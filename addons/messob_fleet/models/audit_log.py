# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.audit.log
# Description: Comprehensive audit trail for critical system actions (FR-5.3).
#
# Features:
#   - Comprehensive logging (logins, approvals, data changes)
#   - Audit log viewer for admins
#   - Log retention policies
#   - Advanced filtering and search
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)


class MessobFmsAuditLog(models.Model):
    """
    Comprehensive audit trail system.
    Records are created automatically by system actions and user activities.
    """

    _name = 'messob.fms.audit.log'
    _description = 'MESSOB FMS - Audit Log'
    _order = 'timestamp desc'
    _rec_name = 'action_display'

    # ── Core Fields ──
    timestamp = fields.Datetime(
        string='Timestamp',
        default=fields.Datetime.now,
        readonly=True,
        required=True,
        index=True,
    )

    user_id = fields.Many2one(
        comodel_name='res.users',
        string='User',
        readonly=True,
        required=True,
        index=True,
        default=lambda self: self.env.user,
    )

    session_id = fields.Char(
        string='Session ID',
        readonly=True,
        help='User session identifier for tracking user activities.',
    )

    ip_address = fields.Char(
        string='IP Address',
        readonly=True,
        help='IP address from which the action was performed.',
    )

    user_agent = fields.Text(
        string='User Agent',
        readonly=True,
        help='Browser/client information.',
    )

    # ── Action Information ──
    action = fields.Selection(
        selection=[
            # Authentication
            ('LOGIN', 'Login'),
            ('LOGOUT', 'Logout'),
            ('LOGIN_FAILED', 'Login Failed'),
            
            # CRUD Operations
            ('CREATE', 'Create'),
            ('UPDATE', 'Update'),
            ('DELETE', 'Delete'),
            ('READ', 'Read'),
            
            # Business Actions
            ('APPROVE', 'Approve'),
            ('REJECT', 'Reject'),
            ('ASSIGN', 'Assign'),
            ('UNASSIGN', 'Unassign'),
            ('SUBMIT', 'Submit'),
            ('CANCEL', 'Cancel'),
            ('COMPLETE', 'Complete'),
            
            # System Actions
            ('EXPORT', 'Export'),
            ('IMPORT', 'Import'),
            ('BACKUP', 'Backup'),
            ('RESTORE', 'Restore'),
            
            # Security Actions
            ('PERMISSION_CHANGE', 'Permission Change'),
            ('ROLE_CHANGE', 'Role Change'),
            ('PASSWORD_CHANGE', 'Password Change'),
            ('ACCESS_DENIED', 'Access Denied'),
        ],
        string='Action',
        required=True,
        readonly=True,
        index=True,
    )

    action_category = fields.Selection(
        selection=[
            ('authentication', 'Authentication'),
            ('data_management', 'Data Management'),
            ('business_process', 'Business Process'),
            ('system_admin', 'System Administration'),
            ('security', 'Security'),
        ],
        string='Category',
        compute='_compute_action_category',
        store=True,
        index=True,
    )

    # ── Resource Information ──
    resource_model = fields.Char(
        string='Resource Model',
        readonly=True,
        index=True,
        help='Technical model name (e.g., messob.fms.trip).',
    )

    resource_name = fields.Char(
        string='Resource Type',
        readonly=True,
        index=True,
        help='Human-readable resource type (e.g., Trip Request).',
    )

    resource_id = fields.Integer(
        string='Resource ID',
        readonly=True,
        index=True,
        help='ID of the affected record.',
    )

    resource_display_name = fields.Char(
        string='Resource Name',
        readonly=True,
        help='Display name of the affected record.',
    )

    # ── Change Details ──
    description = fields.Text(
        string='Description',
        readonly=True,
        help='Human-readable description of the action.',
    )

    old_values = fields.Text(
        string='Old Values',
        readonly=True,
        help='JSON representation of values before change.',
    )

    new_values = fields.Text(
        string='New Values',
        readonly=True,
        help='JSON representation of values after change.',
    )

    changed_fields = fields.Text(
        string='Changed Fields',
        readonly=True,
        help='List of fields that were modified.',
    )

    # ── Status and Metadata ──
    severity = fields.Selection(
        selection=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('critical', 'Critical'),
        ],
        string='Severity',
        default='medium',
        readonly=True,
        index=True,
    )

    success = fields.Boolean(
        string='Success',
        default=True,
        readonly=True,
        index=True,
        help='Whether the action was successful.',
    )

    error_message = fields.Text(
        string='Error Message',
        readonly=True,
        help='Error message if action failed.',
    )

    # ── Computed Fields ──
    action_display = fields.Char(
        string='Action Display',
        compute='_compute_action_display',
        store=True,
    )

    duration_ms = fields.Integer(
        string='Duration (ms)',
        readonly=True,
        help='Time taken to complete the action in milliseconds.',
    )

    @api.depends('action')
    def _compute_action_category(self):
        category_mapping = {
            'LOGIN': 'authentication',
            'LOGOUT': 'authentication',
            'LOGIN_FAILED': 'authentication',
            'CREATE': 'data_management',
            'UPDATE': 'data_management',
            'DELETE': 'data_management',
            'READ': 'data_management',
            'APPROVE': 'business_process',
            'REJECT': 'business_process',
            'ASSIGN': 'business_process',
            'UNASSIGN': 'business_process',
            'SUBMIT': 'business_process',
            'CANCEL': 'business_process',
            'COMPLETE': 'business_process',
            'EXPORT': 'system_admin',
            'IMPORT': 'system_admin',
            'BACKUP': 'system_admin',
            'RESTORE': 'system_admin',
            'PERMISSION_CHANGE': 'security',
            'ROLE_CHANGE': 'security',
            'PASSWORD_CHANGE': 'security',
            'ACCESS_DENIED': 'security',
        }
        
        for record in self:
            record.action_category = category_mapping.get(record.action, 'data_management')

    @api.depends('action', 'resource_name', 'user_id', 'success')
    def _compute_action_display(self):
        for record in self:
            user_name = record.user_id.name if record.user_id else 'System'
            action_name = dict(record._fields['action'].selection).get(record.action, record.action)
            resource_info = f" {record.resource_name}" if record.resource_name else ""
            status = "✓" if record.success else "✗"
            
            record.action_display = f"{status} {user_name}: {action_name}{resource_info}"

    # ── Security ──
    @api.model
    def create(self, vals):
        """Override create to ensure audit logs are immutable after creation."""
        return super().create(vals)

    def write(self, vals):
        """Prevent modification of audit logs."""
        raise UserError(_('Audit logs cannot be modified for data integrity.'))

    def unlink(self):
        """Prevent deletion of audit logs except by system cleanup."""
        if not self.env.context.get('audit_cleanup', False):
            raise UserError(_('Audit logs cannot be deleted manually. Use retention policy cleanup.'))
        return super().unlink()

    # ── Audit Logging Methods ──
    @api.model
    def log_action(self, action, resource_model=None, resource_id=None, 
                   description=None, old_values=None, new_values=None, 
                   severity='medium', success=True, error_message=None,
                   user_id=None, session_id=None, ip_address=None, user_agent=None):
        """
        Create an audit log entry.
        
        Args:
            action (str): Action type from selection
            resource_model (str): Model name of affected resource
            resource_id (int): ID of affected record
            description (str): Human-readable description
            old_values (dict): Values before change
            new_values (dict): Values after change
            severity (str): Severity level
            success (bool): Whether action was successful
            error_message (str): Error message if failed
            user_id (int): User performing action (defaults to current user)
            session_id (str): Session identifier
            ip_address (str): Client IP address
            user_agent (str): Client user agent
        """
        try:
            # Get resource information
            resource_name = None
            resource_display_name = None
            
            if resource_model and resource_id:
                try:
                    resource_obj = self.env[resource_model].browse(resource_id)
                    if resource_obj.exists():
                        resource_name = resource_obj._description or resource_model
                        resource_display_name = resource_obj.display_name
                except Exception:
                    resource_name = resource_model

            # Prepare values
            vals = {
                'action': action,
                'resource_model': resource_model,
                'resource_name': resource_name,
                'resource_id': resource_id,
                'resource_display_name': resource_display_name,
                'description': description,
                'severity': severity,
                'success': success,
                'error_message': error_message,
                'session_id': session_id,
                'ip_address': ip_address,
                'user_agent': user_agent,
            }

            # Set user
            if user_id:
                vals['user_id'] = user_id
            elif self.env.user:
                vals['user_id'] = self.env.user.id

            # Handle old/new values
            if old_values:
                vals['old_values'] = json.dumps(old_values, default=str)
            if new_values:
                vals['new_values'] = json.dumps(new_values, default=str)
            
            # Calculate changed fields
            if old_values and new_values:
                changed = []
                for key in set(old_values.keys()) | set(new_values.keys()):
                    if old_values.get(key) != new_values.get(key):
                        changed.append(key)
                vals['changed_fields'] = ', '.join(changed)

            # Create log entry
            self.sudo().create(vals)
            
        except Exception as e:
            _logger.error(f"Failed to create audit log: {e}")

    @api.model
    def log_login(self, user_id, success=True, ip_address=None, user_agent=None, error_message=None):
        """Log user login attempt."""
        action = 'LOGIN' if success else 'LOGIN_FAILED'
        severity = 'medium' if success else 'high'
        
        user = self.env['res.users'].browse(user_id) if user_id else None
        description = f"User login {'successful' if success else 'failed'}"
        if user:
            description += f" for {user.name} ({user.login})"
        
        self.log_action(
            action=action,
            description=description,
            severity=severity,
            success=success,
            error_message=error_message,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )

    @api.model
    def log_logout(self, user_id, ip_address=None):
        """Log user logout."""
        user = self.env['res.users'].browse(user_id) if user_id else None
        description = f"User logout"
        if user:
            description += f" for {user.name} ({user.login})"
        
        self.log_action(
            action='LOGOUT',
            description=description,
            severity='low',
            user_id=user_id,
            ip_address=ip_address
        )

    @api.model
    def log_data_change(self, action, model, record_id, old_vals=None, new_vals=None, description=None):
        """Log data changes (create, update, delete)."""
        severity_map = {
            'CREATE': 'medium',
            'UPDATE': 'low',
            'DELETE': 'high'
        }
        
        self.log_action(
            action=action,
            resource_model=model,
            resource_id=record_id,
            description=description,
            old_values=old_vals,
            new_values=new_vals,
            severity=severity_map.get(action, 'medium')
        )

    @api.model
    def log_business_action(self, action, model, record_id, description=None, severity='medium'):
        """Log business process actions (approve, reject, assign, etc.)."""
        self.log_action(
            action=action,
            resource_model=model,
            resource_id=record_id,
            description=description,
            severity=severity
        )

    # ── Retention Policy ──
    @api.model
    def _cron_cleanup_old_logs(self):
        """
        Cron job to clean up old audit logs based on retention policy.
        Keeps logs for different periods based on severity:
        - Critical: 7 years
        - High: 3 years  
        - Medium: 1 year
        - Low: 6 months
        """
        _logger.info("Starting audit log cleanup")
        
        now = datetime.now()
        retention_periods = {
            'critical': timedelta(days=7*365),  # 7 years
            'high': timedelta(days=3*365),      # 3 years
            'medium': timedelta(days=365),      # 1 year
            'low': timedelta(days=180),         # 6 months
        }
        
        total_deleted = 0
        
        for severity, period in retention_periods.items():
            cutoff_date = now - period
            
            old_logs = self.search([
                ('severity', '=', severity),
                ('timestamp', '<', cutoff_date)
            ])
            
            if old_logs:
                count = len(old_logs)
                old_logs.with_context(audit_cleanup=True).unlink()
                total_deleted += count
                _logger.info(f"Deleted {count} {severity} audit logs older than {period.days} days")
        
        _logger.info(f"Audit log cleanup completed. Total deleted: {total_deleted}")
        return total_deleted

    # ── Statistics and Reports ──
    @api.model
    def get_audit_statistics(self, days=30):
        """Get audit statistics for the specified number of days."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        domain = [('timestamp', '>=', cutoff_date)]
        
        stats = {
            'total_actions': self.search_count(domain),
            'failed_actions': self.search_count(domain + [('success', '=', False)]),
            'by_action': {},
            'by_user': {},
            'by_severity': {},
            'by_category': {},
        }
        
        # Actions breakdown
        for action_tuple in self._fields['action'].selection:
            action_code, action_name = action_tuple
            count = self.search_count(domain + [('action', '=', action_code)])
            if count > 0:
                stats['by_action'][action_name] = count
        
        # Users breakdown
        user_data = self.read_group(
            domain, ['user_id'], ['user_id']
        )
        for item in user_data:
            user_name = item['user_id'][1] if item['user_id'] else 'System'
            stats['by_user'][user_name] = item['user_id_count']
        
        # Severity breakdown
        severity_data = self.read_group(
            domain, ['severity'], ['severity']
        )
        for item in severity_data:
            stats['by_severity'][item['severity']] = item['severity_count']
        
        # Category breakdown
        category_data = self.read_group(
            domain, ['action_category'], ['action_category']
        )
        for item in category_data:
            stats['by_category'][item['action_category']] = item['action_category_count']
        
        return stats

    def action_view_resource(self):
        """Open the resource record referenced in this audit log entry."""
        self.ensure_one()
        
        if not self.resource_model or not self.resource_id:
            raise UserError(_('No resource linked to this audit log entry.'))
        
        try:
            # Check if model exists
            if self.resource_model not in self.env:
                raise UserError(_('Model %s no longer exists.') % self.resource_model)
            
            # Check if record exists
            resource = self.env[self.resource_model].browse(self.resource_id)
            if not resource.exists():
                raise UserError(_('The referenced record no longer exists.'))
            
            # Get model description
            model_obj = self.env['ir.model'].search([('model', '=', self.resource_model)], limit=1)
            model_name = model_obj.name if model_obj else self.resource_model
            
            return {
                'type': 'ir.actions.act_window',
                'name': model_name,
                'res_model': self.resource_model,
                'res_id': self.resource_id,
                'view_mode': 'form',
                'target': 'current',
            }
        except Exception as e:
            raise UserError(_('Cannot open resource: %s') % str(e))


# ── Model Extensions for Automatic Logging ──
class BaseModelAuditMixin(models.AbstractModel):
    """
    Mixin to add automatic audit logging to models.
    """
    _name = 'base.model.audit.mixin'
    _description = 'Audit Logging Mixin'

    def _serialize_value(self, field_name, value):
        """Convert field value to JSON-serializable format."""
        try:
            field = self._fields.get(field_name)
            if not field:
                return str(value)
            
            # Handle Many2one fields
            if field.type == 'many2one' and value:
                if hasattr(value, 'display_name'):
                    return {'id': value.id, 'name': value.display_name}
                return value.id if hasattr(value, 'id') else value
            
            # Handle Many2many and One2many fields
            elif field.type in ('many2many', 'one2many') and value:
                if hasattr(value, 'ids'):
                    return value.ids
                return list(value) if value else []
            
            # Handle date/datetime fields
            elif field.type in ('date', 'datetime') and value:
                return str(value)
            
            # Handle binary fields
            elif field.type == 'binary':
                return '<binary data>' if value else None
            
            # Handle other types
            else:
                return value
        except Exception:
            return str(value)

    @api.model
    def create(self, vals):
        """Override create to log record creation."""
        record = super().create(vals)
        
        try:
            # Serialize values for logging
            serialized_vals = {}
            for key, value in vals.items():
                serialized_vals[key] = self._serialize_value(key, value)
            
            # Log creation
            self.env['messob.fms.audit.log'].sudo().log_data_change(
                action='CREATE',
                model=self._name,
                record_id=record.id,
                new_vals=serialized_vals,
                description=f"Created {self._description or self._name}: {record.display_name}"
            )
        except Exception as e:
            _logger.warning(f"Failed to log CREATE for {self._name}: {e}")
        
        return record

    def write(self, vals):
        """Override write to log record updates."""
        if not vals:
            return True
        
        # Get old values for changed records
        old_values = {}
        for record in self:
            old_values[record.id] = {}
            for field in vals.keys():
                if hasattr(record, field):
                    old_values[record.id][field] = record._serialize_value(field, getattr(record, field))
        
        # Perform update
        result = super().write(vals)
        
        # Log updates
        try:
            for record in self:
                old_vals = old_values.get(record.id, {})
                
                # Serialize new values
                new_vals = {}
                for key, value in vals.items():
                    new_vals[key] = record._serialize_value(key, value)
                
                self.env['messob.fms.audit.log'].sudo().log_data_change(
                    action='UPDATE',
                    model=self._name,
                    record_id=record.id,
                    old_vals=old_vals,
                    new_vals=new_vals,
                    description=f"Updated {self._description or self._name}: {record.display_name}"
                )
        except Exception as e:
            _logger.warning(f"Failed to log UPDATE for {self._name}: {e}")
        
        return result

    def unlink(self):
        """Override unlink to log record deletion."""
        # Store info before deletion
        records_info = []
        for record in self:
            try:
                # Serialize all stored fields
                serialized_values = {}
                for field_name, field in record._fields.items():
                    if field.store and hasattr(record, field_name):
                        try:
                            value = getattr(record, field_name)
                            serialized_values[field_name] = record._serialize_value(field_name, value)
                        except Exception:
                            pass
                
                records_info.append({
                    'id': record.id,
                    'name': record.display_name,
                    'values': serialized_values
                })
            except Exception as e:
                _logger.warning(f"Failed to serialize record for deletion log: {e}")
        
        # Perform deletion
        result = super().unlink()
        
        # Log deletions
        try:
            for info in records_info:
                self.env['messob.fms.audit.log'].sudo().log_data_change(
                    action='DELETE',
                    model=self._name,
                    record_id=info['id'],
                    old_vals=info['values'],
                    description=f"Deleted {self._description or self._name}: {info['name']}"
                )
        except Exception as e:
            _logger.warning(f"Failed to log DELETE for {self._name}: {e}")
        
        return result
