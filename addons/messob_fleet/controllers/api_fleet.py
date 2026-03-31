# api_fleet.py
from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class FleetController(http.Controller):

    @http.route('/api/vehicles', type='json', auth='user', methods=['GET'], cors='*')
    def get_vehicles(self):
        # Fetch all vehicles or filter by available
        vehicles = request.env['fleet.vehicle'].sudo().search([('vehicle_status', '=', 'available')])
        return {'vehicles': [{'id': v.id, 'name': v.name, 'plate': v.license_plate, 'status': v.vehicle_status} for v in vehicles]}

    @http.route('/api/vehicles/<int:vehicle_id>/maintenance', type='json', auth='user', methods=['POST'], cors='*')
    def log_maintenance(self, vehicle_id):
        # Protect route to Mechanics Admin
        if not request.env.user.has_group('messob_fleet.group_messob_mechanic'):
            return {'error': 'Unauthorized: Only mechanics can perform this action'}
            
        data = request.jsonrequest
        try:
            log = request.env['messob.maintenance.log'].sudo().create({
                'vehicle_id': vehicle_id,
                'type': data.get('type', 'General Maintenance'),
                'description': data.get('description', ''),
                'cost': data.get('cost', 0.0),
                'service_provider': data.get('provider', 'Internal MESSOB')
            })
            return {'id': log.id, 'message': 'Maintenance logged successfully'}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/api/gps/update', type='json', auth='none', methods=['POST'], csrf=False, cors='*')
    def gps_update(self):
        data = request.jsonrequest
        vehicle_id = data.get('vehicle_id')
        lat = data.get('lat')
        lng = data.get('lng')
        
        # In a real environment, we would also verify an API key passed in the headers here.
        if not vehicle_id or not lat or not lng:
             return {'error': 'Missing coordinates'}
             
        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if vehicle.exists():
            # Standard Odoo fleet doesn't have current_lat natively, 
            # so we're logging this request or creating a track if we had coordinates fields.
            _logger.info(f"Vehicle {vehicle_id} pinged GPS: {lat}, {lng}")
            return {'message': 'GPS received'}
            
        return {'error': 'Vehicle not found'}
