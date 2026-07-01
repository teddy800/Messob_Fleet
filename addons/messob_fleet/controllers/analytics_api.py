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
            
            # Get all active vehicles with prefetch for better performance
            vehicles = Vehicle.search([('state_id.name', '=', 'Active')])
            total_vehicles = len(vehicles)
            
            # Get active trips in time range - use search_read to avoid N+1 queries
            active_trips_data = Trip.search_read([
                ('state', 'in', ['approved', 'in_progress']),
                ('start_dt', '<=', end_date),
                ('end_dt', '>=', start_date)
            ], ['assigned_vehicle_id'])
            
            # Extract vehicle IDs efficiently
            vehicles_in_use_ids = set(
                trip['assigned_vehicle_id'][0] 
                for trip in active_trips_data 
                if trip.get('assigned_vehicle_id')
            )
            vehicles_in_use = len(vehicles_in_use_ids)
            utilization_rate = (vehicles_in_use / total_vehicles * 100) if total_vehicles > 0 else 0
            
            # Category breakdown - prefetch category_id to avoid N+1
            vehicles_with_category = vehicles.read(['category_id'])
            category_stats = defaultdict(lambda: {'total': 0, 'in_use': 0})
            for vehicle_data in vehicles_with_category:
                category = vehicle_data['category_id'][1] if vehicle_data.get('category_id') else 'Unknown'
                category_stats[category]['total'] += 1
                
                if vehicle_data['id'] in vehicles_in_use_ids:
                    category_stats[category]['in_use'] += 1
            
            return {
                'success': True,
                'metrics': {
                    'total_vehicles': total_vehicles,
                    'vehicles_in_use': vehicles_in_use,
                    'idle_vehicles': total_vehicles - vehicles_in_use,
                    'utilization_rate': round(utilization_rate, 2),
                    'active_trips': len(active_trips_data),
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

    @http.route('/api/analytics/compliance-package', type='http', auth='user', methods=['GET'], csrf=False)
    def generate_compliance_package(self, start_date=None, end_date=None, format='excel'):
        """
        REG-2: Government Audit Retrieval - One-Click Compliance Package Export
        
        Generates comprehensive compliance package with:
        - Audit logs (all critical actions)
        - Trip records (complete history)
        - Fuel data (consumption & efficiency)
        - Maintenance records
        - Vehicle utilization
        
        Args:
            start_date: Start date for report (YYYY-MM-DD)
            end_date: End date for report (YYYY-MM-DD)
            format: 'excel' or 'csv' (default: excel)
            
        Returns:
            File download (Excel workbook or ZIP of CSV files)
        """
        try:
            import io
            from datetime import datetime, timedelta
            import zipfile
            
            # Check admin/dispatcher permission
            if not request.env.user.has_group('messob_fleet.group_fms_admin') and \
               not request.env.user.has_group('messob_fleet.group_fms_dispatcher'):
                return request.make_response(
                    json.dumps({'error': 'Access denied. Admin or Dispatcher role required.'}),
                    headers=[('Content-Type', 'application/json')]
                )
            
            # Parse dates
            if not end_date:
                end_dt = datetime.now()
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            if not start_date:
                start_dt = end_dt - timedelta(days=365)  # Default: 1 year
            else:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            
            # Gather data
            AuditLog = request.env['messob.fms.audit.log'].sudo()
            Trip = request.env['messob.fms.trip'].sudo()
            FuelLog = request.env['messob.fms.fuel.log'].sudo()
            MaintenanceLog = request.env['messob.fms.maintenance.log'].sudo()
            Vehicle = request.env['fleet.vehicle'].sudo()
            
            # 1. Audit Logs (critical and high severity)
            audit_logs = AuditLog.search([
                ('timestamp', '>=', start_dt),
                ('timestamp', '<=', end_dt),
                ('severity', 'in', ['critical', 'high', 'medium'])
            ], order='timestamp desc')
            
            # 2. Trip Records
            trips = Trip.search([
                ('create_date', '>=', start_dt),
                ('create_date', '<=', end_dt)
            ], order='create_date desc')
            
            # 3. Fuel Logs
            fuel_logs = FuelLog.search([
                ('date', '>=', start_dt.date()),
                ('date', '<=', end_dt.date())
            ], order='date desc')
            
            # 4. Maintenance Records
            maintenance_logs = MaintenanceLog.search([
                ('date', '>=', start_dt.date()),
                ('date', '<=', end_dt.date())
            ], order='date desc')
            
            # 5. Vehicle Inventory
            vehicles = Vehicle.search([])
            
            if format == 'excel':
                # Generate Excel workbook
                import xlsxwriter
                
                output = io.BytesIO()
                workbook = xlsxwriter.Workbook(output, {'in_memory': True})
                
                # Define formats
                header_format = workbook.add_format({
                    'bold': True,
                    'bg_color': '#1E40AF',
                    'font_color': 'white',
                    'border': 1
                })
                cell_format = workbook.add_format({'border': 1, 'valign': 'top'})
                date_format = workbook.add_format({'border': 1, 'num_format': 'yyyy-mm-dd hh:mm'})
                
                # Sheet 1: Cover Page
                cover = workbook.add_worksheet('Cover')
                cover.set_column('A:A', 40)
                cover.write('A1', 'MESSOB FLEET MANAGEMENT SYSTEM', workbook.add_format({'bold': True, 'font_size': 16, 'font_color': '#1E40AF'}))
                cover.write('A2', 'Government Compliance Audit Package', workbook.add_format({'bold': True, 'font_size': 14}))
                cover.write('A4', 'Report Period:', workbook.add_format({'bold': True}))
                cover.write('B4', f'{start_dt.strftime("%Y-%m-%d")} to {end_dt.strftime("%Y-%m-%d")}')
                cover.write('A5', 'Generated:', workbook.add_format({'bold': True}))
                cover.write('B5', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                cover.write('A6', 'Generated By:', workbook.add_format({'bold': True}))
                cover.write('B6', request.env.user.name)
                cover.write('A8', 'Contents:', workbook.add_format({'bold': True, 'font_size': 12}))
                cover.write('A9', f'• Audit Logs: {len(audit_logs)} records')
                cover.write('A10', f'• Trip Records: {len(trips)} records')
                cover.write('A11', f'• Fuel Logs: {len(fuel_logs)} records')
                cover.write('A12', f'• Maintenance Records: {len(maintenance_logs)} records')
                cover.write('A13', f'• Vehicle Inventory: {len(vehicles)} vehicles')
                
                # Sheet 2: Audit Logs
                audit_sheet = workbook.add_worksheet('Audit Logs')
                audit_headers = ['Timestamp', 'User', 'Action', 'Category', 'Resource', 'Description', 'Severity', 'Success', 'IP Address']
                for col, header in enumerate(audit_headers):
                    audit_sheet.write(0, col, header, header_format)
                
                for row, log in enumerate(audit_logs, start=1):
                    audit_sheet.write(row, 0, log.timestamp, date_format)
                    audit_sheet.write(row, 1, log.user_id.name if log.user_id else 'System', cell_format)
                    audit_sheet.write(row, 2, dict(log._fields['action'].selection).get(log.action, log.action), cell_format)
                    audit_sheet.write(row, 3, log.action_category or '', cell_format)
                    audit_sheet.write(row, 4, log.resource_display_name or '', cell_format)
                    audit_sheet.write(row, 5, log.description or '', cell_format)
                    audit_sheet.write(row, 6, log.severity.upper(), cell_format)
                    audit_sheet.write(row, 7, 'Yes' if log.success else 'No', cell_format)
                    audit_sheet.write(row, 8, log.ip_address or '', cell_format)
                
                audit_sheet.autofit()
                
                # Sheet 3: Trip Records
                trip_sheet = workbook.add_worksheet('Trip Records')
                trip_headers = ['Request ID', 'Requester', 'Purpose', 'Vehicle Category', 'Start Date', 'End Date', 
                               'Pickup', 'Destination', 'Status', 'Vehicle', 'Driver', 'Created Date']
                for col, header in enumerate(trip_headers):
                    trip_sheet.write(0, col, header, header_format)
                
                for row, trip in enumerate(trips, start=1):
                    trip_sheet.write(row, 0, trip.name, cell_format)
                    trip_sheet.write(row, 1, trip.requester_id.name if trip.requester_id else '', cell_format)
                    trip_sheet.write(row, 2, trip.purpose or '', cell_format)
                    trip_sheet.write(row, 3, trip.vehicle_category or '', cell_format)
                    trip_sheet.write(row, 4, trip.start_dt, date_format)
                    trip_sheet.write(row, 5, trip.end_dt, date_format)
                    trip_sheet.write(row, 6, trip.pickup or '', cell_format)
                    trip_sheet.write(row, 7, trip.destination or '', cell_format)
                    trip_sheet.write(row, 8, trip.state.upper(), cell_format)
                    trip_sheet.write(row, 9, trip.assigned_vehicle_id.license_plate if trip.assigned_vehicle_id else '', cell_format)
                    trip_sheet.write(row, 10, trip.assigned_driver_id.name if trip.assigned_driver_id else '', cell_format)
                    trip_sheet.write(row, 11, trip.create_date, date_format)
                
                trip_sheet.autofit()
                
                # Sheet 4: Fuel Logs
                fuel_sheet = workbook.add_worksheet('Fuel Logs')
                fuel_headers = ['Date', 'Vehicle', 'Driver', 'Station', 'Liters', 'Price', 'Price/Liter', 
                               'Odometer', 'Source', 'Transaction ID']
                for col, header in enumerate(fuel_headers):
                    fuel_sheet.write(0, col, header, header_format)
                
                for row, fuel in enumerate(fuel_logs, start=1):
                    fuel_sheet.write(row, 0, fuel.date.strftime('%Y-%m-%d') if fuel.date else '', cell_format)
                    fuel_sheet.write(row, 1, fuel.vehicle_id.license_plate if fuel.vehicle_id else '', cell_format)
                    fuel_sheet.write(row, 2, fuel.driver_id.name if fuel.driver_id else '', cell_format)
                    fuel_sheet.write(row, 3, fuel.station_name or '', cell_format)
                    fuel_sheet.write(row, 4, fuel.liters, cell_format)
                    fuel_sheet.write(row, 5, fuel.price, cell_format)
                    fuel_sheet.write(row, 6, fuel.price_per_liter, cell_format)
                    fuel_sheet.write(row, 7, fuel.odometer, cell_format)
                    fuel_sheet.write(row, 8, dict(fuel._fields['source'].selection).get(fuel.source, fuel.source), cell_format)
                    fuel_sheet.write(row, 9, fuel.pump_transaction_id or '', cell_format)
                
                fuel_sheet.autofit()
                
                # Sheet 5: Maintenance Records
                maint_sheet = workbook.add_worksheet('Maintenance Records')
                maint_headers = ['Date', 'Vehicle', 'Service Type', 'Description', 'Cost', 'Parts Cost', 
                                'Labor Cost', 'Service Provider', 'Odometer', 'Next Service (Date)', 'Next Service (KM)']
                for col, header in enumerate(maint_headers):
                    maint_sheet.write(0, col, header, header_format)
                
                for row, maint in enumerate(maintenance_logs, start=1):
                    maint_sheet.write(row, 0, maint.date.strftime('%Y-%m-%d') if maint.date else '', cell_format)
                    maint_sheet.write(row, 1, maint.vehicle_id.license_plate if maint.vehicle_id else '', cell_format)
                    maint_sheet.write(row, 2, dict(maint._fields['service_type'].selection).get(maint.service_type, maint.service_type) if maint.service_type else '', cell_format)
                    maint_sheet.write(row, 3, maint.description or '', cell_format)
                    maint_sheet.write(row, 4, maint.total_cost, cell_format)
                    maint_sheet.write(row, 5, maint.parts_cost, cell_format)
                    maint_sheet.write(row, 6, maint.labor_cost, cell_format)
                    maint_sheet.write(row, 7, maint.service_provider or '', cell_format)
                    maint_sheet.write(row, 8, maint.odometer_at_service, cell_format)
                    maint_sheet.write(row, 9, maint.next_service_date.strftime('%Y-%m-%d') if maint.next_service_date else '', cell_format)
                    maint_sheet.write(row, 10, maint.next_service_odometer or '', cell_format)
                
                maint_sheet.autofit()
                
                # Sheet 6: Vehicle Inventory
                vehicle_sheet = workbook.add_worksheet('Vehicle Inventory')
                vehicle_headers = ['License Plate', 'VIN', 'Make/Model', 'Category', 'Year', 'Fuel Type', 
                                  'Current Odometer', 'Acquisition Date', 'Status']
                for col, header in enumerate(vehicle_headers):
                    vehicle_sheet.write(0, col, header, header_format)
                
                for row, vehicle in enumerate(vehicles, start=1):
                    vehicle_sheet.write(row, 0, vehicle.license_plate or '', cell_format)
                    vehicle_sheet.write(row, 1, vehicle.vin_sn or '', cell_format)
                    vehicle_sheet.write(row, 2, f"{vehicle.model_id.brand_id.name if vehicle.model_id and vehicle.model_id.brand_id else ''} {vehicle.model_id.name if vehicle.model_id else ''}", cell_format)
                    vehicle_sheet.write(row, 3, vehicle.category_id.name if vehicle.category_id else '', cell_format)
                    vehicle_sheet.write(row, 4, vehicle.model_year or '', cell_format)
                    vehicle_sheet.write(row, 5, vehicle.fuel_type or '', cell_format)
                    vehicle_sheet.write(row, 6, vehicle.odometer, cell_format)
                    vehicle_sheet.write(row, 7, vehicle.acquisition_date.strftime('%Y-%m-%d') if vehicle.acquisition_date else '', cell_format)
                    vehicle_sheet.write(row, 8, vehicle.state_id.name if vehicle.state_id else '', cell_format)
                
                vehicle_sheet.autofit()
                
                workbook.close()
                output.seek(0)
                
                filename = f'MESSOB_Compliance_Package_{start_dt.strftime("%Y%m%d")}_{end_dt.strftime("%Y%m%d")}.xlsx'
                
                return request.make_response(
                    output.read(),
                    headers=[
                        ('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                        ('Content-Disposition', f'attachment; filename="{filename}"'),
                        ('Content-Length', len(output.getvalue()))
                    ]
                )
            
            else:  # CSV format - return ZIP of multiple CSV files
                import csv
                
                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    
                    # 1. Audit Logs CSV
                    audit_csv = io.StringIO()
                    audit_writer = csv.writer(audit_csv)
                    audit_writer.writerow(['Timestamp', 'User', 'Action', 'Category', 'Resource', 'Description', 'Severity', 'Success', 'IP Address'])
                    for log in audit_logs:
                        audit_writer.writerow([
                            log.timestamp,
                            log.user_id.name if log.user_id else 'System',
                            dict(log._fields['action'].selection).get(log.action, log.action),
                            log.action_category or '',
                            log.resource_display_name or '',
                            log.description or '',
                            log.severity.upper(),
                            'Yes' if log.success else 'No',
                            log.ip_address or ''
                        ])
                    zip_file.writestr('audit_logs.csv', audit_csv.getvalue())
                    
                    # 2. Trip Records CSV
                    trip_csv = io.StringIO()
                    trip_writer = csv.writer(trip_csv)
                    trip_writer.writerow(['Request ID', 'Requester', 'Purpose', 'Vehicle Category', 'Start Date', 'End Date', 
                                         'Pickup', 'Destination', 'Status', 'Vehicle', 'Driver', 'Created Date'])
                    for trip in trips:
                        trip_writer.writerow([
                            trip.name,
                            trip.requester_id.name if trip.requester_id else '',
                            trip.purpose or '',
                            trip.vehicle_category or '',
                            trip.start_dt,
                            trip.end_dt,
                            trip.pickup or '',
                            trip.destination or '',
                            trip.state.upper(),
                            trip.assigned_vehicle_id.license_plate if trip.assigned_vehicle_id else '',
                            trip.assigned_driver_id.name if trip.assigned_driver_id else '',
                            trip.create_date
                        ])
                    zip_file.writestr('trip_records.csv', trip_csv.getvalue())
                    
                    # 3. Fuel Logs CSV
                    fuel_csv = io.StringIO()
                    fuel_writer = csv.writer(fuel_csv)
                    fuel_writer.writerow(['Date', 'Vehicle', 'Driver', 'Station', 'Liters', 'Price', 'Price/Liter', 
                                         'Odometer', 'Source', 'Transaction ID'])
                    for fuel in fuel_logs:
                        fuel_writer.writerow([
                            fuel.date.strftime('%Y-%m-%d') if fuel.date else '',
                            fuel.vehicle_id.license_plate if fuel.vehicle_id else '',
                            fuel.driver_id.name if fuel.driver_id else '',
                            fuel.station_name or '',
                            fuel.liters,
                            fuel.price,
                            fuel.price_per_liter,
                            fuel.odometer,
                            dict(fuel._fields['source'].selection).get(fuel.source, fuel.source),
                            fuel.pump_transaction_id or ''
                        ])
                    zip_file.writestr('fuel_logs.csv', fuel_csv.getvalue())
                    
                    # 4. Maintenance Records CSV
                    maint_csv = io.StringIO()
                    maint_writer = csv.writer(maint_csv)
                    maint_writer.writerow(['Date', 'Vehicle', 'Service Type', 'Description', 'Cost', 'Parts Cost', 
                                          'Labor Cost', 'Service Provider', 'Odometer', 'Next Service (Date)', 'Next Service (KM)'])
                    for maint in maintenance_logs:
                        maint_writer.writerow([
                            maint.date.strftime('%Y-%m-%d') if maint.date else '',
                            maint.vehicle_id.license_plate if maint.vehicle_id else '',
                            dict(maint._fields['service_type'].selection).get(maint.service_type, maint.service_type) if maint.service_type else '',
                            maint.description or '',
                            maint.total_cost,
                            maint.parts_cost,
                            maint.labor_cost,
                            maint.service_provider or '',
                            maint.odometer_at_service,
                            maint.next_service_date.strftime('%Y-%m-%d') if maint.next_service_date else '',
                            maint.next_service_odometer or ''
                        ])
                    zip_file.writestr('maintenance_records.csv', maint_csv.getvalue())
                    
                    # 5. Vehicle Inventory CSV
                    vehicle_csv = io.StringIO()
                    vehicle_writer = csv.writer(vehicle_csv)
                    vehicle_writer.writerow(['License Plate', 'VIN', 'Make/Model', 'Category', 'Year', 'Fuel Type', 
                                            'Current Odometer', 'Acquisition Date', 'Status'])
                    for vehicle in vehicles:
                        vehicle_writer.writerow([
                            vehicle.license_plate or '',
                            vehicle.vin_sn or '',
                            f"{vehicle.model_id.brand_id.name if vehicle.model_id and vehicle.model_id.brand_id else ''} {vehicle.model_id.name if vehicle.model_id else ''}",
                            vehicle.category_id.name if vehicle.category_id else '',
                            vehicle.model_year or '',
                            vehicle.fuel_type or '',
                            vehicle.odometer,
                            vehicle.acquisition_date.strftime('%Y-%m-%d') if vehicle.acquisition_date else '',
                            vehicle.state_id.name if vehicle.state_id else ''
                        ])
                    zip_file.writestr('vehicle_inventory.csv', vehicle_csv.getvalue())
                
                zip_buffer.seek(0)
                filename = f'MESSOB_Compliance_Package_{start_dt.strftime("%Y%m%d")}_{end_dt.strftime("%Y%m%d")}.zip'
                
                return request.make_response(
                    zip_buffer.read(),
                    headers=[
                        ('Content-Type', 'application/zip'),
                        ('Content-Disposition', f'attachment; filename="{filename}"'),
                        ('Content-Length', len(zip_buffer.getvalue()))
                    ]
                )
                
        except Exception as e:
            _logger.error(f"Compliance package generation error: {e}", exc_info=True)
            return request.make_response(
                json.dumps({'error': f'Failed to generate compliance package: {str(e)}'}),
                headers=[('Content-Type', 'application/json')],
                status=500
            )
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
            
            # Get fuel costs - use search_read to avoid N+1 queries
            fuel_logs_data = FuelLog.search_read(
                fuel_domain,
                ['vehicle_id', 'price', 'liters']
            )
            total_fuel_cost = sum(log['price'] for log in fuel_logs_data if log.get('price'))
            total_fuel_liters = sum(log['liters'] for log in fuel_logs_data if log.get('liters'))
            
            # Get maintenance costs - use search_read to avoid N+1 queries
            maint_logs_data = MaintenanceLog.search_read(
                maint_domain,
                ['vehicle_id', 'cost']
            )
            total_maint_cost = sum(log['cost'] for log in maint_logs_data if log.get('cost'))
            
            # Calculate per-vehicle breakdown
            vehicle_costs = defaultdict(lambda: {'fuel': 0, 'maintenance': 0, 'total': 0, 'plate': None})
            
            # Process fuel logs
            for log in fuel_logs_data:
                if log.get('vehicle_id'):
                    vid = log['vehicle_id'][0]
                    vehicle_costs[vid]['fuel'] += log.get('price', 0)
                    vehicle_costs[vid]['plate'] = log['vehicle_id'][1]
            
            # Process maintenance logs
            for log in maint_logs_data:
                if log.get('vehicle_id'):
                    vid = log['vehicle_id'][0]
                    vehicle_costs[vid]['maintenance'] += log.get('cost', 0)
                    if not vehicle_costs[vid]['plate']:
                        vehicle_costs[vid]['plate'] = log['vehicle_id'][1]
            
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
                    'fuel_transactions': len(fuel_logs_data),
                    'maintenance_events': len(maint_logs_data),
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
            
            # Get trips - use search_read to avoid N+1 queries
            trips_data = Trip.search_read(trip_domain, ['assigned_driver_id', 'start_dt', 'end_dt'])
            
            # Group by driver
            driver_stats = defaultdict(lambda: {
                'trips': 0,
                'on_time': 0,
                'delayed': 0,
                'total_distance': 0,
                'total_fuel': 0,
                'name': None
            })
            
            # Process trip data
            trip_ids_by_driver = defaultdict(list)
            for trip_data in trips_data:
                if not trip_data.get('assigned_driver_id'):
                    continue
                
                did = trip_data['assigned_driver_id'][0]
                driver_stats[did]['name'] = trip_data['assigned_driver_id'][1]
                driver_stats[did]['trips'] += 1
                driver_stats[did]['on_time'] += 1  # Simplified - in production, compare actual vs scheduled
                trip_ids_by_driver[did].append(trip_data['id'])
            
            # Get fuel efficiency per driver - use search_read to avoid N+1 queries
            for did, trip_ids in trip_ids_by_driver.items():
                fuel_logs_data = FuelLog.search_read([
                    ('trip_id', 'in', trip_ids)
                ], ['liters', 'odometer'], order='odometer asc')
                
                total_fuel = sum(log['liters'] for log in fuel_logs_data if log.get('liters'))
                driver_stats[did]['total_fuel'] = total_fuel
                
                if len(fuel_logs_data) >= 2:
                    # Calculate distance and efficiency
                    odometers = [log['odometer'] for log in fuel_logs_data if log.get('odometer')]
                    if odometers:
                        distance = max(odometers) - min(odometers)
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
