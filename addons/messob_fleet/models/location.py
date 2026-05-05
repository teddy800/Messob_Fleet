# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.location
# Description: Pre-defined pickup/destination locations for Addis Ababa.
#              Used for autocomplete in trip request wizard (FR-1.1 Step 3).
#
# Admin can add/edit locations via Configuration menu.
# Staff selects from this list when creating a request.
# ---------------------------------------------------------------------------

from odoo import models, fields


class MessobFmsLocation(models.Model):
    """Named locations used as pickup/destination points."""

    _name = 'messob.fms.location'
    _description = 'MESSOB FMS - Location'
    _order = 'name'
    _rec_name = 'display_name_custom'

    name = fields.Char(
        string='Location Name',
        required=True,
        help='e.g., Bole-Bulbula',
    )

    area = fields.Char(
        string='Area / Sub-city',
        help='e.g., Bole, Kirkos, Yeka',
    )

    city = fields.Char(
        string='City',
        default='Addis Ababa',
    )

    display_name_custom = fields.Char(
        string='Full Location',
        compute='_compute_display_name_custom',
        store=True,
    )

    latitude = fields.Float(
        string='Latitude',
        digits=(10, 7),
        help='GPS latitude for map display.',
    )

    longitude = fields.Float(
        string='Longitude',
        digits=(10, 7),
        help='GPS longitude for map display.',
    )

    active = fields.Boolean(default=True)

    def _compute_display_name_custom(self):
        for rec in self:
            parts = [rec.city, rec.area, rec.name]
            rec.display_name_custom = ' / '.join(p for p in parts if p)
