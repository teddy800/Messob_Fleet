# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.trip (Dispatcher Extension)
# Description: Adds dispatcher-only actions to the trip request model.
#              Implements Module 2 (SRS §3.2).
#
# Business Rules enforced here (SRS §5.5):
#   BR-1: Only 'Dispatcher' role can approve or reject.
#   BR-2: A vehicle cannot be double-booked (time overlap check).
#   BR-3: A driver cannot be double-booked (time overlap check).
# ---------------------------------------------------------------------------

from odoo import models, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsTripDispatcher(models.Model):
    """
    Dispatcher-side extension of messob.fms.trip.

    All methods here are protected by a group check so that
    standard staff users cannot call them even via RPC.
    """

    _inherit = 'messob.fms.trip'

    # =========================================================================
    # DISPATCHER ACTIONS (Module 2 — FR-2.2)
    # =========================================================================

    def action_approve(self):
        """
        Dispatcher action: Approve a pending request.
        Transition: pending → approved

        Requires:
          - Caller has group_fms_dispatcher (BR-1)
          - A vehicle is assigned
          - A driver is assigned
          - No time-overlap conflicts (BR-2, BR-3)
        """
        self._assert_dispatcher()

        for rec in self:
            # Refresh record to get latest data from database (in case assignments were just made)
            rec.invalidate_recordset(['assigned_vehicle_id', 'assigned_driver_id', 'state'])
            
            if rec.state != 'pending':
                raise UserError(_('Only "Pending" requests can be approved.'))
            if not rec.assigned_vehicle_id:
                raise UserError(
                    _('Please assign a vehicle before approving request %s.') % rec.name
                )
            if not rec.assigned_driver_id:
                raise UserError(
                    _('Please assign a driver before approving request %s.') % rec.name
                )
            rec._check_resource_availability()
            
            # Log approval action
            self.env['messob.fms.audit.log'].log_business_action(
                action='APPROVE',
                model=rec._name,
                record_id=rec.id,
                description=f"Approved trip request {rec.name} - Vehicle: {rec.assigned_vehicle_id.license_plate}, Driver: {rec.assigned_driver_id.name}",
                severity='high'
            )
            
            # Send email notification to requester and driver (SW-3)
            rec._send_approval_notification()

        self.write({'state': 'approved'})
        return self._notify('Approved', 'Trip request has been approved.', 'success')

    def action_reject(self):
        """
        Dispatcher action: Reject a pending request.
        Transition: pending → rejected

        Requires:
          - Caller has group_fms_dispatcher (BR-1)
        """
        self._assert_dispatcher()

        for rec in self:
            if rec.state != 'pending':
                raise UserError(_('Only "Pending" requests can be rejected.'))
            
            # Log rejection action
            self.env['messob.fms.audit.log'].log_business_action(
                action='REJECT',
                model=rec._name,
                record_id=rec.id,
                description=f"Rejected trip request {rec.name} - Requester: {rec.requester_id.name}",
                severity='medium'
            )
            
            # Send email notification to requester (SW-3)
            rec._send_rejection_notification()

        self.write({'state': 'rejected'})
        return self._notify('Rejected', 'Trip request has been rejected.', 'warning')

    # =========================================================================
    # EMAIL NOTIFICATIONS (SW-3)
    # =========================================================================

    def _send_approval_notification(self):
        """Send email notification when trip is approved."""
        self.ensure_one()
        
        # Notify requester
        if self.requester_id.email:
            subject = f"Trip Request Approved: {self.name}"
            body = f"""
            <p>Dear {self.requester_id.name},</p>
            <p>Your trip request <strong>{self.name}</strong> has been approved.</p>
            <h3>Trip Details:</h3>
            <ul>
                <li><strong>Purpose:</strong> {self.purpose}</li>
                <li><strong>Date/Time:</strong> {self.start_dt.strftime('%Y-%m-%d %H:%M')} to {self.end_dt.strftime('%Y-%m-%d %H:%M')}</li>
                <li><strong>Pickup:</strong> {self.pickup}</li>
                <li><strong>Destination:</strong> {self.destination}</li>
                <li><strong>Assigned Vehicle:</strong> {self.assigned_vehicle_id.license_plate}</li>
                <li><strong>Assigned Driver:</strong> {self.assigned_driver_id.name}</li>
            </ul>
            <p>Please be ready at the pickup location at the scheduled time.</p>
            <p>Best regards,<br/>MESSOB Fleet Management Team</p>
            """
            
            self.message_post(
                subject=subject,
                body=body,
                partner_ids=[self.requester_id.id],
                message_type='email',
                subtype_xmlid='mail.mt_comment',
            )
        
        # Notify driver
        if self.assigned_driver_id.email:
            subject = f"New Trip Assignment: {self.name}"
            body = f"""
            <p>Dear {self.assigned_driver_id.name},</p>
            <p>You have been assigned to a new trip.</p>
            <h3>Trip Details:</h3>
            <ul>
                <li><strong>Request ID:</strong> {self.name}</li>
                <li><strong>Requester:</strong> {self.requester_id.name}</li>
                <li><strong>Purpose:</strong> {self.purpose}</li>
                <li><strong>Date/Time:</strong> {self.start_dt.strftime('%Y-%m-%d %H:%M')} to {self.end_dt.strftime('%Y-%m-%d %H:%M')}</li>
                <li><strong>Pickup:</strong> {self.pickup}</li>
                <li><strong>Destination:</strong> {self.destination}</li>
                <li><strong>Vehicle:</strong> {self.assigned_vehicle_id.license_plate}</li>
            </ul>
            <p>Please ensure the vehicle is ready and arrive at the pickup location on time.</p>
            <p>Best regards,<br/>MESSOB Fleet Management Team</p>
            """
            
            self.message_post(
                subject=subject,
                body=body,
                partner_ids=[self.assigned_driver_id.id],
                message_type='email',
                subtype_xmlid='mail.mt_comment',
            )

    def _send_rejection_notification(self):
        """Send email notification when trip is rejected."""
        self.ensure_one()
        
        if self.requester_id.email:
            subject = f"Trip Request Rejected: {self.name}"
            body = f"""
            <p>Dear {self.requester_id.name},</p>
            <p>We regret to inform you that your trip request <strong>{self.name}</strong> has been rejected.</p>
            <h3>Request Details:</h3>
            <ul>
                <li><strong>Purpose:</strong> {self.purpose}</li>
                <li><strong>Date/Time:</strong> {self.start_dt.strftime('%Y-%m-%d %H:%M')} to {self.end_dt.strftime('%Y-%m-%d %H:%M')}</li>
                <li><strong>Pickup:</strong> {self.pickup}</li>
                <li><strong>Destination:</strong> {self.destination}</li>
            </ul>
            <p>Please contact the dispatcher for more information or to submit a new request.</p>
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
    # AVAILABILITY CHECK (BR-2, BR-3)
    # =========================================================================

    def _check_resource_availability(self):
        """
        Verify that the assigned vehicle and driver are not already
        committed to another active trip that overlaps in time.

        Raises UserError if a conflict is found.
        Called before every approval.
        """
        active_states = ['approved', 'in_progress']

        for rec in self:
            base_domain = [
                ('state', 'in', active_states),
                ('id', '!=', rec.id),
                ('start_dt', '<', rec.end_dt),
                ('end_dt', '>', rec.start_dt),
            ]

            # --- Vehicle conflict check (BR-2) ---
            if rec.assigned_vehicle_id:
                conflict = self.search(
                    base_domain + [('assigned_vehicle_id', '=', rec.assigned_vehicle_id.id)],
                    limit=1,
                )
                if conflict:
                    raise UserError(
                        _('Vehicle "%s" is already assigned to trip %s during this time window.')
                        % (rec.assigned_vehicle_id.name, conflict.name)
                    )

            # --- Driver conflict check (BR-3) ---
            if rec.assigned_driver_id:
                conflict = self.search(
                    base_domain + [('assigned_driver_id', '=', rec.assigned_driver_id.id)],
                    limit=1,
                )
                if conflict:
                    raise UserError(
                        _('Driver "%s" is already assigned to trip %s during this time window.')
                        % (rec.assigned_driver_id.name, conflict.name)
                    )

    # =========================================================================
    # PRIVATE HELPERS
    # =========================================================================

    def _assert_dispatcher(self):
        """Raise UserError if the current user is not a dispatcher or admin."""
        if not self.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            raise UserError(
                _('Access Denied: Only dispatchers can perform this action.')
            )
