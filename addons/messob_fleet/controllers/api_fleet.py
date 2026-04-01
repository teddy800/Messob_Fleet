# api_fleet.py
import logging
import os

from odoo import http # type: ignore
from odoo.http import request # type: ignore
from odoo.exceptions import ValidationError # type: ignore

_logger = logging.getLogger(__name__)

# API key for GPS gateway — set GPS_API_KEY in the environment (HW-1)
GPS_API_KEY = os.environ.get('MESSOB_GPS_API_KEY', '')


def _check_gps_api_key():
    """Validate the X-GPS-Api-Key header against the configured key."""
    if not GPS_API_KEY:
        return True  # key not configured — allow (dev mode)
    return request.httprequest.headers.get('X-GPS-Api-Key') == GPS_API_KEY


class FleetController(http.Controller):

    # ------------------------------------------------------------------
    # GET /api/vehicles  — list vehicles (available by default)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles', type='json', auth='user', methods=['GET'], cors='*')
    def get_vehicles(self):
        body = request.jsonrequest or {}
        domain = []
        if body.get('status'):
            domain.append(('vehicle_status', '=', body['status']))
        else:
            domain.append(('vehicle_status', '=', 'available'))

        vehicles = request.env['fleet.vehicle'].sudo().search(domain)
        return {
            'vehicles': [
                {
                    'id': v.id,
                    'name': v.name,
                    'plate': v.license_plate,
                    'category': v.type_id.name if v.type_id else None,
                    'status': v.vehicle_status,
                    'current_lat': v.current_lat,
                    'current_lng': v.current_lng,
                }
                for v in vehicles
            ]
        }

    # ------------------------------------------------------------------
    # GET /api/vehicles/available  — vehicles free during a time window (FR-2.2)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles/available', type='json', auth='user', methods=['GET'], cors='*')
    def available_vehicles(self):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Access denied'}

        body = request.jsonrequest or {}
        start = body.get('start')
        end = body.get('end')
        category = body.get('category')

        if not start or not end:
            return {'error': 'start and end datetime are required'}

        # Find vehicles already booked in this window
        busy_ids = request.env['messob.trip.request'].sudo().search([
            ('status', 'in', ['approved', 'in_progress']),
            ('start_datetime', '<', end),
            ('end_datetime', '>', start),
        ]).mapped('assigned_vehicle_id.id')

        domain = [
            ('vehicle_status', '=', 'available'),
            ('id', 'not in', busy_ids),
        ]
        vehicles = request.env['fleet.vehicle'].sudo().search(domain)
        return {
            'vehicles': [
                {'id': v.id, 'name': v.name, 'plate': v.license_plate, 'status': v.vehicle_status}
                for v in vehicles
            ]
        }

    # ------------------------------------------------------------------
    # GET /api/drivers/available  — drivers free during a time window (FR-2.2)
    # ------------------------------------------------------------------
    @http.route('/api/drivers/available', type='json', auth='user', methods=['GET'], cors='*')
    def available_drivers(self):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_dispatcher') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Access denied'}

        body = request.jsonrequest or {}
        start = body.get('start')
        end = body.get('end')

        if not start or not end:
            return {'error': 'start and end datetime are required'}

        busy_ids = request.env['messob.trip.request'].sudo().search([
            ('status', 'in', ['approved', 'in_progress']),
            ('start_datetime', '<', end),
            ('end_datetime', '>', start),
        ]).mapped('assigned_driver_id.id')

        drivers = request.env['messob.driver'].sudo().search([
            ('is_on_duty', '=', True),
            ('id', 'not in', busy_ids),
        ])
        return {
            'drivers': [
                {'id': d.id, 'name': d.name, 'license_no': d.license_no}
                for d in drivers
            ]
        }

    # ------------------------------------------------------------------
    # POST /api/vehicles/<id>/fuel  — log a fuel transaction (FR-4.2)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles/<int:vehicle_id>/fuel', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def log_fuel(self, vehicle_id):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_driver') and \
                not user.has_group('messob_fleet.group_messob_mechanic') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Unauthorized'}

        data = request.jsonrequest or {}
        required = ['volume', 'cost', 'odometer']
        missing = [f for f in required if data.get(f) is None]
        if missing:
            return {'error': f'Missing fields: {", ".join(missing)}'}

        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if not vehicle.exists():
            return {'error': 'Vehicle not found'}

        try:
            log = request.env['messob.fuel.log'].sudo().create({
                'vehicle_id': vehicle_id,
                'volume': data['volume'],
                'cost': data['cost'],
                'odometer': data['odometer'],
                'station': data.get('station', ''),
                'date': data.get('date'),
            })
            # Update vehicle odometer
            if data['odometer'] > (vehicle.odometer or 0):
                vehicle.write({'odometer': data['odometer']})

            return {'id': log.id, 'message': 'Fuel log created'}
        except Exception as e:
            _logger.exception('Error logging fuel')
            return {'error': 'Internal server error'}

    # ------------------------------------------------------------------
    # POST /api/vehicles/<id>/maintenance  — log maintenance (FR-4.4)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles/<int:vehicle_id>/maintenance', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def log_maintenance(self, vehicle_id):
        user = request.env.user
        if not user.has_group('messob_fleet.group_messob_mechanic') and \
                not user.has_group('messob_fleet.group_messob_admin'):
            return {'error': 'Only mechanics or admins can log maintenance'}

        data = request.jsonrequest or {}
        if not data.get('type'):
            return {'error': 'type is required'}

        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if not vehicle.exists():
            return {'error': 'Vehicle not found'}

        try:
            log = request.env['messob.maintenance.log'].sudo().create({
                'vehicle_id': vehicle_id,
                'type': data['type'],
                'description': data.get('description', ''),
                'cost': data.get('cost', 0.0),
                'service_provider': data.get('provider', ''),
                'next_due_odometer': data.get('next_due_odometer', 0.0),
                'next_due_date': data.get('next_due_date'),
            })
            # While vehicle is in maintenance, mark it unavailable
            vehicle.write({'vehicle_status': 'maintenance'})

            request.env['messob.audit.log'].sudo().log_action(
                'vehicle_data',
                f'Maintenance logged for vehicle {vehicle.license_plate}: {data["type"]}',
                res_model='fleet.vehicle',
                res_id=vehicle_id,
            )
            return {'id': log.id, 'message': 'Maintenance logged'}
        except Exception as e:
            _logger.exception('Error logging maintenance')
            return {'error': 'Internal server error'}

    # ------------------------------------------------------------------
    # GET /api/vehicles/<id>/fuel/efficiency  — KM/Liter over time (FR-4.2)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles/<int:vehicle_id>/fuel/efficiency', type='json', auth='user', methods=['GET'], cors='*')
    def fuel_efficiency(self, vehicle_id):
        logs = request.env['messob.fuel.log'].sudo().search(
            [('vehicle_id', '=', vehicle_id)], order='odometer asc'
        )
        if len(logs) < 2:
            return {'efficiency': None, 'message': 'Not enough data'}

        total_km = logs[-1].odometer - logs[0].odometer
        total_liters = sum(l.volume for l in logs[1:])  # exclude first fill-up
        efficiency = round(total_km / total_liters, 2) if total_liters else 0
        return {'efficiency_km_per_liter': efficiency, 'total_km': total_km, 'total_liters': total_liters}

    # ------------------------------------------------------------------
    # POST /api/gps/update  — GPS gateway push (HW-1, FR-3.2)
    # ------------------------------------------------------------------
    @http.route('/api/gps/update', type='json', auth='none', methods=['POST'], csrf=False, cors='*')
    def gps_update(self):
        if not _check_gps_api_key():
            return {'error': 'Invalid or missing GPS API key'}

        data = request.jsonrequest or {}
        vehicle_id = data.get('vehicle_id')
        lat = data.get('lat')
        lng = data.get('lng')

        if not vehicle_id or lat is None or lng is None:
            return {'error': 'vehicle_id, lat, and lng are required'}

        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if not vehicle.exists():
            return {'error': 'Vehicle not found'}

        vehicle.write({'current_lat': lat, 'current_lng': lng})

        # Persist a timestamped GPS track record
        request.env['messob.gps.track'].sudo().create({
            'vehicle_id': vehicle_id,
            'lat': lat,
            'lng': lng,
        })
        return {'message': 'GPS location updated'}

    # ------------------------------------------------------------------
    # GET /api/vehicles/<id>/location  — latest GPS position (FR-3.2)
    # ------------------------------------------------------------------
    @http.route('/api/vehicles/<int:vehicle_id>/location', type='json', auth='user', methods=['GET'], cors='*')
    def vehicle_location(self, vehicle_id):
        vehicle = request.env['fleet.vehicle'].sudo().browse(vehicle_id)
        if not vehicle.exists():
            return {'error': 'Vehicle not found'}
        return {
            'vehicle_id': vehicle_id,
            'lat': vehicle.current_lat,
            'lng': vehicle.current_lng,
        }
