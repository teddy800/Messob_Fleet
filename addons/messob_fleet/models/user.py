from odoo import models, fields, api  # type: ignore


class MessobDriver(models.Model):
    _name = 'messob.driver'
    _description = 'Fleet Driver Profile'

    name = fields.Char(string="Driver Name", required=True)
    employee_id = fields.Many2one('hr.employee', string="Related Employee", required=True)
    license_no = fields.Char(string="License Number", required=True)
    license_expiry = fields.Date(string="License Expiry Date", required=True)
    is_on_duty = fields.Boolean(string="On Duty", default=True)


class ResUsers(models.Model):
    _inherit = 'res.users'

    @api.model
    def authenticate(self, db, login, password, user_agent_env):
        """Override authenticate (stable across Odoo 17/18) to audit logins."""
        uid = super().authenticate(db, login, password, user_agent_env)
        if uid:
            try:
                self.env['messob.audit.log'].sudo().log_action(
                    'login',
                    f'User {login} logged in',
                    res_model='res.users',
                    res_id=uid,
                )
            except Exception:
                pass  # never block login due to audit failure
        return uid

    def write(self, vals):
        """Audit role assignment changes."""
        res = super().write(vals)
        if 'groups_id' in vals:
            for user in self:
                try:
                    self.env['messob.audit.log'].sudo().log_action(
                        'role_assign',
                        f'Role assignments updated for user {user.name}',
                        res_model='res.users',
                        res_id=user.id,
                    )
                except Exception:
                    pass
        return res
