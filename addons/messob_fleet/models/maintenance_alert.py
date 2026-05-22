# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.maintenance.alert
# Description: Preventive Maintenance & Alerts System (FR-4.3)
#
# Features:
#   - Automated alerts for upcoming maintenance
#   - Dashboard notifications
#   - Email/SMS alerts
#   - Maintenance schedule management
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class MessobFmsMaintenanceAlert(models.Model):
    """
    Preventive Maintenance Alert System
    Manages automated alerts for upcoming maintenance based on date and odometer.
    """

    _name = 'messob.fms.maintenance.alert'
    _description = 'MESSOB FMS - Maintenance Alert'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'alert_date desc'
    _rec_name = 'alert_title'

    # ── Alert Information ──
    alert_title = fields.Char(
        string='Alert Title',
        required=True,
        tracking=True,
        help='Title of the maintenance alert.',
    )

    alert_type = fields.Selection(
        selection=[
            ('date_based', 'Date-Based Alert'),
            ('odometer_based', 'Odometer-Based Alert'),
            ('combined', 'Combined (Date & Odometer)'),
        ],
        string='Alert Type',
        required=True,
        default='date_based',
        tracking=True,
    )

    alert_date = fields.Datetime(
        string='Alert Date',
        required=True,
        default=fields.Datetime.now,
        tracking=True,
        help='When this alert was generated.',
    )

    # ── Vehicle & Maintenance ──
    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        required=True,
        tracking=True,
        help='Vehicle requiring maintenance.',
    )

    maintenance_log_id = fields.Many2one(
        comodel_name='messob.fms.maintenance.log',
        string='Related Maintenance Log',
        help='Original maintenance record that scheduled this alert.',
    )

    # ── Schedule Information ──
    scheduled_date = fields.Date(
        string='Scheduled Maintenance Date',
        required=True,
        tracking=True,
        help='Date when maintenance is due.',
    )

    scheduled_odometer = fields.Integer(
        string='Scheduled Odometer (km)',
        help='Odometer reading when maintenance is due.',
    )

    current_odometer = fields.Integer(
        string='Current Odometer (km)',
        help='Current vehicle odometer reading.',
    )

    # ── Alert Status ──
    status = fields.Selection(
        selection=[
            ('pending', 'Pending'),
            ('sent', 'Alert Sent'),
            ('acknowledged', 'Acknowledged'),
            ('completed', 'Maintenance Completed'),
            ('dismissed', 'Dismissed'),
        ],
        string='Status',
        default='pending',
        required=True,
        tracking=True,
    )

    priority = fields.Selection(
        selection=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ],
        string='Priority',
        default='medium',
        required=True,
        tracking=True,
    )

    # ── Alert Details ──
    service_type = fields.Selection(
        selection=[
            ('full_change', 'Full Change (Oil & Filter)'),
            ('brake', 'Brake Service'),
            ('tire', 'Tire Replacement'),
            ('engine', 'Engine Repair'),
            ('transmission', 'Transmission Service'),
            ('electrical', 'Electrical Repair'),
            ('body', 'Body & Paint'),
            ('inspection', 'General Inspection'),
            ('other', 'Other'),
        ],
        string='Service Type',
        required=True,
        tracking=True,
    )

    description = fields.Text(
        string='Alert Description',
        help='Detailed description of the maintenance required.',
    )

    # ── Notification Settings ──
    email_sent = fields.Boolean(
        string='Email Sent',
        default=False,
        help='Whether email notification has been sent.',
    )

    sms_sent = fields.Boolean(
        string='SMS Sent',
        default=False,
        help='Whether SMS notification has been sent.',
    )

    dashboard_notification = fields.Boolean(
        string='Dashboard Notification',
        default=True,
        help='Show this alert in dashboard notifications.',
    )

    # ── Recipients ──
    mechanic_ids = fields.Many2many(
        comodel_name='res.partner',
        relation='maintenance_alert_mechanic_rel',
        column1='alert_id',
        column2='mechanic_id',
        string='Mechanics to Notify',
        help='Mechanics who should receive this alert.',
    )

    manager_ids = fields.Many2many(
        comodel_name='res.partner',
        relation='maintenance_alert_manager_rel',
        column1='alert_id',
        column2='manager_id',
        string='Managers to Notify',
        help='Managers who should receive this alert.',
    )

    # ── Computed Fields ──
    days_until_due = fields.Integer(
        string='Days Until Due',
        compute='_compute_days_until_due',
        store=True,
        help='Number of days until maintenance is due.',
    )

    odometer_difference = fields.Integer(
        string='Odometer Difference (km)',
        compute='_compute_odometer_difference',
        store=True,
        help='Difference between current and scheduled odometer.',
    )

    is_overdue = fields.Boolean(
        string='Is Overdue',
        compute='_compute_is_overdue',
        store=True,
        help='Whether this maintenance is overdue.',
    )

    alert_message = fields.Text(
        string='Alert Message',
        compute='_compute_alert_message',
        help='Generated alert message for notifications.',
    )

    @api.depends('scheduled_date')
    def _compute_days_until_due(self):
        for alert in self:
            if alert.scheduled_date:
                today = fields.Date.today()
                delta = alert.scheduled_date - today
                alert.days_until_due = delta.days
            else:
                alert.days_until_due = 0

    @api.depends('current_odometer', 'scheduled_odometer')
    def _compute_odometer_difference(self):
        for alert in self:
            if alert.current_odometer and alert.scheduled_odometer:
                alert.odometer_difference = alert.scheduled_odometer - alert.current_odometer
            else:
                alert.odometer_difference = 0

    @api.depends('days_until_due', 'odometer_difference')
    def _compute_is_overdue(self):
        for alert in self:
            date_overdue = alert.days_until_due < 0
            odometer_overdue = alert.odometer_difference < 0
            alert.is_overdue = date_overdue or odometer_overdue

    @api.depends('vehicle_id', 'service_type', 'scheduled_date', 'days_until_due', 'is_overdue')
    def _compute_alert_message(self):
        for alert in self:
            vehicle_name = alert.vehicle_id.name if alert.vehicle_id else 'Unknown Vehicle'
            service_type = dict(alert._fields['service_type'].selection).get(alert.service_type, 'Maintenance')
            
            if alert.is_overdue:
                if alert.days_until_due < 0:
                    alert.alert_message = f"OVERDUE: {service_type} for {vehicle_name} was due {abs(alert.days_until_due)} days ago!"
                else:
                    alert.alert_message = f"OVERDUE: {service_type} for {vehicle_name} is overdue by odometer reading!"
            else:
                if alert.days_until_due <= 7:
                    alert.alert_message = f"URGENT: {service_type} for {vehicle_name} is due in {alert.days_until_due} days!"
                else:
                    alert.alert_message = f"REMINDER: {service_type} for {vehicle_name} is due on {alert.scheduled_date}."

    # ── Actions ──
    def action_view_vehicle(self):
        """Open the vehicle form view."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Vehicle',
            'res_model': 'fleet.vehicle',
            'res_id': self.vehicle_id.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_view_maintenance_log(self):
        """Open the maintenance log form view."""
        self.ensure_one()
        if not self.maintenance_log_id:
            return
        return {
            'type': 'ir.actions.act_window',
            'name': 'Maintenance Log',
            'res_model': 'messob.fms.maintenance.log',
            'res_id': self.maintenance_log_id.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_acknowledge(self):
        """Mark alert as acknowledged."""
        self.write({'status': 'acknowledged'})
        self.message_post(body=f"Alert acknowledged by {self.env.user.name}")

    def action_dismiss(self):
        """Dismiss the alert."""
        self.write({'status': 'dismissed'})
        self.message_post(body=f"Alert dismissed by {self.env.user.name}")

    def action_complete_maintenance(self):
        """Mark maintenance as completed."""
        self.write({'status': 'completed'})
        self.message_post(body=f"Maintenance marked as completed by {self.env.user.name}")

    def action_send_notifications(self):
        """Send email and SMS notifications."""
        self._send_email_notifications()
        self._send_sms_notifications()
        self.write({'status': 'sent'})

    def _send_email_notifications(self):
        """Send email notifications to mechanics and managers."""
        if self.email_sent:
            return

        template = self.env.ref('messob_fleet.email_template_maintenance_alert', raise_if_not_found=False)
        if not template:
            _logger.warning("Email template 'email_template_maintenance_alert' not found")
            return

        recipients = self.mechanic_ids + self.manager_ids
        for recipient in recipients:
            if recipient.email:
                try:
                    template.send_mail(self.id, force_send=True, email_values={
                        'email_to': recipient.email,
                        'recipient_ids': [(4, recipient.id)],
                    })
                except Exception as e:
                    _logger.error(f"Failed to send email to {recipient.email}: {e}")

        self.write({'email_sent': True})

    def _send_sms_notifications(self):
        """Send SMS notifications to mechanics and managers."""
        if self.sms_sent:
            return

        recipients = self.mechanic_ids + self.manager_ids
        for recipient in recipients:
            if recipient.mobile:
                try:
                    # SMS integration would go here
                    # For now, we'll log the SMS that would be sent
                    sms_message = f"MESSOB Fleet Alert: {self.alert_message[:140]}"
                    _logger.info(f"SMS to {recipient.mobile}: {sms_message}")
                    
                    # In a real implementation, integrate with SMS gateway:
                    # self.env['sms.sms'].create({
                    #     'number': recipient.mobile,
                    #     'body': sms_message,
                    # }).send()
                    
                except Exception as e:
                    _logger.error(f"Failed to send SMS to {recipient.mobile}: {e}")

        self.write({'sms_sent': True})

    # ── Cron Job Methods ──
    @api.model
    def _cron_generate_maintenance_alerts(self):
        """
        Cron job to generate maintenance alerts based on scheduled dates and odometer readings.
        Runs daily to check for upcoming maintenance.
        """
        _logger.info("Running maintenance alert generation cron job")
        
        # Get all maintenance logs with future service dates
        maintenance_logs = self.env['messob.fms.maintenance.log'].search([
            ('next_service_date', '!=', False),
            ('vehicle_state', '=', 'active'),
        ])

        alerts_created = 0
        for log in maintenance_logs:
            alerts_created += self._check_and_create_alert(log)

        _logger.info(f"Maintenance alert cron job completed. Created {alerts_created} new alerts.")

    def _check_and_create_alert(self, maintenance_log):
        """Check if an alert should be created for a maintenance log."""
        if not maintenance_log.next_service_date:
            return 0

        # Check if alert already exists
        existing_alert = self.search([
            ('maintenance_log_id', '=', maintenance_log.id),
            ('status', 'in', ['pending', 'sent', 'acknowledged']),
        ], limit=1)

        if existing_alert:
            return 0  # Alert already exists

        # Calculate days until due
        today = fields.Date.today()
        days_until_due = (maintenance_log.next_service_date - today).days

        # Create alert if within alert window (30 days before due)
        if days_until_due <= 30:
            priority = self._calculate_priority(days_until_due)
            
            alert_data = {
                'alert_title': f"{maintenance_log.service_type} - {maintenance_log.vehicle_id.name}",
                'alert_type': 'date_based',
                'vehicle_id': maintenance_log.vehicle_id.id,
                'maintenance_log_id': maintenance_log.id,
                'scheduled_date': maintenance_log.next_service_date,
                'scheduled_odometer': maintenance_log.next_service_odometer,
                'service_type': maintenance_log.service_type,
                'priority': priority,
                'description': f"Scheduled maintenance based on previous service on {maintenance_log.date}",
            }

            # Add default recipients (mechanics and fleet managers)
            mechanics = self._get_default_mechanics()
            managers = self._get_default_managers()
            
            alert = self.create(alert_data)
            alert.write({
                'mechanic_ids': [(6, 0, mechanics.ids)],
                'manager_ids': [(6, 0, managers.ids)],
            })

            # Send notifications immediately for urgent alerts
            if priority in ['high', 'critical']:
                alert.action_send_notifications()

            return 1

        return 0

    def _calculate_priority(self, days_until_due):
        """Calculate alert priority based on days until due."""
        if days_until_due < 0:
            return 'critical'  # Overdue
        elif days_until_due <= 3:
            return 'high'      # Due within 3 days
        elif days_until_due <= 7:
            return 'medium'    # Due within a week
        else:
            return 'low'       # Due within a month

    def _get_default_mechanics(self):
        """Get default mechanics to notify."""
        # Get users with mechanic role
        mechanic_group = self.env.ref('messob_fleet.group_fms_mechanic', raise_if_not_found=False)
        if mechanic_group:
            return mechanic_group.users.mapped('partner_id')
        return self.env['res.partner']

    def _get_default_managers(self):
        """Get default managers to notify."""
        # Get users with admin/dispatcher roles
        admin_group = self.env.ref('messob_fleet.group_fms_admin', raise_if_not_found=False)
        dispatcher_group = self.env.ref('messob_fleet.group_fms_dispatcher', raise_if_not_found=False)
        
        managers = self.env['res.partner']
        if admin_group:
            managers |= admin_group.users.mapped('partner_id')
        if dispatcher_group:
            managers |= dispatcher_group.users.mapped('partner_id')
        
        return managers

    @api.model
    def _cron_send_daily_alert_summary(self):
        """
        Cron job to send daily summary of pending maintenance alerts.
        Runs every morning to provide overview of maintenance status.
        """
        _logger.info("Running daily maintenance alert summary cron job")
        
        # Get pending and overdue alerts
        pending_alerts = self.search([
            ('status', 'in', ['pending', 'sent']),
            ('dashboard_notification', '=', True),
        ])

        if not pending_alerts:
            return

        # Group alerts by priority
        critical_alerts = pending_alerts.filtered(lambda a: a.priority == 'critical')
        high_alerts = pending_alerts.filtered(lambda a: a.priority == 'high')
        medium_alerts = pending_alerts.filtered(lambda a: a.priority == 'medium')
        low_alerts = pending_alerts.filtered(lambda a: a.priority == 'low')

        # Send summary email to managers
        managers = self._get_default_managers()
        if managers:
            self._send_daily_summary_email(managers, {
                'critical': critical_alerts,
                'high': high_alerts,
                'medium': medium_alerts,
                'low': low_alerts,
            })

    def _send_daily_summary_email(self, recipients, alert_groups):
        """Send daily summary email to managers."""
        template = self.env.ref('messob_fleet.email_template_daily_maintenance_summary', raise_if_not_found=False)
        if not template:
            _logger.warning("Email template 'email_template_daily_maintenance_summary' not found")
            return

        for recipient in recipients:
            if recipient.email:
                try:
                    template.with_context(
                        alert_groups=alert_groups,
                        recipient_name=recipient.name,
                    ).send_mail(recipient.id, force_send=True)
                except Exception as e:
                    _logger.error(f"Failed to send daily summary to {recipient.email}: {e}")


class MessobFmsMaintenanceLog(models.Model):
    """
    Extend maintenance log to integrate with alert system.
    """
    _inherit = 'messob.fms.maintenance.log'

    # ── Alert Integration ──
    alert_ids = fields.One2many(
        comodel_name='messob.fms.maintenance.alert',
        inverse_name='maintenance_log_id',
        string='Related Alerts',
        help='Alerts generated for this maintenance record.',
    )

    alert_count = fields.Integer(
        string='Alert Count',
        compute='_compute_alert_count',
        help='Number of alerts for this maintenance record.',
    )

    @api.depends('alert_ids')
    def _compute_alert_count(self):
        for record in self:
            record.alert_count = len(record.alert_ids)

    @api.model_create_multi
    def create(self, vals_list):
        """Override create to generate alerts for future maintenance."""
        records = super().create(vals_list)
        for record in records:
            if record.next_service_date:
                record._schedule_maintenance_alert()
        return records

    def write(self, vals):
        """Override write to update alerts when next service date changes."""
        result = super().write(vals)
        if 'next_service_date' in vals or 'next_service_odometer' in vals:
            for record in self:
                if record.next_service_date:
                    record._schedule_maintenance_alert()
        return result

    def _schedule_maintenance_alert(self):
        """Schedule a maintenance alert for this record."""
        # This will be picked up by the cron job
        # We could also create the alert immediately if needed
        pass

    def action_view_alerts(self):
        """Action to view related alerts."""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Maintenance Alerts',
            'res_model': 'messob.fms.maintenance.alert',
            'view_mode': 'list,form',
            'domain': [('maintenance_log_id', '=', self.id)],
            'context': {'default_maintenance_log_id': self.id},
        }