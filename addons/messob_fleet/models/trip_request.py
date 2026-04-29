# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.trip
# Description: Core trip request model used by Staff (Module 1 - SRS §3.1).
#
# State machine (FR-1.3):
#   draft → pending → approved / rejected → in_progress → completed → closed
#
# Staff can only:
#   - Create requests (wizard or direct form)
#   - Submit (draft → pending)
#   - Cancel own pending request (pending → draft)
#   - View their own requests on the dashboard
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore
from datetime import timedelta


class MessobFmsTrip(models.Model):
    """
    Vehicle trip request raised by a staff member.

    Inherits mail.thread for chatter (status history) and
    mail.activity.mixin for scheduled activities (reminders, follow-ups).
    """

    _name = 'messob.fms.trip'
    _description = 'MESSOB FMS - Vehicle Trip Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'          # Newest requests appear first
    _rec_name = 'name'

    # =========================================================================
    # IDENTIFICATION
    # =========================================================================

    name = fields.Char(
        string='Request ID',
        readonly=True,
        copy=False,
        default='New',
        tracking=True,
        help='Auto-generated sequence: REQ/YYYY/NNNN',
    )

    requester_id = fields.Many2one(
        comodel_name='res.partner',
        string='Requested By',
        default=lambda self: self.env.user.partner_id,
        required=True,
        readonly=True,
        tracking=True,
        help='Staff member who raised this request.',
    )

    # =========================================================================
    # TRIP DETAILS (Wizard Step 1 — FR-1.1)
    # =========================================================================

    purpose = fields.Text(
        string='Purpose / Justification',
        required=True,
        tracking=True,
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
        required=True,
        tracking=True,
        help='Type of vehicle needed. Dispatcher will assign a matching vehicle.',
    )

    # =========================================================================
    # SCHEDULE (Wizard Step 2 — FR-1.1)
    # =========================================================================

    start_dt = fields.Datetime(
        string='Start Date / Time',
        required=True,
        tracking=True,
    )

    end_dt = fields.Datetime(
        string='End Date / Time',
        required=True,
        tracking=True,
        help='Must be after Start Date/Time. Multi-day trips are supported.',
    )

    # =========================================================================
    # LOCATIONS (Wizard Step 3 — FR-1.1)
    # =========================================================================

    pickup = fields.Char(
        string='Pickup Location',
        required=True,
        tracking=True,
        help='Where the vehicle should pick up the passenger(s).',
    )

    destination = fields.Char(
        string='Destination',
        required=True,
        tracking=True,
        help='Final destination of the trip.',
    )

    # =========================================================================
    # STATUS (FR-1.3)
    # =========================================================================

    state = fields.Selection(
        selection=[
            ('draft',       'Draft'),
            ('pending',     'Pending'),
            ('approved',    'Approved'),
            ('rejected',    'Rejected'),
            ('in_progress', 'In Progress'),
            ('completed',   'Completed'),
            ('closed',      'Closed'),
        ],
        string='Status',
        default='draft',
        required=True,
        readonly=True,
        tracking=True,
        copy=False,
        help='Current lifecycle state of the trip request.',
    )

    # =========================================================================
    # DISPATCHER ASSIGNMENT FIELDS (populated by Dispatcher — Module 2)
    # =========================================================================

    assigned_vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Assigned Vehicle',
        tracking=True,
        help='Vehicle assigned by the dispatcher (Plate No. shown).',
    )

    assigned_driver_id = fields.Many2one(
        comodel_name='res.partner',
        string='Assigned Driver',
        tracking=True,
        help='Driver assigned by the dispatcher.',
    )

    fuel_status = fields.Selection(
        selection=[
            ('full',          'Full'),
            ('three_quarter', '3/4'),
            ('half',          '1/2'),
            ('quarter',       '1/4'),
            ('empty',         'Empty'),
        ],
        string='Fuel Status',
        default='full',
        tracking=True,
        help='Fuel level of the assigned vehicle at time of dispatch.',
    )

    # =========================================================================
    # COMPUTED / DISPLAY FIELDS
    # =========================================================================

    duration_display = fields.Char(
        string='Duration',
        compute='_compute_duration_display',
        store=False,
        help='Human-readable trip duration.',
    )

    @api.depends('start_dt', 'end_dt')
    def _compute_duration_display(self):
        for rec in self:
            if rec.start_dt and rec.end_dt and rec.end_dt > rec.start_dt:
                delta = rec.end_dt - rec.start_dt
                hours, remainder = divmod(int(delta.total_seconds()), 3600)
                minutes = remainder // 60
                rec.duration_display = f'{hours}h {minutes}m'
            else:
                rec.duration_display = '—'

    # =========================================================================
    # ORM OVERRIDES
    # =========================================================================

    @api.model_create_multi
    def create(self, vals_list):
        """Assign auto-generated sequence ID on creation."""
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = (
                    self.env['ir.sequence'].next_by_code('messob.fms.trip') or 'New'
                )
        return super().create(vals_list)

    # =========================================================================
    # CONSTRAINTS
    # =========================================================================

    @api.constrains('start_dt', 'end_dt')
    def _check_dates(self):
        """
        Validate trip schedule:
          Rule 1: start_dt date must be today or future (past dates blocked).
                  We compare DATE only — time within today is always allowed.
          Rule 2: end_dt must be strictly after start_dt (same day = later time).
        """
        today = fields.Date.today()          # local date (no time component)
        for rec in self:
            if rec.start_dt:
                # Convert UTC datetime → local date for comparison
                start_date = rec.start_dt.date()
                if start_date < today:
                    raise UserError(
                        _('Start date cannot be in the past. Please select today or a future date.')
                    )
            if rec.start_dt and rec.end_dt and rec.end_dt <= rec.start_dt:
                raise UserError(
                    _('End Date/Time must be after Start Date/Time.')
                )

    @api.constrains('purpose')
    def _check_purpose_length(self):
        """FR-1.1 Step 1: Purpose must be at least 10 characters."""
        for rec in self:
            if rec.purpose and len(rec.purpose.strip()) < 10:
                raise UserError(
                    _('Purpose must be at least 10 characters long.')
                )

    # =========================================================================
    # STAFF ACTIONS (Module 1 — FR-1.3)
    # =========================================================================

    def action_submit(self):
        """
        Staff action: Submit request for dispatcher review.
        Transition: draft → pending
        """
        for rec in self:
            if rec.state != 'draft':
                raise UserError(
                    _('Only "Draft" requests can be submitted.')
                )
        self.write({'state': 'pending'})
        return self._notify('Request Submitted',
                            'Your request has been sent to the dispatcher.',
                            'success')

    def action_cancel(self):
        """
        Staff action: Cancel a pending request (returns to draft).
        Transition: pending → draft
        FR-1.3: Users can cancel only if status is Pending.
        """
        for rec in self:
            if rec.state != 'pending':
                raise UserError(
                    _('You can only cancel requests that are in "Pending" status.')
                )
        self.write({'state': 'draft'})
        return self._notify('Request Cancelled',
                            'Your request has been returned to Draft.',
                            'warning')

    def action_save_draft(self):
        """Staff action: Explicitly save as draft (no-op if already draft)."""
        self.ensure_one()
        if self.state not in ('draft',):
            raise UserError(_('Only Draft requests can be saved.'))
        return self._notify('Saved', 'Request saved as draft.', 'success')

    # =========================================================================
    # SHARED HELPER
    # =========================================================================

    def _notify(self, title, message, msg_type='success', sticky=False):
        """
        Return a client-side notification action.

        :param title:    Notification title string.
        :param message:  Notification body string.
        :param msg_type: One of 'success', 'warning', 'danger', 'info'.
        :param sticky:   If True, notification stays until dismissed.
        """
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _(title),
                'message': _(message),
                'type': msg_type,
                'sticky': sticky,
                'next': {'type': 'ir.actions.act_window_close'},
            },
        }
