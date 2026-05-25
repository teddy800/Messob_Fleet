# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: WebSocket Server for Real-Time GPS Tracking
# Description: WebSocket server for broadcasting real-time GPS updates
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import json
import logging
from datetime import datetime

_logger = logging.getLogger(__name__)


class WebSocketController(http.Controller):
    """
    WebSocket controller for real-time GPS tracking.
    Uses Odoo's bus.bus for real-time communication.
    """

    @http.route('/api/websocket/gps/subscribe', type='json', auth='user', methods=['POST'])
    def subscribe_gps_updates(self, vehicle_ids=None, trip_ids=None):
        """
        Subscribe to GPS updates for specific vehicles or trips.
        
        Args:
            vehicle_ids (list): List of vehicle IDs to track
            trip_ids (list): List of trip IDs to track
            
        Returns:
            dict: Subscription channels
        """
        try:
            channels = []
            
            # Subscribe to vehicle channels
            if vehicle_ids:
                for vehicle_id in vehicle_ids:
                    channels.append(f'gps_position_{vehicle_id}')
            
            # Subscribe to trip channels
            if trip_ids:
                Trip = request.env['messob.fms.trip']
                trips = Trip.browse(trip_ids)
                for trip in trips:
                    if trip.assigned_vehicle_id:
                        channels.append(f'gps_position_{trip.assigned_vehicle_id.id}')
                        channels.append(f'trip_update_{trip.id}')
            
            return {
                'success': True,
                'channels': channels,
                'message': f'Subscribed to {len(channels)} channels'
            }
            
        except Exception as e:
            _logger.error(f"WebSocket subscription error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/websocket/gps/latest', type='json', auth='user', methods=['POST'])
    def get_latest_positions(self, vehicle_ids):
        """
        Get latest GPS positions for vehicles.
        
        Args:
            vehicle_ids (list): List of vehicle IDs
            
        Returns:
            dict: Latest positions
        """
        try:
            Position = request.env['messob.fms.gps.position']
            positions = []
            
            for vehicle_id in vehicle_ids:
                # Get latest position for this vehicle
                latest = Position.search([
                    ('device_id.vehicle_id', '=', vehicle_id)
                ], order='timestamp desc', limit=1)
                
                if latest:
                    positions.append({
                        'vehicle_id': vehicle_id,
                        'vehicle_plate': latest.device_id.vehicle_id.license_plate,
                        'latitude': latest.latitude,
                        'longitude': latest.longitude,
                        'speed': latest.speed or 0,
                        'heading': latest.heading or 0,
                        'altitude': latest.altitude or 0,
                        'accuracy': latest.accuracy or 0,
                        'status': latest.status,
                        'ignition': latest.ignition,
                        'timestamp': latest.timestamp.isoformat(),
                        'trip_id': latest.trip_id.id if latest.trip_id else None,
                    })
            
            return {
                'success': True,
                'positions': positions,
                'count': len(positions)
            }
            
        except Exception as e:
            _logger.error(f"Get latest positions error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/websocket/trip/updates', type='json', auth='user', methods=['POST'])
    def subscribe_trip_updates(self, trip_id):
        """
        Subscribe to trip status updates.
        
        Args:
            trip_id (int): Trip ID
            
        Returns:
            dict: Subscription info
        """
        try:
            Trip = request.env['messob.fms.trip']
            trip = Trip.browse(trip_id)
            
            if not trip.exists():
                return {'success': False, 'error': 'Trip not found'}
            
            # Check permissions
            user = request.env.user
            if (trip.requester_id.id != user.partner_id.id and 
                not user.has_group('messob_fleet.group_fms_dispatcher')):
                return {'success': False, 'error': 'Access denied'}
            
            channels = [f'trip_update_{trip_id}']
            
            if trip.assigned_vehicle_id:
                channels.append(f'gps_position_{trip.assigned_vehicle_id.id}')
            
            return {
                'success': True,
                'channels': channels,
                'trip': {
                    'id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'vehicle_id': trip.assigned_vehicle_id.id if trip.assigned_vehicle_id else None,
                }
            }
            
        except Exception as e:
            _logger.error(f"Trip subscription error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/websocket/broadcast/test', type='json', auth='user', methods=['POST'])
    def test_broadcast(self, channel, message):
        """
        Test WebSocket broadcasting (admin only).
        
        Args:
            channel (str): Channel name
            message (dict): Message to broadcast
            
        Returns:
            dict: Broadcast result
        """
        try:
            # Check admin permission
            if not request.env.user.has_group('messob_fleet.group_fms_admin'):
                return {'success': False, 'error': 'Admin access required'}
            
            # Broadcast test message
            request.env['bus.bus']._sendone(channel, 'test_message', message)
            
            return {
                'success': True,
                'message': 'Test broadcast sent',
                'channel': channel
            }
            
        except Exception as e:
            _logger.error(f"Test broadcast error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/websocket/poll', type='json', auth='user', methods=['POST'])
    def poll_updates(self, channels, last_id=0):
        """
        Poll for updates on subscribed channels.
        Alternative to WebSocket for browsers without WebSocket support.
        
        Args:
            channels (list): List of channel names
            last_id (int): Last message ID received
            
        Returns:
            dict: New messages
        """
        try:
            # Use Odoo's bus.bus polling mechanism
            messages = request.env['bus.bus'].poll(channels, last_id)
            
            return {
                'success': True,
                'messages': messages
            }
            
        except Exception as e:
            _logger.error(f"Poll updates error: {e}")
            return {'success': False, 'error': str(e)}
