# api_trips.py
from odoo import http
from odoo.http import request
import json

class TripsController(http.Controller):

    @http.route('/api/trips', type='json', auth='user', methods=['GET'], cors='*')
    def get_trips(self):
        user = request.env.user
        
        # If Dispatcher, return all trips. Otherwise, return only standard user's requested trips or driver's assigned trips.
        if user.has_group('messob_fleet.group_messob_dispatcher'):
            domain = []
        elif user.has_group('messob_fleet.group_messob_driver'):
            driver = request.env['messob.driver'].search([('employee_id.user_id', '=', user.id)], limit=1)
            domain = [('assigned_driver_id', '=', driver.id)] if driver else [('id', '=', -1)] # no driver = no trips
        else:
            domain = [('requester_id', '=', user.id)]
            
        trips = request.env['messob.trip.request'].sudo().search(domain)
        
        result = []
        for t in trips:
            result.append({
                'id': t.id, 
                'name': t.name,
                'purpose': t.purpose, 
                'status': t.status,
                'priority': t.priority,
                'pickup_location': t.pickup_location,
                'dest_location': t.dest_location,
                'start_datetime': str(t.start_datetime) if t.start_datetime else None,
                'end_datetime': str(t.end_datetime) if t.end_datetime else None,
                'assigned_driver': t.assigned_driver_id.name if t.assigned_driver_id else None,
                'assigned_vehicle': t.assigned_vehicle_id.license_plate if t.assigned_vehicle_id else None
            })
        return {'trips': result}

    @http.route('/api/trips', type='json', auth='user', methods=['POST'], cors='*')
    def create_trip(self):
        data = request.jsonrequest
        # Check required fields
        if not all(k in data for k in ['purpose', 'category', 'start', 'end', 'pickup', 'destination']):
            return {'error': 'Missing required fields'}

        trip_val = {
            'requester_id': request.env.user.id,
            'purpose': data['purpose'],
            'vehicle_category_needed': data['category'],
            'start_datetime': data['start'],
            'end_datetime': data['end'],
            'pickup_location': data['pickup'],
            'dest_location': data['destination'],
            'priority': data.get('priority', '1'),
            'status': 'pending'
        }
        
        try:
            trip = request.env['messob.trip.request'].sudo().create(trip_val)
            return {'id': trip.id, 'name': trip.name, 'message': 'Trip request created successfully'}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/api/trips/<int:trip_id>/status', type='json', auth='user', methods=['PUT'], cors='*')
    def update_trip_status(self, trip_id):
        # Allow Drivers/Staff/Dispatchers to update statuses according to workflow
        data = request.jsonrequest
        new_status = data.get('status')
        trip = request.env['messob.trip.request'].browse(trip_id)
        
        if not trip.exists():
            return {'error': 'Trip not found'}
            
        if new_status not in ['draft', 'pending', 'approved', 'rejected', 'canceled', 'in_progress', 'completed', 'closed']:
            return {'error': 'Invalid status'}

        try:
            trip.write({'status': new_status})
            return {'message': f'Trip status updated to {new_status}'}
        except Exception as e:
            return {'error': str(e)}
