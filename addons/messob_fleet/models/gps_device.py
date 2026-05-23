# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.gps.device
# Description: GPS Device registry and management (HW-1)
#
# Features:
#   - GPS device registration and configuration
#   - Device status monitoring
#   - Vehicle-device assignment
#   - Connection health tracking
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class MessobFmsGpsDevice(models.Model):
    """
    GPS Device registry for fleet vehicles.
    Manages GPS hardware devices and their assignments to vehicles.
    """

    _name = 'messob.fms.gps.device'
    _description = 'MESSOB FMS - GPS Device'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'
    _rec_name = 'name'

    # ── Device Information ──
    name = fields.Char(
        string='Device Name',
        required=True,
        tracking=True,
        help='Unique identifier for the GPS device (e.g., GPS-001)',
    )

    device_id = fields.Char(
        string='Device ID / IMEI',
        required=True,
        tracking=True,
        index=True,
        help='Unique hardware identifier (IMEI for GSM devices)',
    )

    device_type = fields.Selection(
        selection=[
            ('gsm_gps', 'GSM GPS Tracker'),
            ('obd_gps', 'OBD-II GPS Tracker'),
            ('satellite', 'Satellite GPS'),
            ('mobile_app', 'Mobile App GPS'),
            ('other', 'Other'),
        ],
        string='Device Type',
        required=True,
        default='gsm_gps',
        tracking=True,
    )

    manufacturer = fields.Char(
        string='Manufacturer',
        help='Device manufacturer (e.g., Teltonika, Queclink, Concox)',
    )

    model = fields.Char(
        string='Model',
        help='Device model number',
    )

    firmware_version = fields.Char(
        string='Firmware Version',
        help='Current firmware version',
    )

    # ── Assignment ──
    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Assigned Vehicle',
        tracking=True,
        ondelete='set null',
        help='Vehicle this GPS device is installed in',
    )

    installation_date = fields.Date(
        string='Installation Date',
        tracking=True,
        help='Date when device was installed in vehicle',
    )

    # ── Connection Configuration ──
    gateway_url = fields.Char(
        string='Gateway URL',
        required=True,
        default='http://localhost:5000',
        help='GPS Gateway service endpoint URL',
    )

    gateway_protocol = fields.Selection(
        selection=[
            ('http', 'HTTP/REST'),
            ('mqtt', 'MQTT'),
            ('tcp', 'TCP Socket'),
            ('websocket', 'WebSocket'),
        ],
        string='Gateway Protocol',
        default='http',
        required=True,
    )

    api_key = fields.Char(
        string='API Key',
        help='Authentication key for GPS Gateway',
    )

    update_interval = fields.Integer(
        string='Update Interval (seconds)',
        default=30,
        help='How often device sends position updates',
    )

    # ── Status ──
    status = fields.Selection(
        selection=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('maintenance', 'Maintenance'),
            ('faulty', 'Faulty'),
        ],
        string='Status',
        default='inactive',
        required=True,
        tracking=True,
    )

    connection_status = fields.Selection(
        selection=[
            ('connected', 'Connected'),
            ('disconnected', 'Disconnected'),
            ('unknown', 'Unknown'),
        ],
        string='Connection Status',
        default='unknown',
        compute='_compute_connection_status',
        store=True,
    )

    last_communication = fields.Datetime(
        string='Last Communication',
        help='Last time device sent data',
    )

    signal_strength = fields.Integer(
        string='Signal Strength (%)',
        help='GPS/GSM signal strength percentage',
    )

    battery_level = fields.Integer(
        string='Battery Level (%)',
        help='Device battery level (if applicable)',
    )

    # ── Statistics ──
    total_positions = fields.Integer(
        string='Total Positions Recorded',
        default=0,
        help='Total number of GPS positions received',
    )

    last_position_id = fields.Many2one(
        comodel_name='messob.fms.gps.position',
        string='Last Position',
        help='Most recent GPS position',
    )

    # ── Configuration ──
    active = fields.Boolean(
        default=True,
        help='Uncheck to archive device',
    )

    notes = fields.Text(
        string='Notes',
        help='Additional notes about the device',
    )

    # ── Computed Fields ──
    @api.depends('last_communication')
    def _compute_connection_status(self):
        """Determine connection status based on last communication time."""
        now = datetime.now()
        timeout_minutes = 5  # Consider disconnected if no data for 5 minutes
        
        for device in self:
            if not device.last_communication:
                device.connection_status = 'unknown'
            elif (now - device.last_communication) > timedelta(minutes=timeout_minutes):
                device.connection_status = 'disconnected'
            else:
                device.connection_status = 'connected'

    # ── Constraints ──
    _sql_constraints = [
        ('device_id_unique', 'UNIQUE(device_id)', 'Device ID must be unique!'),
    ]

    @api.constrains('update_interval')
    def _check_update_interval(self):
        """Validate update interval is reasonable."""
        for device in self:
            if device.update_interval < 5 or device.update_interval > 3600:
                raise ValidationError(_('Update interval must be between 5 and 3600 seconds.'))

    # ── Actions ──
    def action_activate(self):
        """Activate GPS device."""
        self.ensure_one()
        self.write({'status': 'active'})
        self.message_post(body=_('GPS device activated'))
        return True

    def action_deactivate(self):
        """Deactivate GPS device."""
        self.ensure_one()
        self.write({'status': 'inactive'})
        self.message_post(body=_('GPS device deactivated'))
        return True

    def action_test_connection(self):
        """Test connection to GPS Gateway."""
        self.ensure_one()
        
        try:
            # Import GPS Gateway service
            gateway = self.env['messob.fms.gps.gateway']
            result = gateway.test_device_connection(self.id)
            
            if result.get('success'):
                self.message_post(
                    body=_('Connection test successful. Device is responding.'),
                    message_type='notification'
                )
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Success'),
                        'message': _('GPS device connection test successful'),
                        'type': 'success',
                        'sticky': False,
                    }
                }
            else:
                error_msg = result.get('error', 'Unknown error')
                self.message_post(
                    body=_('Connection test failed: %s') % error_msg,
                    message_type='notification'
                )
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Connection Failed'),
                        'message': error_msg,
                        'type': 'warning',
                        'sticky': True,
                    }
                }
        except Exception as e:
            _logger.error(f"GPS device connection test failed: {e}")
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'message': str(e),
                    'type': 'danger',
                    'sticky': True,
                }
            }

    def action_view_positions(self):
        """View GPS positions for this device."""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': _('GPS Positions - %s') % self.name,
            'res_model': 'messob.fms.gps.position',
            'view_mode': 'list,form,map',
            'domain': [('device_id', '=', self.id)],
            'context': {'default_device_id': self.id},
        }

    def action_sync_now(self):
        """Manually trigger position sync from GPS Gateway."""
        self.ensure_one()
        
        try:
            gateway = self.env['messob.fms.gps.gateway']
            result = gateway.sync_device_positions(self.id)
            
            if result.get('success'):
                count = result.get('positions_synced', 0)
                self.message_post(
                    body=_('Synced %d new positions from GPS Gateway') % count
                )
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Sync Complete'),
                        'message': _('%d positions synced') % count,
                        'type': 'success',
                        'sticky': False,
                    }
                }
            else:
                error_msg = result.get('error', 'Sync failed')
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Sync Failed'),
                        'message': error_msg,
                        'type': 'warning',
                        'sticky': True,
                    }
                }
        except Exception as e:
            _logger.error(f"GPS position sync failed: {e}")
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'message': str(e),
                    'type': 'danger',
                    'sticky': True,
                }
            }

    # ── Scheduled Actions ──
    @api.model
    def _cron_sync_all_devices(self):
        """
        Cron job to sync positions from all active GPS devices.
        Runs every 5 minutes.
        """
        _logger.info("Starting GPS devices sync")
        
        active_devices = self.search([
            ('status', '=', 'active'),
            ('vehicle_id', '!=', False)
        ])
        
        gateway = self.env['messob.fms.gps.gateway']
        total_synced = 0
        
        for device in active_devices:
            try:
                result = gateway.sync_device_positions(device.id)
                if result.get('success'):
                    count = result.get('positions_synced', 0)
                    total_synced += count
                    _logger.info(f"Synced {count} positions for device {device.name}")
            except Exception as e:
                _logger.error(f"Failed to sync device {device.name}: {e}")
        
        _logger.info(f"GPS sync completed. Total positions synced: {total_synced}")
        return total_synced

    @api.model
    def _cron_check_device_health(self):
        """
        Cron job to check health of all GPS devices.
        Runs every 15 minutes.
        """
        _logger.info("Starting GPS device health check")
        
        devices = self.search([('status', '=', 'active')])
        disconnected_count = 0
        
        for device in devices:
            # Recompute connection status
            device._compute_connection_status()
            
            if device.connection_status == 'disconnected':
                disconnected_count += 1
                _logger.warning(f"Device {device.name} is disconnected")
                
                # Create activity for admin
                device.activity_schedule(
                    'mail.mail_activity_data_warning',
                    summary=_('GPS Device Disconnected'),
                    note=_('Device %s has not communicated for over 5 minutes') % device.name,
                    user_id=self.env.ref('base.user_admin').id
                )
        
        _logger.info(f"Health check completed. {disconnected_count} devices disconnected")
        return disconnected_count
