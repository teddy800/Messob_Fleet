# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Model: messob.fms.geofence
# Description: Geofence management for location-based alerts (HW-1)
#
# Features:
#   - Define geographic boundaries
#   - Circular and polygon geofences
#   - Entry/exit alerts
#   - Speed limit zones
# ---------------------------------------------------------------------------

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import math
import json
import logging

_logger = logging.getLogger(__name__)


class MessobFmsGeofence(models.Model):
    """
    Geofence definitions for location-based monitoring.
    Supports circular and polygon geofences.
    """

    _name = 'messob.fms.geofence'
    _description = 'MESSOB FMS - Geofence'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'
    _rec_name = 'name'

    # ── Basic Information ──
    name = fields.Char(
        string='Geofence Name',
        required=True,
        tracking=True,
        help='Name of the geofence (e.g., "MESSOB HQ", "Bole Area")',
    )

    description = fields.Text(
        string='Description',
        help='Description of the geofence purpose',
    )

    geofence_type = fields.Selection(
        selection=[
            ('circle', 'Circular'),
            ('polygon', 'Polygon'),
        ],
        string='Type',
        required=True,
        default='circle',
        tracking=True,
    )

    # ── Circular Geofence ──
    center_latitude = fields.Float(
        string='Center Latitude',
        digits=(10, 7),
        help='Center point latitude for circular geofence',
    )

    center_longitude = fields.Float(
        string='Center Longitude',
        digits=(10, 7),
        help='Center point longitude for circular geofence',
    )

    radius = fields.Float(
        string='Radius (meters)',
        help='Radius in meters for circular geofence',
    )

    # ── Polygon Geofence ──
    polygon_points = fields.Text(
        string='Polygon Points',
        help='JSON array of coordinates for polygon geofence',
    )

    # ── Alert Configuration ──
    alert_on_entry = fields.Boolean(
        string='Alert on Entry',
        default=True,
        help='Send alert when vehicle enters geofence',
    )

    alert_on_exit = fields.Boolean(
        string='Alert on Exit',
        default=True,
        help='Send alert when vehicle exits geofence',
    )

    speed_limit = fields.Float(
        string='Speed Limit (km/h)',
        help='Speed limit within this geofence (0 = no limit)',
    )

    alert_on_speeding = fields.Boolean(
        string='Alert on Speeding',
        default=False,
        help='Send alert when vehicle exceeds speed limit',
    )

    # ── Assignment ──
    vehicle_ids = fields.Many2many(
        comodel_name='fleet.vehicle',
        string='Monitored Vehicles',
        help='Vehicles to monitor for this geofence (empty = all vehicles)',
    )

    # ── Status ──
    active = fields.Boolean(
        default=True,
        tracking=True,
        help='Uncheck to disable geofence monitoring',
    )

    color = fields.Char(
        string='Color',
        default='#3498db',
        help='Color for map display (hex code)',
    )

    # ── Statistics ──
    entry_count = fields.Integer(
        string='Total Entries',
        default=0,
        help='Total number of vehicle entries',
    )

    exit_count = fields.Integer(
        string='Total Exits',
        default=0,
        help='Total number of vehicle exits',
    )

    # ── Constraints ──
    @api.constrains('geofence_type', 'center_latitude', 'center_longitude', 'radius')
    def _check_circular_geofence(self):
        """Validate circular geofence parameters."""
        for geofence in self:
            if geofence.geofence_type == 'circle':
                if not geofence.center_latitude or not geofence.center_longitude:
                    raise ValidationError(_('Circular geofence requires center coordinates'))
                if not geofence.radius or geofence.radius <= 0:
                    raise ValidationError(_('Circular geofence requires positive radius'))

    @api.constrains('geofence_type', 'polygon_points')
    def _check_polygon_geofence(self):
        """Validate polygon geofence parameters."""
        for geofence in self:
            if geofence.geofence_type == 'polygon':
                if not geofence.polygon_points:
                    raise ValidationError(_('Polygon geofence requires points'))
                
                try:
                    points = json.loads(geofence.polygon_points)
                    if not isinstance(points, list) or len(points) < 3:
                        raise ValidationError(_('Polygon must have at least 3 points'))
                except json.JSONDecodeError:
                    raise ValidationError(_('Invalid polygon points format'))

    # ── Methods ──
    def is_point_inside(self, latitude, longitude):
        """
        Check if a point is inside this geofence.
        
        Args:
            latitude (float): Point latitude
            longitude (float): Point longitude
            
        Returns:
            bool: True if point is inside geofence
        """
        self.ensure_one()
        
        if self.geofence_type == 'circle':
            return self._is_point_in_circle(latitude, longitude)
        elif self.geofence_type == 'polygon':
            return self._is_point_in_polygon(latitude, longitude)
        else:
            return False

    def _is_point_in_circle(self, latitude, longitude):
        """Check if point is inside circular geofence."""
        # Calculate distance from center
        distance = self._calculate_distance(
            self.center_latitude, self.center_longitude,
            latitude, longitude
        )
        
        # Convert radius from meters to kilometers
        radius_km = self.radius / 1000.0
        
        return distance <= radius_km

    def _is_point_in_polygon(self, latitude, longitude):
        """Check if point is inside polygon geofence using ray casting algorithm."""
        try:
            points = json.loads(self.polygon_points)
            
            # Ray casting algorithm
            inside = False
            j = len(points) - 1
            
            for i in range(len(points)):
                xi, yi = points[i]['lat'], points[i]['lng']
                xj, yj = points[j]['lat'], points[j]['lng']
                
                if ((yi > longitude) != (yj > longitude)) and \
                   (latitude < (xj - xi) * (longitude - yi) / (yj - yi) + xi):
                    inside = not inside
                
                j = i
            
            return inside
            
        except Exception as e:
            _logger.error(f"Polygon check failed: {e}")
            return False

    @staticmethod
    def _calculate_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points in kilometers."""
        R = 6371.0  # Earth radius in km
        
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def action_view_on_map(self):
        """View geofence on map."""
        self.ensure_one()
        
        return {
            'type': 'ir.actions.act_window',
            'name': _('Geofence Map'),
            'res_model': 'messob.fms.geofence',
            'view_mode': 'map',
            'res_id': self.id,
            'target': 'new',
        }

    @api.model
    def check_position_geofences(self, position_id):
        """
        Check if a GPS position is inside any geofences.
        Updates position record with geofence information.
        
        Args:
            position_id (int): GPS position ID
            
        Returns:
            list: List of geofences the position is inside
        """
        position = self.env['messob.fms.gps.position'].browse(position_id)
        
        if not position.exists():
            return []
        
        # Get active geofences
        geofences = self.search([('active', '=', True)])
        
        inside_geofences = []
        
        for geofence in geofences:
            # Check if this geofence applies to this vehicle
            if geofence.vehicle_ids and position.vehicle_id not in geofence.vehicle_ids:
                continue
            
            # Check if position is inside
            if geofence.is_point_inside(position.latitude, position.longitude):
                inside_geofences.append(geofence)
                
                # Update position
                position.write({
                    'inside_geofence': True,
                    'geofence_id': geofence.id
                })
                
                # Check for speeding
                if geofence.alert_on_speeding and geofence.speed_limit > 0:
                    if position.speed > geofence.speed_limit:
                        self._create_speeding_alert(position, geofence)
        
        return inside_geofences

    def _create_speeding_alert(self, position, geofence):
        """Create alert for speeding violation."""
        # Create activity for dispatcher
        position.vehicle_id.activity_schedule(
            'mail.mail_activity_data_warning',
            summary=_('Speeding Alert'),
            note=_('Vehicle %s exceeded speed limit in %s: %d km/h (limit: %d km/h)') % (
                position.vehicle_id.license_plate,
                geofence.name,
                position.speed,
                geofence.speed_limit
            ),
            user_id=self.env.ref('base.user_admin').id
        )
        
        _logger.warning(f"Speeding alert: {position.vehicle_id.license_plate} in {geofence.name}")
