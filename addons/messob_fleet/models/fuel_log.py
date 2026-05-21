# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.fuel.log
# Description: Fuel transaction log entered by the driver (FR-4.2, SRS §3.4).
#
# Driver fills this in when refuelling:
#   - Fuel station name
#   - Litres added
#   - Cost
#   - Odometer reading
#   - Date
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _ # type: ignore
from odoo.exceptions import UserError # type: ignore


class MessobFmsFuelLog(models.Model):
    """
    Records a single fuel refill event for a vehicle.
    Linked to the trip that was active at the time.
    Includes comprehensive audit logging for all fuel transactions.
    """

    _name = 'messob.fms.fuel.log'
    _description = 'MESSOB FMS - Fuel Log'
    _inherit = ['base.model.audit.mixin']
    _order = 'date desc'
    _rec_name = 'station_name'

    # ── Link to the trip ──
    trip_id = fields.Many2one(
        comodel_name='messob.fms.trip',
        string='Trip',
        required=True,
        ondelete='cascade',
        help='The active trip during which this fuel was added.',
    )

    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        related='trip_id.assigned_vehicle_id',
        store=True,
        readonly=True,
    )

    driver_id = fields.Many2one(
        comodel_name='res.partner',
        string='Driver',
        related='trip_id.assigned_driver_id',
        store=True,
        readonly=True,
    )

    # ── Fuel details ──
    station_name = fields.Char(
        string='Fuel Station Name',
        required=True,
        help='Name or location of the fuel station.',
    )

    liters = fields.Float(
        string='Liters',
        required=True,
        digits=(10, 2),
        help='Volume of fuel added in litres.',
    )

    price = fields.Float(
        string='Price (Total)',
        required=True,
        digits=(10, 2),
        help='Total cost of the fuel transaction.',
    )

    odometer = fields.Integer(
        string='Odometer (km)',
        required=True,
        help='Vehicle odometer reading at time of refuel.',
    )

    date = fields.Date(
        string='Date',
        required=True,
        default=fields.Date.today,
    )

    # ── Computed ──
    price_per_liter = fields.Float(
        string='Price / Liter',
        compute='_compute_price_per_liter',
        store=True,
        digits=(10, 2),
    )

    @api.depends('price', 'liters')
    def _compute_price_per_liter(self):
        for rec in self:
            rec.price_per_liter = (
                rec.price / rec.liters if rec.liters > 0 else 0.0
            )

    # ── Constraints ──
    @api.constrains('liters')
    def _check_liters(self):
        for rec in self:
            if rec.liters <= 0:
                raise UserError(_('Liters must be greater than zero.'))

    @api.constrains('price')
    def _check_price(self):
        for rec in self:
            if rec.price <= 0:
                raise UserError(_('Price must be greater than zero.'))

    # =========================================================================
    # FUEL EFFICIENCY METHODS (FR-4.2.2)
    # =========================================================================

    @api.model
    def calculate_fuel_efficiency(self, vehicle_id, start_date=None, end_date=None):
        """
        Calculate fuel efficiency (KM/Liter) for a vehicle over a period.
        
        Args:
            vehicle_id (int): Vehicle ID
            start_date (date, optional): Start date for calculation
            end_date (date, optional): End date for calculation
            
        Returns:
            dict: Fuel efficiency statistics
        """
        domain = [('vehicle_id', '=', vehicle_id)]
        
        if start_date:
            domain.append(('date', '>=', start_date))
        if end_date:
            domain.append(('date', '<=', end_date))
        
        fuel_logs = self.search(domain, order='odometer asc')
        
        if len(fuel_logs) < 2:
            return {
                'success': False,
                'error': 'Need at least 2 fuel logs to calculate efficiency'
            }
        
        # Calculate total distance and total fuel
        first_log = fuel_logs[0]
        last_log = fuel_logs[-1]
        
        total_distance = last_log.odometer - first_log.odometer
        total_fuel = sum(log.liters for log in fuel_logs)
        total_cost = sum(log.price for log in fuel_logs)
        
        if total_fuel == 0:
            return {
                'success': False,
                'error': 'No fuel consumption recorded'
            }
        
        efficiency_km_per_liter = total_distance / total_fuel
        cost_per_km = total_cost / total_distance if total_distance > 0 else 0
        
        return {
            'success': True,
            'vehicle_id': vehicle_id,
            'period': {
                'start_date': start_date.isoformat() if start_date else fuel_logs[0].date.isoformat(),
                'end_date': end_date.isoformat() if end_date else fuel_logs[-1].date.isoformat(),
                'days': (fuel_logs[-1].date - fuel_logs[0].date).days
            },
            'statistics': {
                'total_distance_km': total_distance,
                'total_fuel_liters': round(total_fuel, 2),
                'total_cost': round(total_cost, 2),
                'efficiency_km_per_liter': round(efficiency_km_per_liter, 2),
                'cost_per_km': round(cost_per_km, 2),
                'refuel_count': len(fuel_logs),
                'average_refuel_liters': round(total_fuel / len(fuel_logs), 2),
                'average_refuel_cost': round(total_cost / len(fuel_logs), 2)
            }
        }

    @api.model
    def get_fuel_efficiency_trend(self, vehicle_id, months=6):
        """
        Get fuel efficiency trend over time for dashboard charts.
        
        Args:
            vehicle_id (int): Vehicle ID
            months (int): Number of months to analyze
            
        Returns:
            dict: Monthly fuel efficiency data for charting
        """
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta
        
        end_date = fields.Date.today()
        start_date = end_date - relativedelta(months=months)
        
        fuel_logs = self.search([
            ('vehicle_id', '=', vehicle_id),
            ('date', '>=', start_date),
            ('date', '<=', end_date)
        ], order='date asc')
        
        if not fuel_logs:
            return {
                'success': False,
                'error': 'No fuel data available for this period'
            }
        
        # Group by month
        monthly_data = {}
        for log in fuel_logs:
            month_key = log.date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'logs': [],
                    'total_fuel': 0,
                    'total_cost': 0,
                    'min_odometer': float('inf'),
                    'max_odometer': 0
                }
            
            monthly_data[month_key]['logs'].append(log)
            monthly_data[month_key]['total_fuel'] += log.liters
            monthly_data[month_key]['total_cost'] += log.price
            monthly_data[month_key]['min_odometer'] = min(monthly_data[month_key]['min_odometer'], log.odometer)
            monthly_data[month_key]['max_odometer'] = max(monthly_data[month_key]['max_odometer'], log.odometer)
        
        # Calculate efficiency for each month
        trend_data = []
        for month_key in sorted(monthly_data.keys()):
            data = monthly_data[month_key]
            distance = data['max_odometer'] - data['min_odometer']
            
            if distance > 0 and data['total_fuel'] > 0:
                efficiency = distance / data['total_fuel']
                cost_per_km = data['total_cost'] / distance
                
                trend_data.append({
                    'month': month_key,
                    'month_name': datetime.strptime(month_key, '%Y-%m').strftime('%B %Y'),
                    'efficiency_km_per_liter': round(efficiency, 2),
                    'total_fuel_liters': round(data['total_fuel'], 2),
                    'total_cost': round(data['total_cost'], 2),
                    'distance_km': distance,
                    'cost_per_km': round(cost_per_km, 2),
                    'refuel_count': len(data['logs'])
                })
        
        return {
            'success': True,
            'vehicle_id': vehicle_id,
            'period_months': months,
            'trend': trend_data
        }

    @api.model
    def compare_vehicle_efficiency(self, vehicle_ids, start_date=None, end_date=None):
        """
        Compare fuel efficiency across multiple vehicles.
        
        Args:
            vehicle_ids (list): List of vehicle IDs to compare
            start_date (date, optional): Start date
            end_date (date, optional): End date
            
        Returns:
            dict: Comparison data for all vehicles
        """
        Vehicle = self.env['fleet.vehicle']
        comparison = []
        
        for vehicle_id in vehicle_ids:
            vehicle = Vehicle.browse(vehicle_id)
            if not vehicle.exists():
                continue
            
            efficiency_data = self.calculate_fuel_efficiency(vehicle_id, start_date, end_date)
            
            if efficiency_data['success']:
                comparison.append({
                    'vehicle_id': vehicle_id,
                    'plate_no': vehicle.license_plate,
                    'category': vehicle.category_id.name if vehicle.category_id else 'Unknown',
                    'model': vehicle.model_id.name if vehicle.model_id else 'Unknown',
                    'efficiency_km_per_liter': efficiency_data['statistics']['efficiency_km_per_liter'],
                    'total_distance_km': efficiency_data['statistics']['total_distance_km'],
                    'total_fuel_liters': efficiency_data['statistics']['total_fuel_liters'],
                    'total_cost': efficiency_data['statistics']['total_cost'],
                    'cost_per_km': efficiency_data['statistics']['cost_per_km']
                })
        
        # Sort by efficiency (best first)
        comparison.sort(key=lambda x: x['efficiency_km_per_liter'], reverse=True)
        
        return {
            'success': True,
            'vehicle_count': len(comparison),
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            },
            'vehicles': comparison
        }

    @api.model
    def get_fuel_alerts(self, vehicle_id=None):
        """
        Get fuel-related alerts (low efficiency, high costs, etc.).
        
        Args:
            vehicle_id (int, optional): Specific vehicle or all vehicles
            
        Returns:
            dict: List of fuel alerts
        """
        alerts = []
        
        # Define thresholds
        LOW_EFFICIENCY_THRESHOLD = 8.0  # km/liter
        HIGH_COST_PER_KM_THRESHOLD = 5.0  # currency per km
        
        domain = []
        if vehicle_id:
            domain.append(('vehicle_id', '=', vehicle_id))
        
        # Get recent fuel logs (last 30 days)
        from datetime import timedelta
        recent_date = fields.Date.today() - timedelta(days=30)
        domain.append(('date', '>=', recent_date))
        
        vehicles = self.search(domain).mapped('vehicle_id')
        
        for vehicle in vehicles:
            efficiency_data = self.calculate_fuel_efficiency(vehicle.id, recent_date)
            
            if not efficiency_data['success']:
                continue
            
            stats = efficiency_data['statistics']
            
            # Check for low efficiency
            if stats['efficiency_km_per_liter'] < LOW_EFFICIENCY_THRESHOLD:
                alerts.append({
                    'type': 'low_efficiency',
                    'severity': 'warning',
                    'vehicle_id': vehicle.id,
                    'vehicle_plate': vehicle.license_plate,
                    'message': f"Low fuel efficiency: {stats['efficiency_km_per_liter']} km/L (threshold: {LOW_EFFICIENCY_THRESHOLD} km/L)",
                    'value': stats['efficiency_km_per_liter'],
                    'threshold': LOW_EFFICIENCY_THRESHOLD
                })
            
            # Check for high cost per km
            if stats['cost_per_km'] > HIGH_COST_PER_KM_THRESHOLD:
                alerts.append({
                    'type': 'high_cost',
                    'severity': 'warning',
                    'vehicle_id': vehicle.id,
                    'vehicle_plate': vehicle.license_plate,
                    'message': f"High fuel cost: {stats['cost_per_km']} per km (threshold: {HIGH_COST_PER_KM_THRESHOLD} per km)",
                    'value': stats['cost_per_km'],
                    'threshold': HIGH_COST_PER_KM_THRESHOLD
                })
        
        return {
            'success': True,
            'alert_count': len(alerts),
            'alerts': alerts
        }

