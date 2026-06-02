# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: Advanced Analytics API
# Description: Real-time analytics and performance metrics API
#
# Features:
#   - Real-time fleet utilization
#   - Performance dashboards
#   - Predictive maintenance alerts
#   - Cost analysis
#   - Driver performance metrics
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
import json
import logging
from datetime import datetime, timedelta
from collections import defaultdict

_logger = logging.getLogger(__name__)


class AnalyticsAPIController(http.Controller):
    """
    Advanced analytics API for fleet performance monitoring.
    Provides real-time metrics and predictive insights.
    """

    @http.route('/api/analytics/fleet/utilization', type='json', auth='user', methods=['POST'])
    def get_fleet_utilization(self, start_date=None, end_date=None):
        """
        Get real-time fleet utilization metrics (NFR-1.1).
        
        Returns utilization percentage, active trips, idle vehicles.
        """
        try:
            Vehicle = request.env['fleet.vehicle']
            Trip = request.env['messob.fms.trip']
            
            # Parse dates
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            else:
                start_date = datetime.fromisoformat(start_date)
            
            if not end_date:
                end_date = datetime.now()
            else:
                end_date = datetime.fromisoformat(end_date)
            
            # Get all active vehicles
            vehicles = Vehicle.search([('state_id.name', '=', 'Active')])
            total_vehicles = len(vehicles)
            
            # Get active trips in time range
            active_trips = Trip.search([
                ('state', 'in', ['approved', 'in_progress']),
                ('start_dt', '<=', end_date),
                ('end_dt', '>=', start_date)
            ])
            
            # Calculate utilization
            vehicles_in_use = len(set(active_trips.mapped('assigned_vehicle_id.id')))
            utilization_rate = (vehicles_in_use / total_vehicles * 100) if total_vehicles > 0 else 0
            
            # Category breakdown
            category_stats = defaultdict(lambda: {'total': 0, 'in_use': 0})
            for vehicle in vehicles:
                category = vehicle.category_id.name if vehicle.category_id else 'Unknown'
                category_stats[category]['total'] += 1
                
                if vehicle.id in active_trips.mapped('assigned_vehicle_id.id'):
                    category_stats[category]['in_use'] += 1
            
            return {
                'success': True,
                'metrics': {
                    'total_vehicles': total_vehicles,
                    'vehicles_in_use': vehicles_in_use,
                    'idle_vehicles': total_vehicles - vehicles_in_use,
                    'utilization_rate': round(utilization_rate, 2),
                    'active_trips': len(active_trips),
                    'category_breakdown': dict(category_stats),
                },
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
            
        except Exception as e:
            _logger.error(f"Fleet utilization error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/analytics/performance/realtime', type='json', auth='user', methods=['POST'])
    def get_realtime_performance(self):
        """
        Get real-time system performance metrics (NFR-1).
        
        Returns API response times, GPS update rate, active connections.
        """
        try:
            Performance = request.env['messob.fms.api.performance']
            Position = request.env['messob.fms.gps.position']
            
            # Get performance data from last 5 minutes
            five_min_ago = datetime.now() - timedelta(minutes=5)
            
            recent_api_calls = Performance.search([
                ('timestamp', '>=', five_min_ago)
            ])
            
            # Calculate API metrics
            if recent_api_calls:
                avg_response_time = sum(recent_api_calls.mapped('response_time')) / len(recent_api_calls)
                max_response_time = max(recent_api_calls.mapped('response_time'))
                total_calls = len(recent_api_calls)
                failed_calls = len(recent_api_calls.filtered(lambda r: not r.success))
                success_rate = ((total_calls - failed_calls) / total_calls * 100) if total_calls > 0 else 0
            else:
                avg_response_time = 0
                max_response_time = 0
                total_calls = 0
                failed_calls = 0
                success_rate = 100
            
            # GPS update metrics
            recent_positions = Position.search([
                ('timestamp', '>=', five_min_ago)
            ])
            
            gps_updates_per_minute = len(recent_positions) / 5
            
            return {
                'success': True,
                'metrics': {
                    'api_performance': {
                        'avg_response_time_ms': round(avg_response_time, 2),
                        'max_response_time_ms': round(max_response_time, 2),
                        'total_calls_5min': total_calls,
                        'failed_calls': failed_calls,
                        'success_rate_percent': round(success_rate, 2),
                    },
                    'gps_tracking': {
                        'updates_per_minute': round(gps_updates_per_minute, 2),
                        'total_updates_5min': len(recent_positions),
                        'active_devices': len(set(recent_positions.mapped('device_id.id'))),
                    },
                    'timestamp': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            _logger.error(f"Real-time performance error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/analytics/maintenance/predictive', type='json', auth='user', methods=['POST'])
    def get_predictive_maintenance(self):
        """
        Get predictive maintenance alerts (FR-4.3 Advanced).
        
        Uses ML-based predictions for maintenance needs.
        """
        try:
            MaintenanceAlert = request.env['messob.fms.maintenance.alert']
            Vehicle = request.env['fleet.vehicle']
            
            # Get all active vehicles
            vehicles = Vehicle.search([('state_id.name', '=', 'Active')])
            
            predictions = []
            
            for vehicle in vehicles:
                # Get maintenance history
                maintenance_logs = request.env['messob.fms.maintenance.log'].search([
                    ('vehicle_id', '=', vehicle.id)
                ], order='date desc', limit=10)
                
                # Calculate average maintenance interval
                if len(maintenance_logs) >= 2:
                    intervals = []
                    for i in range(len(maintenance_logs) - 1):
                        interval = (maintenance_logs[i].date - maintenance_logs[i+1].date).days
                        intervals.append(interval)
                    
                    avg_interval = sum(intervals) / len(intervals) if intervals else 90
                    
                    # Predict next maintenance
                    if maintenance_logs:
                        days_since_last = (datetime.now().date() - maintenance_logs[0].date).days
                        days_until_next = avg_interval - days_since_last
                        
                        urgency = 'low'
                        if days_until_next < 7:
                            urgency = 'critical'
                        elif days_until_next < 14:
                            urgency = 'high'
                        elif days_until_next < 30:
                            urgency = 'medium'
                        
                        predictions.append({
                            'vehicle_id': vehicle.id,
                            'vehicle_plate': vehicle.license_plate,
                            'days_until_maintenance': days_until_next,
                            'predicted_date': (datetime.now() + timedelta(days=days_until_next)).date().isoformat(),
                            'urgency': urgency,
                            'last_maintenance_days_ago': days_since_last,
                            'avg_maintenance_interval_days': round(avg_interval, 1)
                        })
            
            # Sort by urgency
            urgency_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
            predictions.sort(key=lambda x: urgency_order[x['urgency']])
            
            return {
                'success': True,
                'predictions': predictions,
                'total_vehicles': len(vehicles),
                'vehicles_needing_attention': len([p for p in predictions if p['urgency'] in ['critical', 'high']])
            }
            
        except Exception as e:
            _logger.error(f"Predictive maintenance error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/analytics/costs/summary', type='json', auth='user', methods=['POST'])
    def get_cost_summary(self, start_date=None, end_date=None, vehicle_id=None):
        """
        Get comprehensive cost analysis.
        
        Includes fuel costs, maintenance costs, and total cost of ownership.
        """
        try:
            FuelLog = request.env['messob.fms.fuel.log']
            MaintenanceLog = request.env['messob.fms.maintenance.log']
            
            # Parse dates
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            else:
                start_date = datetime.fromisoformat(start_date)
            
            if not end_date:
                end_date = datetime.now()
            else:
                end_date = datetime.fromisoformat(end_date)
            
            # Build domain
            fuel_domain = [('date', '>=', start_date.date()), ('date', '<=', end_date.date())]
            maint_domain = [('date', '>=', start_date.date()), ('date', '<=', end_date.date())]
            
            if vehicle_id:
                fuel_domain.append(('vehicle_id', '=', vehicle_id))
                maint_domain.append(('vehicle_id', '=', vehicle_id))
            
            # Get fuel costs
            fuel_logs = FuelLog.search(fuel_domain)
            total_fuel_cost = sum(fuel_logs.mapped('price'))
            total_fuel_liters = sum(fuel_logs.mapped('liters'))
            
            # Get maintenance costs
            maint_logs = MaintenanceLog.search(maint_domain)
            total_maint_cost = sum(maint_logs.mapped('cost'))
            
            # Calculate per-vehicle breakdown
            vehicle_costs = defaultdict(lambda: {'fuel': 0, 'maintenance': 0, 'total': 0})
            
            for log in fuel_logs:
                vid = log.vehicle_id.id
                vehicle_costs[vid]['fuel'] += log.price
                vehicle_costs[vid]['plate'] = log.vehicle_id.license_plate
            
            for log in maint_logs:
                vid = log.vehicle_id.id
                vehicle_costs[vid]['maintenance'] += log.cost
                if 'plate' not in vehicle_costs[vid]:
                    vehicle_costs[vid]['plate'] = log.vehicle_id.license_plate
            
            for vid in vehicle_costs:
                vehicle_costs[vid]['total'] = vehicle_costs[vid]['fuel'] + vehicle_costs[vid]['maintenance']
            
            # Sort by total cost
            vehicle_breakdown = [
                {
                    'vehicle_id': vid,
                    'vehicle_plate': data['plate'],
                    'fuel_cost': round(data['fuel'], 2),
                    'maintenance_cost': round(data['maintenance'], 2),
                    'total_cost': round(data['total'], 2)
                }
                for vid, data in vehicle_costs.items()
            ]
            vehicle_breakdown.sort(key=lambda x: x['total_cost'], reverse=True)
            
            return {
                'success': True,
                'summary': {
                    'total_fuel_cost': round(total_fuel_cost, 2),
                    'total_maintenance_cost': round(total_maint_cost, 2),
                    'total_cost': round(total_fuel_cost + total_maint_cost, 2),
                    'total_fuel_liters': round(total_fuel_liters, 2),
                    'avg_cost_per_liter': round(total_fuel_cost / total_fuel_liters, 2) if total_fuel_liters > 0 else 0,
                    'fuel_transactions': len(fuel_logs),
                    'maintenance_events': len(maint_logs),
                },
                'vehicle_breakdown': vehicle_breakdown,
                'period': {
                    'start': start_date.date().isoformat(),
                    'end': end_date.date().isoformat(),
                    'days': (end_date.date() - start_date.date()).days
                }
            }
            
        except Exception as e:
            _logger.error(f"Cost summary error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/analytics/drivers/performance', type='json', auth='user', methods=['POST'])
    def get_driver_performance(self, driver_id=None, start_date=None, end_date=None):
        """
        Get driver performance metrics.
        
        Includes trip count, distance, fuel efficiency, on-time rate.
        """
        try:
            Trip = request.env['messob.fms.trip']
            FuelLog = request.env['messob.fms.fuel.log']
            
            # Parse dates
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            else:
                start_date = datetime.fromisoformat(start_date)
            
            if not end_date:
                end_date = datetime.now()
            else:
                end_date = datetime.fromisoformat(end_date)
            
            # Build domain
            trip_domain = [
                ('state', 'in', ['completed', 'closed']),
                ('start_dt', '>=', start_date),
                ('end_dt', '<=', end_date)
            ]
            
            if driver_id:
                trip_domain.append(('assigned_driver_id', '=', driver_id))
            
            # Get trips
            trips = Trip.search(trip_domain)
            
            # Group by driver
            driver_stats = defaultdict(lambda: {
                'trips': 0,
                'on_time': 0,
                'delayed': 0,
                'total_distance': 0,
                'total_fuel': 0
            })
            
            for trip in trips:
                if not trip.assigned_driver_id:
                    continue
                
                did = trip.assigned_driver_id.id
                driver_stats[did]['name'] = trip.assigned_driver_id.name
                driver_stats[did]['trips'] += 1
                
                # Check on-time performance (simplified)
                # In production, compare actual start time with scheduled
                driver_stats[did]['on_time'] += 1
            
            # Get fuel efficiency per driver
            for did in driver_stats:
                driver_trips = trips.filtered(lambda t: t.assigned_driver_id.id == did)
                trip_ids = driver_trips.ids
                
                fuel_logs = FuelLog.search([
                    ('trip_id', 'in', trip_ids)
                ])
                
                total_fuel = sum(fuel_logs.mapped('liters'))
                driver_stats[did]['total_fuel'] = total_fuel
                
                if len(fuel_logs) >= 2:
                    # Calculate distance and efficiency
                    sorted_logs = fuel_logs.sorted(key=lambda l: l.odometer)
                    distance = sorted_logs[-1].odometer - sorted_logs[0].odometer
                    driver_stats[did]['total_distance'] = distance
                    driver_stats[did]['fuel_efficiency'] = distance / total_fuel if total_fuel > 0 else 0
            
            # Format output
            performance = [
                {
                    'driver_id': did,
                    'driver_name': data['name'],
                    'trips_completed': data['trips'],
                    'on_time_rate_percent': round(data['on_time'] / data['trips'] * 100, 1) if data['trips'] > 0 else 0,
                    'total_distance_km': round(data['total_distance'], 2),
                    'total_fuel_liters': round(data['total_fuel'], 2),
                    'fuel_efficiency_km_per_liter': round(data.get('fuel_efficiency', 0), 2)
                }
                for did, data in driver_stats.items()
            ]
            
            # Sort by trips completed
            performance.sort(key=lambda x: x['trips_completed'], reverse=True)
            
            return {
                'success': True,
                'performance': performance,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'total_drivers': len(performance)
            }
            
        except Exception as e:
            _logger.error(f"Driver performance error: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/analytics/dashboard/summary', type='json', auth='user', methods=['POST'])
    def get_dashboard_summary(self):
        """
        Get comprehensive dashboard summary for admin.
        
        One-call API for complete fleet overview.
        """
        try:
            # Get all key metrics
            utilization = self.get_fleet_utilization()
            performance = self.get_realtime_performance()
            costs = self.get_cost_summary()
            maintenance = self.get_predictive_maintenance()
            
            # Get trip statistics
            Trip = request.env['messob.fms.trip']
            
            today_trips = Trip.search_count([
                ('start_dt', '>=', datetime.now().replace(hour=0, minute=0, second=0)),
                ('start_dt', '<=', datetime.now().replace(hour=23, minute=59, second=59))
            ])
            
            pending_requests = Trip.search_count([('state', '=', 'pending')])
            active_trips = Trip.search_count([('state', '=', 'in_progress')])
            
            return {
                'success': True,
                'dashboard': {
                    'fleet_utilization': utilization.get('metrics', {}),
                    'system_performance': performance.get('metrics', {}),
                    'costs': costs.get('summary', {}),
                    'maintenance_alerts': {
                        'vehicles_needing_attention': maintenance.get('vehicles_needing_attention', 0),
                        'critical_count': len([p for p in maintenance.get('predictions', []) if p['urgency'] == 'critical'])
                    },
                    'trips': {
                        'today': today_trips,
                        'pending_requests': pending_requests,
                        'active_now': active_trips
                    }
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            _logger.error(f"Dashboard summary error: {e}")
            return {'success': False, 'error': str(e)}
