from odoo import models, fields, api # type: ignore

class MessobDriver(models.Model):
    _name = 'messob.driver'
    _description = 'Fleet Driver Profile'
    
    name = fields.Char(string="Driver Name", required=True)
    employee_id = fields.Many2one('hr.employee', string="Related Employee", required=True)
    license_no = fields.Char(string="License Number", required=True)
    license_expiry = fields.Date(string="License Expiry Date", required=True)
    is_on_duty = fields.Boolean(string="On Duty", default=True)
