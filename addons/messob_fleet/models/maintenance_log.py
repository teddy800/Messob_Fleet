# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.maintenance.log
# Description: Repair & Maintenance log entered by the Mechanic (FR-4.4).
#
# Mechanic can:
#   - Log repair/service activities per vehicle
#   - Record date, service type, cost, service provider, notes
#   - Track vehicle status: active / inactive / disposed
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import UserError


class MessobFmsMaintenanceLog(models.Model):
    """
    A single repair or maintenance event for a vehicle.
    Linked to the fleet.vehicle record.
    Includes comprehensive audit logging for all changes.
    """

    _name = 'messob.fms.maintenance.log'
    _description = 'MESSOB FMS - Repair & Maintenance Log'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'base.model.audit.mixin']
    _order = 'date desc'
    _rec_name = 'service_type'

    # ── Vehicle ──
    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        required=True,
        tracking=True,
        help='Vehicle that was serviced.',
    )

    vehicle_state = fields.Selection(
        selection=[
            ('active',   'Active'),
            ('inactive', 'Inactive'),
            ('disposed', 'Disposed'),
        ],
        string='Vehicle State',
        default='active',
        required=True,
        tracking=True,
        help='Current operational state of the vehicle.',
    )

    # ── Date section ──
    date = fields.Date(
        string='Service Date',
        required=True,
        default=fields.Date.today,
        tracking=True,
    )

    next_service_date = fields.Date(
        string='Next Service Date',
        help='Scheduled date for the next maintenance.',
    )

    next_service_odometer = fields.Integer(
        string='Next Service Odometer (km)',
        help='Odometer reading at which next service is due.',
    )

    next_service_type = fields.Selection(
        selection=[
            ('full_change',     'Full Change (Oil & Filter)'),
            ('brake',           'Brake Service'),
            ('tire',            'Tire Replacement'),
            ('engine',          'Engine Repair'),
            ('transmission',    'Transmission Service'),
            ('electrical',      'Electrical Repair'),
            ('body',            'Body & Paint'),
            ('inspection',      'General Inspection'),
            ('other',           'Other'),
        ],
        string='Next Service Type',
        tracking=True,
        help='Type of service required for the next scheduled maintenance.',
    )

    # ── Service details ──
    service_type = fields.Selection(
        selection=[
            ('full_change',     'Full Change (Oil & Filter)'),
            ('brake',           'Brake Service'),
            ('tire',            'Tire Replacement'),
            ('engine',          'Engine Repair'),
            ('transmission',    'Transmission Service'),
            ('electrical',      'Electrical Repair'),
            ('body',            'Body & Paint'),
            ('inspection',      'General Inspection'),
            ('other',           'Other'),
        ],
        string='Service Type',
        required=True,
        tracking=True,
    )

    description = fields.Text(
        string='Description / Notes',
        help='Details of the repair or maintenance work done.',
    )

    service_provider = fields.Char(
        string='Service Provider',
        help='Name of the garage or technician who performed the service.',
    )

    # ── Cost section ──
    cost = fields.Float(
        string='Cost',
        digits=(10, 2),
        required=True,
        tracking=True,
    )

    parts_cost = fields.Float(
        string='Parts Cost',
        digits=(10, 2),
        help='Cost of spare parts used.',
    )

    labor_cost = fields.Float(
        string='Labor Cost',
        digits=(10, 2),
        help='Cost of labor.',
    )

    total_cost = fields.Float(
        string='Total Cost',
        compute='_compute_total_cost',
        store=False,
        digits=(10, 2),
    )

    @api.depends('cost', 'parts_cost', 'labor_cost')
    def _compute_total_cost(self):
        for rec in self:
            rec.total_cost = rec.cost + rec.parts_cost + rec.labor_cost

    # ── Mechanic section ──
    mechanic_id = fields.Many2one(
        comodel_name='res.partner',
        string='Mechanic',
        help='Mechanic who performed or logged this service.',
        default=lambda self: self.env.user.partner_id,
    )

    odometer = fields.Integer(
        string='Odometer at Service (km)',
        help='Vehicle odometer reading at time of service.',
    )

    invoice_ref = fields.Char(
        string='Invoice / Reference',
        help='Invoice number or reference for this service.',
    )

    # ── Constraints ──
    @api.constrains('cost')
    def _check_cost(self):
        for rec in self:
            if rec.cost < 0:
                raise UserError(_('Cost cannot be negative.'))

    @api.constrains('next_service_date', 'date')
    def _check_next_service_date(self):
        """Validate that next service date is not in the past."""
        for rec in self:
            if rec.next_service_date:
                # Next service date must be today or in the future
                if rec.next_service_date < fields.Date.today():
                    raise UserError(_('Next service date cannot be in the past. Please select today or a future date.'))
                
                # Optionally: Next service date should be after the current service date
                if rec.next_service_date < rec.date:
                    raise UserError(_('Next service date must be on or after the current service date (%s).') % rec.date)
