# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: REST API for Frontend Integration
# File: fms_api.py (named fms_api to avoid conflict with odoo.api module)
#
# Base URL: /api/fms/v1/
# ---------------------------------------------------------------------------

import json
from odoo import http
from odoo.http import request, Response


def _json_response(data, status=200):
    return Response(
        json.dumps(data, default=str),
        status=status,
        mimetype='application/json',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    )


def _error(message, status=400):
    return _json_response({'success': False, 'error': message}, status)


def _success(data):
    return _json_response({'success': True, 'data': data})


class MessobFmsApi(http.Controller):

    # =========================================================================
    # AUTH
    # =========================================================================

    @http.route('/api/fms/v1/auth/login', type='json', auth='none',
                methods=['POST'], csrf=False, cors='*')
    def login(self, **kwargs):
        """
        POST /api/fms/v1/auth/login
        Body: { "login": "user@messob.org", "password": "pass" }
        """
        params = request.get_json_data()
        login    = params.get('login')
        password = params.get('password')
        db       = request.db

        uid = request.session.authenticate(db, login, password)
        if not uid:
            return {'success': False, 'error': 'Invalid credentials'}

        user = request.env['res.users'].sudo().browse(uid)
        return {
            'success': True,
            'data': {
                'uid':        uid,
                'name':       user.name,
                'email':      user.login,
                'role':       _get_user_role(user),
                'session_id': request.session.sid,
            }
        }

    # =========================================================================
    # TRIP REQUESTS — Staff
    # =========================================================================

    @http.route('/api/fms/v1/trips', type='http', auth='user',
                methods=['GET'], csrf=False, cors='*')
    def get_my_trips(self, **kwargs):
        """GET /api/fms/v1/trips?state=pending"""
        domain = [('requester_id', '=', request.env.user.partner_id.id)]
        state = kwargs.get('state')
        if state:
            domain.append(('state', '=', state))
        trips = request.env['messob.fms.trip'].search(domain, order='create_date desc')
        return _success([_format_trip(t) for t in trips])

    @http.route('/api/fms/v1/trips/<int:trip_id>', type='http', auth='user',
                methods=['GET'], csrf=False, cors='*')
    def get_trip(self, trip_id, **kwargs):
        """GET /api/fms/v1/trips/42"""
        trip = request.env['messob.fms.trip'].browse(trip_id)
        if not trip.exists():
            return _error('Trip not found', 404)
        return _success(_format_trip(trip))

    @http.route('/api/fms/v1/trips', type='json', auth='user',
                methods=['POST'], csrf=False, cors='*')
    def create_trip(self, **kwargs):
        """POST /api/fms/v1/trips"""
        data = request.get_json_data()
        try:
            trip = request.env['messob.fms.trip'].create({
                'purpose':          data.get('purpose'),
                'vehicle_category': data.get('vehicle_category'),
                'start_dt':         data.get('start_dt'),
                'end_dt':           data.get('end_dt'),
                'pickup':           data.get('pickup'),
                'destination':      data.get('destination'),
                'state':            'pending',
            })
            return {'success': True, 'data': _format_trip(trip)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route('/api/fms/v1/trips/<int:trip_id>/cancel', type='json',
                auth='user', methods=['POST'], csrf=False, cors='*')
    def cancel_trip(self, trip_id, **kwargs):
        """POST /api/fms/v1/trips/42/cancel"""
        trip = request.env['messob.fms.trip'].browse(trip_id)
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        try:
            trip.action_cancel()
            return {'success': True, 'message': 'Trip cancelled'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # DISPATCHER
    # =========================================================================

    @http.route('/api/fms/v1/dispatcher/pending', type='http', auth='user',
                methods=['GET'], csrf=False, cors='*')
    def get_pending_trips(self, **kwargs):
        """GET /api/fms/v1/dispatcher/pending"""
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return _error('Access denied', 403)
        trips = request.env['messob.fms.trip'].search(
            [('state', '=', 'pending')], order='create_date asc'
        )
        return _success([_format_trip(t) for t in trips])

    @http.route('/api/fms/v1/dispatcher/trips/<int:trip_id>/approve',
                type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def approve_trip(self, trip_id, **kwargs):
        """POST /api/fms/v1/dispatcher/trips/42/approve"""
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return {'success': False, 'error': 'Access denied'}
        data = request.get_json_data()
        trip = request.env['messob.fms.trip'].browse(trip_id)
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        try:
            trip.write({
                'assigned_vehicle_id': data.get('vehicle_id'),
                'assigned_driver_id':  data.get('driver_id'),
                'fuel_status':         data.get('fuel_status', 'full'),
            })
            trip.action_approve()
            return {'success': True, 'data': _format_trip(trip)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route('/api/fms/v1/dispatcher/trips/<int:trip_id>/reject',
                type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def reject_trip(self, trip_id, **kwargs):
        """POST /api/fms/v1/dispatcher/trips/42/reject"""
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return {'success': False, 'error': 'Access denied'}
        trip = request.env['messob.fms.trip'].browse(trip_id)
        if not trip.exists():
            return {'success': False, 'error': 'Trip not found'}
        try:
            trip.action_reject()
            return {'success': True, 'message': 'Trip rejected'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route('/api/fms/v1/dispatcher/available-vehicles', type='http',
                auth='user', methods=['GET'], csrf=False, cors='*')
    def get_available_vehicles(self, **kwargs):
        """GET /api/fms/v1/dispatcher/available-vehicles?start=...&end=..."""
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return _error('Access denied', 403)
        start = kwargs.get('start')
        end   = kwargs.get('end')
        booked = request.env['messob.fms.trip'].search([
            ('state', 'in', ['approved', 'in_progress']),
            ('start_dt', '<', end),
            ('end_dt',   '>', start),
        ]).mapped('assigned_vehicle_id.id')
        vehicles = request.env['fleet.vehicle'].search([('id', 'not in', booked)])
        return _success([{
            'id':    v.id,
            'name':  v.name,
            'plate': v.license_plate,
            'model': v.model_id.name if v.model_id else '',
        } for v in vehicles])

    @http.route('/api/fms/v1/dispatcher/available-drivers', type='http',
                auth='user', methods=['GET'], csrf=False, cors='*')
    def get_available_drivers(self, **kwargs):
        """GET /api/fms/v1/dispatcher/available-drivers?start=...&end=..."""
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return _error('Access denied', 403)
        start = kwargs.get('start')
        end   = kwargs.get('end')
        booked = request.env['messob.fms.trip'].search([
            ('state', 'in', ['approved', 'in_progress']),
            ('start_dt', '<', end),
            ('end_dt',   '>', start),
        ]).mapped('assigned_driver_id.id')
        drivers = request.env['messob.fms.driver'].search([
            ('is_active', '=', True),
            ('partner_id', 'not in', booked),
        ])
        return _success([{
            'id':         d.id,
            'name':       d.name,
            'license_no': d.license_no,
            'phone':      d.phone,
        } for d in drivers])

    # =========================================================================
    # LOCATIONS
    # =========================================================================

    @http.route('/api/fms/v1/locations', type='http', auth='user',
                methods=['GET'], csrf=False, cors='*')
    def get_locations(self, **kwargs):
        """GET /api/fms/v1/locations?q=bole"""
        domain = []
        query  = kwargs.get('q')
        if query:
            domain = [('display_name_custom', 'ilike', query)]
        locations = request.env['messob.fms.location'].search(domain)
        return _success([{
            'id':        loc.id,
            'name':      loc.name,
            'area':      loc.area,
            'city':      loc.city,
            'full_name': loc.display_name_custom,
            'lat':       loc.latitude,
            'lng':       loc.longitude,
        } for loc in locations])


# =========================================================================
# HELPERS
# =========================================================================

def _format_trip(trip):
    return {
        'id':               trip.id,
        'request_id':       trip.name,
        'state':            trip.state,
        'purpose':          trip.purpose,
        'vehicle_category': trip.vehicle_category,
        'start_dt':         str(trip.start_dt) if trip.start_dt else None,
        'end_dt':           str(trip.end_dt)   if trip.end_dt   else None,
        'pickup':           trip.pickup,
        'destination':      trip.destination,
        'requester': {
            'id':   trip.requester_id.id,
            'name': trip.requester_id.name,
        } if trip.requester_id else None,
        'assigned_vehicle': {
            'id':    trip.assigned_vehicle_id.id,
            'name':  trip.assigned_vehicle_id.name,
            'plate': trip.assigned_vehicle_id.license_plate,
        } if trip.assigned_vehicle_id else None,
        'assigned_driver': {
            'id':   trip.assigned_driver_id.id,
            'name': trip.assigned_driver_id.name,
        } if trip.assigned_driver_id else None,
        'fuel_status': trip.fuel_status,
        'created_at':  str(trip.create_date),
    }


def _get_user_role(user):
    if user.has_group('messob_fleet.group_fms_admin'):
        return 'admin'
    if user.has_group('messob_fleet.group_fms_dispatcher'):
        return 'dispatcher'
    if user.has_group('messob_fleet.group_fms_driver'):
        return 'driver'
    if user.has_group('messob_fleet.group_fms_mechanic'):
        return 'mechanic'
    if user.has_group('messob_fleet.group_fms_user'):
        return 'staff'
    return 'unknown'
