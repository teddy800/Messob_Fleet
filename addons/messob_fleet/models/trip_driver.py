# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.trip.driver
# Description: Driver actions and trip status updates (Module 3 - Driver Side)
#
# Features:
#   - Driver trip status updates (Depart, Arrive, Complete)
#   - Odometer logging at trip milestones
#   - Fuel usage reporting
#   - Trip completion workflow
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError
from datetime import datetime


class MessobFmsTripDriver(models.Model):
    """
    Driver-side extension of messob.fms.trip.
    Handles trip status updates and field operations.
    """

    _inherit = 'messob.fms.trip'

    # =========================================================================
    # DRIVER FIELDS
    # =========================================================================

    actual_start_dt = fields.Datetime(
        string='Actual Start Time',
        readonly=True,
        tracking=True,
        help='Timestamp when driver marked trip as departed.',
    )

    actual_end_dt = fields.Datetime(
        string='Actual End Time',
        readonly=True,
        tracking=True,
        help='Timestamp when driver marked trip as completed.',
    )

    start_odometer = fields.Float(
        string='Start Odometer (KM)',
        tracking=True,
        help='Vehicle odometer reading at trip start.',
    )

    end_odometer = fields.Float(
        string='End Odometer (KM)',
        tracking=True,
        help='Vehicle odometer reading at trip completion.',
    )

    distance_traveled = fields.Float(
        string='Distance Traveled (KM)',
        compute='_compute_distance_traveled',
        store=True,
        help='Calculated from odometer readings.',
    )

    fuel_consumed = fields.Float(
        string='Fuel Consumed (Liters)',
        tracking=True,
        help='Driver-reported fuel consumption for this trip.',
    )

    driver_notes = fields.Text(
        string='Driver Notes',
        tracking=True,
        help='Any observations or issues during the trip.',
    )

    # =========================================================================
    # COMPUTED FIELDS
    # =========================================================================

    @api.depends('start_odometer', 'end_odometer')
    def _compute_distance_traveled(self):
        """Calculate distance from odometer readings."""
        for rec in self:
            if rec.start_odometer and rec.end_odometer:
                rec.distance_traveled = rec.end_odometer - rec.start_odometer
            else:
                rec.distance_traveled = 0.0

    # =========================================================================
    # DRIVER ACTIONS (SRS §2.3 - Driver User Class)
    # =========================================================================

    def action_depart(self):
        """
        Driver action: Mark trip as departed.
        Transition: approved → in_progress
        
        Requires:
          - Caller is the assigned driver
          - Trip is in 'approved' state
          - Start odometer reading provided
        """
        self._assert_assigned_driver()

        for rec in self:
            if rec.state != 'approved':
                raise UserError(_('Only approved trips can be marked as departed.'))
            
            if not rec.start_odometer or rec.start_odometer <= 0:
                raise UserError(_('Please enter the current odometer reading before departing.'))
            
            # Update vehicle odometer
            if rec.assigned_vehicle_id:
                rec.assigned_vehicle_id.write({
                    'odometer': rec.start_odometer
                })
            
            # Log departure
            self.env['messob.fms.audit.log'].log_business_action(
                action='DEPART',
                model=rec._name,
                record_id=rec.id,
                description=f"Trip {rec.name} departed - Driver: {rec.assigned_driver_id.name}, Odometer: {rec.start_odometer} KM",
                severity='medium'
            )

        self.write({
            'state': 'in_progress',
            'actual_start_dt': fields.Datetime.now(),
        })
        
        return self._notify('Departed', 'Trip marked as in progress.', 'success')

    def action_arrive(self):
        """
        Driver action: Mark arrival at destination.
        Transition: in_progress → (stays in_progress until completion)
        
        This is an intermediate status for multi-stop trips.
        """
        self._assert_assigned_driver()

        for rec in self:
            if rec.state != 'in_progress':
                raise UserError(_('Only in-progress trips can be marked as arrived.'))
            
            # Log arrival
            self.env['messob.fms.audit.log'].log_business_action(
                action='ARRIVE',
                model=rec._name,
                record_id=rec.id,
                description=f"Trip {rec.name} arrived at destination - Driver: {rec.assigned_driver_id.name}",
                severity='low'
            )
            
            # Post message to chatter
            rec.message_post(
                body=f"Driver {rec.assigned_driver_id.name} has arrived at destination.",
                message_type='notification'
            )

        return self._notify('Arrived', 'Arrival at destination recorded.', 'success')

    def action_complete(self):
        """
        Driver action: Complete the trip.
        Transition: in_progress → completed
        
        Requires:
          - Caller is the assigned driver
          - Trip is in 'in_progress' state
          - End odometer reading provided
          - End odometer > start odometer
        """
        self._assert_assigned_driver()

        for rec in self:
            if rec.state != 'in_progress':
                raise UserError(_('Only in-progress trips can be completed.'))
            
            if not rec.end_odometer or rec.end_odometer <= 0:
                raise UserError(_('Please enter the final odometer reading before completing.'))
            
            if rec.start_odometer and rec.end_odometer <= rec.start_odometer:
                raise UserError(_('End odometer must be greater than start odometer.'))
            
            # Update vehicle odometer
            if rec.assigned_vehicle_id:
                rec.assigned_vehicle_id.write({
                    'odometer': rec.end_odometer
                })
            
            # Auto-create fuel log if fuel consumed is provided
            if rec.fuel_consumed and rec.fuel_consumed > 0:
                self.env['messob.fms.fuel.log'].create({
                    'vehicle_id': rec.assigned_vehicle_id.id,
                    'driver_id': rec.assigned_driver_id.id,
                    'trip_id': rec.id,
                    'date': fields.Date.today(),
                    'liters': rec.fuel_consumed,
                    'odometer': rec.end_odometer,
                    'source': 'trip_completion',
                    'notes': f'Auto-logged from trip {rec.name}',
                })
            
            # Log completion
            self.env['messob.fms.audit.log'].log_business_action(
                action='COMPLETE',
                model=rec._name,
                record_id=rec.id,
                description=f"Trip {rec.name} completed - Distance: {rec.distance_traveled} KM, Fuel: {rec.fuel_consumed or 0} L",
                severity='medium'
            )
            
            # Notify requester
            rec._send_completion_notification()

        self.write({
            'state': 'completed',
            'actual_end_dt': fields.Datetime.now(),
        })
        
        return self._notify('Completed', 'Trip has been completed successfully.', 'success')

    def action_report_issue(self):
        """
        Driver action: Report an issue during the trip.
        Creates an activity for the dispatcher to follow up.
        """
        self._assert_assigned_driver()

        for rec in self:
            if rec.state not in ['approved', 'in_progress']:
                raise UserError(_('Can only report issues for active trips.'))
            
            # Create activity for dispatcher
            rec.activity_schedule(
                activity_type_xmlid='mail.mail_activity_data_todo',
                summary=f'Issue reported on trip {rec.name}',
                note=rec.driver_notes or 'Driver reported an issue. Please follow up.',
                user_id=self.env.ref('base.user_admin').id,  # Assign to admin/dispatcher
            )
            
            # Log issue
            self.env['messob.fms.audit.log'].log_business_action(
                action='REPORT_ISSUE',
                model=rec._name,
                record_id=rec.id,
                description=f"Issue reported on trip {rec.name} by driver {rec.assigned_driver_id.name}",
                severity='high'
            )

        return self._notify('Issue Reported', 'Dispatcher has been notified.', 'warning')

    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================

    def _send_completion_notification(self):
        """Send email notification when trip is completed."""
        self.ensure_one()
        
        if self.requester_id.email:
            subject = f"Trip Completed: {self.name}"
            body = f"""
            <p>Dear {self.requester_id.name},</p>
            <p>Your trip <strong>{self.name}</strong> has been completed.</p>
            <h3>Trip Summary:</h3>
            <ul>
                <li><strong>Purpose:</strong> {self.purpose}</li>
                <li><strong>Scheduled:</strong> {self.start_dt.strftime('%Y-%m-%d %H:%M')} to {self.end_dt.strftime('%Y-%m-%d %H:%M')}</li>
                <li><strong>Actual Duration:</strong> {self.actual_start_dt.strftime('%Y-%m-%d %H:%M') if self.actual_start_dt else 'N/A'} to {self.actual_end_dt.strftime('%Y-%m-%d %H:%M') if self.actual_end_dt else 'N/A'}</li>
                <li><strong>Distance Traveled:</strong> {self.distance_traveled:.2f} KM</li>
                <li><strong>Fuel Consumed:</strong> {self.fuel_consumed or 0:.2f} Liters</li>
                <li><strong>Vehicle:</strong> {self.assigned_vehicle_id.license_plate}</li>
                <li><strong>Driver:</strong> {self.assigned_driver_id.name}</li>
            </ul>
            {f'<p><strong>Driver Notes:</strong> {self.driver_notes}</p>' if self.driver_notes else ''}
            <p>Thank you for using MESSOB Fleet Management.</p>
            <p>Best regards,<br/>MESSOB Fleet Management Team</p>
            """
            
            self.message_post(
                subject=subject,
                body=body,
                partner_ids=[self.requester_id.id],
                message_type='email',
                subtype_xmlid='mail.mt_comment',
            )

    # =========================================================================
    # PRIVATE HELPERS
    # =========================================================================

    def _assert_assigned_driver(self):
        """Raise UserError if the current user is not the assigned driver."""
        for rec in self:
            if not rec.assigned_driver_id:
                raise UserError(_('No driver assigned to this trip.'))
            
            current_user_partner = self.env.user.partner_id
            if rec.assigned_driver_id.id != current_user_partner.id:
                # Also check if user is admin/dispatcher (they can override)
                if not self.env.user.has_group('messob_fleet.group_fms_dispatcher'):
                    raise UserError(
                        _('Access Denied: Only the assigned driver can perform this action.')
                    )

    def _notify(self, title, message, type='info'):
        """Helper to return notification dict for frontend."""
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': title,
                'message': message,
                'type': type,
                'sticky': False,
            }
        }
