from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import ValidationError # type: ignore


class MessobTripWizard(models.TransientModel):
    _name = 'messob.trip.wizard'
    _description = 'Trip Request Wizard'

    # Step control
    step = fields.Integer(default=1)

    # Step 1
    purpose = fields.Text(string='Purpose', required=True)

    # Step 2 (✅ FIXED MODEL)
    category_id = fields.Many2one(
        'fleet.vehicle.model.category',
        string='Vehicle Category',
        required=True
    )

    # Step 3
    start_datetime = fields.Datetime(string='Start Date/Time', required=True)
    end_datetime = fields.Datetime(string='End Date/Time', required=True)

    # Step 4
    pickup_location = fields.Char(string='Pickup Address', required=True)
    destination_location = fields.Char(string='Destination Address', required=True)

    # -------------------------
    # DEFAULT VALUES HANDLING
    # -------------------------
    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)

        category_model = self.env['fleet.vehicle.model.category']

        # Clean invalid default
        if 'category_id' in defaults:
            cat_id = defaults.get('category_id')
            if not cat_id or not category_model.browse(cat_id).exists():
                defaults.pop('category_id', None)

        # Set first category if empty
        if 'category_id' in fields_list and not defaults.get('category_id'):
            first_cat = category_model.search([], limit=1)
            if first_cat:
                defaults['category_id'] = first_cat.id

        return defaults

    # -------------------------
    # NAVIGATION BUTTONS
    # -------------------------
    def action_next(self):
        for record in self:
            if record.step < 4:
                record.step += 1

        return self._reload_wizard()

    def action_previous(self):
        for record in self:
            if record.step > 1:
                record.step -= 1

        return self._reload_wizard()

    def _reload_wizard(self):
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
            'context': self.env.context,
        }

    # -------------------------
    # VALIDATION
    # -------------------------
    def _validate_all_steps(self):
        for record in self:
            if not record.purpose:
                raise ValidationError(_('Purpose is required!'))

            if not record.category_id:
                raise ValidationError(_('Vehicle Category is required!'))

            if not record.start_datetime or not record.end_datetime:
                raise ValidationError(_('Start and End time are required!'))

            if record.start_datetime >= record.end_datetime:
                raise ValidationError(_('End time must be after Start time!'))

            if not record.pickup_location or not record.destination_location:
                raise ValidationError(_('Pickup and Destination are required!'))

    # -------------------------
    # SUBMIT ACTION
    # -------------------------
    def action_submit(self):
        self._validate_all_steps()

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