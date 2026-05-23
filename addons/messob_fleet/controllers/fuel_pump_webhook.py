# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: Fuel Pump Hardware Interface (HW-2)
# Description: REST API endpoint for automatic fuel log creation from fuel pump hardware
#
# Features:
#   - Receive fuel transaction data from fuel pump hardware
#   - Automatic fuel log creation
#   - Data validation and duplicate prevention
#   - API key authentication
# ---------------------------------------------------------------------------

from odoo import http, _
from odoo.http import request
import logging
import json
from datetime import datetime

_logger = logging.getLogger(__name__)


class FuelPumpWebhook(http.Controller):
    """
    Fuel Pump Hardware Interface Controller
    Handles incoming fuel transaction data from fuel pump hardware.
    """

    @http.route(
        '/odoo/fms/fuel-pump/transaction',
        type='json',
        auth='none',
        methods=['POST'],
        csrf=False
    )
    def receive_fuel_transaction(self, **kwargs):
        """
        HW-2: Receive fuel transaction data from fuel pump hardware.
        
        Expected JSON payload:
        {
            "api_key": "your-api-key",
            "vehicle_identifier": "PLATE-123" or "VIN-ABC123",
            "identifier_type": "plate" or "vin",
            "volume": 45.5,
            "cost": 2275.50,
            "odometer": 125000,
            "fuel_station": "Shell Station - Main Branch",
            "pump_id": "PUMP-01",
            "transaction_id": "TXN-20260523-001",
            "timestamp": "2026-05-23T14:30:00Z"
        }
        
        Returns:
        {
            "success": True/False,
            "message": "Success/Error message",
            "fuel_log_id": 123 (if successful)
        }
        """
        try:
            # Get request data
            data = request.jsonrequest
            
            # Validate API key
            if not self._validate_api_key(data.get('api_key')):
                return {
                    'success': False,
                    'error': 'Invalid or missing API key',
                    'code': 'AUTH_FAILED'
                }
            
            # Validate required fields
            validation_result = self._validate_transaction_data(data)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error'],
                    'code': 'VALIDATION_ERROR'
                }
            
            # Find vehicle
            vehicle = self._find_vehicle(
                data.get('vehicle_identifier'),
                data.get('identifier_type', 'plate')
            )
            
            if not vehicle:
                return {
                    'success': False,
                    'error': f"Vehicle not found: {data.get('vehicle_identifier')}",
                    'code': 'VEHICLE_NOT_FOUND'
                }
            
            # Check for duplicate transaction
            if self._is_duplicate_transaction(data.get('transaction_id')):
                return {
                    'success': False,
                    'error': 'Duplicate transaction ID',
                    'code': 'DUPLICATE_TRANSACTION'
                }
            
            # Create fuel log
            fuel_log = self._create_fuel_log(vehicle, data)
            
            if fuel_log:
                _logger.info(f"Fuel log created from pump: {fuel_log.id} for vehicle {vehicle.license_plate}")
                return {
                    'success': True,
                    'message': 'Fuel transaction recorded successfully',
                    'fuel_log_id': fuel_log.id,
                    'vehicle': vehicle.license_plate,
                    'volume': data.get('volume'),
                    'cost': data.get('cost')
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to create fuel log',
                    'code': 'CREATE_FAILED'
                }
                
        except Exception as e:
            _logger.error(f"Fuel pump webhook error: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'code': 'INTERNAL_ERROR'
            }

    @http.route(
        '/odoo/fms/fuel-pump/health',
        type='json',
        auth='none',
        methods=['GET', 'POST'],
        csrf=False
    )
    def health_check(self, **kwargs):
        """
        Health check endpoint for fuel pump hardware.
        Returns system status and configuration.
        """
        try:
            data = request.jsonrequest or {}
            
            # Validate API key
            if not self._validate_api_key(data.get('api_key')):
                return {
                    'success': False,
                    'error': 'Invalid or missing API key'
                }
            
            # Get system status
            fuel_log_model = request.env['messob.fms.fuel.log'].sudo()
            
            return {
                'success': True,
                'status': 'online',
                'system': 'MESSOB Fleet Management System',
                'version': '1.1.0',
                'endpoint': '/odoo/fms/fuel-pump/transaction',
                'statistics': {
                    'total_fuel_logs': fuel_log_model.search_count([]),
                    'automatic_logs': fuel_log_model.search_count([('source', '=', 'automatic')]),
                    'manual_logs': fuel_log_model.search_count([('source', '=', 'manual')]),
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            _logger.error(f"Health check error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _validate_api_key(self, api_key):
        """Validate API key for fuel pump hardware."""
        if not api_key:
            return False
        
        # Get configured API key from system parameters
        configured_key = request.env['ir.config_parameter'].sudo().get_param(
            'messob_fleet.fuel_pump_api_key'
        )
        
        if not configured_key:
            _logger.warning("Fuel pump API key not configured in system parameters")
            return False
        
        return api_key == configured_key

    def _validate_transaction_data(self, data):
        """Validate fuel transaction data."""
        required_fields = [
            'vehicle_identifier',
            'volume',
            'cost',
            'odometer',
            'transaction_id'
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None:
                return {
                    'valid': False,
                    'error': f"Missing required field: {field}"
                }
        
        # Validate data types and ranges
        try:
            volume = float(data['volume'])
            cost = float(data['cost'])
            odometer = int(data['odometer'])
            
            if volume <= 0:
                return {'valid': False, 'error': 'Volume must be positive'}
            
            if volume > 500:  # Max 500 liters per transaction
                return {'valid': False, 'error': 'Volume exceeds maximum (500L)'}
            
            if cost <= 0:
                return {'valid': False, 'error': 'Cost must be positive'}
            
            if odometer < 0:
                return {'valid': False, 'error': 'Odometer cannot be negative'}
            
        except (ValueError, TypeError) as e:
            return {
                'valid': False,
                'error': f"Invalid data type: {str(e)}"
            }
        
        return {'valid': True}

    def _find_vehicle(self, identifier, identifier_type='plate'):
        """Find vehicle by plate number or VIN."""
        vehicle_model = request.env['fleet.vehicle'].sudo()
        
        if identifier_type == 'plate':
            vehicle = vehicle_model.search([
                ('license_plate', '=', identifier)
            ], limit=1)
        elif identifier_type == 'vin':
            vehicle = vehicle_model.search([
                ('vin_sn', '=', identifier)
            ], limit=1)
        else:
            _logger.warning(f"Unknown identifier type: {identifier_type}")
            return None
        
        return vehicle

    def _is_duplicate_transaction(self, transaction_id):
        """Check if transaction ID already exists."""
        if not transaction_id:
            return False
        
        fuel_log_model = request.env['messob.fms.fuel.log'].sudo()
        existing = fuel_log_model.search([
            ('pump_transaction_id', '=', transaction_id)
        ], limit=1)
        
        return bool(existing)

    def _create_fuel_log(self, vehicle, data):
        """Create fuel log from pump transaction data."""
        try:
            fuel_log_model = request.env['messob.fms.fuel.log'].sudo()
            
            # Parse timestamp
            timestamp = data.get('timestamp')
            if timestamp:
                try:
                    date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    date = datetime.now()
            else:
                date = datetime.now()
            
            # Prepare fuel log data
            fuel_log_data = {
                'vehicle_id': vehicle.id,
                'date': date,
                'volume': float(data['volume']),
                'cost': float(data['cost']),
                'odometer': int(data['odometer']),
                'fuel_station': data.get('fuel_station', 'Unknown Station'),
                'source': 'automatic',
                'pump_id': data.get('pump_id'),
                'pump_transaction_id': data.get('transaction_id'),
                'notes': f"Automatic fuel log from pump {data.get('pump_id', 'Unknown')}",
            }
            
            # Create fuel log
            fuel_log = fuel_log_model.create(fuel_log_data)
            
            # Update vehicle odometer if higher
            if fuel_log.odometer > vehicle.odometer:
                vehicle.write({'odometer': fuel_log.odometer})
            
            return fuel_log
            
        except Exception as e:
            _logger.error(f"Error creating fuel log: {e}", exc_info=True)
            return None

    @http.route(
        '/odoo/fms/fuel-pump/reconcile',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def reconcile_fuel_logs(self, date_from=None, date_to=None, **kwargs):
        """
        Reconciliation endpoint for comparing manual vs automatic fuel logs.
        Requires user authentication (admin/dispatcher).
        
        Returns:
        {
            "success": True,
            "period": {"from": "2026-05-01", "to": "2026-05-31"},
            "summary": {
                "total_logs": 150,
                "automatic": 120,
                "manual": 30,
                "discrepancies": 2
            },
            "discrepancies": [...]
        }
        """
        try:
            # Check user permissions
            if not request.env.user.has_group('messob_fleet.group_fms_admin') and \
               not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
                return {
                    'success': False,
                    'error': 'Insufficient permissions'
                }
            
            fuel_log_model = request.env['messob.fms.fuel.log']
            
            # Build domain
            domain = []
            if date_from:
                domain.append(('date', '>=', date_from))
            if date_to:
                domain.append(('date', '<=', date_to))
            
            # Get all logs
            all_logs = fuel_log_model.search(domain)
            automatic_logs = all_logs.filtered(lambda l: l.source == 'automatic')
            manual_logs = all_logs.filtered(lambda l: l.source == 'manual')
            
            # Find discrepancies (same vehicle, similar time, different values)
            discrepancies = self._find_discrepancies(automatic_logs, manual_logs)
            
            return {
                'success': True,
                'period': {
                    'from': date_from or 'All time',
                    'to': date_to or 'Now'
                },
                'summary': {
                    'total_logs': len(all_logs),
                    'automatic': len(automatic_logs),
                    'manual': len(manual_logs),
                    'discrepancies': len(discrepancies)
                },
                'discrepancies': discrepancies
            }
            
        except Exception as e:
            _logger.error(f"Reconciliation error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _find_discrepancies(self, automatic_logs, manual_logs):
        """Find discrepancies between automatic and manual logs."""
        discrepancies = []
        
        for auto_log in automatic_logs:
            # Find manual logs for same vehicle within 1 hour
            similar_manual = manual_logs.filtered(
                lambda m: m.vehicle_id == auto_log.vehicle_id and
                abs((m.date - auto_log.date).total_seconds()) < 3600
            )
            
            for manual_log in similar_manual:
                # Check for significant differences
                volume_diff = abs(auto_log.volume - manual_log.volume)
                cost_diff = abs(auto_log.cost - manual_log.cost)
                
                if volume_diff > 1.0 or cost_diff > 50.0:  # Thresholds
                    discrepancies.append({
                        'vehicle': auto_log.vehicle_id.license_plate,
                        'date': auto_log.date.isoformat(),
                        'automatic': {
                            'id': auto_log.id,
                            'volume': auto_log.volume,
                            'cost': auto_log.cost
                        },
                        'manual': {
                            'id': manual_log.id,
                            'volume': manual_log.volume,
                            'cost': manual_log.cost
                        },
                        'differences': {
                            'volume': volume_diff,
                            'cost': cost_diff
                        }
                    })
        
        return discrepancies
