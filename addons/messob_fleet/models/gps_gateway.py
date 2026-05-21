# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.gps.gateway
# Description: GPS Gateway Service Interface (HW-1)
#
# Features:
#   - Interface with external GPS Gateway services
#   - Support multiple GPS protocols (HTTP, MQTT, TCP)
#   - Real-time position updates
#   - Device command sending
#   - Connection pooling and retry logic
# ---------------------------------------------------------------------------

from odoo import models, api, _
from odoo.exceptions import UserError
import requests
import json
import logging
from datetime import datetime, timedelta

_logger = logging.getLogger(__name__)


class MessobFmsGpsGateway(models.AbstractModel):
    """
    GPS Gateway Service Interface.
    Handles communication with external GPS tracking systems.
    
    Supports multiple GPS Gateway providers:
    - Traccar (Open Source)
    - GPS-Server (Custom)
    - Wialon
    - Flespi
    - Custom HTTP/MQTT gateways
    """

    _name = 'messob.fms.gps.gateway'
    _description = 'MESSOB FMS - GPS Gateway Interface'

    # =========================================================================
    # CORE GATEWAY METHODS
    # =========================================================================

    @api.model
    def test_device_connection(self, device_id):
        """
        Test connection to a GPS device through the gateway.
        
        Args:
            device_id (int): GPS device ID
            
        Returns:
            dict: {'success': bool, 'message': str, 'data': dict}
        """
        try:
            device = self.env['messob.fms.gps.device'].browse(device_id)
            
            if not device.exists():
                return {'success': False, 'error': 'Device not found'}
            
            # Build request based on gateway protocol
            if device.gateway_protocol == 'http':
                result = self._test_http_connection(device)
            elif device.gateway_protocol == 'mqtt':
                result = self._test_mqtt_connection(device)
            elif device.gateway_protocol == 'tcp':
                result = self._test_tcp_connection(device)
            else:
                return {'success': False, 'error': f'Unsupported protocol: {device.gateway_protocol}'}
            
            return result
            
        except Exception as e:
            _logger.error(f"GPS device connection test failed: {e}")
            return {'success': False, 'error': str(e)}

    @api.model
    def sync_device_positions(self, device_id, since=None, limit=100):
        """
        Sync GPS positions from gateway for a specific device.
        
        Args:
            device_id (int): GPS device ID
            since (datetime): Get positions since this time (default: last sync)
            limit (int): Maximum number of positions to fetch
            
        Returns:
            dict: {'success': bool, 'positions_synced': int, 'data': list}
        """
        try:
            device = self.env['messob.fms.gps.device'].browse(device_id)
            
            if not device.exists():
                return {'success': False, 'error': 'Device not found'}
            
            # Determine time range
            if not since:
                # Get positions since last communication or last hour
                since = device.last_communication or (datetime.now() - timedelta(hours=1))
            
            # Fetch positions from gateway
            if device.gateway_protocol == 'http':
                positions_data = self._fetch_http_positions(device, since, limit)
            elif device.gateway_protocol == 'mqtt':
                positions_data = self._fetch_mqtt_positions(device, since, limit)
            elif device.gateway_protocol == 'tcp':
                positions_data = self._fetch_tcp_positions(device, since, limit)
            else:
                return {'success': False, 'error': f'Unsupported protocol: {device.gateway_protocol}'}
            
            if not positions_data.get('success'):
                return positions_data
            
            # Store positions in database
            positions_created = self._store_positions(device, positions_data.get('positions', []))
            
            # Update device statistics
            device.write({
                'last_communication': datetime.now(),
                'total_positions': device.total_positions + positions_created,
            })
            
            return {
                'success': True,
                'positions_synced': positions_created,
                'device_id': device_id,
            }
            
        except Exception as e:
            _logger.error(f"GPS position sync failed: {e}")
            return {'success': False, 'error': str(e)}

    @api.model
    def get_realtime_position(self, device_id):
        """
        Get real-time position for a device.
        
        Args:
            device_id (int): GPS device ID
            
        Returns:
            dict: Latest position data
        """
        try:
            device = self.env['messob.fms.gps.device'].browse(device_id)
            
            if not device.exists():
                return {'success': False, 'error': 'Device not found'}
            
            # Try to get from gateway first
            if device.gateway_protocol == 'http':
                result = self._get_http_realtime_position(device)
            else:
                # Fall back to database
                result = self._get_database_position(device)
            
            return result
            
        except Exception as e:
            _logger.error(f"Failed to get realtime position: {e}")
            return {'success': False, 'error': str(e)}

    @api.model
    def send_device_command(self, device_id, command, parameters=None):
        """
        Send command to GPS device through gateway.
        
        Args:
            device_id (int): GPS device ID
            command (str): Command to send (e.g., 'reboot', 'set_interval', 'locate')
            parameters (dict): Command parameters
            
        Returns:
            dict: Command execution result
        """
        try:
            device = self.env['messob.fms.gps.device'].browse(device_id)
            
            if not device.exists():
                return {'success': False, 'error': 'Device not found'}
            
            # Send command based on protocol
            if device.gateway_protocol == 'http':
                result = self._send_http_command(device, command, parameters)
            elif device.gateway_protocol == 'mqtt':
                result = self._send_mqtt_command(device, command, parameters)
            else:
                return {'success': False, 'error': 'Command sending not supported for this protocol'}
            
            # Log command
            device.message_post(
                body=_('Command sent: %s') % command,
                message_type='notification'
            )
            
            return result
            
        except Exception as e:
            _logger.error(f"Failed to send device command: {e}")
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # HTTP PROTOCOL IMPLEMENTATION
    # =========================================================================

    def _test_http_connection(self, device):
        """Test HTTP connection to GPS Gateway."""
        try:
            url = f"{device.gateway_url}/api/devices/{device.device_id}/status"
            headers = self._get_http_headers(device)
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'message': 'Connection successful',
                    'data': data
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
                
        except requests.exceptions.Timeout:
            return {'success': False, 'error': 'Connection timeout'}
        except requests.exceptions.ConnectionError:
            return {'success': False, 'error': 'Cannot connect to GPS Gateway'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _fetch_http_positions(self, device, since, limit):
        """Fetch positions via HTTP from GPS Gateway."""
        try:
            # Format timestamp for API
            since_str = since.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            url = f"{device.gateway_url}/api/positions"
            headers = self._get_http_headers(device)
            params = {
                'deviceId': device.device_id,
                'from': since_str,
                'limit': limit
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code == 200:
                positions = response.json()
                return {
                    'success': True,
                    'positions': self._normalize_positions(positions, 'http')
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
                
        except Exception as e:
            _logger.error(f"HTTP position fetch failed: {e}")
            return {'success': False, 'error': str(e)}

    def _get_http_realtime_position(self, device):
        """Get real-time position via HTTP."""
        try:
            url = f"{device.gateway_url}/api/positions/latest"
            headers = self._get_http_headers(device)
            params = {'deviceId': device.device_id}
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                position_data = response.json()
                normalized = self._normalize_positions([position_data], 'http')
                
                if normalized:
                    return {
                        'success': True,
                        'position': normalized[0]
                    }
                else:
                    return {'success': False, 'error': 'No position data available'}
            else:
                # Fall back to database
                return self._get_database_position(device)
                
        except Exception as e:
            _logger.warning(f"HTTP realtime position failed, falling back to database: {e}")
            return self._get_database_position(device)

    def _send_http_command(self, device, command, parameters):
        """Send command to device via HTTP."""
        try:
            url = f"{device.gateway_url}/api/commands/send"
            headers = self._get_http_headers(device)
            
            payload = {
                'deviceId': device.device_id,
                'type': command,
                'attributes': parameters or {}
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code in [200, 201]:
                return {
                    'success': True,
                    'message': 'Command sent successfully',
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _get_http_headers(self, device):
        """Build HTTP headers for gateway requests."""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if device.api_key:
            headers['Authorization'] = f'Bearer {device.api_key}'
        
        return headers

    # =========================================================================
    # MQTT PROTOCOL IMPLEMENTATION (Placeholder)
    # =========================================================================

    def _test_mqtt_connection(self, device):
        """Test MQTT connection to GPS Gateway."""
        # TODO: Implement MQTT connection test
        return {
            'success': False,
            'error': 'MQTT protocol not yet implemented. Use HTTP protocol.'
        }

    def _fetch_mqtt_positions(self, device, since, limit):
        """Fetch positions via MQTT."""
        # TODO: Implement MQTT position fetching
        return {
            'success': False,
            'error': 'MQTT protocol not yet implemented'
        }

    def _send_mqtt_command(self, device, command, parameters):
        """Send command via MQTT."""
        # TODO: Implement MQTT command sending
        return {
            'success': False,
            'error': 'MQTT protocol not yet implemented'
        }

    # =========================================================================
    # TCP PROTOCOL IMPLEMENTATION (Placeholder)
    # =========================================================================

    def _test_tcp_connection(self, device):
        """Test TCP connection to GPS Gateway."""
        # TODO: Implement TCP connection test
        return {
            'success': False,
            'error': 'TCP protocol not yet implemented. Use HTTP protocol.'
        }

    def _fetch_tcp_positions(self, device, since, limit):
        """Fetch positions via TCP."""
        # TODO: Implement TCP position fetching
        return {
            'success': False,
            'error': 'TCP protocol not yet implemented'
        }

    # =========================================================================
    # DATA NORMALIZATION
    # =========================================================================

    def _normalize_positions(self, positions, protocol):
        """
        Normalize position data from different gateway formats.
        Converts various GPS gateway formats to standard format.
        """
        normalized = []
        
        for pos in positions:
            try:
                # Handle different gateway formats
                if protocol == 'http':
                    normalized_pos = self._normalize_http_position(pos)
                else:
                    normalized_pos = pos
                
                if normalized_pos:
                    normalized.append(normalized_pos)
                    
            except Exception as e:
                _logger.warning(f"Failed to normalize position: {e}")
                continue
        
        return normalized

    def _normalize_http_position(self, pos):
        """Normalize HTTP/Traccar format position."""
        try:
            # Standard format expected by our system
            normalized = {
                'timestamp': pos.get('deviceTime') or pos.get('fixTime') or pos.get('serverTime'),
                'latitude': pos.get('latitude'),
                'longitude': pos.get('longitude'),
                'altitude': pos.get('altitude'),
                'speed': pos.get('speed', 0),  # m/s to km/h conversion if needed
                'heading': pos.get('course') or pos.get('heading'),
                'accuracy': pos.get('accuracy'),
                'ignition': pos.get('attributes', {}).get('ignition', False),
                'odometer': pos.get('attributes', {}).get('totalDistance'),
                'fuel_level': pos.get('attributes', {}).get('fuel'),
                'battery_voltage': pos.get('attributes', {}).get('batteryLevel'),
                'raw_data': json.dumps(pos)
            }
            
            # Convert speed from m/s to km/h if needed
            if normalized['speed'] and normalized['speed'] < 100:  # Likely in m/s
                normalized['speed'] = normalized['speed'] * 3.6
            
            return normalized
            
        except Exception as e:
            _logger.error(f"Position normalization failed: {e}")
            return None

    # =========================================================================
    # DATABASE OPERATIONS
    # =========================================================================

    def _store_positions(self, device, positions):
        """Store normalized positions in database."""
        Position = self.env['messob.fms.gps.position']
        created_count = 0
        
        # Find active trip for this vehicle
        active_trip = None
        if device.vehicle_id:
            active_trip = self.env['messob.fms.trip'].search([
                ('assigned_vehicle_id', '=', device.vehicle_id.id),
                ('state', '=', 'in_progress')
            ], limit=1)
        
        for pos_data in positions:
            try:
                # Parse timestamp
                timestamp_str = pos_data.get('timestamp')
                if isinstance(timestamp_str, str):
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                else:
                    timestamp = timestamp_str or datetime.now()
                
                # Check if position already exists
                existing = Position.search([
                    ('device_id', '=', device.id),
                    ('timestamp', '=', timestamp)
                ], limit=1)
                
                if existing:
                    continue  # Skip duplicate
                
                # Create position record
                vals = {
                    'device_id': device.id,
                    'trip_id': active_trip.id if active_trip else False,
                    'timestamp': timestamp,
                    'latitude': pos_data.get('latitude'),
                    'longitude': pos_data.get('longitude'),
                    'altitude': pos_data.get('altitude'),
                    'speed': pos_data.get('speed'),
                    'heading': pos_data.get('heading'),
                    'accuracy': pos_data.get('accuracy'),
                    'ignition': pos_data.get('ignition', False),
                    'odometer': pos_data.get('odometer'),
                    'fuel_level': pos_data.get('fuel_level'),
                    'battery_voltage': pos_data.get('battery_voltage'),
                    'raw_data': pos_data.get('raw_data'),
                }
                
                position = Position.create(vals)
                created_count += 1
                
                # Update device's last position
                device.write({'last_position_id': position.id})
                
            except Exception as e:
                _logger.error(f"Failed to store position: {e}")
                continue
        
        return created_count

    def _get_database_position(self, device):
        """Get latest position from database."""
        Position = self.env['messob.fms.gps.position']
        
        position = Position.search([
            ('device_id', '=', device.id)
        ], order='timestamp desc', limit=1)
        
        if position:
            return {
                'success': True,
                'position': {
                    'timestamp': position.timestamp.isoformat(),
                    'latitude': position.latitude,
                    'longitude': position.longitude,
                    'speed': position.speed,
                    'heading': position.heading,
                    'status': position.status,
                    'ignition': position.ignition,
                }
            }
        else:
            return {
                'success': False,
                'error': 'No position data available'
            }

    # =========================================================================
    # WEBHOOK RECEIVER (for push-based gateways)
    # =========================================================================

    @api.model
    def receive_position_webhook(self, device_id_external, position_data):
        """
        Receive position data via webhook from GPS Gateway.
        This method is called by the webhook controller.
        
        Args:
            device_id_external (str): External device ID (IMEI)
            position_data (dict): Position data from gateway
            
        Returns:
            dict: Processing result
        """
        try:
            # Find device by external ID
            device = self.env['messob.fms.gps.device'].search([
                ('device_id', '=', device_id_external)
            ], limit=1)
            
            if not device:
                return {
                    'success': False,
                    'error': f'Device not found: {device_id_external}'
                }
            
            # Normalize and store position
            normalized = self._normalize_positions([position_data], 'http')
            
            if normalized:
                count = self._store_positions(device, normalized)
                
                # Update device communication time
                device.write({'last_communication': datetime.now()})
                
                return {
                    'success': True,
                    'device_id': device.id,
                    'positions_stored': count
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to normalize position data'
                }
                
        except Exception as e:
            _logger.error(f"Webhook position receive failed: {e}")
            return {'success': False, 'error': str(e)}
