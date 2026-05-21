# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.gps.position
# Description: GPS Position data storage (HW-1)
#
# Features:
#   - Store GPS coordinates and telemetry
#   - Link positions to vehicles and trips
#   - Calculate distance and speed
#   - Geofencing support
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime
import math
import logging

_logger = logging.getLogger(__name__)


class MessobFmsGpsPosition(models.Model):
    """
    GPS Position records from tracking devices.
    Stores location, speed, heading, and other telemetry data.
    """

    _name = 'messob.fms.gps.position'
    _description = 'MESSOB FMS - GPS Position'
    _order = 'timestamp desc'
    _rec_name = 'display_name'

    # ── Core Fields ──
    device_id = fields.Many2one(
        comodel_name='messob.fms.gps.device',
        string='GPS Device',
        required=True,
        ondelete='cascade',
        index=True,
    )

    vehicle_id = fields.Many2one(
        comodel_name='fleet.vehicle',
        string='Vehicle',
        related='device_id.vehicle_id',
        store=True,
        index=True,
    )

    trip_id = fields.Many2one(
        comodel_name='messob.fms.trip',
        string='Trip',
        index=True,
        help='Trip active at the time of this position',
    )

    timestamp = fields.Datetime(
        string='Timestamp',
        required=True,
        default=fields.Datetime.now,
        index=True,
        help='Time when position was recorded',
    )

    # ── GPS Coordinates ──
    latitude = fields.Float(
        string='Latitude',
        required=True,
        digits=(10, 7),
        help='GPS latitude in decimal degrees',
    )

    longitude = fields.Float(
        string='Longitude',
        required=True,
        digits=(10, 7),
        help='GPS longitude in decimal degrees',
    )

    altitude = fields.Float(
        string='Altitude (m)',
        help='Altitude above sea level in meters',
    )

    accuracy = fields.Float(
        string='Accuracy (m)',
        help='GPS accuracy in meters',
    )

    # ── Motion Data ──
    speed = fields.Float(
        string='Speed (km/h)',
        help='Vehicle speed in kilometers per hour',
    )

    heading = fields.Float(
        string='Heading (degrees)',
        help='Direction of travel in degrees (0-360, 0=North)',
    )

    # ── Telemetry ──
    ignition = fields.Boolean(
        string='Ignition On',
        default=False,
        help='Engine ignition status',
    )

    odometer = fields.Float(
        string='Odometer (km)',
        help='Vehicle odometer reading',
    )

    fuel_level = fields.Float(
        string='Fuel Level (%)',
        help='Fuel tank level percentage',
    )

    battery_voltage = fields.Float(
        string='Battery Voltage (V)',
        help='Vehicle battery voltage',
    )

    # ── Status ──
    status = fields.Selection(
        selection=[
            ('moving', 'Moving'),
            ('stopped', 'Stopped'),
            ('idle', 'Idle'),
            ('unknown', 'Unknown'),
        ],
        string='Status',
        compute='_compute_status',
        store=True,
    )

    # ── Geofencing ──
    inside_geofence = fields.Boolean(
        string='Inside Geofence',
        default=False,
        help='Whether position is inside defined geofence',
    )

    geofence_id = fields.Many2one(
        comodel_name='messob.fms.geofence',
        string='Geofence',
        help='Geofence this position is inside',
    )

    # ── Computed Fields ──
    display_name = fields.Char(
        string='Display Name',
        compute='_compute_display_name',
        store=True,
    )

    distance_from_previous = fields.Float(
        string='Distance from Previous (km)',
        compute='_compute_distance_from_previous',
        store=True,
        help='Distance traveled since last position',
    )

    # ── Raw Data ──
    raw_data = fields.Text(
        string='Raw Data',
        help='Raw GPS data from device (JSON)',
    )

    @api.depends('device_id', 'timestamp', 'latitude', 'longitude')
    def _compute_display_name(self):
        """Generate display name for position."""
        for position in self:
            if position.device_id and position.timestamp:
                position.display_name = f"{position.device_id.name} - {position.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
            else:
                position.display_name = f"Position #{position.id}"

    @api.depends('speed', 'ignition')
    def _compute_status(self):
        """Determine vehicle status based on speed and ignition."""
        for position in self:
            if not position.ignition:
                position.status = 'stopped'
            elif position.speed > 5:  # Moving if speed > 5 km/h
                position.status = 'moving'
            elif position.speed > 0:
                position.status = 'idle'
            else:
                position.status = 'stopped'

    @api.depends('device_id', 'timestamp', 'latitude', 'longitude')
    def _compute_distance_from_previous(self):
        """Calculate distance from previous position."""
        for position in self:
            if not position.device_id or not position.timestamp:
                position.distance_from_previous = 0.0
                continue
            
            # Find previous position
            previous = self.search([
                ('device_id', '=', position.device_id.id),
                ('timestamp', '<', position.timestamp),
                ('id', '!=', position.id)
            ], order='timestamp desc', limit=1)
            
            if previous:
                distance = self._calculate_distance(
                    position.latitude, position.longitude,
                    previous.latitude, previous.longitude
                )
                position.distance_from_previous = distance
            else:
                position.distance_from_previous = 0.0

    # ── Constraints ──
    @api.constrains('latitude', 'longitude')
    def _check_coordinates(self):
        """Validate GPS coordinates are within valid ranges."""
        for position in self:
            if not (-90 <= position.latitude <= 90):
                raise ValidationError(_('Latitude must be between -90 and 90 degrees'))
            if not (-180 <= position.longitude <= 180):
                raise ValidationError(_('Longitude must be between -180 and 180 degrees'))

    @api.constrains('speed')
    def _check_speed(self):
        """Validate speed is reasonable."""
        for position in self:
            if position.speed and position.speed < 0:
                raise ValidationError(_('Speed cannot be negative'))
            if position.speed and position.speed > 200:  # Max reasonable speed
                _logger.warning(f"Unusually high speed recorded: {position.speed} km/h")

    # ── Helper Methods ──
    @staticmethod
    def _calculate_distance(lat1, lon1, lat2, lon2):
        """
        Calculate distance between two GPS coordinates using Haversine formula.
        Returns distance in kilometers.
        """
        # Earth radius in kilometers
        R = 6371.0
        
        # Convert degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return round(distance, 3)

    def action_view_on_map(self):
        """Open position on map view."""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': _('Position on Map'),
            'res_model': 'messob.fms.gps.position',
            'view_mode': 'map',
            'res_id': self.id,
            'target': 'new',
        }

    @api.model
    def get_latest_position(self, vehicle_id):
        """Get the latest GPS position for a vehicle."""
        position = self.search([
            ('vehicle_id', '=', vehicle_id)
        ], order='timestamp desc', limit=1)
        
        if position:
            return {
                'success': True,
                'position': {
                    'id': position.id,
                    'latitude': position.latitude,
                    'longitude': position.longitude,
                    'speed': position.speed,
                    'heading': position.heading,
                    'timestamp': position.timestamp.isoformat(),
                    'status': position.status,
                    'ignition': position.ignition,
                }
            }
        else:
            return {
                'success': False,
                'error': 'No position data available for this vehicle'
            }

    @api.model
    def get_position_history(self, vehicle_id, start_date, end_date, limit=1000):
        """Get position history for a vehicle within date range."""
        positions = self.search([
            ('vehicle_id', '=', vehicle_id),
            ('timestamp', '>=', start_date),
            ('timestamp', '<=', end_date)
        ], order='timestamp asc', limit=limit)
        
        history = []
        for position in positions:
            history.append({
                'id': position.id,
                'latitude': position.latitude,
                'longitude': position.longitude,
                'speed': position.speed,
                'heading': position.heading,
                'timestamp': position.timestamp.isoformat(),
                'status': position.status,
                'distance_from_previous': position.distance_from_previous,
            })
        
        return {
            'success': True,
            'count': len(history),
            'positions': history
        }

    @api.model
    def get_trip_route(self, trip_id):
        """Get all GPS positions for a specific trip."""
        positions = self.search([
            ('trip_id', '=', trip_id)
        ], order='timestamp asc')
        
        route = []
        total_distance = 0.0
        
        for position in positions:
            route.append({
                'latitude': position.latitude,
                'longitude': position.longitude,
                'speed': position.speed,
                'timestamp': position.timestamp.isoformat(),
            })
            total_distance += position.distance_from_previous
        
        return {
            'success': True,
            'trip_id': trip_id,
            'positions_count': len(route),
            'total_distance_km': round(total_distance, 2),
            'route': route
        }

    @api.model
    def calculate_trip_statistics(self, trip_id):
        """Calculate statistics for a trip based on GPS positions."""
        positions = self.search([
            ('trip_id', '=', trip_id)
        ], order='timestamp asc')
        
        if not positions:
            return {
                'success': False,
                'error': 'No GPS data available for this trip'
            }
        
        # Calculate statistics
        total_distance = sum(p.distance_from_previous for p in positions)
        speeds = [p.speed for p in positions if p.speed]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        max_speed = max(speeds) if speeds else 0
        
        # Calculate duration
        start_time = positions[0].timestamp
        end_time = positions[-1].timestamp
        duration_seconds = (end_time - start_time).total_seconds()
        duration_hours = duration_seconds / 3600
        
        # Count stops
        stops = len([p for p in positions if p.status == 'stopped'])
        
        return {
            'success': True,
            'trip_id': trip_id,
            'statistics': {
                'total_distance_km': round(total_distance, 2),
                'average_speed_kmh': round(avg_speed, 1),
                'max_speed_kmh': round(max_speed, 1),
                'duration_hours': round(duration_hours, 2),
                'stops_count': stops,
                'positions_recorded': len(positions),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
            }
        }
