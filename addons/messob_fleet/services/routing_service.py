# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Service: Routing Service
# Description: Advanced routing with multiple provider support
#
# Supported Providers:
#   - Google Maps Directions API
#   - Mapbox Directions API
#   - OSRM (Open Source Routing Machine)
#   - HERE Routing API
#   - GraphHopper
# ---------------------------------------------------------------------------

import requests
import logging
from datetime import datetime
from odoo import api, models, _
from odoo.exceptions import UserError
import math

_logger = logging.getLogger(__name__)


class RoutingService(models.AbstractModel):
    """
    Advanced Routing Service with multiple provider support.
    Calculates optimal routes, distances, and travel times.
    """

    _name = 'messob.fms.routing.service'
    _description = 'MESSOB FMS - Routing Service'

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    @api.model
    def calculate_route(self, origin, destination, waypoints=None, provider='auto', options=None):
        """
        Calculate route between origin and destination.
        
        Args:
            origin (dict): {'lat': float, 'lng': float} or address string
            destination (dict): {'lat': float, 'lng': float} or address string
            waypoints (list): Optional list of waypoints
            provider (str): 'google', 'mapbox', 'osrm', 'here', 'graphhopper', or 'auto'
            options (dict): Additional options (avoid_tolls, avoid_highways, etc.)
            
        Returns:
            dict: {
                'success': bool,
                'route': {
                    'distance_km': float,
                    'duration_minutes': float,
                    'polyline': list of coordinates,
                    'steps': list of turn-by-turn directions,
                    'bounds': dict with ne/sw corners
                },
                'provider': str
            }
        """
        try:
            # Normalize coordinates
            origin_coords = self._normalize_location(origin)
            dest_coords = self._normalize_location(destination)
            
            if not origin_coords or not dest_coords:
                return {'success': False, 'error': 'Invalid origin or destination'}
            
            # Try providers in order
            if provider == 'auto':
                providers = self._get_provider_priority()
            else:
                providers = [provider]
            
            for prov in providers:
                try:
                    if prov == 'google':
                        result = self._route_google(origin_coords, dest_coords, waypoints, options)
                    elif prov == 'mapbox':
                        result = self._route_mapbox(origin_coords, dest_coords, waypoints, options)
                    elif prov == 'osrm':
                        result = self._route_osrm(origin_coords, dest_coords, waypoints, options)
                    elif prov == 'here':
                        result = self._route_here(origin_coords, dest_coords, waypoints, options)
                    elif prov == 'graphhopper':
                        result = self._route_graphhopper(origin_coords, dest_coords, waypoints, options)
                    
                    if result and result.get('success'):
                        return result
                        
                except Exception as e:
                    _logger.warning(f"Routing failed with {prov}: {e}")
                    continue
            
            # All providers failed, use fallback
            return self._route_fallback(origin_coords, dest_coords)
            
        except Exception as e:
            _logger.error(f"Routing error: {e}")
            return self._route_fallback(origin_coords, dest_coords)
