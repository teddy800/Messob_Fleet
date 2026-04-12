from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore

class MessobFmsTrip(models.Model):
    # ⚠️ CRITICAL: This _name generates the XML ID: model_messob_fms_trip
    _name = 'messob.fms.trip'
    _description = 'Staff Vehicle Trip Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(string='Request ID', readonly=True, copy=False, default='New')
    requester_id = fields.Many2one('res.partner', string='Requested By', 
                                   default=lambda self: self.env.user.partner_id, required=True)
    purpose = fields.Text(string='Purpose', required=True)
    vehicle_category = fields.Selection([
        ('sedan', 'Sedan'), ('suv', 'SUV'), ('pickup', 'Pickup'),
        ('bus', 'Bus'), ('minibus', 'Mini-Bus'), ('mesobus', 'MesoBus')
    ], string='Select Vehicle', required=True)
    start_dt = fields.Datetime(string='Start Time', required=True)
    end_dt = fields.Datetime(string='Destination Time', required=True)
    pickup = fields.Char(string='Start Place')
    destination = fields.Char(string='Destination Place')
    
    state = fields.Selection([
        ('draft', 'Draft'), ('pending', 'Pending'), 
        ('approved', 'Approved'), ('rejected', 'Rejected'),
        ('in_progress', 'In Progress'), ('completed', 'Completed'), ('closed', 'Closed')
    ], default='draft', tracking=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('messob.fms.trip') or 'New'
        return super().create(vals_list)

    @api.constrains('start_dt', 'end_dt')
    def _check_dates(self):
        for rec in self:
            if rec.start_dt and rec.end_dt and rec.start_dt >= rec.end_dt:
                raise UserError(_('Destination time must be after start time.'))

    def action_submit(self):
        self.write({'state': 'pending'})
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Success'),
                'message': _('Request is send successfully!'),
                'type': 'success',
                'sticky': False,
            }
        }

    def action_cancel(self):
        if any(rec.state != 'pending' for rec in self):
            raise UserError(_('You can only cancel requests in "Pending" status.'))
        self.write({'state': 'draft'})