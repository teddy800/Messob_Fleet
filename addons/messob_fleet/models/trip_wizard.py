from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import ValidationError # type: ignore

class MessobTripWizard(models.TransientModel):
    _name = 'messob.trip.wizard'
    _description = 'Trip Request Wizard'

    step = fields.Integer(default=1)
    purpose = fields.Text(string='Purpose', required=True)
    category_id = fields.Many2one('fleet.vehicle.category', string='Vehicle Category', required=True)
    start_datetime = fields.Datetime(string='Start Date/Time', required=True)
    end_datetime = fields.Datetime(string='End Date/Time', required=True)
    pickup_location = fields.Char(string='Pickup Address', required=True)
    destination_location = fields.Char(string='Destination Address', required=True)

    def action_next(self):
        if self.step < 4:
            self.step += 1
        return {'type': 'ir.actions.act_window_close'}  # will reopen with updated step

    def action_previous(self):
        if self.step > 1:
            self.step -= 1
        return {'type': 'ir.actions.act_window_close'}

    def action_submit(self):
        # Validate all fields
        if not (self.purpose and self.category_id and self.start_datetime and
                self.end_datetime and self.pickup_location and self.destination_location):
            raise ValidationError(_('Please fill all steps!'))
        # Create the trip request
        request = self.env['messob.trip.request'].create({
            'purpose': self.purpose,
            'category_id': self.category_id.id,
            'start_datetime': self.start_datetime,
            'end_datetime': self.end_datetime,
            'pickup_location': self.pickup_location,
            'destination_location': self.destination_location,
            'state': 'pending',
        })
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'messob.trip.request',
            'res_id': request.id,
            'view_mode': 'form',
            'target': 'current',
        }