from odoo import models, fields, api # type: ignore

class AuditLog(models.Model):
    _name = 'messob.audit.log'
    _description = 'System Audit Log'
    _order = 'timestamp desc'

    timestamp = fields.Datetime(string='Timestamp', default=fields.Datetime.now, required=True, readonly=True)
    user_id = fields.Many2one('res.users', string='User', default=lambda self: self.env.user, required=True, readonly=True)
    action_type = fields.Selection([
        ('login', 'User Login'),
        ('approve', 'Request Approved'),
        ('reject', 'Request Rejected'),
        ('role_assign', 'Role Assigned/Changed'),
        ('vehicle_data', 'Vehicle Data Modified'),
        ('system', 'System Action')
    ], string='Action Type', required=True, readonly=True)
    
    res_model = fields.Char(string='Related Model', readonly=True)
    res_id = fields.Integer(string='Record ID', readonly=True)
    details = fields.Text(string='Action Details', readonly=True)

    @api.model
    def log_action(self, action_type, details, res_model=False, res_id=False):
        """Helper to create an audit log from anywhere"""
        self.sudo().create({
            'action_type': action_type,
            'details': details,
            'res_model': res_model,
            'res_id': res_id,
            'user_id': self.env.uid
        })
