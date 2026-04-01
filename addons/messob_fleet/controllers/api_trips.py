# api_trips.py
import logging

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_trip(t):
    return {
        'id': t.id,
        'name': t.name,
        'purpose': t.purpose,
        'status': t.status,
        'priority': t.priority,
        'vehicle_category_needed': t.vehicle_category_needed,
        'pickup_location': t.pickup_location,
        'dest_location': t.dest_location,
        'start_datetime': t.start_datetime.isoformat() if t.start_datetime else None,
        'end_datetime': t.end_datetime.isoformat() if t.end_datetime else None,
        'requester': t.requester_id.name if t.requester_id else None,
        'assigned_driver': t.assigned_driver_id.name if t.assigned_driver_id else None,
        'assigned_vehicle': t.assigned_vehicle_id.license_plate if t.assigned_vehicle_id else None,
        'created_at': t.create_date.isoformat() if t.create_date else None,
    }


class TripsController(http.Controller):

    # ------------------------------------------------------------------
    # GET /api/trips  — list trips (role-aware)
    # ------------------------------------------------------------------
    @http.route('/api/trips', type='json', auth='user', methods=['GET'], cors='*')
    def get_trips(self):
        user = request.env.user

        if user.has_group('messob_fleet.group_messob_dispatcher') or \
                user.has_group('messob_fleet.group_messob_admin'):
            domain = []
        elif user.has_group('messob_fleet.group_messob_driver'):
            driver = request.env['messob.driver'].sudo().search(
                [('employee_id.user_id', '=', user.id)], limit=1
            )
            domain = [('assigned_driver_id', '=', driver.id)] if driver else [('id', '=', -1)]
        else:
            domain = [('requester_id', '=', user.id)]

        # Support simple query filters from the request body
        body = request.jsonrequest or {}
        if body.get('status'):
            domain.append(('status', '=', body['status']))

        trips = request.env['messob.trip.request'].sudo().search(
            domain, order='create_date desc'
        )
        return {'trips': [_serialize_trip(t) for t in trips]}

    # ------------------------------------------------------------------
    # POST /api/trips  — create a new trip request
    # ------------------------------------------------------------------
    @http.route('/api/trips', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def create_trip(self):
        data = request.jsonrequest or {}
        required = ['purpose', 'category', 'start', 'end', 'pickup', 'destination']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return {'error': f'Missing required fields: {", ".join(missing)}'}

        if len(data['purpose']) < 10:
            return {'error': 'Justification must be at least 10 characters (FR-1.1)'}

        try:
            trip = request.env['messob.trip.request'].sudo().create({
                'requester_id': request.env.user.id,
                'purpose': data['purpose'],
                'vehicle_category_needed': data['category'],
                'start_datetime': data['start'],
                'end_datetime': data['end'],
                'pickup_location': data['pickup'],
                'dest_location': data['destination'],
                'priority': data.get('priority', '1'),
                'status': 'pending',
            })
            return {'id': trip.id, 'name': trip.name, 'message': 'Trip request created'}
        except ValidationError as e:
            return {'error': str(e)}
        except Exception as e:
            _logger.exception('Error creating trip request')
            return {'error': 'Internal server error'}

    # ------------------------------------------------------------------
    # GET /api/trips/<id>  — single trip detail
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>', type='json', auth='user', methods=['GET'], cors='*')
    def get_trip(self, trip_id):
        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}
        # Enforce that standard users can only see their own trips
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin') and \
                trip.requester_id.id != user.id:
            return {'error': 'Access denied'}
        return {'trip': _serialize_trip(trip)}

    # ------------------------------------------------------------------
    # POST /api/trips/<id>/approve  — dispatcher approves + assigns
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>/approve', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def approve_trip(self, trip_id):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Only dispatchers can approve trip requests (BR-1)'}

        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}
        if trip.status != 'pending':
            return {'error': f'Cannot approve a trip in "{trip.status}" status'}

        data = request.jsonrequest or {}
        vehicle_id = data.get('vehicle_id')
        driver_id = data.get('driver_id')

        if not vehicle_id or not driver_id:
            return {'error': 'vehicle_id and driver_id are required for approval'}

        # Validate vehicle exists and is available
        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if not vehicle.exists() or vehicle.vehicle_status != 'available':
            return {'error': 'Selected vehicle is not available'}

        # Validate driver exists and is on duty
        driver = request.env['messob.driver'].sudo().browse(driver_id)
        if not driver.exists() or not driver.is_on_duty:
            return {'error': 'Selected driver is not on duty'}

        try:
            trip.write({
                'status': 'approved',
                'assigned_vehicle_id': vehicle_id,
                'assigned_driver_id': driver_id,
            })
            # Mark vehicle as on trip
            vehicle.write({'vehicle_status': 'on_trip'})

            request.env['messob.audit.log'].sudo().log_action(
                'approve',
                f'Dispatcher {user.name} approved trip {trip.name}, assigned vehicle {vehicle.license_plate} and driver {driver.name}',
                res_model='messob.trip.request',
                res_id=trip.id,
            )
            return {'message': 'Trip approved and resources assigned', 'trip': _serialize_trip(trip)}
        except ValidationError as e:
            return {'error': str(e)}
        except Exception as e:
            _logger.exception('Error approving trip')
            return {'error': 'Internal server error'}

    # ------------------------------------------------------------------
    # POST /api/trips/<id>/reject  — dispatcher rejects
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>/reject', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def reject_trip(self, trip_id):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Only dispatchers can reject trip requests (BR-1)'}

        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}
        if trip.status != 'pending':
            return {'error': f'Cannot reject a trip in "{trip.status}" status'}

        data = request.jsonrequest or {}
        reason = data.get('reason', '')

        try:
            trip.write({'status': 'rejected'})
            request.env['messob.audit.log'].sudo().log_action(
                'reject',
                f'Dispatcher {user.name} rejected trip {trip.name}. Reason: {reason}',
                res_model='messob.trip.request',
                res_id=trip.id,
            )
            return {'message': 'Trip rejected'}
        except Exception as e:
            _logger.exception('Error rejecting trip')
            return {'error': 'Internal server error'}

    # ------------------------------------------------------------------
    # POST /api/trips/<id>/cancel  — requester cancels their own pending trip
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>/cancel', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def cancel_trip(self, trip_id):
        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}

        user = request.env.user
        if trip.requester_id.id != user.id and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'You can only cancel your own requests'}

        if trip.status not in ('draft', 'pending'):
            return {'error': 'Only Draft or Pending trips can be cancelled (FR-1.3)'}

        trip.write({'status': 'canceled'})
        return {'message': 'Trip cancelled'}

    # ------------------------------------------------------------------
    # PUT /api/trips/<id>/progress  — driver logs trip progress
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>/progress', type='json', auth='user', methods=['PUT'], csrf=False, cors='*')
    def log_progress(self, trip_id):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_driver') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Only drivers can log trip progress'}

        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}

        data = request.jsonrequest or {}
        log_status = data.get('status')
        if log_status not in ('depart', 'arrive', 'delay'):
            return {'error': 'status must be one of: depart, arrive, delay'}

        # Auto-transition trip to in_progress on first depart
        if log_status == 'depart' and trip.status == 'approved':
            trip.write({'status': 'in_progress'})

        request.env['messob.trip.log'].sudo().create({
            'request_id': trip_id,
            'status': log_status,
            'odometer': data.get('odometer', 0.0),
            'notes': data.get('notes', ''),
        })
        return {'message': 'Progress logged'}

    # ------------------------------------------------------------------
    # POST /api/trips/<id>/complete  — driver/dispatcher marks trip done
    # ------------------------------------------------------------------
    @http.route('/api/trips/<int:trip_id>/complete', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def complete_trip(self, trip_id):
        trip = request.env['messob.trip.request'].sudo().browse(trip_id)
        if not trip.exists():
            return {'error': 'Trip not found'}
        if trip.status != 'in_progress':
            return {'error': 'Only in-progress trips can be completed'}

        trip.write({'status': 'completed'})
        # Free up the vehicle
        if trip.assigned_vehicle_id:
            trip.assigned_vehicle_id.write({'vehicle_status': 'available'})

        return {'message': 'Trip completed'}

    # ------------------------------------------------------------------
    # GET /api/trips/pending  — dispatcher queue (oldest first)
    # ------------------------------------------------------------------
    @http.route('/api/trips/pending', type='json', auth='user', methods=['GET'], cors='*')
    def pending_queue(self):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Access denied'}

        trips = request.env['messob.trip.request'].sudo().search(
            [('status', '=', 'pending')],
            order='create_date asc',  # oldest first per FR-2.1
        )
        return {'trips': [_serialize_trip(t) for t in trips]}
