# -*- coding: utf-8 -*-
"""MESSOB Fleet Management - Trip Request Model"""

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsTrip(models.Model):
    """Staff Vehicle Trip Request - Workflow: Draft → Pending → Approved → ..."""
    _name = 'messob.fms.trip'
    _description = 'Staff Vehicle Trip Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    # =========================================================================
    # CORE FIELDS
    # =========================================================================
    name = fields.Char(string='Request ID', readonly=True, copy=False, default='New', tracking=True)
    requester_id = fields.Many2one('res.partner', string='Requested By', default=lambda self: self.env.user.partner_id, required=True, readonly=True, tracking=True)
    purpose = fields.Text(string='Purpose', required=True, placeholder="Enter trip justification...", tracking=True)
    
    vehicle_category = fields.Selection([
        ('sedan', 'Sedan'), ('suv', 'SUV'), ('pickup', 'Pickup'),
        ('bus', 'Bus'), ('minibus', 'Mini-Bus'), ('mesobus', 'MesoBus')
    ], string='Select Vehicle', required=True, tracking=True)
    
    start_dt = fields.Datetime(string='Start Time', required=True, tracking=True)
    end_dt = fields.Datetime(string='Destination Time', required=True, tracking=True)
    pickup = fields.Char(string='Start Place', placeholder="e.g., MESSOB HQ", tracking=True)
    destination = fields.Char(string='Destination Place', placeholder="e.g., Bole Branch", tracking=True)
    
    state = fields.Selection([
        ('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'),
        ('rejected', 'Rejected'), ('in_progress', 'In Progress'),
        ('completed', 'Completed'), ('closed', 'Closed')
    ], string='Status', default='draft', tracking=True, readonly=True)

    # =========================================================================
    # AUTOMATED METHODS & VALIDATIONS
    # =========================================================================
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

    # =========================================================================
    # STAFF WORKFLOW ACTIONS
    # =========================================================================
    def action_submit(self):
        for rec in self:
            if rec.state != 'draft':
                raise UserError(_('Only requests in "Draft" status can be submitted.'))
        self.write({'state': 'pending'})
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('✅ Submitted'), 'message': _('Request sent to dispatcher.'), 'type': 'success', 'sticky': False, 'next': {'type': 'ir.actions.act_window_close'}}}

    def action_cancel(self):
        for rec in self:
            if rec.state != 'pending':
                raise UserError(_('You can only cancel requests in "Pending" status.'))
        self.write({'state': 'draft'})
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('❌ Cancelled'), 'message': _('Request returned to draft.'), 'type': 'warning', 'sticky': False, 'next': {'type': 'ir.actions.act_window_close'}}}

    def action_review(self):
        self.ensure_one()
        start = self.start_dt.strftime('%d-%b-%Y %H:%M') if self.start_dt else 'Not set'
        end = self.end_dt.strftime('%d-%b-%Y %H:%M') if self.end_dt else 'Not set'
        vehicle_label = dict(self._fields['vehicle_category'].selection).get(self.vehicle_category, 'Not set')
        summary = _("📋 REQUEST REVIEW\n\n🎯 Purpose: %s\n🚗 Vehicle: %s\n📅 Schedule: %s → %s\n📍 Route: %s → %s") % (
            self.purpose or 'N/A', vehicle_label, start, end, self.pickup or 'N/A', self.destination or 'N/A')
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('🔍 Review'), 'message': summary, 'type': 'info', 'sticky': True, 'next': {'type': 'ir.actions.act_window_close'}}}

    def action_save_draft(self):
        self.ensure_one()
        if self.state not in ['draft', 'pending']:
            raise UserError(_('Can only save requests in Draft or Pending status.'))
        self.write({'state': 'draft'})
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('💾 Saved'), 'message': _('Request saved as draft.'), 'type': 'success', 'sticky': False, 'next': {'type': 'ir.actions.act_window_close'}}}

    # =========================================================================
    # DISPATCHER-ONLY ACTIONS (Protected by Group Check)
    # =========================================================================
    def action_approve(self):
        if not self.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            raise UserError(_('Only dispatchers can approve requests.'))
        for rec in self:
            if rec.state != 'pending':
                raise UserError(_('Only "Pending" requests can be approved.'))
        self.write({'state': 'approved'})
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('✅ Approved'), 'message': _('Trip request approved.'), 'type': 'success', 'sticky': False, 'next': {'type': 'ir.actions.act_window_close'}}}

    def action_reject(self):
        if not self.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            raise UserError(_('Only dispatchers can reject requests.'))
        for rec in self:
            if rec.state != 'pending':
                raise UserError(_('Only "Pending" requests can be rejected.'))
        self.write({'state': 'rejected'})
        return {'type': 'ir.actions.client', 'tag': 'display_notification', 'params': {'title': _('❌ Rejected'), 'message': _('Trip request rejected.'), 'type': 'warning', 'sticky': False, 'next': {'type': 'ir.actions.act_window_close'}}}