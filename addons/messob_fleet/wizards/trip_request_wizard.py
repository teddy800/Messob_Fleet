# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Wizard: messob.fms.trip.wizard
# Description: 4-step transient wizard for staff to create trip requests.
#              Implements FR-1.1 (SRS §3.1).
#
# Steps:
#   1 - Trip Details  (purpose + vehicle category)
#   2 - Schedule      (start/end datetime)
#   3 - Locations     (pickup + destination)
#   4 - Review        (read-only summary before submit)
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsTripWizard(models.TransientModel):
    """
    4-step wizard that guides a staff member through creating a trip request.

    TransientModel: records are auto-deleted after the session ends.
    The wizard creates a permanent messob.fms.trip record on final submit.
    """

    _name = 'messob.fms.trip.wizard'
    _description = 'MESSOB FMS - Trip Request Wizard (4-Step)'

    # Current active step (1–4)
    step = fields.Integer(string='Step', default=1, required=True)

    # -------------------------------------------------------------------------
    # Step 1: Trip Details
    # -------------------------------------------------------------------------
    purpose = fields.Text(
        string='Purpose / Justification',
        help='Minimum 10 characters. Describe the official reason for the trip.',
    )
    vehicle_category = fields.Selection(
        selection=[
            ('sedan',   'Sedan'),
            ('suv',     'SUV'),
            ('pickup',  'Pickup'),
            ('bus',     'Bus'),
            ('minibus', 'Mini-Bus'),
        ],
        string='Vehicle Category',
        help='Select the type of vehicle required.',
    )

    # -------------------------------------------------------------------------
    # Step 2: Schedule
    # -------------------------------------------------------------------------
    start_dt = fields.Datetime(string='Start Date / Time')
    end_dt = fields.Datetime(string='End Date / Time')

    # -------------------------------------------------------------------------
    # Step 3: Locations
    # -------------------------------------------------------------------------
    pickup = fields.Char(string='Pickup Location')
    pickup_location_id = fields.Many2one(
        comodel_name='messob.fms.location',
        string='Pickup (Select from list)',
    )
    destination = fields.Char(string='Destination')
    destination_location_id = fields.Many2one(
        comodel_name='messob.fms.location',
        string='Destination (Select from list)',
    )

    @api.onchange('pickup_location_id')
    def _onchange_pickup(self):
        if self.pickup_location_id:
            self.pickup = self.pickup_location_id.display_name_custom

    @api.onchange('destination_location_id')
    def _onchange_destination(self):
        if self.destination_location_id:
            self.destination = self.destination_location_id.display_name_custom

    # =========================================================================
    # NAVIGATION ACTIONS
    # =========================================================================

    def action_next(self):
        """Validate current step then advance to the next."""
        self.ensure_one()
        self._validate_step(self.step)
        if self.step < 4:
            self.step += 1
        return self._reopen()

    def action_previous(self):
        """Go back one step without validation."""
        self.ensure_one()
        if self.step > 1:
            self.step -= 1
        return self._reopen()

    # =========================================================================
    # FINAL SUBMIT
    # =========================================================================

    def action_submit(self):
        """
        Step 4 action: validate all fields and create the trip request.
        On success, opens the newly created record in form view.
        """
        self.ensure_one()
        self._validate_all()

        trip = self.env['messob.fms.trip'].create({
            'purpose':          self.purpose,
            'vehicle_category': self.vehicle_category,
            'start_dt':         self.start_dt,
            'end_dt':           self.end_dt,
            'pickup':           self.pickup,
            'destination':      self.destination,
            'state':            'pending',
        })

        # Open the created record so the user can see the confirmation
        return {
            'type':      'ir.actions.act_window',
            'res_model': 'messob.fms.trip',
            'res_id':    trip.id,
            'view_mode': 'form',
            'target':    'current',
        }

    # =========================================================================
    # VALIDATION HELPERS
    # =========================================================================

    def _validate_step(self, step):
        """Run validation rules for the given step number."""
        if step == 1:
            if not self.purpose or len(self.purpose.strip()) < 10:
                raise UserError(_('Purpose must be at least 10 characters.'))
            if not self.vehicle_category:
                raise UserError(_('Please select a vehicle category.'))

        elif step == 2:
            today = fields.Date.today()
            if not self.start_dt:
                raise UserError(_('Please select a start date and time.'))
            if not self.end_dt:
                raise UserError(_('Please select an end date and time.'))
            # Compare date only — today's time is always valid
            if self.start_dt.date() < today:
                raise UserError(
                    _('Start date cannot be in the past. Please select today or a future date.')
                )
            # End must be strictly after start
            if self.end_dt <= self.start_dt:
                raise UserError(
                    _('End Date/Time must be after Start Date/Time.')
                )

        elif step == 3:
            if not self.pickup:
                raise UserError(_('Please enter a pickup location.'))
            if not self.destination:
                raise UserError(_('Please enter a destination.'))

    def _validate_all(self):
        """Full validation before final submission (steps 1–3)."""
        for step in (1, 2, 3):
            self._validate_step(step)

    # =========================================================================
    # PRIVATE HELPER
    # =========================================================================

    def _reopen(self):
        """Return an action that re-opens this wizard in the same dialog."""
        return {
            'type':      'ir.actions.act_window',
            'res_model': self._name,
            'res_id':    self.id,
            'view_mode': 'form',
            'target':    'new',
            'context':   self.env.context,
        }
