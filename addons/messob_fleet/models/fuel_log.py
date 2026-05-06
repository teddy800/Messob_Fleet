# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.fuel.log
# Description: Fuel transaction log entered by the driver (FR-4.2, SRS §3.4).
#
# Driver fills this in when refuelling:
#   - Fuel station name
#   - Litres added
#   - Cost
#   - Odometer reading
#   - Date
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsFuelLog(models.Model):
    """
    Records a single fuel refill event for a vehicle.
    Linked to the trip that was active at the time.
    """

    _name = 'messob.fms.fuel.log'
    _description = 'MESSOB FMS - Fuel Log'
    _order = 'date desc'
    _rec_name = 'station_name'

    # ── Link to the trip ──
    trip_id = fields.Many2one(
        comodel_name='messob.fms.trip',
        string='Trip',
        required=True,
        ondelete='cascade',
        help='The active trip during which this fuel was added.',
    )

    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        related='trip_id.assigned_vehicle_id',
        store=True,
        readonly=True,
    )

    driver_id = fields.Many2one(
        comodel_name='res.partner',
        string='Driver',
        related='trip_id.assigned_driver_id',
        store=True,
        readonly=True,
    )

    # ── Fuel details ──
    station_name = fields.Char(
        string='Fuel Station Name',
        required=True,
        help='Name or location of the fuel station.',
    )

    liters = fields.Float(
        string='Liters',
        required=True,
        digits=(10, 2),
        help='Volume of fuel added in litres.',
    )

    price = fields.Float(
        string='Price (Total)',
        required=True,
        digits=(10, 2),
        help='Total cost of the fuel transaction.',
    )

    odometer = fields.Integer(
        string='Odometer (km)',
        required=True,
        help='Vehicle odometer reading at time of refuel.',
    )

    date = fields.Date(
        string='Date',
        required=True,
        default=fields.Date.today,
    )

    # ── Computed ──
    price_per_liter = fields.Float(
        string='Price / Liter',
        compute='_compute_price_per_liter',
        store=True,
        digits=(10, 2),
    )

    @api.depends('price', 'liters')
    def _compute_price_per_liter(self):
        for rec in self:
            rec.price_per_liter = (
                rec.price / rec.liters if rec.liters > 0 else 0.0
            )

    # ── Constraints ──
    @api.constrains('liters')
    def _check_liters(self):
        for rec in self:
            if rec.liters <= 0:
                raise UserError(_('Liters must be greater than zero.'))

    @api.constrains('price')
    def _check_price(self):
        for rec in self:
            if rec.price <= 0:
                raise UserError(_('Price must be greater than zero.'))
