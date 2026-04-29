# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.trip (Driver Extension)
# Description: Adds driver-side actions and fuel log relation to the trip.
#
# Driver workflow:
#   approved → [driver clicks Start] → in_progress
#   in_progress → [driver clicks Complete] → completed
#
# Driver can also log fuel fills during an active trip.
# ---------------------------------------------------------------------------

from odoo import models, fields, _
from odoo.exceptions import UserError


class MessobFmsTripDriver(models.Model):
    """Driver-side extension of messob.fms.trip."""

    _inherit = 'messob.fms.trip'

    # ── Fuel logs linked to this trip ──
    fuel_log_ids = fields.One2many(
        comodel_name='messob.fms.fuel.log',
        inverse_name='trip_id',
        string='Fuel Logs',
    )

    fuel_log_count = fields.Integer(
        string='Fuel Logs',
        compute='_compute_fuel_log_count',
        store=False,
    )

    def _compute_fuel_log_count(self):
        for rec in self:
            rec.fuel_log_count = len(rec.fuel_log_ids)

    # =========================================================================
    # DRIVER ACTIONS
    # =========================================================================

    def action_start_trip(self):
        """
        Driver action: Mark trip as started.
        Transition: approved → in_progress
        """
        self._assert_driver()
        for rec in self:
            if rec.state != 'approved':
                raise UserError(_('Only approved trips can be started.'))
        self.write({'state': 'in_progress'})
        return self._notify('Trip Started', 'Trip is now in progress.', 'success')

    def action_complete_trip(self):
        """
        Driver action: Mark trip as completed.
        Transition: in_progress → completed
        """
        self._assert_driver()
        for rec in self:
            if rec.state != 'in_progress':
                raise UserError(_('Only in-progress trips can be completed.'))
        self.write({'state': 'completed'})
        return self._notify('Trip Completed', 'Trip has been marked as completed.', 'success')

    def action_open_fuel_log(self):
        """Open the fuel log wizard for this trip."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Log Fuel Fill',
            'res_model': 'messob.fms.fuel.log.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_trip_id': self.id,
            },
        }

    # =========================================================================
    # PRIVATE HELPERS
    # =========================================================================

    def _assert_driver(self):
        """Raise if current user is not a driver."""
        if not self.env.user.has_group('messob_fleet.group_fms_driver'):
            raise UserError(
                _('Access Denied: Only drivers can perform this action.')
            )
