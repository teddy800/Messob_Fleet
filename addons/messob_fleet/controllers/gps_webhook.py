# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: GPS Webhook Receiver (HW-1)
# Description: Receives GPS position data from external GPS Gateway
#
# Features:
#   - Webhook endpoint for GPS data
#   - Support multiple GPS gateway formats
#   - Authentication and validation
#   - Real-time position processing
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import json
import logging
import hmac
import hashlib

_logger = logging.getLogger(__name__)


class GpsWebhookController(http.Controller):
    """
    GPS Webhook receiver for real-time position updates.
    Receives data from external GPS Gateway services.
    """

    @http.route(
        '/api/gps/webhook/position',
        type='json',
        auth='public',
        methods=['POST'],
        csrf=False
    )
    def receive_position(self, **kwargs):
        """
        Receive GPS position data via webhook.
        
        Expected payload format:
        {
            "device_id": "IMEI or device identifier",
            "timestamp": "2024-05-21T10:30:00Z",
            "latitude": 9.0320,
            "longitude": 38.7469,
            "speed": 45.5,
            "heading": 180,
            "altitude": 2355,
            "accuracy": 10,
            "ignition": true,
            "odometer": 12345.6,
            "fuel_level": 75,
            "battery_voltage": 12.6
        }
        
        Returns:
            dict: Processing result
        """
        try:
            # Get request data
            data = request.jsonrequest
            
            if not data:
                return {'success': False, 'error': 'No data provided'}
            
            # Validate required fields
            device_id = data.get('device_id')
            if not device_id:
                return {'success': False, 'error': 'device_id is required'}
            
            # Authenticate request (optional)
            api_key = request.httprequest.headers.get('X-API-Key')
            if not self._authenticate_request(device_id, api_key):
                return {'success': False, 'error': 'Authentication failed'}
            
            # Process position data
            gateway = request.env['messob.fms.gps.gateway'].sudo()
            result = gateway.receive_position_webhook(device_id, data)
            
            return result
            
        except Exception as e:
            _logger.error(f"GPS webhook error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/gps/webhook/batch',
        type='json',
        auth='public',
        methods=['POST'],
        csrf=False
    )
    def receive_batch_positions(self, **kwargs):
        """
        Receive multiple GPS positions in batch.
        
        Expected payload format:
        {
            "device_id": "IMEI",
            "positions": [
                {...position1...},
                {...position2...},
                ...
            ]
        }
        
        Returns:
            dict: Processing result
        """
        try:
            data = request.jsonrequest
            
            if not data:
                return {'success': False, 'error': 'No data provided'}
            
            device_id = data.get('device_id')
            positions = data.get('positions', [])
            
            if not device_id or not positions:
                return {'success': False, 'error': 'device_id and positions are required'}
            
            # Authenticate
            api_key = request.httprequest.headers.get('X-API-Key')
            if not self._authenticate_request(device_id, api_key):
                return {'success': False, 'error': 'Authentication failed'}
            
            # Process each position
            gateway = request.env['messob.fms.gps.gateway'].sudo()
            success_count = 0
            error_count = 0
            
            for position_data in positions:
                try:
                    result = gateway.receive_position_webhook(device_id, position_data)
                    if result.get('success'):
                        success_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    _logger.error(f"Failed to process position: {e}")
                    error_count += 1
            
            return {
                'success': True,
                'processed': success_count,
                'errors': error_count,
                'total': len(positions)
            }
            
        except Exception as e:
            _logger.error(f"GPS batch webhook error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/gps/webhook/traccar',
        type='json',
        auth='public',
        methods=['POST'],
        csrf=False
    )
    def receive_traccar_webhook(self, **kwargs):
        """
        Receive webhook from Traccar GPS platform.
        Traccar-specific format handling.
        
        Returns:
            dict: Processing result
        """
        try:
            data = request.jsonrequest
            
            if not data:
                return {'success': False, 'error': 'No data provided'}
            
            # Extract Traccar format
            device = data.get('device', {})
            position = data.get('position', {})
            
            device_id = device.get('uniqueId')
            
            if not device_id:
                return {'success': False, 'error': 'Device ID not found'}
            
            # Convert Traccar format to our format
            normalized_position = {
                'device_id': device_id,
                'timestamp': position.get('deviceTime') or position.get('fixTime'),
                'latitude': position.get('latitude'),
                'longitude': position.get('longitude'),
                'altitude': position.get('altitude'),
                'speed': position.get('speed', 0) * 1.852,  # knots to km/h
                'heading': position.get('course'),
                'accuracy': position.get('accuracy'),
                'ignition': position.get('attributes', {}).get('ignition', False),
                'odometer': position.get('attributes', {}).get('totalDistance'),
                'fuel_level': position.get('attributes', {}).get('fuel'),
                'battery_voltage': position.get('attributes', {}).get('batteryLevel'),
            }
            
            # Process position
            gateway = request.env['messob.fms.gps.gateway'].sudo()
            result = gateway.receive_position_webhook(device_id, normalized_position)
            
            return result
            
        except Exception as e:
            _logger.error(f"Traccar webhook error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/gps/webhook/osmand',
        type='http',
        auth='public',
        methods=['GET', 'POST'],
        csrf=False
    )
    def receive_osmand_webhook(self, **kwargs):
        """
        Receive webhook from OsmAnd tracking app.
        OsmAnd sends data via GET parameters.
        
        Returns:
            str: Response message
        """
        try:
            # OsmAnd sends data as GET/POST parameters
            params = request.params
            
            device_id = params.get('id') or params.get('deviceid')
            
            if not device_id:
                return 'ERROR: Device ID required'
            
            # Extract OsmAnd parameters
            position_data = {
                'device_id': device_id,
                'timestamp': params.get('timestamp'),
                'latitude': float(params.get('lat', 0)),
                'longitude': float(params.get('lon', 0)),
                'altitude': float(params.get('altitude', 0)),
                'speed': float(params.get('speed', 0)) * 3.6,  # m/s to km/h
                'heading': float(params.get('bearing', 0)),
                'accuracy': float(params.get('hdop', 0)),
                'battery_voltage': float(params.get('batt', 0)),
            }
            
            # Process position
            gateway = request.env['messob.fms.gps.gateway'].sudo()
            result = gateway.receive_position_webhook(device_id, position_data)
            
            if result.get('success'):
                return 'OK'
            else:
                return f"ERROR: {result.get('error')}"
            
        except Exception as e:
            _logger.error(f"OsmAnd webhook error: {e}")
            return f'ERROR: {str(e)}'

    @http.route(
        '/api/gps/device/status',
        type='json',
        auth='user',
        methods=['GET'],
        csrf=False
    )
    def get_device_status(self, device_id):
        """
        Get current status of a GPS device.
        
        Args:
            device_id (int): GPS device ID
            
        Returns:
            dict: Device status information
        """
        try:
            device = request.env['messob.fms.gps.device'].browse(device_id)
            
            if not device.exists():
                return {'success': False, 'error': 'Device not found'}
            
            # Check user permissions
            if not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
                return {'success': False, 'error': 'Access denied'}
            
            return {
                'success': True,
                'device': {
                    'id': device.id,
                    'name': device.name,
                    'device_id': device.device_id,
                    'status': device.status,
                    'connection_status': device.connection_status,
                    'last_communication': device.last_communication.isoformat() if device.last_communication else None,
                    'signal_strength': device.signal_strength,
                    'battery_level': device.battery_level,
                    'vehicle': {
                        'id': device.vehicle_id.id if device.vehicle_id else None,
                        'plate_no': device.vehicle_id.license_plate if device.vehicle_id else None,
                    }
                }
            }
            
        except Exception as e:
            _logger.error(f"Device status error: {e}")
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _authenticate_request(self, device_id, api_key):
        """
        Authenticate webhook request.
        
        Args:
            device_id (str): Device identifier
            api_key (str): API key from request header
            
        Returns:
            bool: True if authenticated
        """
        try:
            # Find device
            device = request.env['messob.fms.gps.device'].sudo().search([
                ('device_id', '=', device_id)
            ], limit=1)
            
            if not device:
                _logger.warning(f"Unknown device: {device_id}")
                return False
            
            # Check API key if configured
            if device.api_key:
                if not api_key:
                    _logger.warning(f"Missing API key for device: {device_id}")
                    return False
                
                if api_key != device.api_key:
                    _logger.warning(f"Invalid API key for device: {device_id}")
                    return False
            
            return True
            
        except Exception as e:
            _logger.error(f"Authentication error: {e}")
            return False

    def _verify_signature(self, payload, signature, secret):
        """
        Verify webhook signature for security.
        
        Args:
            payload (str): Request payload
            signature (str): Signature from header
            secret (str): Shared secret
            
        Returns:
            bool: True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            _logger.error(f"Signature verification error: {e}")
            return False
