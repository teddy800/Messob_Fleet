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
import logging

_logger = logging.getLogger(__name__)


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
    
    @api.constrains('purpose')
    def _check_purpose_length(self):
        """FR-1.1: Enforce minimum 10 characters for purpose field."""
        for rec in self:
            if rec.purpose and len(rec.purpose.strip()) < 10:
                raise UserError(_('Trip purpose must be at least 10 characters long.'))

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
    )
    
    @api.constrains('start_dt', 'end_dt')
    def _check_date_sequence(self):
        """FR-1.1: Prevent selection of end times before start times."""
        for rec in self:
            if rec.start_dt and rec.end_dt and rec.end_dt < rec.start_dt:
                raise UserError(_('End date/time must be on or after start date/time.'))
    
    @api.constrains('start_dt')
    def _check_past_date(self):
        """Prevent scheduling trips in the past."""
        for rec in self:
            if rec.start_dt and rec.start_dt < fields.Datetime.now():
                # Allow editing existing approved/in-progress records
                if rec.state in ['approved', 'in_progress', 'completed', 'closed']:
                    continue
                raise UserError(_('Cannot schedule trips in the past. Please select a future date/time.'))
    
    # =========================================================================
    # LOCATIONS (Wizard Step 3 — FR-1.1)
    # =========================================================================
    
    pickup = fields.Char(
        string='Pickup Location',
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

    # FR-3.4: Dynamic Pickup Point Coordinates
    pickup_latitude = fields.Float(
        string='Pickup Latitude',
        digits=(10, 7),
        tracking=True,
        help='GPS latitude for pickup point (can be updated dynamically).',
    )

    pickup_longitude = fields.Float(
        string='Pickup Longitude',
        digits=(10, 7),
        tracking=True,
        help='GPS longitude for pickup point (can be updated dynamically).',
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

    destination_latitude = fields.Float(
        string='Destination Latitude',
        digits=(10, 7),
        help='GPS latitude for destination point.',
    )

    destination_longitude = fields.Float(
        string='Destination Longitude',
        digits=(10, 7),
        help='GPS longitude for destination point.',
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
            # Auto-populate coordinates from selected location
            if self.pickup_location_id.latitude and self.pickup_location_id.longitude:
                self.pickup_latitude = self.pickup_location_id.latitude
                self.pickup_longitude = self.pickup_location_id.longitude

    @api.onchange('destination_location_id')
    def _onchange_destination_location(self):
        if self.destination_location_id:
            self.destination = self.destination_location_id.display_name_custom
            # Auto-populate coordinates from selected location
            if self.destination_location_id.latitude and self.destination_location_id.longitude:
                self.destination_latitude = self.destination_location_id.latitude
                self.destination_longitude = self.destination_location_id.longitude

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
        
        # CRITICAL: Call parent write method to actually save the changes!
        return super().write(vals)
    
    # =========================================================================
    # DRIVER MOBILE APP ACTIONS (NFR-2.1: Safety - Simple driver interface)
    # =========================================================================
    
    def action_start_trip(self):
        """
        Driver action: Start the trip (change state to in_progress).
        Called from Driver Mobile App when driver begins journey.
        
        Security: Only assigned driver can start their trip.
        """
        self.ensure_one()
        
        # Security check: Only assigned driver can start
        if self.assigned_driver_id.user_id.id != self.env.user.id:
            raise UserError(_('Only the assigned driver can start this trip.'))
        
        if self.state != 'approved':
            raise UserError(_('Only approved trips can be started.'))
        
        # Record start time and change state
        self.write({
            'state': 'in_progress',
            'actual_start_dt': fields.Datetime.now(),
        })
        
        # Log audit trail
        self.env['messob.fms.audit.log'].log_business_action(
            action='START_TRIP',
            model=self._name,
            record_id=self.id,
            description=f"Trip {self.name} started by driver {self.assigned_driver_id.name}",
            severity='medium'
        )
        
        # Send notification to requester
        self.message_post(
            body=f"Your trip has started. Driver: {self.assigned_driver_id.name}",
            subject=f"Trip Started: {self.name}",
            partner_ids=[self.requester_id.id],
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Trip Started'),
                'message': _('Trip has been started successfully.'),
                'type': 'success',
                'sticky': False,
            }
        }
    
    def action_complete_trip(self):
        """
        Driver action: Complete the trip (change state to completed).
        Called from Driver Mobile App when driver finishes journey.
        
        Security: Only assigned driver can complete their trip.
        """
        self.ensure_one()
        
        # Security check: Only assigned driver can complete
        if self.assigned_driver_id.user_id.id != self.env.user.id:
            raise UserError(_('Only the assigned driver can complete this trip.'))
        
        if self.state != 'in_progress':
            raise UserError(_('Only in-progress trips can be completed.'))
        
        # Record completion time and change state
        self.write({
            'state': 'completed',
            'actual_end_dt': fields.Datetime.now(),
        })
        
        # Log audit trail
        self.env['messob.fms.audit.log'].log_business_action(
            action='COMPLETE',
            model=self._name,
            record_id=self.id,
            description=f"Trip {self.name} completed by driver {self.assigned_driver_id.name}",
            severity='medium'
        )
        
        # Send notification to requester and dispatcher
        self.message_post(
            body=f"Your trip has been completed. Thank you for using MESSOB Fleet Management.",
            subject=f"Trip Completed: {self.name}",
            partner_ids=[self.requester_id.id],
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Trip Completed'),
                'message': _('Trip has been completed successfully.'),
                'type': 'success',
                'sticky': False,
            }
        }
    
    def action_report_incident(self, incident_type, description, location=None, photo=None):
        """
        Driver action: Report an incident during trip.
        Creates an audit log and notifies dispatcher.
        
        Args:
            incident_type: Type of incident (accident, breakdown, delay, etc.)
            description: Detailed description of the incident
            location: Optional GPS coordinates
            photo: Optional base64 encoded photo evidence
        """
        self.ensure_one()
        
        # Security check: Only assigned driver can report
        # Check both user_id link and partner_id to handle different Odoo configurations
        current_user_partner = self.env.user.partner_id
        driver_has_user_link = self.assigned_driver_id.user_id and self.assigned_driver_id.user_id.id == self.env.user.id
        driver_is_current_user_partner = self.assigned_driver_id.id == current_user_partner.id
        
        if not (driver_has_user_link or driver_is_current_user_partner):
            raise UserError(_('Only the assigned driver can report incidents.'))
        
        # Log incident in audit trail
        incident_details = (
            f"Trip: {self.name} | "
            f"Type: {incident_type} | "
            f"Description: {description} | "
            f"Location: {location or 'Not provided'} | "
            f"Timestamp: {fields.Datetime.now().isoformat()}"
        )
        
        self.env['messob.fms.audit.log'].log_business_action(
            action='INCIDENT',
            model=self._name,
            record_id=self.id,
            description=f"Incident reported on trip {self.name}: {incident_type} - {incident_details}",
            severity='high'
        )
        
        # Prepare message body with photo attachment if provided
        message_body = (
            f"<strong>INCIDENT REPORTED</strong><br/>"
            f"Type: {incident_type}<br/>"
            f"Description: {description}<br/>"
            f"Location: {location or 'Not provided'}<br/>"
            f"Driver: {self.assigned_driver_id.name}<br/>"
            f"Time: {fields.Datetime.now()}<br/>"
        )
        
        if photo:
            message_body += f"<br/>📷 Photo evidence attached"
        
        # Send urgent notification to dispatcher
        dispatcher_group = self.env.ref('messob_fleet.group_fms_dispatcher')
        dispatcher_users = dispatcher_group.users
        
        # Create message with optional photo attachment
        message_values = {
            'body': message_body,
            'subject': f"URGENT: Incident on Trip {self.name}",
            'partner_ids': dispatcher_users.mapped('partner_id').ids,
            'message_type': 'notification',
        }
        
        # If photo provided, add as attachment
        attachments = []
        if photo:
            try:
                # Extract base64 data (remove data:image/...;base64, prefix if present)
                if ',' in photo:
                    photo_data = photo.split(',')[1]
                else:
                    photo_data = photo
                    
                attachment = self.env['ir.attachment'].create({
                    'name': f'Incident_Photo_{self.name}_{fields.Datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg',
                    'datas': photo_data,
                    'res_model': self._name,
                    'res_id': self.id,
                    'type': 'binary',
                })
                attachments.append(attachment.id)
            except Exception as e:
                _logger.warning(f"Failed to attach photo to incident report: {e}")
        
        # Post message with attachments
        self.message_post(
            body=message_body,
            subject=message_values['subject'],
            partner_ids=message_values['partner_ids'],
            message_type=message_values['message_type'],
            attachment_ids=attachments if attachments else False,
        )
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Incident Reported'),
                'message': _('Dispatcher has been notified.'),
                'type': 'warning',
                'sticky': True,
            }
        }
    
    # Continue with parent write method to handle driver assignment tracking
        if 'assigned_driver_id' in vals:
            for rec in self:
                if vals['assigned_driver_id'] != rec.assigned_driver_id.id:
                    old_driver = rec.assigned_driver_id.name if rec.assigned_driver_id and rec.assigned_driver_id.exists() else 'None'
                    new_driver_obj = self.env['messob.fms.driver'].browse(vals['assigned_driver_id']) if vals['assigned_driver_id'] else None
                    new_driver = new_driver_obj.name if new_driver_obj and new_driver_obj.exists() else 'None'
                    
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
    
    # =========================================================================
    # PERFORMANCE OPTIMIZATION (NFR-1: Performance Requirements)
    # =========================================================================
    
    def _auto_init(self):
        """
        Create composite indexes for frequently queried field combinations.
        This improves query performance for dispatcher operations and reporting:
        - state + start_dt: Pending queue and calendar views
        - requester_id + state: Personal dashboard filtering
        - assigned_vehicle_id + start_dt + end_dt: Vehicle availability checks (BR-2)
        - assigned_driver_id + start_dt + end_dt: Driver availability checks (BR-3)
        
        NFR-1.1: API response time for trip list operations should be <500ms.
        NFR-1.2: Support efficient conflict detection for resource assignment.
        """
        res = super()._auto_init()
        
        # Composite index for pending queue and status filtering
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_trip_state_start_dt_idx 
            ON messob_fms_trip (state, start_dt ASC)
        """)
        
        # Composite index for personal dashboard queries (FR-1.2)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_trip_requester_state_idx 
            ON messob_fms_trip (requester_id, state, create_date DESC)
        """)
        
        # Composite index for vehicle availability queries (BR-2: No double-booking)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_trip_vehicle_timerange_idx 
            ON messob_fms_trip (assigned_vehicle_id, start_dt, end_dt) 
            WHERE assigned_vehicle_id IS NOT NULL AND state IN ('approved', 'in_progress')
        """)
        
        # Composite index for driver availability queries (BR-3: No double-booking)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_trip_driver_timerange_idx 
            ON messob_fms_trip (assigned_driver_id, start_dt, end_dt) 
            WHERE assigned_driver_id IS NOT NULL AND state IN ('approved', 'in_progress')
        """)
        
        # Composite index for fleet calendar queries (FR-2.3)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_trip_calendar_idx 
            ON messob_fms_trip (start_dt, end_dt, state)
        """)
        
        _logger.info("Trip Request: Composite indexes created for performance optimization (NFR-1)")
        return res

    @api.model
    def cleanup_orphaned_drivers(self):
        """
        Clean up trips with driver references that no longer exist.
        This can happen if drivers are deleted from the system.
        """
        trips = self.search([('assigned_driver_id', '!=', False)])
        cleaned = 0
        for trip in trips:
            if trip.assigned_driver_id and not trip.assigned_driver_id.exists():
                trip.write({'assigned_driver_id': False})
                cleaned += 1
        return cleaned

    def get_collaborative_users(self):
        """
        FR-3.3: Get all service users (passengers) sharing the same vehicle
        for collaborative pickup coordination.
        
        Returns:
            dict: Collaborative users data with pickup locations
        """
        self.ensure_one()
        
        if not self.assigned_vehicle_id:
            return {
                'success': False,
                'error': 'No vehicle assigned to this trip'
            }
        
        # Find other approved/in-progress trips with the same vehicle
        # that overlap in time (same route/day)
        other_trips = self.search([
            ('id', '!=', self.id),
            ('assigned_vehicle_id', '=', self.assigned_vehicle_id.id),
            ('state', 'in', ['approved', 'in_progress']),
            ('start_dt', '<=', self.end_dt),
            ('end_dt', '>=', self.start_dt),
        ], order='start_dt asc')
        
        # Get geocoding service for coordinate resolution
        geocoding_service = self.env['messob.fms.geocoding.service']
        
        # Build current trip data
        # Use explicit coordinates if available, otherwise geocode address
        if self.pickup_latitude and self.pickup_longitude:
            current_lat = self.pickup_latitude
            current_lng = self.pickup_longitude
        else:
            current_coords = geocoding_service.geocode_address(self.pickup) if self.pickup else None
            current_lat = current_coords.get('latitude', 9.0320) if current_coords else 9.0320
            current_lng = current_coords.get('longitude', 38.7469) if current_coords else 38.7469
        
        current_trip_data = {
            'trip_id': self.id,
            'request_id': self.name,
            'requester': self.requester_id.name if self.requester_id else 'Unknown',
            'pickup_address': self.pickup or '',
            'pickup_coordinates': {
                'lat': current_lat,
                'lng': current_lng,
            },
            'start_time': self.start_dt.strftime('%Y-%m-%d %H:%M') if self.start_dt else '',
            'status': self.state,
        }
        
        # Build service users list
        service_users = []
        for trip in other_trips:
            # Use explicit coordinates if available, otherwise geocode
            if trip.pickup_latitude and trip.pickup_longitude:
                trip_lat = trip.pickup_latitude
                trip_lng = trip.pickup_longitude
            else:
                coords = geocoding_service.geocode_address(trip.pickup) if trip.pickup else None
                trip_lat = coords.get('latitude', 9.0320) if coords else 9.0320
                trip_lng = coords.get('longitude', 38.7469) if coords else 38.7469
            
            user_data = {
                'trip_id': trip.id,
                'request_id': trip.name,
                'requester': trip.requester_id.name if trip.requester_id else 'Unknown',
                'department': trip.requester_id.function if trip.requester_id and hasattr(trip.requester_id, 'function') else None,
                'pickup_address': trip.pickup or '',
                'pickup_coordinates': {
                    'lat': trip_lat,
                    'lng': trip_lng,
                },
                'start_time': trip.start_dt.strftime('%Y-%m-%d %H:%M') if trip.start_dt else '',
                'status': trip.state,
                'phone': trip.requester_id.phone if trip.requester_id and trip.requester_id.phone else None,
                'email': trip.requester_id.email if trip.requester_id and trip.requester_id.email else None,
                'contact_allowed': True,  # Can be controlled by privacy settings
            }
            service_users.append(user_data)
        
        # Vehicle information
        vehicle_data = {
            'id': self.assigned_vehicle_id.id,
            'plate_no': self.assigned_vehicle_id.license_plate,
            'model': self.assigned_vehicle_id.model_id.name if self.assigned_vehicle_id.model_id else 'Unknown',
            'category': dict(self._fields['vehicle_category'].selection).get(self.vehicle_category, self.vehicle_category),
        }
        
        return {
            'success': True,
            'current_trip': current_trip_data,
            'service_users': service_users,
            'vehicle': vehicle_data,
            'total_passengers': len(service_users) + 1,
        }

    def update_pickup_coordinates(self, latitude, longitude):
        """
        FR-3.4: Dynamic Pickup Point Update
        
        Allows staff to update their exact pickup coordinates in real-time.
        Broadcasts the change via WebSocket to the assigned driver for immediate sync.
        
        Args:
            latitude (float): New pickup latitude
            longitude (float): New pickup longitude
            
        Returns:
            dict: Success status and updated coordinates
            
        Security:
            - Only the requester can update their own pickup point
            - Only works for approved or in-progress trips
            - Driver receives real-time notification
        """
        self.ensure_one()
        
        # Security check: Only requester can update their pickup point
        if self.requester_id.id != self.env.user.partner_id.id:
            # Allow dispatcher/admin to update as well
            if not self.env.user.has_group('messob_fleet.group_fms_dispatcher') and \
               not self.env.user.has_group('messob_fleet.group_fms_admin'):
                raise UserError(_('Only the trip requester can update pickup coordinates.'))
        
        # State check: Only approved or in-progress trips can be updated
        if self.state not in ['approved', 'in_progress']:
            raise UserError(_('Pickup coordinates can only be updated for approved or in-progress trips.'))
        
        # Validate coordinates
        if not (-90 <= latitude <= 90):
            raise UserError(_('Latitude must be between -90 and 90 degrees.'))
        if not (-180 <= longitude <= 180):
            raise UserError(_('Longitude must be between -180 and 180 degrees.'))
        
        # Store old coordinates for audit
        old_lat = self.pickup_latitude
        old_lng = self.pickup_longitude
        
        # Update coordinates
        self.write({
            'pickup_latitude': latitude,
            'pickup_longitude': longitude,
        })
        
        # Log the coordinate update in audit trail
        self.env['messob.fms.audit.log'].sudo().log_business_action(
            action='UPDATE_PICKUP',
            model=self._name,
            record_id=self.id,
            description=f"Pickup coordinates updated for trip {self.name}: "
                       f"({old_lat}, {old_lng}) → ({latitude}, {longitude})",
            severity='medium',
            additional_data={
                'old_coordinates': {'lat': old_lat, 'lng': old_lng},
                'new_coordinates': {'lat': latitude, 'lng': longitude},
                'requester': self.requester_id.name if self.requester_id else 'Unknown',
                'trip_state': self.state,
            }
        )
        
        # Broadcast via WebSocket to assigned driver (FR-3.4: Real-time sync)
        if self.assigned_driver_id:
            try:
                # Channel specific to this driver
                self.env['bus.bus']._sendone(
                    f'trip_update_{self.assigned_driver_id.id}',
                    'pickup_updated',
                    {
                        'trip_id': self.id,
                        'trip_name': self.name,
                        'requester_name': self.requester_id.name if self.requester_id else 'Unknown',
                        'pickup_address': self.pickup,
                        'lat': latitude,
                        'lng': longitude,
                        'timestamp': fields.Datetime.now().isoformat(),
                        'message': f'{self.requester_id.name} updated their pickup location',
                    }
                )
                _logger.info(
                    f"Broadcasted pickup update to driver {self.assigned_driver_id.name} "
                    f"for trip {self.name}"
                )
            except Exception as e:
                _logger.error(f"Failed to broadcast pickup update via WebSocket: {e}")
        
        # Also broadcast to dispatcher dashboard for visibility
        try:
            self.env['bus.bus']._sendone(
                'dispatcher_trip_updates',
                'pickup_updated',
                {
                    'trip_id': self.id,
                    'trip_name': self.name,
                    'requester_name': self.requester_id.name if self.requester_id else 'Unknown',
                    'driver_name': self.assigned_driver_id.name if self.assigned_driver_id else 'Unassigned',
                    'lat': latitude,
                    'lng': longitude,
                    'timestamp': fields.Datetime.now().isoformat(),
                }
            )
        except Exception as e:
            _logger.error(f"Failed to broadcast to dispatcher dashboard: {e}")
        
        # Send notification message to driver
        if self.assigned_driver_id:
            self.message_post(
                body=f"<strong>Pickup Location Updated</strong><br/>"
                     f"Requester: {self.requester_id.name if self.requester_id else 'Unknown'}<br/>"
                     f"New pickup coordinates: {latitude}, {longitude}<br/>"
                     f"Address: {self.pickup}<br/>"
                     f"Please check your map for the updated location.",
                subject=f"Pickup Updated: {self.name}",
                partner_ids=[self.assigned_driver_id.id],
                message_type='notification',
            )
        
        return {
            'success': True,
            'message': 'Pickup coordinates updated and driver notified',
            'trip_id': self.id,
            'coordinates': {
                'latitude': latitude,
                'longitude': longitude,
            },
            'driver_notified': bool(self.assigned_driver_id),
        }

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
        # Only show ACTIVE maintenance (vehicle is currently unavailable)
        all_maintenance = Maintenance.search([
            ('vehicle_id', 'in', vehicles.ids),
            ('date', '<=', end_dt),
            ('date', '>=', start_dt),
            ('vehicle_state', '=', 'inactive'),  # Only inactive vehicles (under maintenance)
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
                    'type': dict(maint._fields['service_type'].selection).get(maint.service_type, 'Maintenance') if hasattr(maint, 'service_type') and maint.service_type else 'Maintenance',
                    'start_dt': f"{maint.date.isoformat()}T00:00:00",  # Start of maintenance day
                    'end_dt': f"{maint.date.isoformat()}T23:59:59",    # End of maintenance day
                    'description': maint.description or f"{dict(maint._fields['service_type'].selection).get(maint.service_type, 'Maintenance')} - {maint.service_provider or 'Workshop'}",
                    'status': maint.vehicle_state,
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
        
        # Clean up orphaned driver reference
        if trip.assigned_driver_id and not trip.assigned_driver_id.exists():
            trip.write({'assigned_driver_id': False})
        
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
                    'id': trip.assigned_driver_id.id if trip.assigned_driver_id and trip.assigned_driver_id.exists() else None,
                    'name': trip.assigned_driver_id.name if trip.assigned_driver_id and trip.assigned_driver_id.exists() else 'Driver Not Found',
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
        # Ethiopian cities coordinates (comprehensive list)
        city_coords = {
            # =====================================================================
            # ADDIS ABABA - Comprehensive Locations (60+ locations)
            # =====================================================================
            
            # Central Addis Ababa
            'MESSOB Center HQ': {'lat': 9.0320, 'lng': 38.7469},
            'Addis Ababa': {'lat': 9.0320, 'lng': 38.7469},
            'Meskel Square': {'lat': 9.0105, 'lng': 38.7614},
            'Mexico Square': {'lat': 9.0192, 'lng': 38.7525},
            'Arat Kilo': {'lat': 9.0400, 'lng': 38.7600},
            'Sidist Kilo': {'lat': 9.0380, 'lng': 38.7630},
            'Saris': {'lat': 9.0150, 'lng': 38.7400},
            '6 Kilo': {'lat': 9.0410, 'lng': 38.7640},
            
            # Bole Area
            'Bole': {'lat': 8.9950, 'lng': 38.7850},
            'Bole Airport': {'lat': 8.9806, 'lng': 38.7992},
            'Bole International Airport': {'lat': 8.9779, 'lng': 38.7993},
            'Bole Medhanialem': {'lat': 9.0050, 'lng': 38.7850},
            'Bole Arabsa': {'lat': 8.9950, 'lng': 38.8100},
            'Bole Bulbula': {'lat': 8.9806, 'lng': 38.7578},
            'Bole Road': {'lat': 8.9900, 'lng': 38.7700},
            'Bole Michael': {'lat': 9.0000, 'lng': 38.7800},
            'Bole Rwanda': {'lat': 8.9980, 'lng': 38.7920},
            'Bole Atlas': {'lat': 8.9930, 'lng': 38.7880},
            'Edna Mall': {'lat': 8.9970, 'lng': 38.7920},
            
            # Kirkos Sub-city
            'Kirkos': {'lat': 9.0250, 'lng': 38.7550},
            'CMC': {'lat': 9.0100, 'lng': 38.7650},
            'Mekanisa': {'lat': 9.0050, 'lng': 38.7700},
            'Akaki Kality': {'lat': 8.8950, 'lng': 38.7650},
            
            # Arada Sub-city  
            'Piazza': {'lat': 9.0420, 'lng': 38.7500},
            'Arada': {'lat': 9.0380, 'lng': 38.7450},
            'De Gaulle Square': {'lat': 9.0330, 'lng': 38.7420},
            'Tewodros Square': {'lat': 9.0390, 'lng': 38.7480},
            'Churchill Avenue': {'lat': 9.0280, 'lng': 38.7450},
            'Arada Giorgis': {'lat': 9.0360, 'lng': 38.7460},
            
            # Lideta Sub-city
            'Mercato': {'lat': 9.0370, 'lng': 38.7444},
            'Merkato': {'lat': 9.0300, 'lng': 38.7350},
            'Lideta': {'lat': 9.0320, 'lng': 38.7380},
            'Autobus Tera': {'lat': 9.0340, 'lng': 38.7360},
            'Legehar': {'lat': 9.0450, 'lng': 38.7550},
            
            # Gulele Sub-city
            'Gulele': {'lat': 9.0650, 'lng': 38.7300},
            'Entoto': {'lat': 9.0800, 'lng': 38.7400},
            'Shiromeda': {'lat': 9.0550, 'lng': 38.7350},
            'Gullele Botanic Garden': {'lat': 9.0680, 'lng': 38.7320},
            
            # Yeka Sub-city
            'Megenagna': {'lat': 9.0250, 'lng': 38.7950},
            'Gerji': {'lat': 9.0100, 'lng': 38.8050},
            'Summit': {'lat': 9.0200, 'lng': 38.8100},
            'Ayat': {'lat': 9.0450, 'lng': 38.8300},
            'CMC Mazoria': {'lat': 9.0080, 'lng': 38.8000},
            'Kality': {'lat': 8.9200, 'lng': 38.7500},
            'Yeka Abado': {'lat': 9.0350, 'lng': 38.8200},
            'Megenagna 2': {'lat': 9.0280, 'lng': 38.7980},
            
            # Nifas Silk-Lafto
            'Nifas Silk': {'lat': 8.9800, 'lng': 38.7200},
            'Lafto': {'lat': 8.9650, 'lng': 38.7300},
            'Gotera': {'lat': 8.9700, 'lng': 38.7350},
            
            # Addis Ketema
            'Addis Ketema': {'lat': 9.0380, 'lng': 38.7350},
            'Shiro Meda': {'lat': 9.0550, 'lng': 38.7350},
            
            # Kolfe Keranio
            'Kolfe': {'lat': 9.0150, 'lng': 38.6950},
            'Keranio': {'lat': 9.0200, 'lng': 38.6900},
            'Sebategna': {'lat': 9.0100, 'lng': 38.7000},
            
            # Lemi Kura
            'Lemi Kura': {'lat': 9.0000, 'lng': 38.6800},
            'Gurd Shola': {'lat': 9.0050, 'lng': 38.6850},
            
            # Akaki Kaliti
            'Akaki': {'lat': 8.8800, 'lng': 38.7600},
            'Kaliti': {'lat': 8.9100, 'lng': 38.7450},
            
            # Major Landmarks & Institutions
            'National Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'University': {'lat': 9.0370, 'lng': 38.7620},
            'Addis Ababa University': {'lat': 9.0370, 'lng': 38.7620},
            'Black Lion Hospital': {'lat': 9.0380, 'lng': 38.7650},
            'Menelik II Hospital': {'lat': 9.0350, 'lng': 38.7600},
            'National Theatre': {'lat': 9.0310, 'lng': 38.7440},
            'Hilton Hotel': {'lat': 9.0320, 'lng': 38.7490},
            'Sheraton Hotel': {'lat': 9.0380, 'lng': 38.7520},
            'African Union': {'lat': 9.0150, 'lng': 38.7630},
            'AU Headquarters': {'lat': 9.0150, 'lng': 38.7630},
            'ECA Conference Center': {'lat': 9.0130, 'lng': 38.7620},
            'Millennium Hall': {'lat': 9.0280, 'lng': 38.7580},
            'National Palace': {'lat': 9.0330, 'lng': 38.7470},
            'Menelik Palace': {'lat': 9.0340, 'lng': 38.7460},
            'Holy Trinity Cathedral': {'lat': 9.0350, 'lng': 38.7550},
            
            # Shopping & Commercial Areas
            'Shola Market': {'lat': 9.0400, 'lng': 38.7500},
            'Asko': {'lat': 9.0100, 'lng': 38.7400},
            'Tor Hailoch': {'lat': 9.0150, 'lng': 38.7300},
            
            # Residential Areas
            'Old Airport': {'lat': 9.0080, 'lng': 38.7850},
            'Kazanchis': {'lat': 9.0220, 'lng': 38.7620},
            'Sarbet': {'lat': 9.0200, 'lng': 38.7500},
            'Mexico': {'lat': 9.0192, 'lng': 38.7525},
            '22 Mazoria': {'lat': 9.0150, 'lng': 38.7950},
            'CMC Area': {'lat': 9.0100, 'lng': 38.7650},
            
            # =====================================================================
            # MAJOR ETHIOPIAN CITIES
            # =====================================================================
            'Dire Dawa': {'lat': 9.5930, 'lng': 41.8661},
            'Mekelle': {'lat': 13.4967, 'lng': 39.4753},
            'Gondar': {'lat': 12.6000, 'lng': 37.4667},
            'Bahir Dar': {'lat': 11.5933, 'lng': 37.3905},
            'Hawassa': {'lat': 7.0500, 'lng': 38.4667},
            'Adama': {'lat': 8.5400, 'lng': 39.2700},
            'Adama (Nazret)': {'lat': 8.5400, 'lng': 39.2700},
            'Nazret': {'lat': 8.5400, 'lng': 39.2700},
            'Jimma': {'lat': 7.6667, 'lng': 36.8333},
            'Jijiga': {'lat': 9.3500, 'lng': 42.8000},
            'Dessie': {'lat': 11.1333, 'lng': 39.6333},
            'Harar': {'lat': 9.3100, 'lng': 42.1200},
            'Shashamane': {'lat': 7.2000, 'lng': 38.6000},
            'Debre Birhan': {'lat': 9.6833, 'lng': 39.5333},
            'Arba Minch': {'lat': 6.0333, 'lng': 37.5500},
            'Nekemte': {'lat': 9.0833, 'lng': 36.5333},
            'Debre Markos': {'lat': 10.3500, 'lng': 37.7167},
            'Asella': {'lat': 7.9500, 'lng': 39.1333},
            'Gambela': {'lat': 8.2500, 'lng': 34.5833},
            'Semera': {'lat': 11.7833, 'lng': 41.0000},
        }
        
        # Check if address matches known locations (case-insensitive)
        address_lower = address.lower().strip()
        for city, coords in city_coords.items():
            if city.lower() in address_lower:
                return coords
        
        # If no match found, return Addis Ababa as default
        _logger.warning(f"Location not found in database: {address}. Defaulting to Addis Ababa.")
        return {'lat': 9.0320, 'lng': 38.7469}

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
        """Calculate distance between two coordinates using Haversine formula."""
        import math
        
        # Earth's radius in kilometers
        R = 6371.0
        
        # Convert coordinates to radians
        lat1 = math.radians(start_coords['lat'])
        lon1 = math.radians(start_coords['lng'])
        lat2 = math.radians(end_coords['lat'])
        lon2 = math.radians(end_coords['lng'])
        
        # Haversine formula (straight-line distance)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        straight_distance = R * c
        
        # Apply road distance multiplier for more realistic estimates
        # Roads in mountainous Ethiopia are rarely straight
        if straight_distance < 50:  # Short urban distances
            road_distance = straight_distance * 1.3  # 30% longer due to streets
        elif straight_distance < 200:  # Medium distances
            road_distance = straight_distance * 1.5  # 50% longer due to terrain
        else:  # Long distances
            road_distance = straight_distance * 1.8  # 80% longer due to mountains/valleys
        
        return round(road_distance, 2)

    def _estimate_duration(self, start_coords, end_coords):
        """Estimate travel duration based on distance."""
        distance = self._calculate_distance(start_coords, end_coords)
        
        # Use realistic average speeds based on distance
        if distance < 20:  # City driving
            avg_speed = 25  # km/h in heavy traffic
        elif distance < 100:  # Regional roads
            avg_speed = 50  # km/h
        else:  # Highway/long distance
            avg_speed = 65  # km/h (accounting for road conditions in Ethiopia)
        
        duration_hours = distance / avg_speed
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
