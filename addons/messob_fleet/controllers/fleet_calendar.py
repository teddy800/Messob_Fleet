# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: FleetCalendarController
# Description: API endpoints for Fleet Availability Calendar (FR-2.3)
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
from datetime import datetime
import json


class FleetCalendarController(http.Controller):
    """
    API endpoints for Fleet Availability Calendar.
    Provides dispatchers with vehicle availability data and quick assignment.
    """

    @http.route(
        '/api/fleet/availability',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def get_availability(self, start_date, end_date, category=None, status=None):
        """
        Get fleet availability for date range.
        
        Args:
            start_date (str): ISO datetime string (e.g., "2026-05-21T00:00:00Z")
            end_date (str): ISO datetime string
            category (str, optional): Vehicle category filter (sedan, suv, bus, etc.)
            status (str, optional): Vehicle status filter
            
        Returns:
            dict: {
                'success': bool,
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
        # Check permissions - only Dispatcher and Admin can access
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return {
                'success': False,
                'error': 'Access denied. Only dispatchers can view fleet calendar.'
            }

        try:
            Trip = request.env['messob.fms.trip']
            result = Trip.get_fleet_availability(
                start_date=start_date,
                end_date=end_date,
                category=category,
                status=status
            )
            return {
                'success': True,
                'vehicles': result.get('vehicles', [])
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @http.route(
        '/api/fleet/quick-assign',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def quick_assign(self, trip_id, vehicle_id, driver_id):
        """
        Quick assign vehicle and driver to a pending trip from calendar.
        
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
        # Check permissions
        if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
            return {
                'success': False,
                'message': 'Access denied. Only dispatchers can assign vehicles.'
            }

        try:
            Trip = request.env['messob.fms.trip']
            result = Trip.quick_assign_vehicle(
                trip_id=trip_id,
                vehicle_id=vehicle_id,
                driver_id=driver_id
            )
            return result
        except Exception as e:
            return {
                'success': False,
                'message': f'Assignment failed: {str(e)}'
            }
