# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Service: Routing Service
# Description: Routing with multiple provider support
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
    Routing Service with multiple provider support.
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

    # =========================================================================
    # GOOGLE MAPS DIRECTIONS API
    # =========================================================================

    def _route_google(self, origin, destination, waypoints, options):
        """Calculate route using Google Maps Directions API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.google_maps_api_key')
        
        if not api_key:
            raise UserError(_("Google Maps API key not configured"))
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        
        params = {
            'origin': f"{origin['lat']},{origin['lng']}",
            'destination': f"{destination['lat']},{destination['lng']}",
            'key': api_key,
            'alternatives': False,
            'units': 'metric'
        }
        
        # Add waypoints
        if waypoints:
            waypoint_str = '|'.join([f"{w['lat']},{w['lng']}" for w in waypoints])
            params['waypoints'] = waypoint_str
        
        # Add options
        if options:
            if options.get('avoid_tolls'):
                params['avoid'] = 'tolls'
            if options.get('avoid_highways'):
                params['avoid'] = 'highways'
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if data['status'] == 'OK' and data['routes']:
            route = data['routes'][0]
            leg = route['legs'][0]
            
            # Extract polyline
            polyline = self._decode_polyline(route['overview_polyline']['points'])
            
            # Extract steps
            steps = []
            for step in leg['steps']:
                steps.append({
                    'instruction': step['html_instructions'],
                    'distance': step['distance']['value'] / 1000,  # meters to km
                    'duration': step['duration']['value'] / 60,  # seconds to minutes
                    'start_location': step['start_location'],
                    'end_location': step['end_location']
                })
            
            return {
                'success': True,
                'route': {
                    'distance_km': leg['distance']['value'] / 1000,
                    'duration_minutes': leg['duration']['value'] / 60,
                    'polyline': polyline,
                    'steps': steps,
                    'bounds': route['bounds']
                },
                'provider': 'google'
            }
        else:
            return {'success': False, 'error': data.get('status')}

    # =========================================================================
    # MAPBOX DIRECTIONS API
    # =========================================================================

    def _route_mapbox(self, origin, destination, waypoints, options):
        """Calculate route using Mapbox Directions API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.mapbox_api_key')
        
        if not api_key:
            raise UserError(_("Mapbox API key not configured"))
        
        # Build coordinates string
        coords = [f"{origin['lng']},{origin['lat']}"]
        if waypoints:
            coords.extend([f"{w['lng']},{w['lat']}" for w in waypoints])
        coords.append(f"{destination['lng']},{destination['lat']}")
        coords_str = ';'.join(coords)
        
        url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{coords_str}"
        
        params = {
            'access_token': api_key,
            'geometries': 'geojson',
            'steps': True,
            'overview': 'full'
        }
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get('routes'):
            route = data['routes'][0]
            
            # Extract polyline from geometry
            polyline = []
            for coord in route['geometry']['coordinates']:
                polyline.append({'lat': coord[1], 'lng': coord[0]})
            
            # Extract steps
            steps = []
            for leg in route['legs']:
                for step in leg['steps']:
                    steps.append({
                        'instruction': step['maneuver']['instruction'],
                        'distance': step['distance'] / 1000,
                        'duration': step['duration'] / 60,
                        'start_location': {'lat': step['maneuver']['location'][1], 'lng': step['maneuver']['location'][0]},
                        'end_location': {'lat': step['maneuver']['location'][1], 'lng': step['maneuver']['location'][0]}
                    })
            
            return {
                'success': True,
                'route': {
                    'distance_km': route['distance'] / 1000,
                    'duration_minutes': route['duration'] / 60,
                    'polyline': polyline,
                    'steps': steps,
                    'bounds': self._calculate_bounds(polyline)
                },
                'provider': 'mapbox'
            }
        else:
            return {'success': False, 'error': 'No routes found'}

    # =========================================================================
    # OSRM (Open Source Routing Machine)
    # =========================================================================

    def _route_osrm(self, origin, destination, waypoints, options):
        """Calculate route using OSRM."""
        osrm_url = self.env['ir.config_parameter'].sudo().get_param('messob_fms.osrm_url', 'https://router.project-osrm.org')
        
        # Build coordinates string
        coords = [f"{origin['lng']},{origin['lat']}"]
        if waypoints:
            coords.extend([f"{w['lng']},{w['lat']}" for w in waypoints])
        coords.append(f"{destination['lng']},{destination['lat']}")
        coords_str = ';'.join(coords)
        
        url = f"{osrm_url}/route/v1/driving/{coords_str}"
        
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': True
        }
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            
            # Extract polyline
            polyline = []
            for coord in route['geometry']['coordinates']:
                polyline.append({'lat': coord[1], 'lng': coord[0]})
            
            # Extract steps
            steps = []
            for leg in route['legs']:
                for step in leg['steps']:
                    steps.append({
                        'instruction': step.get('name', 'Continue'),
                        'distance': step['distance'] / 1000,
                        'duration': step['duration'] / 60,
                        'start_location': {'lat': step['maneuver']['location'][1], 'lng': step['maneuver']['location'][0]},
                        'end_location': {'lat': step['maneuver']['location'][1], 'lng': step['maneuver']['location'][0]}
                    })
            
            return {
                'success': True,
                'route': {
                    'distance_km': route['distance'] / 1000,
                    'duration_minutes': route['duration'] / 60,
                    'polyline': polyline,
                    'steps': steps,
                    'bounds': self._calculate_bounds(polyline)
                },
                'provider': 'osrm'
            }
        else:
            return {'success': False, 'error': data.get('message', 'Routing failed')}

    # =========================================================================
    # HERE ROUTING API
    # =========================================================================

    def _route_here(self, origin, destination, waypoints, options):
        """Calculate route using HERE Routing API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.here_api_key')
        
        if not api_key:
            raise UserError(_("HERE API key not configured"))
        
        url = "https://router.hereapi.com/v8/routes"
        
        params = {
            'apiKey': api_key,
            'transportMode': 'car',
            'origin': f"{origin['lat']},{origin['lng']}",
            'destination': f"{destination['lat']},{destination['lng']}",
            'return': 'polyline,summary,instructions'
        }
        
        # Add waypoints
        if waypoints:
            for i, wp in enumerate(waypoints):
                params[f'via[{i}]'] = f"{wp['lat']},{wp['lng']}"
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get('routes'):
            route = data['routes'][0]
            section = route['sections'][0]
            
            # Decode polyline
            polyline = self._decode_here_polyline(section['polyline'])
            
            # Extract steps
            steps = []
            for action in section.get('actions', []):
                steps.append({
                    'instruction': action.get('instruction', 'Continue'),
                    'distance': action.get('length', 0) / 1000,
                    'duration': action.get('duration', 0) / 60,
                    'start_location': {'lat': 0, 'lng': 0},
                    'end_location': {'lat': 0, 'lng': 0}
                })
            
            summary = section['summary']
            
            return {
                'success': True,
                'route': {
                    'distance_km': summary['length'] / 1000,
                    'duration_minutes': summary['duration'] / 60,
                    'polyline': polyline,
                    'steps': steps,
                    'bounds': self._calculate_bounds(polyline)
                },
                'provider': 'here'
            }
        else:
            return {'success': False, 'error': 'No routes found'}

    # =========================================================================
    # GRAPHHOPPER ROUTING API
    # =========================================================================

    def _route_graphhopper(self, origin, destination, waypoints, options):
        """Calculate route using GraphHopper API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.graphhopper_api_key')
        
        if not api_key:
            raise UserError(_("GraphHopper API key not configured"))
        
        url = "https://graphhopper.com/api/1/route"
        
        # Build points
        points = [[origin['lat'], origin['lng']]]
        if waypoints:
            points.extend([[w['lat'], w['lng']] for w in waypoints])
        points.append([destination['lat'], destination['lng']])
        
        payload = {
            'points': points,
            'vehicle': 'car',
            'locale': 'en',
            'instructions': True,
            'calc_points': True,
            'points_encoded': False
        }
        
        params = {'key': api_key}
        
        response = requests.post(url, params=params, json=payload, timeout=30)
        data = response.json()
        
        if data.get('paths'):
            path = data['paths'][0]
            
            # Extract polyline
            polyline = []
            for coord in path['points']['coordinates']:
                polyline.append({'lat': coord[1], 'lng': coord[0]})
            
            # Extract steps
            steps = []
            for instruction in path.get('instructions', []):
                steps.append({
                    'instruction': instruction['text'],
                    'distance': instruction['distance'] / 1000,
                    'duration': instruction['time'] / 60000,
                    'start_location': {'lat': 0, 'lng': 0},
                    'end_location': {'lat': 0, 'lng': 0}
                })
            
            return {
                'success': True,
                'route': {
                    'distance_km': path['distance'] / 1000,
                    'duration_minutes': path['time'] / 60000,
                    'polyline': polyline,
                    'steps': steps,
                    'bounds': self._calculate_bounds(polyline)
                },
                'provider': 'graphhopper'
            }
        else:
            return {'success': False, 'error': data.get('message', 'Routing failed')}

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _normalize_location(self, location):
        """Normalize location to lat/lng dict."""
        if isinstance(location, dict) and 'lat' in location and 'lng' in location:
            return location
        elif isinstance(location, str):
            # Geocode address
            geocode_result = self.env['messob.fms.geocoding.service'].geocode_address(location)
            if geocode_result.get('success'):
                return {
                    'lat': geocode_result['latitude'],
                    'lng': geocode_result['longitude']
                }
        return None

    def _route_fallback(self, origin, destination):
        """Fallback routing using straight-line distance."""
        distance_km = self._haversine_distance(
            origin['lat'], origin['lng'],
            destination['lat'], destination['lng']
        )
        
        # Estimate duration (assume 50 km/h average)
        duration_minutes = (distance_km / 50) * 60
        
        return {
            'success': True,
            'route': {
                'distance_km': distance_km,
                'duration_minutes': duration_minutes,
                'polyline': [origin, destination],
                'steps': [{
                    'instruction': f'Drive {distance_km:.1f} km to destination',
                    'distance': distance_km,
                    'duration': duration_minutes,
                    'start_location': origin,
                    'end_location': destination
                }],
                'bounds': {
                    'northeast': {
                        'lat': max(origin['lat'], destination['lat']),
                        'lng': max(origin['lng'], destination['lng'])
                    },
                    'southwest': {
                        'lat': min(origin['lat'], destination['lat']),
                        'lng': min(origin['lng'], destination['lng'])
                    }
                }
            },
            'provider': 'fallback',
            'warning': 'Using straight-line distance estimation'
        }

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula."""
        R = 6371  # Earth radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c

    def _decode_polyline(self, encoded):
        """Decode Google polyline format."""
        points = []
        index = 0
        lat = 0
        lng = 0
        
        while index < len(encoded):
            # Decode latitude
            result = 0
            shift = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            dlat = ~(result >> 1) if result & 1 else result >> 1
            lat += dlat
            
            # Decode longitude
            result = 0
            shift = 0
            while True:
                b = ord(encoded[index]) - 63
                index += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            dlng = ~(result >> 1) if result & 1 else result >> 1
            lng += dlng
            
            points.append({
                'lat': lat / 1e5,
                'lng': lng / 1e5
            })
        
        return points

    def _decode_here_polyline(self, encoded):
        """Decode HERE flexible polyline format."""
        # Simplified decoder - HERE uses flexible polyline format
        # For production, use the official HERE polyline library
        points = []
        try:
            coords = encoded.split(',')
            for i in range(0, len(coords), 2):
                if i + 1 < len(coords):
                    points.append({
                        'lat': float(coords[i]),
                        'lng': float(coords[i + 1])
                    })
        except:
            pass
        return points

    def _calculate_bounds(self, polyline):
        """Calculate bounding box for polyline."""
        if not polyline:
            return {}
        
        lats = [p['lat'] for p in polyline]
        lngs = [p['lng'] for p in polyline]
        
        return {
            'northeast': {'lat': max(lats), 'lng': max(lngs)},
            'southwest': {'lat': min(lats), 'lng': min(lngs)}
        }

    def _get_provider_priority(self):
        """Get provider priority order."""
        ICP = self.env['ir.config_parameter'].sudo()
        
        providers = []
        if ICP.get_param('messob_fms.google_maps_api_key'):
            providers.append('google')
        if ICP.get_param('messob_fms.mapbox_api_key'):
            providers.append('mapbox')
        if ICP.get_param('messob_fms.graphhopper_api_key'):
            providers.append('graphhopper')
        if ICP.get_param('messob_fms.here_api_key'):
            providers.append('here')
        
        # Always add OSRM as free fallback
        providers.append('osrm')
        
        return providers
