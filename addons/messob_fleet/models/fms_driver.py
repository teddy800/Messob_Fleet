# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.driver
# Description: Driver profile managed by Admin (FR-5.2).
#
# Stores: name, license number, phone, status (active/inactive).
# Linked to res.partner for assignment in trip requests.
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class MessobFmsDriver(models.Model):
    """
    Driver master record managed by the Fleet Admin.
    Includes comprehensive audit logging for all driver changes.
    """

    _name = 'messob.fms.driver'
    _description = 'MESSOB FMS - Driver'
    _inherit = ['base.model.audit.mixin']
    _order = 'name'
    _rec_name = 'name'

    name = fields.Char(string='Full Name', required=True)

    license_no = fields.Char(string='License No', required=True)

    license_expiry = fields.Date(string='License Expiry')

    phone = fields.Char(string='Phone')

    is_active = fields.Boolean(
        string='Active',
        default=True,
    )

    status = fields.Selection(
        selection=[
            ('active',   'Active'),
            ('inactive', 'Inactive'),
        ],
        string='Status',
        compute='_compute_status',
        store=True,
    )

    partner_id = fields.Many2one(
        comodel_name='res.partner',
        string='Linked Contact',
        help='res.partner used for trip assignment.',
    )

    notes = fields.Text(string='Notes')

    @api.depends('is_active')
    def _compute_status(self):
        for rec in self:
            rec.status = 'active' if rec.is_active else 'inactive'
