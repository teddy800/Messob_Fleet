# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Wizard: messob.fms.fuel.log.wizard
# Description: Quick fuel fill entry form for drivers (FR-4.2).
#              Opened via the "Full Change" button on the driver's trip list.
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsFuelLogWizard(models.TransientModel):
    """
    Transient wizard for a driver to log a fuel refill.
    Creates a permanent messob.fms.fuel.log record on submit.
    """

    _name = 'messob.fms.fuel.log.wizard'
    _description = 'MESSOB FMS - Fuel Log Wizard'

    trip_id = fields.Many2one(
        comodel_name='messob.fms.trip',
        string='Trip',
        required=True,
        readonly=True,
    )

    # Display-only info
    vehicle_info = fields.Char(
        string='Vehicle',
        compute='_compute_vehicle_info',
        store=False,
    )

    @api.depends('trip_id')
    def _compute_vehicle_info(self):
        for rec in self:
            rec.vehicle_info = (
                rec.trip_id.assigned_vehicle_id.name
                if rec.trip_id.assigned_vehicle_id else '—'
            )

    # Fuel details
    station_name = fields.Char(
        string='Fuel Station Name',
        required=True,
    )

    liters = fields.Float(
        string='Liter',
        required=True,
        default=1.0,
        digits=(10, 2),
    )

    price = fields.Float(
        string='Price',
        required=True,
        default=10.0,
        digits=(10, 2),
    )

    odometer = fields.Integer(
        string='Odometer (km)',
        required=True,
        default=1200,
        help='Current odometer reading on the vehicle.',
    )

    date = fields.Date(
        string='Date',
        required=True,
        default=fields.Date.today,
    )

    # =========================================================================
    # SUBMIT
    # =========================================================================

    def action_save_fuel_log(self):
        """Create the fuel log record and close the wizard."""
        self.ensure_one()
        if self.liters <= 0:
            raise UserError(_('Liters must be greater than zero.'))
        if self.price <= 0:
            raise UserError(_('Price must be greater than zero.'))

        self.env['messob.fms.fuel.log'].create({
            'trip_id':      self.trip_id.id,
            'station_name': self.station_name,
            'liters':       self.liters,
            'price':        self.price,
            'odometer':     self.odometer,
            'date':         self.date,
        })

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Fuel Logged'),
                'message': _('Fuel fill recorded successfully.'),
                'type': 'success',
                'sticky': False,
                'next': {'type': 'ir.actions.act_window_close'},
            },
        }
