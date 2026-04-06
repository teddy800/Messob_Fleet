from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import ValidationError # type: ignore
from datetime import datetime

class MessobTripRequest(models.Model):
    _name = 'messob.trip.request'
    _description = 'Vehicle Trip Request'
    _order = 'create_date desc'
    _rec_name = 'name'

    name = fields.Char(string='Request ID', readonly=True, default=lambda self: _('New'))
    requester_id = fields.Many2one('res.users', string='Requester', default=lambda self: self.env.user, readonly=True)
    purpose = fields.Text(string='Purpose', required=True)
    category_id = fields.Many2one('fleet.vehicle.category', string='Vehicle Category', required=True)
    start_datetime = fields.Datetime(string='Start Date/Time', required=True)
    end_datetime = fields.Datetime(string='End Date/Time', required=True)
    pickup_location = fields.Char(string='Pickup Address', required=True)
    destination_location = fields.Char(string='Destination Address', required=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], default='draft', string='Status')

    @api.constrains('start_datetime', 'end_datetime')
    def _check_dates(self):
        for rec in self:
            if rec.start_datetime and rec.end_datetime and rec.end_datetime <= rec.start_datetime:
                raise ValidationError(_('End time must be after start time!'))

    @api.model
    def create(self, vals):
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('messob.trip.request') or _('New')
        return super().create(vals)

    def action_submit(self):
        self.state = 'pending'