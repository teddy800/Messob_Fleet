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
        index=True,  # NFR-1: Performance - Index for fast lookup
        help='Auto-generated sequence: REQ/YYYY/NNNN',
    )

    requester_id = fields.Many2one(
        comodel_name='res.partner',
        string='Requested By',
        default=lambda self: self.env.user.partner_id,
        required=True,
        readonly=True,
        tracking=True,
        index=True,  # NFR-1: Performance - Index for user queries
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
        index=True,  # NFR-1: Performance - Index for date range queries
    )

    end_dt = fields.Datetime(
        string='End Date / Time',
        required=True,
        tracking=True,
        index=True,  # NFR-1: Performance - Index for date range queries
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
        index=True,  # NFR-1: Performance - Index for status filtering
        help='Current lifecycle state of the trip request.',
    )

    # =========================================================================
    # DISPATCHER ASSIGNMENT FIELDS (populated by Dispatcher — Module 2)
    # =========================================================================

    assigned_vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Assigned Vehicle',
        tracking=True,
        index=True,  # NFR-1: Performance - Index for vehicle queries
        help='Vehicle assigned by the dispatcher (Plate No. shown).',
    )

    assigned_driver_id = fields.Many2one(
        comodel_name='res.partner',
        string='Assigned Driver',
        tracking=True,
        index=True,  # NFR-1: Performance - Index for driver queries
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
        
        NFR-1: Performance - Optimized with single query for all records.
        """
        active_states = ['approved', 'in_progress']
        
        # Batch process all records at once for better performance
        records_to_process = self.filtered(lambda r: r.start_dt and r.end_dt)
        
        if not records_to_process:
            for rec in self:
                rec.unavailable_vehicle_ids = []
                rec.unavailable_driver_ids = []
            return
        
        # Single query to get all overlapping trips
        all_overlapping = self.search([
            ('state', 'in', active_states),
            ('id', 'not in', records_to_process.ids),
            ('start_dt', '!=', False),
            ('end_dt', '!=', False),
        ])
        
        for rec in records_to_process:
            # Filter overlapping trips for this specific record
            overlapping = all_overlapping.filtered(
                lambda t: t.start_dt < rec.end_dt and t.end_dt > rec.start_dt
            )
            
            rec.unavailable_vehicle_ids = overlapping.mapped('assigned_vehicle_id')
            rec.unavailable_driver_ids = overlapping.mapped('assigned_driver_id')
        
        # Handle records without dates
        for rec in (self - records_to_process):
            rec.unavailable_vehicle_ids = []
            rec.unavailable_driver_ids = []

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
    # SQL CONSTRAINTS (NFR-1: Performance & Data Integrity)
    # =========================================================================
    
    _sql_constraints = [
        (
            'name_unique',
            'UNIQUE(name)',
            'Request ID must be unique!'
        ),
        (
            'check_dates_order',
            'CHECK(end_dt > start_dt)',
            'End date/time must be after start date/time!'
        ),
    ]

    def _check_resource_availability(self):
        """
        Check if assigned vehicle and driver are available (BR-2, BR-3).
        Raises UserError if there's a conflict.
        """
        for rec in self:
            if not rec.assigned_vehicle_id and not rec.assigned_driver_id:
                continue
            
            # Find overlapping trips
            overlapping = self.search([
                ('state', 'in', ['approved', 'in_progress']),
                ('id', '!=', rec.id or 0),
                ('start_dt', '<', rec.end_dt),
                ('end_dt', '>', rec.start_dt),
            ])
            
            # Check vehicle conflict (BR-2)
            if rec.assigned_vehicle_id:
                conflicting_vehicle = overlapping.filtered(
                    lambda t: t.assigned_vehicle_id.id == rec.assigned_vehicle_id.id
                )
                if conflicting_vehicle:
                    raise UserError(
                        _('Vehicle %s is already assigned to trip %s during this time period.') % 
                        (rec.assigned_vehicle_id.license_plate, conflicting_vehicle[0].name)
                    )
            
            # Check driver conflict (BR-3)
            if rec.assigned_driver_id:
                conflicting_driver = overlapping.filtered(
                    lambda t: t.assigned_driver_id.id == rec.assigned_driver_id.id
                )
                if conflicting_driver:
                    raise UserError(
                        _('Driver %s is already assigned to trip %s during this time period.') % 
                        (rec.assigned_driver_id.name, conflicting_driver[0].name)
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
        
        NFR-1: Performance - Optimized with batch queries and minimal database hits.
        
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
        
        # NFR-1: Fetch all vehicles at once
        vehicles = Vehicle.search(vehicle_domain)
        
        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)
        
        # NFR-1: Batch fetch all trips in date range (single query)
        all_trips = self.search([
            ('assigned_vehicle_id', 'in', vehicles.ids),
            ('state', 'in', ['approved', 'in_progress']),
            ('start_dt', '<', end_dt),
            ('end_dt', '>', start_dt),
        ])
        
        # NFR-1: Batch fetch all maintenance in date range (single query)
        all_maintenance = Maintenance.search([
            ('vehicle_id', 'in', vehicles.ids),
            ('date', '<=', end_dt),
            ('date', '>=', start_dt),
        ])
        
        # NFR-1: Group trips and maintenance by vehicle (in-memory, no DB queries)
        trips_by_vehicle = {}
        for trip in all_trips:
            vehicle_id = trip.assigned_vehicle_id.id
            if vehicle_id not in trips_by_vehicle:
                trips_by_vehicle[vehicle_id] = []
            trips_by_vehicle[vehicle_id].append(trip)
        
        maintenance_by_vehicle = {}
        for maint in all_maintenance:
            vehicle_id = maint.vehicle_id.id
            if vehicle_id not in maintenance_by_vehicle:
                maintenance_by_vehicle[vehicle_id] = []
            maintenance_by_vehicle[vehicle_id].append(maint)
        
        # Build result
        result = []
        for vehicle in vehicles:
            trips = trips_by_vehicle.get(vehicle.id, [])
            maintenance = maintenance_by_vehicle.get(vehicle.id, [])
            
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
                    'type': maint.service_type if hasattr(maint, 'service_type') else 'Maintenance',
                    'start_dt': maint.date.isoformat() if maint.date else None,
                    'end_dt': maint.next_service_date.isoformat() if maint.next_service_date else None,
                    'description': maint.description if hasattr(maint, 'description') else 'Scheduled maintenance',
                } for maint in maintenance],
            })
        
        return {
            'success': True,
            'vehicles': result
        }

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

    # =========================================================================
    # ROUTE TRACKING & COLLABORATION METHODS (FR-3.x)
    # =========================================================================

    @api.model
    def get_route_display(self, trip_id):
        """
        FR-3.1: Get assigned route display data for approved/active trips.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Route display data with pickup/destination POIs and route line
        """
        import random
        
        trip = self.browse(trip_id)
        
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        
        # Check if user can view this trip (requester or dispatcher/admin)
        user = self.env.user
        if (trip.requester_id.id != user.partner_id.id and 
            not user.has_group('messob_fleet.group_fms_dispatcher')):
            return {'success': False, 'error': 'Access denied'}
        
        # Only show route for approved or active trips
        if trip.state not in ['approved', 'in_progress']:
            return {'success': False, 'error': 'Route not available for this trip status'}
        
        # Get pickup and destination coordinates (simulate geocoding)
        pickup_coords = self._geocode_location(trip.pickup)
        dest_coords = self._geocode_location(trip.destination)
        
        # Generate route line (simulate routing service)
        route_line = self._generate_route_line(pickup_coords, dest_coords)
        
        return {
            'success': True,
            'trip': {
                'id': trip.id,
                'request_id': trip.name,
                'requester': trip.requester_id.name,
                'purpose': trip.purpose,
                'state': trip.state,
                'start_dt': trip.start_dt.isoformat(),
                'end_dt': trip.end_dt.isoformat(),
                'vehicle': {
                    'id': trip.assigned_vehicle_id.id if trip.assigned_vehicle_id else None,
                    'plate_no': trip.assigned_vehicle_id.license_plate if trip.assigned_vehicle_id else None,
                    'category': trip.assigned_vehicle_id.category_id.name if trip.assigned_vehicle_id and trip.assigned_vehicle_id.category_id else None,
                },
                'driver': {
                    'id': trip.assigned_driver_id.id if trip.assigned_driver_id else None,
                    'name': trip.assigned_driver_id.name if trip.assigned_driver_id else None,
                }
            },
            'route': {
                'pickup': {
                    'address': trip.pickup,
                    'coordinates': pickup_coords,
                    'type': 'pickup'
                },
                'destination': {
                    'address': trip.destination,
                    'coordinates': dest_coords,
                    'type': 'destination'
                },
                'route_line': route_line,
                'distance_km': self._calculate_distance(pickup_coords, dest_coords),
                'estimated_duration_minutes': self._estimate_duration(pickup_coords, dest_coords)
            }
        }

    @api.model
    def get_gps_position(self, trip_id):
        """
        FR-3.2: Get real-time GPS position of assigned vehicle.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Real-time vehicle position and status
        """
        from datetime import datetime
        import random
        
        trip = self.browse(trip_id)
        
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        
        # Check access permissions
        user = self.env.user
        if (trip.requester_id.id != user.partner_id.id and 
            not user.has_group('messob_fleet.group_fms_dispatcher')):
            return {'success': False, 'error': 'Access denied'}
        
        if trip.state not in ['approved', 'in_progress']:
            return {'success': False, 'error': 'GPS tracking not available for this trip status'}
        
        if not trip.assigned_vehicle_id:
            return {'success': False, 'error': 'No vehicle assigned to this trip'}
        
        # Simulate GPS data (in real implementation, this would call GPS Gateway)
        gps_data = self._simulate_gps_position(trip)
        
        return {
            'success': True,
            'vehicle': {
                'id': trip.assigned_vehicle_id.id,
                'plate_no': trip.assigned_vehicle_id.license_plate,
            },
            'gps': gps_data,
            'trip_status': trip.state,
            'last_updated': fields.Datetime.now().isoformat()
        }

    @api.model
    def get_collaborative_pickup(self, trip_id):
        """
        FR-3.3: Get collaborative pickup information for shared trips.
        
        NFR-1: Performance - Optimized query with date range filtering.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Other service users on the same vehicle/route
        """
        trip = self.browse(trip_id)
        
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        
        # Check access permissions
        user = self.env.user
        if (trip.requester_id.id != user.partner_id.id and 
            not user.has_group('messob_fleet.group_fms_dispatcher')):
            return {'success': False, 'error': 'Access denied'}
        
        if not trip.assigned_vehicle_id:
            return {'success': False, 'error': 'No vehicle assigned'}
        
        # NFR-1: Optimized query - find other trips using same vehicle on same day
        # Use date range instead of replace() for better index usage
        day_start = trip.start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = trip.start_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        same_day_trips = self.search([
            ('assigned_vehicle_id', '=', trip.assigned_vehicle_id.id),
            ('state', 'in', ['approved', 'in_progress']),
            ('start_dt', '>=', day_start),
            ('start_dt', '<=', day_end),
            ('id', '!=', trip.id)
        ])
        
        service_users = []
        for other_trip in same_day_trips:
            pickup_coords = self._geocode_location(other_trip.pickup)
            service_users.append({
                'trip_id': other_trip.id,
                'request_id': other_trip.name,
                'requester': other_trip.requester_id.name,
                'pickup_address': other_trip.pickup,
                'pickup_coordinates': pickup_coords,
                'start_time': other_trip.start_dt.strftime('%H:%M'),
                'status': other_trip.state,
                'contact_allowed': True  # In real system, check privacy settings
            })
        
        return {
            'success': True,
            'current_trip': {
                'id': trip.id,
                'requester': trip.requester_id.name,
                'pickup_address': trip.pickup,
                'pickup_coordinates': self._geocode_location(trip.pickup)
            },
            'service_users': service_users,
            'vehicle': {
                'plate_no': trip.assigned_vehicle_id.license_plate,
                'category': trip.assigned_vehicle_id.category_id.name if trip.assigned_vehicle_id.category_id else 'Unknown'
            }
        }

    @api.model
    def update_pickup_point(self, trip_id, new_pickup_address, new_coordinates):
        """
        FR-3.4: Update pickup point dynamically.
        
        Args:
            trip_id (int): Trip request ID
            new_pickup_address (str): New pickup address
            new_coordinates (dict): New coordinates {lat, lng}
            
        Returns:
            dict: Update result
        """
        trip = self.browse(trip_id)
        
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        
        # Check if user is the requester
        user = self.env.user
        if trip.requester_id.id != user.partner_id.id:
            return {'success': False, 'error': 'Only the trip requester can update pickup point'}
        
        # Only allow updates for approved trips (not yet in progress)
        if trip.state != 'approved':
            return {'success': False, 'error': 'Pickup point can only be updated for approved trips'}
        
        # Update pickup location
        trip.write({
            'pickup': new_pickup_address
        })
        
        # Log the pickup point change
        trip.message_post(
            body=f"Pickup point updated by {user.name}: {new_pickup_address}",
            message_type='notification'
        )
        
        # Notify driver and dispatcher
        self._notify_pickup_change(trip, new_pickup_address, new_coordinates)
        
        # Log the change in audit log
        self.env['messob.fms.audit.log'].log_business_action(
            action='UPDATE',
            model=trip._name,
            record_id=trip.id,
            description=f"Pickup point updated for {trip.name}: {new_pickup_address}",
            severity='medium'
        )
        
        return {
            'success': True,
            'message': 'Pickup point updated successfully',
            'trip': {
                'id': trip.id,
                'pickup': trip.pickup,
                'coordinates': new_coordinates
            }
        }

    # =========================================================================
    # HELPER METHODS FOR ROUTE TRACKING
    # =========================================================================

    def _geocode_location(self, address):
        """Simulate geocoding service - convert address to coordinates."""
        import random
        
        # Ethiopian cities coordinates (simulate geocoding)
        city_coords = {
            'MESSOB Center HQ': {'lat': 9.0320, 'lng': 38.7469},
            'Addis Ababa': {'lat': 9.0320, 'lng': 38.7469},
            'Bole Airport': {'lat': 8.9806, 'lng': 38.7992},
            'Mercato': {'lat': 9.0370, 'lng': 38.7444},
            'Piazza': {'lat': 9.0420, 'lng': 38.7469},
            'Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'University': {'lat': 9.0370, 'lng': 38.7620},
            'Bole': {'lat': 8.9806, 'lng': 38.7992},
            'Kirkos': {'lat': 9.0250, 'lng': 38.7550},
            'Gulele': {'lat': 9.0650, 'lng': 38.7300},
        }
        
        # Check if address matches known locations
        for city, coords in city_coords.items():
            if city.lower() in address.lower():
                return coords
        
        # Default to Addis Ababa with slight random offset
        return {
            'lat': 9.0320 + (random.random() - 0.5) * 0.1,
            'lng': 38.7469 + (random.random() - 0.5) * 0.1
        }

    def _generate_route_line(self, start_coords, end_coords):
        """Simulate routing service - generate route line between two points."""
        # Simple straight line with some waypoints for demonstration
        lat_diff = end_coords['lat'] - start_coords['lat']
        lng_diff = end_coords['lng'] - start_coords['lng']
        
        route_points = []
        steps = 5  # Number of intermediate points
        
        for i in range(steps + 1):
            progress = i / steps
            # Add some curve to make it look more realistic
            curve_offset = 0.01 * (1 - (2 * progress - 1) ** 2)  # Parabolic curve
            
            point = {
                'lat': start_coords['lat'] + lat_diff * progress + curve_offset,
                'lng': start_coords['lng'] + lng_diff * progress
            }
            route_points.append(point)
        
        return route_points

    def _calculate_distance(self, start_coords, end_coords):
        """Calculate approximate distance between two coordinates."""
        # Simplified distance calculation (Haversine formula approximation)
        lat_diff = abs(end_coords['lat'] - start_coords['lat'])
        lng_diff = abs(end_coords['lng'] - start_coords['lng'])
        
        # Rough conversion: 1 degree ≈ 111 km
        distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
        return round(distance, 2)

    def _estimate_duration(self, start_coords, end_coords):
        """Estimate travel duration based on distance."""
        distance = self._calculate_distance(start_coords, end_coords)
        # Assume average speed of 30 km/h in city traffic
        duration_hours = distance / 30
        return round(duration_hours * 60)  # Convert to minutes

    def _simulate_gps_position(self, trip):
        """Simulate real-time GPS position for demonstration."""
        from datetime import datetime
        import random
        
        pickup_coords = self._geocode_location(trip.pickup)
        dest_coords = self._geocode_location(trip.destination)
        
        # Simulate vehicle movement based on trip progress
        now = fields.Datetime.now()
        trip_start = trip.start_dt
        trip_duration = (trip.end_dt - trip.start_dt).total_seconds()
        
        if now < trip_start:
            # Trip hasn't started yet - vehicle at pickup
            progress = 0
            status = 'waiting_at_pickup'
        elif now > trip.end_dt:
            # Trip completed - vehicle at destination
            progress = 1
            status = 'completed'
        else:
            # Trip in progress
            elapsed = (now - trip_start).total_seconds()
            progress = min(elapsed / trip_duration, 1)
            status = 'en_route'
        
        # Calculate current position based on progress
        current_lat = pickup_coords['lat'] + (dest_coords['lat'] - pickup_coords['lat']) * progress
        current_lng = pickup_coords['lng'] + (dest_coords['lng'] - pickup_coords['lng']) * progress
        
        # Add some random variation to simulate real GPS
        current_lat += (random.random() - 0.5) * 0.001
        current_lng += (random.random() - 0.5) * 0.001
        
        return {
            'latitude': round(current_lat, 6),
            'longitude': round(current_lng, 6),
            'speed_kmh': random.randint(0, 60) if status == 'en_route' else 0,
            'heading': random.randint(0, 360),
            'accuracy_meters': random.randint(3, 15),
            'status': status,
            'progress_percent': round(progress * 100, 1),
            'timestamp': now.isoformat()
        }

    def _notify_pickup_change(self, trip, new_address, new_coordinates):
        """Notify driver and dispatcher about pickup point change."""
        # Notify driver if assigned
        if trip.assigned_driver_id:
            trip.message_post(
                body=f"⚠️ Pickup location changed to: {new_address}",
                message_type='notification',
                partner_ids=[trip.assigned_driver_id.id]
            )
        
        # Notify dispatcher group
        dispatcher_group = self.env.ref('messob_fleet.group_fms_dispatcher', raise_if_not_found=False)
        if dispatcher_group:
            dispatcher_partners = dispatcher_group.users.mapped('partner_id')
            trip.message_post(
                body=f"📍 Pickup point updated for {trip.name}: {new_address}",
                message_type='notification',
                partner_ids=dispatcher_partners.ids
            )
        
        return True
