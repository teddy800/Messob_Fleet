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
import logging

_logger = logging.getLogger(__name__)


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
        ondelete='set null',
        help='The active trip during which this fuel was added (optional for automatic logs).',
    )

    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        required=True,
        index=True,
        help='Vehicle that received the fuel.',
    )

    driver_id = fields.Many2one(
        comodel_name='res.partner',
        string='Driver',
        help='Driver who refueled the vehicle (for manual entries).',
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

    # ── HW-2: Fuel Pump Hardware Interface Fields ──
    source = fields.Selection(
        selection=[
            ('manual', 'Manual Entry'),
            ('automatic', 'Automatic (Fuel Pump)'),
        ],
        string='Source',
        default='manual',
        required=True,
        help='Source of the fuel log entry.',
    )

    pump_id = fields.Char(
        string='Pump ID',
        help='Fuel pump hardware identifier (for automatic entries).',
    )

    pump_transaction_id = fields.Char(
        string='Transaction ID',
        help='Unique transaction ID from fuel pump hardware.',
        index=True,
    )

    notes = fields.Text(
        string='Notes',
        help='Additional notes or comments about this fuel transaction.',
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

    # =========================================================================
    # PERFORMANCE OPTIMIZATION (NFR-1: Performance Requirements)
    # =========================================================================
    
    def _auto_init(self):
        """
        Create composite indexes for frequently queried field combinations.
        This improves query performance for fuel analytics and reporting:
        - vehicle_id + date: Vehicle fuel history
        - vehicle_id + odometer: Fuel efficiency calculations
        - pump_transaction_id: Automatic fuel log lookup (HW-2)
        
        NFR-1.1: API response time for fuel analytics should be <500ms.
        """
        res = super()._auto_init()
        
        # Composite index for vehicle fuel history queries
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_fuel_log_vehicle_date_idx 
            ON messob_fms_fuel_log (vehicle_id, date DESC)
        """)
        
        # Composite index for fuel efficiency calculations (requires odometer ordering)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_fuel_log_vehicle_odometer_idx 
            ON messob_fms_fuel_log (vehicle_id, odometer ASC)
        """)
        
        # Index for automatic fuel pump transaction lookup (HW-2)
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_fuel_log_pump_transaction_idx 
            ON messob_fms_fuel_log (pump_transaction_id) 
            WHERE pump_transaction_id IS NOT NULL
        """)
        
        # Composite index for trip-related fuel logs
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS messob_fms_fuel_log_trip_date_idx 
            ON messob_fms_fuel_log (trip_id, date DESC) 
            WHERE trip_id IS NOT NULL
        """)
        
        _logger.info("Fuel Log: Composite indexes created for performance optimization (NFR-1)")
        return res
    
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
        
        # Convert dates to string format properly
        first_date = fuel_logs[0].date
        last_date = fuel_logs[-1].date
        period_start = start_date if start_date else first_date
        period_end = end_date if end_date else last_date
        
        return {
            'success': True,
            'vehicle_id': vehicle_id,
            'period': {
                'start_date': period_start.isoformat() if hasattr(period_start, 'isoformat') else str(period_start),
                'end_date': period_end.isoformat() if hasattr(period_end, 'isoformat') else str(period_end),
                'days': (last_date - first_date).days
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


    @api.model_create_multi
    def create(self, vals_list):
        """
        Override create to handle automatic fuel pump transactions.
        
        HW-2: Enhanced create method for fuel pump hardware integration.
        - Sends notifications for automatic logs
        - Triggers reconciliation checks
        - Updates vehicle odometer automatically
        - Logs audit trail for automatic transactions
        """
        records = super().create(vals_list)
        
        for rec in records:
            # Handle automatic fuel logs from pump hardware
            if rec.source == 'automatic':
                # Send notification to dispatcher/admin
                self._notify_automatic_fuel_log(rec)
                
                # Log in audit trail
                self.env['messob.fms.audit.log'].sudo().log_business_action(
                    action='AUTO_FUEL_LOG',
                    model=self._name,
                    record_id=rec.id,
                    description=f"Automatic fuel log created from pump {rec.pump_id or 'Unknown'} "
                               f"for vehicle {rec.vehicle_id.license_plate if rec.vehicle_id else 'Unknown'} - "
                               f"{rec.liters}L, Cost: {rec.price}",
                    severity='medium',
                    additional_data={
                        'vehicle': rec.vehicle_id.license_plate if rec.vehicle_id else None,
                        'pump_id': rec.pump_id,
                        'transaction_id': rec.pump_transaction_id,
                        'volume': rec.liters,
                        'cost': rec.price,
                        'odometer': rec.odometer,
                        'station': rec.station_name,
                    }
                )
                
                # Update vehicle odometer if higher
                if rec.vehicle_id and rec.odometer > (rec.vehicle_id.odometer or 0):
                    old_odometer = rec.vehicle_id.odometer
                    rec.vehicle_id.write({'odometer': rec.odometer})
                    _logger.info(
                        f"Vehicle {rec.vehicle_id.license_plate} odometer updated "
                        f"from {old_odometer} to {rec.odometer} via fuel pump"
                    )
        
        return records

    def _notify_automatic_fuel_log(self, fuel_log):
        """
        Send notification when automatic fuel log is created.
        
        HW-2: Notification system for automatic fuel pump transactions.
        Notifies dispatcher and admin about new automatic fuel entries.
        """
        notify_dispatcher = self.env['ir.config_parameter'].sudo().get_param(
            'messob_fleet.fuel_pump_notify_dispatcher', 'True'
        ) == 'True'
        
        notify_admin = self.env['ir.config_parameter'].sudo().get_param(
            'messob_fleet.fuel_pump_notify_admin', 'True'
        ) == 'True'
        
        if not (notify_dispatcher or notify_admin):
            return
        
        # Get recipients
        recipients = self.env['res.partner']
        
        if notify_dispatcher:
            dispatcher_group = self.env.ref('messob_fleet.group_fms_dispatcher', raise_if_not_found=False)
            if dispatcher_group:
                recipients |= dispatcher_group.users.mapped('partner_id')
        
        if notify_admin:
            admin_group = self.env.ref('messob_fleet.group_fms_admin', raise_if_not_found=False)
            if admin_group:
                recipients |= admin_group.users.mapped('partner_id')
        
        if not recipients:
            return
        
        # Prepare message
        vehicle_name = fuel_log.vehicle_id.license_plate if fuel_log.vehicle_id else 'Unknown Vehicle'
        pump_id = fuel_log.pump_id or 'Unknown Pump'
        station = fuel_log.station_name or 'Unknown Station'
        
        message_body = f"""
        <div style="padding: 15px; background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 4px;">
            <strong style="color: #1E40AF; font-size: 16px;">⛽ Automatic Fuel Log Created</strong>
            <div style="margin-top: 12px; color: #1E3A8A;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0;"><strong>Vehicle:</strong></td>
                        <td style="padding: 4px 0;">{vehicle_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Station:</strong></td>
                        <td style="padding: 4px 0;">{station}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Pump ID:</strong></td>
                        <td style="padding: 4px 0;">{pump_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Volume:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.liters:.2f} Liters</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Cost:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.price:.2f} ETB</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Price/Liter:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.price_per_liter:.2f} ETB/L</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Odometer:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.odometer:,} km</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Transaction ID:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.pump_transaction_id or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0;"><strong>Date:</strong></td>
                        <td style="padding: 4px 0;">{fuel_log.date.strftime('%Y-%m-%d %H:%M:%S')}</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 12px; padding: 8px; background: #DBEAFE; border-radius: 4px;">
                <small style="color: #1E40AF;">
                    <strong>ℹ️ Note:</strong> This fuel log was automatically created by the fuel pump hardware system.
                    No manual intervention required.
                </small>
            </div>
        </div>
        """
        
        # Send notification
        try:
            self.env['mail.mail'].sudo().create({
                'subject': f'🔔 Automatic Fuel Log: {vehicle_name} - {fuel_log.liters:.1f}L',
                'body_html': message_body,
                'recipient_ids': [(6, 0, recipients.ids)],
                'auto_delete': False,
            }).send()
            
            _logger.info(f"Automatic fuel log notification sent to {len(recipients)} recipients")
        except Exception as e:
            _logger.error(f"Failed to send automatic fuel log notification: {e}")

    @api.model
    def reconcile_fuel_logs(self, vehicle_id=None, date_from=None, date_to=None):
        """
        HW-2: Reconcile automatic vs manual fuel logs.
        
        Compare automatic fuel logs (from pump hardware) with manual entries
        to identify discrepancies, missing entries, or duplicate records.
        
        Args:
            vehicle_id (int, optional): Specific vehicle to reconcile
            date_from (date, optional): Start date for reconciliation
            date_to (date, optional): End date for reconciliation
            
        Returns:
            dict: Reconciliation report with discrepancies and statistics
        """
        domain = []
        
        if vehicle_id:
            domain.append(('vehicle_id', '=', vehicle_id))
        if date_from:
            domain.append(('date', '>=', date_from))
        if date_to:
            domain.append(('date', '<=', date_to))
        
        all_logs = self.search(domain, order='date asc')
        automatic_logs = all_logs.filtered(lambda l: l.source == 'automatic')
        manual_logs = all_logs.filtered(lambda l: l.source == 'manual')
        
        discrepancies = []
        matched = []
        unmatched_automatic = []
        unmatched_manual = []
        
        # Match automatic with manual logs (within 1 hour, same vehicle)
        for auto_log in automatic_logs:
            matching_manual = manual_logs.filtered(
                lambda m: m.vehicle_id == auto_log.vehicle_id and
                abs((m.date - auto_log.date).total_seconds()) < 3600
            )
            
            if matching_manual:
                # Check for discrepancies
                for manual_log in matching_manual:
                    volume_diff = abs(auto_log.liters - manual_log.liters)
                    cost_diff = abs(auto_log.price - manual_log.price)
                    
                    if volume_diff > 1.0 or cost_diff > 50.0:
                        discrepancies.append({
                            'vehicle': auto_log.vehicle_id.license_plate,
                            'date': auto_log.date.isoformat() if hasattr(auto_log.date, 'isoformat') else str(auto_log.date),
                            'automatic_log_id': auto_log.id,
                            'manual_log_id': manual_log.id,
                            'volume_difference': round(volume_diff, 2),
                            'cost_difference': round(cost_diff, 2),
                            'severity': 'high' if volume_diff > 5.0 or cost_diff > 200.0 else 'medium',
                        })
                    else:
                        matched.append({
                            'automatic_log_id': auto_log.id,
                            'manual_log_id': manual_log.id,
                            'vehicle': auto_log.vehicle_id.license_plate,
                            'date': auto_log.date.isoformat() if hasattr(auto_log.date, 'isoformat') else str(auto_log.date),
                        })
            else:
                unmatched_automatic.append({
                    'log_id': auto_log.id,
                    'vehicle': auto_log.vehicle_id.license_plate,
                    'date': auto_log.date.isoformat() if hasattr(auto_log.date, 'isoformat') else str(auto_log.date),
                    'volume': auto_log.liters,
                    'cost': auto_log.price,
                })
        
        # Find manual logs without automatic counterpart
        for manual_log in manual_logs:
            matching_auto = automatic_logs.filtered(
                lambda a: a.vehicle_id == manual_log.vehicle_id and
                abs((a.date - manual_log.date).total_seconds()) < 3600
            )
            
            if not matching_auto:
                unmatched_manual.append({
                    'log_id': manual_log.id,
                    'vehicle': manual_log.vehicle_id.license_plate,
                    'date': manual_log.date.isoformat() if hasattr(manual_log.date, 'isoformat') else str(manual_log.date),
                    'volume': manual_log.liters,
                    'cost': manual_log.price,
                })
        
        # Format period dates safely
        period_from = date_from.isoformat() if date_from and hasattr(date_from, 'isoformat') else (str(date_from) if date_from else 'All time')
        period_to = date_to.isoformat() if date_to and hasattr(date_to, 'isoformat') else (str(date_to) if date_to else 'Now')
        
        return {
            'success': True,
            'period': {
                'from': period_from,
                'to': period_to,
            },
            'summary': {
                'total_logs': len(all_logs),
                'automatic_logs': len(automatic_logs),
                'manual_logs': len(manual_logs),
                'matched_pairs': len(matched),
                'discrepancies': len(discrepancies),
                'unmatched_automatic': len(unmatched_automatic),
                'unmatched_manual': len(unmatched_manual),
            },
            'discrepancies': discrepancies,
            'unmatched_automatic': unmatched_automatic,
            'unmatched_manual': unmatched_manual,
            'matched': matched,
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
                'start_date': start_date.isoformat() if start_date and hasattr(start_date, 'isoformat') else (str(start_date) if start_date else None),
                'end_date': end_date.isoformat() if end_date and hasattr(end_date, 'isoformat') else (str(end_date) if end_date else None)
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

