# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Mixin: base.model.audit.mixin
# Description: Automatic audit logging for model changes (FR-5.3)
#
# Features:
#   - Automatic logging of create, write, unlink operations
#   - Field-level change tracking
#   - Integration with messob.fms.audit.log
# ---------------------------------------------------------------------------

from odoo import models, api, _
import json


class BaseModelAuditMixin(models.AbstractModel):
    """
    Mixin to automatically log CRUD operations to audit log.
    
    Usage:
        class MyModel(models.Model):
            _name = 'my.model'
            _inherit = ['base.model.audit.mixin']
    
    This will automatically log all create, write, and unlink operations.
    """

    _name = 'base.model.audit.mixin'
    _description = 'Audit Logging Mixin'

    @api.model_create_multi
    def create(self, vals_list):
        """Override create to log record creation."""
        records = super(BaseModelAuditMixin, self).create(vals_list)
        
        # Log creation for each record
        for record in records:
            self._log_audit_action('CREATE', record, vals_list[0] if vals_list else {})
        
        return records

    def write(self, vals):
        """Override write to log record updates."""
        # Capture old values before update
        old_values = {}
        for record in self:
            old_values[record.id] = {
                field: record[field] for field in vals.keys() if field in record._fields
            }
        
        # Perform the write
        result = super(BaseModelAuditMixin, self).write(vals)
        
        # Log changes for each record
        for record in self:
            changes = self._compute_field_changes(old_values.get(record.id, {}), vals, record)
            if changes:
                self._log_audit_action('UPDATE', record, changes)
        
        return result

    def unlink(self):
        """Override unlink to log record deletion."""
        # Log deletion before actually deleting
        for record in self:
            self._log_audit_action('DELETE', record, {
                'deleted_record': record.display_name,
                'deleted_id': record.id,
            })
        
        return super(BaseModelAuditMixin, self).unlink()

    def _log_audit_action(self, action, record, data):
        """
        Create audit log entry.
        
        Args:
            action (str): Action type (CREATE, UPDATE, DELETE)
            record (recordset): The affected record
            data (dict): Changed data
        """
        try:
            # Skip logging for audit log model itself to prevent recursion
            if record._name == 'messob.fms.audit.log':
                return
            
            # Skip if audit log model doesn't exist (during module installation)
            if 'messob.fms.audit.log' not in self.env:
                return
            
            AuditLog = self.env['messob.fms.audit.log'].sudo()
            
            # Prepare change details
            change_details = self._format_change_details(data, record)
            
            # Determine severity based on action and model
            severity = self._determine_severity(action, record._name)
            
            # Create audit log entry
            AuditLog.create({
                'action': action,
                'action_category': 'data_management',
                'resource_model': record._name,
                'resource_name': record._description or record._name,
                'resource_id': record.id,
                'resource_display_name': record.display_name,
                'description': self._generate_description(action, record, data),
                'change_details': change_details,
                'severity': severity,
            })
        
        except Exception as e:
            # Don't fail the operation if audit logging fails
            import logging
            _logger = logging.getLogger(__name__)
            _logger.warning(f"Failed to create audit log: {e}")

    def _compute_field_changes(self, old_values, new_values, record):
        """
        Compute field-level changes.
        
        Args:
            old_values (dict): Old field values
            new_values (dict): New field values
            record (recordset): The record being updated
            
        Returns:
            dict: Changed fields with old and new values
        """
        changes = {}
        
        for field_name, new_value in new_values.items():
            if field_name not in record._fields:
                continue
            
            old_value = old_values.get(field_name)
            
            # Skip if value hasn't changed
            if old_value == new_value:
                continue
            
            # Format values for display
            field = record._fields[field_name]
            changes[field_name] = {
                'field_label': field.string,
                'old_value': self._format_field_value(old_value, field),
                'new_value': self._format_field_value(new_value, field),
            }
        
        return changes

    def _format_field_value(self, value, field):
        """Format field value for audit log display."""
        if value is None or value is False:
            return 'Empty'
        
        # Handle Many2one fields
        if field.type == 'many2one':
            if isinstance(value, models.BaseModel):
                return value.display_name
            return str(value)
        
        # Handle Many2many and One2many fields
        if field.type in ('many2many', 'one2many'):
            if isinstance(value, models.BaseModel):
                return ', '.join(value.mapped('display_name'))
            return str(value)
        
        # Handle Selection fields
        if field.type == 'selection':
            selection_dict = dict(field.selection)
            return selection_dict.get(value, str(value))
        
        # Handle Date/Datetime fields
        if field.type in ('date', 'datetime'):
            if hasattr(value, 'strftime'):
                return value.strftime('%Y-%m-%d %H:%M:%S' if field.type == 'datetime' else '%Y-%m-%d')
            return str(value)
        
        # Default: convert to string
        return str(value)

    def _format_change_details(self, data, record):
        """Format change details as JSON string."""
        try:
            # Convert data to JSON-serializable format
            serializable_data = {}
            for key, value in data.items():
                if isinstance(value, models.BaseModel):
                    serializable_data[key] = value.display_name
                elif isinstance(value, (list, tuple)):
                    serializable_data[key] = [str(v) for v in value]
                elif isinstance(value, dict):
                    serializable_data[key] = {k: str(v) for k, v in value.items()}
                else:
                    serializable_data[key] = str(value)
            
            return json.dumps(serializable_data, indent=2)
        except Exception:
            return str(data)

    def _generate_description(self, action, record, data):
        """Generate human-readable description of the action."""
        action_labels = {
            'CREATE': 'Created',
            'UPDATE': 'Updated',
            'DELETE': 'Deleted',
        }
        
        action_label = action_labels.get(action, action)
        model_name = record._description or record._name
        
        if action == 'CREATE':
            return f"{action_label} {model_name}: {record.display_name}"
        elif action == 'UPDATE':
            changed_fields = ', '.join(data.keys()) if isinstance(data, dict) else 'multiple fields'
            return f"{action_label} {model_name} {record.display_name}: {changed_fields}"
        elif action == 'DELETE':
            return f"{action_label} {model_name}: {data.get('deleted_record', record.display_name)}"
        
        return f"{action_label} {model_name}: {record.display_name}"

    def _determine_severity(self, action, model_name):
        """Determine severity level based on action and model."""
        # Critical models
        critical_models = [
            'res.users',
            'res.groups',
            'ir.model.access',
            'ir.rule',
        ]
        
        # High-priority models
        high_priority_models = [
            'messob.fms.trip',
            'messob.fms.driver',
            'fleet.vehicle',
        ]
        
        if action == 'DELETE':
            return 'critical' if model_name in critical_models else 'high'
        
        if model_name in critical_models:
            return 'critical'
        
        if model_name in high_priority_models:
            return 'high' if action == 'CREATE' else 'medium'
        
        return 'low'
