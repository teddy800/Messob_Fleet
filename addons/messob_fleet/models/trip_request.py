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
    Trip Request model with comprehensive audit logging.
    
    Vehicle trip request raised by a staff member.
    Inherits mail.thread for chatter (status history),
    mail.activity.mixin for scheduled activities (reminders, follow-ups),
    and base.model.audit.mixin for automatic change tracking.
    """

    _name = 'messob.fms.trip'
    _description = 'MESSOB FMS - Vehicle Trip Request'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'base.model.audit.mixin']
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

    pickup_location_id = fields.Many2one(
        comodel_name='messob.fms.location',
        string='Pickup (Select)',
        help='Select from known locations for autocomplete.',
    )

    destination = fields.Char(
        string='Destination',
        required=True,
        tracking=True,
        help='Final destination of the trip.',
    )

    destination_location_id = fields.Many2one(
        comodel_name='messob.fms.location',
        string='Destination (Select)',
        help='Select from known locations for autocomplete.',
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

    # ── Computed: IDs of vehicles/drivers already booked in this time window ──
    # Used as domain on the assignment dropdowns so dispatcher only sees
    # available resources (FR-2.2, BR-2, BR-3).

    unavailable_vehicle_ids = fields.Many2many(
        comodel_name='fleet.vehicle',
        compute='_compute_unavailable_resources',
        store=False,
        help='Vehicles already booked during this trip time window.',
    )

    unavailable_driver_ids = fields.Many2many(
        comodel_name='res.partner',
        compute='_compute_unavailable_resources',
        store=False,
        help='Drivers already assigned during this trip time window.',
    )

    @api.depends('start_dt', 'end_dt')
    def _compute_unavailable_resources(self):
        """
        Find all vehicles and drivers already committed to approved/in-progress
        trips that overlap with this trip's time window.
        Result is used as exclusion domain on the assignment dropdowns.
        """
        active_states = ['approved', 'in_progress']
        for rec in self:
            if not rec.start_dt or not rec.end_dt:
                rec.unavailable_vehicle_ids = []
                rec.unavailable_driver_ids = []
                continue

            overlapping = self.search([
                ('state', 'in', active_states),
                ('id', '!=', rec.id or 0),
                ('start_dt', '<', rec.end_dt),
                ('end_dt', '>', rec.start_dt),
            ])

            rec.unavailable_vehicle_ids = overlapping.mapped('assigned_vehicle_id')
            rec.unavailable_driver_ids = overlapping.mapped('assigned_driver_id')

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

    @api.onchange('pickup_location_id')
    def _onchange_pickup_location(self):
        if self.pickup_location_id:
            self.pickup = self.pickup_location_id.display_name_custom

    @api.onchange('destination_location_id')
    def _onchange_destination_location(self):
        if self.destination_location_id:
            self.destination = self.destination_location_id.display_name_custom

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

    def write(self, vals):
        """Override write to log resource assignments."""
        # Track vehicle/driver assignments
        for rec in self:
            if 'assigned_vehicle_id' in vals and vals['assigned_vehicle_id'] != rec.assigned_vehicle_id.id:
                old_vehicle = rec.assigned_vehicle_id.license_plate if rec.assigned_vehicle_id else 'None'
                new_vehicle_obj = self.env['fleet.vehicle'].browse(vals['assigned_vehicle_id']) if vals['assigned_vehicle_id'] else None
                new_vehicle = new_vehicle_obj.license_plate if new_vehicle_obj else 'None'
                
                self.env['messob.fms.audit.log'].log_business_action(
                    action='ASSIGN',
                    model=rec._name,
                    record_id=rec.id,
                    description=f"Vehicle assignment changed for {rec.name}: {old_vehicle} → {new_vehicle}",
                    severity='medium'
                )
            
            if 'assigned_driver_id' in vals and vals['assigned_driver_id'] != rec.assigned_driver_id.id:
                old_driver = rec.assigned_driver_id.name if rec.assigned_driver_id else 'None'
                new_driver_obj = self.env['res.partner'].browse(vals['assigned_driver_id']) if vals['assigned_driver_id'] else None
                new_driver = new_driver_obj.name if new_driver_obj else 'None'
                
                self.env['messob.fms.audit.log'].log_business_action(
                    action='ASSIGN',
                    model=rec._name,
                    record_id=rec.id,
                    description=f"Driver assignment changed for {rec.name}: {old_driver} → {new_driver}",
                    severity='medium'
                )
        
        return super().write(vals)

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
            
            # Log submission action
            self.env['messob.fms.audit.log'].log_business_action(
                action='SUBMIT',
                model=rec._name,
                record_id=rec.id,
                description=f"Submitted trip request {rec.name} - Purpose: {rec.purpose[:50]}...",
                severity='medium'
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
            
            # Log cancellation action
            self.env['messob.fms.audit.log'].log_business_action(
                action='CANCEL',
                model=rec._name,
                record_id=rec.id,
                description=f"Cancelled trip request {rec.name}",
                severity='low'
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

    # =========================================================================
    # FLEET CALENDAR METHODS (FR-2.3)
    # =========================================================================

    @api.model
    def get_fleet_availability(self, start_date, end_date, category=None, status=None):
        """
        Get all vehicles with their trip assignments and maintenance schedules
        for the fleet availability calendar.
        
        Args:
            start_date (str): ISO datetime string
            end_date (str): ISO datetime string
            category (str, optional): Filter by vehicle category
            status (str, optional): Filter by vehicle status
            
        Returns:
            dict: {
                'vehicles': [
                    {
                        'id': int,
                        'plate_no': str,
                        'category': str,
                        'status': str,
                        'trips': [...],
                        'maintenance': [...]
                    }
                ]
            }
        """
        from datetime import datetime
        
        Vehicle = self.env['fleet.vehicle']
        Maintenance = self.env['messob.fms.maintenance.log']
        
        # Build vehicle domain
        vehicle_domain = []
        if category:
            vehicle_domain.append(('category_id.name', '=ilike', category))
        
        vehicles = Vehicle.search(vehicle_domain)
        
        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)
        
        result = []
        for vehicle in vehicles:
            # Get trips for this vehicle in date range
            trips = self.search([
                ('assigned_vehicle_id', '=', vehicle.id),
                ('state', 'in', ['approved', 'in_progress']),
                ('start_dt', '<', end_dt),
                ('end_dt', '>', start_dt),
            ])
            
            # Get maintenance for this vehicle in date range
            maintenance = Maintenance.search([
                ('vehicle_id', '=', vehicle.id),
                ('start_date', '<', end_dt),
            ])
            
            result.append({
                'id': vehicle.id,
                'plate_no': vehicle.license_plate or 'N/A',
                'category': vehicle.category_id.name if vehicle.category_id else 'Unknown',
                'status': vehicle.state_id.name if vehicle.state_id else 'Active',
                'trips': [{
                    'id': trip.id,
                    'request_id': trip.name,
                    'requester': trip.requester_id.name,
                    'start_dt': trip.start_dt.isoformat(),
                    'end_dt': trip.end_dt.isoformat(),
                    'pickup': trip.pickup,
                    'destination': trip.destination,
                    'state': trip.state,
                    'purpose': trip.purpose[:50] + '...' if len(trip.purpose) > 50 else trip.purpose,
                } for trip in trips],
                'maintenance': [{
                    'id': maint.id,
                    'type': maint.maintenance_type if hasattr(maint, 'maintenance_type') else 'Maintenance',
                    'start_dt': maint.start_date.isoformat(),
                    'end_dt': maint.end_date.isoformat() if maint.end_date else None,
                    'description': maint.description if hasattr(maint, 'description') else 'Scheduled maintenance',
                } for maint in maintenance],
            })
        
        return {'vehicles': result}

    @api.model
    def quick_assign_vehicle(self, trip_id, vehicle_id, driver_id):
        """
        Quick assign vehicle and driver to a pending trip from the calendar.
        Validates availability and prevents conflicts.
        
        Args:
            trip_id (int): Trip request ID
            vehicle_id (int): Vehicle ID to assign
            driver_id (int): Driver ID to assign
            
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'trip': dict (if success)
            }
        """
        trip = self.browse(trip_id)
        
        if not trip.exists():
            return {'success': False, 'message': 'Trip not found'}
        
        if trip.state != 'pending':
            return {
                'success': False,
                'message': f'Only pending trips can be assigned. Current status: {trip.state}'
            }
        
        # Assign resources
        trip.write({
            'assigned_vehicle_id': vehicle_id,
            'assigned_driver_id': driver_id,
        })
        
        # Validate availability (will raise UserError if conflict)
        try:
            trip._check_resource_availability()
        except UserError as e:
            # Rollback assignment
            trip.write({
                'assigned_vehicle_id': False,
                'assigned_driver_id': False,
            })
            return {'success': False, 'message': str(e)}
        except Exception as e:
            trip.write({
                'assigned_vehicle_id': False,
                'assigned_driver_id': False,
            })
            return {'success': False, 'message': f'Assignment failed: {str(e)}'}
        
        return {
            'success': True,
            'message': 'Vehicle and driver assigned successfully',
            'trip': {
                'id': trip.id,
                'name': trip.name,
                'state': trip.state,
                'vehicle': trip.assigned_vehicle_id.license_plate if trip.assigned_vehicle_id else None,
                'driver': trip.assigned_driver_id.name if trip.assigned_driver_id else None,
            }
        }
