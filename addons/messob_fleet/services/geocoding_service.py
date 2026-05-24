# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Service: Geocoding Service
# Description: Advanced geocoding with multiple provider support
#
# Supported Providers:
#   - Google Maps Geocoding API
#   - Mapbox Geocoding API
#   - OpenStreetMap Nominatim
#   - HERE Geocoding API
#   - Local fallback database
# ---------------------------------------------------------------------------

import requests
import logging
from datetime import datetime, timedelta
from odoo import api, models, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class GeocodingService(models.AbstractModel):
    """
    Advanced Geocoding Service with multiple provider support.
    Automatically falls back to alternative providers if primary fails.
    """

    _name = 'messob.fms.geocoding.service'
    _description = 'MESSOB FMS - Geocoding Service'

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    @api.model
    def geocode_address(self, address, provider='auto'):
        """
        Convert address to coordinates (latitude, longitude).
        
        Args:
            address (str): Address to geocode
            provider (str): 'google', 'mapbox', 'osm', 'here', or 'auto'
            
        Returns:
            dict: {
                'success': bool,
                'latitude': float,
                'longitude': float,
                'formatted_address': str,
                'provider': str,
                'confidence': float (0-1)
            }
        """
        try:
            # Check cache first
            cached = self._get_cached_geocode(address)
            if cached:
                return cached
            
            # Try providers in order
            if provider == 'auto':
                providers = self._get_provider_priority()
            else:
                providers = [provider]
            
            result = None
            for prov in providers:
                try:
                    if prov == 'google':
                        result = self._geocode_google(address)
                    elif prov == 'mapbox':
                        result = self._geocode_mapbox(address)
                    elif prov == 'osm':
                        result = self._geocode_osm(address)
                    elif prov == 'here':
                        result = self._geocode_here(address)
                    
                    if result and result.get('success'):
                        # Cache successful result
                        self._cache_geocode(address, result)
                        return result
                        
                except Exception as e:
                    _logger.warning(f"Geocoding failed with {prov}: {e}")
                    continue
            
            # All providers failed, use fallback
            return self._geocode_fallback(address)
            
        except Exception as e:
            _logger.error(f"Geocoding error: {e}")
            return self._geocode_fallback(address)

    @api.model
    def reverse_geocode(self, latitude, longitude, provider='auto'):
        """
        Convert coordinates to address.
        
        Args:
            latitude (float): Latitude
            longitude (float): Longitude
            provider (str): Provider to use
            
        Returns:
            dict: {
                'success': bool,
                'address': str,
                'city': str,
                'country': str,
                'provider': str
            }
        """
        try:
            # Check cache
            cache_key = f"{latitude},{longitude}"
            cached = self._get_cached_reverse_geocode(cache_key)
            if cached:
                return cached
            
            # Try providers
            if provider == 'auto':
                providers = self._get_provider_priority()
            else:
                providers = [provider]
            
            for prov in providers:
                try:
                    if prov == 'google':
                        result = self._reverse_geocode_google(latitude, longitude)
                    elif prov == 'mapbox':
                        result = self._reverse_geocode_mapbox(latitude, longitude)
                    elif prov == 'osm':
                        result = self._reverse_geocode_osm(latitude, longitude)
                    elif prov == 'here':
                        result = self._reverse_geocode_here(latitude, longitude)
                    
                    if result and result.get('success'):
                        self._cache_reverse_geocode(cache_key, result)
                        return result
                        
                except Exception as e:
                    _logger.warning(f"Reverse geocoding failed with {prov}: {e}")
                    continue
            
            # Fallback
            return {
                'success': True,
                'address': f"Location: {latitude:.4f}, {longitude:.4f}",
                'city': 'Unknown',
                'country': 'Ethiopia',
                'provider': 'fallback'
            }
            
        except Exception as e:
            _logger.error(f"Reverse geocoding error: {e}")
            return {'success': False, 'error': str(e)}

    @api.model
    def autocomplete_address(self, query, limit=5, provider='auto'):
        """
        Get address suggestions for autocomplete.
        
        Args:
            query (str): Partial address query
            limit (int): Maximum number of suggestions
            provider (str): Provider to use
            
        Returns:
            dict: {
                'success': bool,
                'suggestions': [
                    {
                        'address': str,
                        'latitude': float,
                        'longitude': float,
                        'relevance': float
                    }
                ]
            }
        """
        try:
            if len(query) < 3:
                return {'success': True, 'suggestions': []}
            
            # Try providers
            if provider == 'auto':
                providers = self._get_provider_priority()
            else:
                providers = [provider]
            
            for prov in providers:
                try:
                    if prov == 'google':
                        result = self._autocomplete_google(query, limit)
                    elif prov == 'mapbox':
                        result = self._autocomplete_mapbox(query, limit)
                    elif prov == 'osm':
                        result = self._autocomplete_osm(query, limit)
                    elif prov == 'here':
                        result = self._autocomplete_here(query, limit)
                    
                    if result and result.get('success'):
                        return result
                        
                except Exception as e:
                    _logger.warning(f"Autocomplete failed with {prov}: {e}")
                    continue
            
            # Fallback to local database
            return self._autocomplete_fallback(query, limit)
            
        except Exception as e:
            _logger.error(f"Autocomplete error: {e}")
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # GOOGLE MAPS GEOCODING API
    # =========================================================================

    def _geocode_google(self, address):
        """Geocode using Google Maps API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.google_maps_api_key')
        
        if not api_key:
            raise UserError(_("Google Maps API key not configured"))
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'address': address,
            'key': api_key,
            'region': 'et'  # Ethiopia
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            result = data['results'][0]
            location = result['geometry']['location']
            
            return {
                'success': True,
                'latitude': location['lat'],
                'longitude': location['lng'],
                'formatted_address': result['formatted_address'],
                'provider': 'google',
                'confidence': 0.95
            }
        else:
            return {'success': False, 'error': data.get('status')}

    def _reverse_geocode_google(self, lat, lng):
        """Reverse geocode using Google Maps API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.google_maps_api_key')
        
        if not api_key:
            raise UserError(_("Google Maps API key not configured"))
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'latlng': f"{lat},{lng}",
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            result = data['results'][0]
            
            # Extract city and country
            city = None
            country = None
            for component in result['address_components']:
                if 'locality' in component['types']:
                    city = component['long_name']
                if 'country' in component['types']:
                    country = component['long_name']
            
            return {
                'success': True,
                'address': result['formatted_address'],
                'city': city or 'Unknown',
                'country': country or 'Ethiopia',
                'provider': 'google'
            }
        else:
            return {'success': False, 'error': data.get('status')}

    def _autocomplete_google(self, query, limit):
        """Autocomplete using Google Places API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.google_maps_api_key')
        
        if not api_key:
            raise UserError(_("Google Maps API key not configured"))
        
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        params = {
            'input': query,
            'key': api_key,
            'components': 'country:et',
            'types': 'geocode'
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['status'] == 'OK':
            suggestions = []
            for prediction in data['predictions'][:limit]:
                # Get place details for coordinates
                place_id = prediction['place_id']
                coords = self._get_place_details_google(place_id, api_key)
                
                suggestions.append({
                    'address': prediction['description'],
                    'latitude': coords.get('lat'),
                    'longitude': coords.get('lng'),
                    'relevance': 1.0
                })
            
            return {'success': True, 'suggestions': suggestions}
        else:
            return {'success': False, 'error': data.get('status')}

    def _get_place_details_google(self, place_id, api_key):
        """Get place details from Google Places API."""
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            'place_id': place_id,
            'key': api_key,
            'fields': 'geometry'
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['status'] == 'OK':
            return data['result']['geometry']['location']
        return {}

    # =========================================================================
    # MAPBOX GEOCODING API
    # =========================================================================

    def _geocode_mapbox(self, address):
        """Geocode using Mapbox API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.mapbox_api_key')
        
        if not api_key:
            raise UserError(_("Mapbox API key not configured"))
        
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
        params = {
            'access_token': api_key,
            'country': 'et',
            'limit': 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['features']:
            feature = data['features'][0]
            coords = feature['geometry']['coordinates']
            
            return {
                'success': True,
                'latitude': coords[1],
                'longitude': coords[0],
                'formatted_address': feature['place_name'],
                'provider': 'mapbox',
                'confidence': feature.get('relevance', 0.9)
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _reverse_geocode_mapbox(self, lat, lng):
        """Reverse geocode using Mapbox API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.mapbox_api_key')
        
        if not api_key:
            raise UserError(_("Mapbox API key not configured"))
        
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"
        params = {
            'access_token': api_key,
            'limit': 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data['features']:
            feature = data['features'][0]
            
            # Extract city and country
            city = None
            country = None
            for context in feature.get('context', []):
                if 'place' in context['id']:
                    city = context['text']
                if 'country' in context['id']:
                    country = context['text']
            
            return {
                'success': True,
                'address': feature['place_name'],
                'city': city or 'Unknown',
                'country': country or 'Ethiopia',
                'provider': 'mapbox'
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _autocomplete_mapbox(self, query, limit):
        """Autocomplete using Mapbox API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.mapbox_api_key')
        
        if not api_key:
            raise UserError(_("Mapbox API key not configured"))
        
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"
        params = {
            'access_token': api_key,
            'country': 'et',
            'limit': limit,
            'autocomplete': True
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        suggestions = []
        for feature in data['features']:
            coords = feature['geometry']['coordinates']
            suggestions.append({
                'address': feature['place_name'],
                'latitude': coords[1],
                'longitude': coords[0],
                'relevance': feature.get('relevance', 0.9)
            })
        
        return {'success': True, 'suggestions': suggestions}

    # =========================================================================
    # OPENSTREETMAP NOMINATIM
    # =========================================================================

    def _geocode_osm(self, address):
        """Geocode using OpenStreetMap Nominatim."""
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': address,
            'format': 'json',
            'countrycodes': 'et',
            'limit': 1
        }
        headers = {
            'User-Agent': 'MESSOB-FMS/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        if data:
            result = data[0]
            return {
                'success': True,
                'latitude': float(result['lat']),
                'longitude': float(result['lon']),
                'formatted_address': result['display_name'],
                'provider': 'osm',
                'confidence': float(result.get('importance', 0.8))
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _reverse_geocode_osm(self, lat, lng):
        """Reverse geocode using OpenStreetMap Nominatim."""
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lng,
            'format': 'json'
        }
        headers = {
            'User-Agent': 'MESSOB-FMS/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        if data:
            address_parts = data.get('address', {})
            return {
                'success': True,
                'address': data['display_name'],
                'city': address_parts.get('city') or address_parts.get('town') or 'Unknown',
                'country': address_parts.get('country', 'Ethiopia'),
                'provider': 'osm'
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _autocomplete_osm(self, query, limit):
        """Autocomplete using OpenStreetMap Nominatim."""
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'json',
            'countrycodes': 'et',
            'limit': limit
        }
        headers = {
            'User-Agent': 'MESSOB-FMS/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        suggestions = []
        for result in data:
            suggestions.append({
                'address': result['display_name'],
                'latitude': float(result['lat']),
                'longitude': float(result['lon']),
                'relevance': float(result.get('importance', 0.8))
            })
        
        return {'success': True, 'suggestions': suggestions}

    # =========================================================================
    # HERE GEOCODING API
    # =========================================================================

    def _geocode_here(self, address):
        """Geocode using HERE API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.here_api_key')
        
        if not api_key:
            raise UserError(_("HERE API key not configured"))
        
        url = "https://geocode.search.hereapi.com/v1/geocode"
        params = {
            'q': address,
            'apiKey': api_key,
            'in': 'countryCode:ETH',
            'limit': 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('items'):
            item = data['items'][0]
            position = item['position']
            
            return {
                'success': True,
                'latitude': position['lat'],
                'longitude': position['lng'],
                'formatted_address': item['address']['label'],
                'provider': 'here',
                'confidence': item.get('scoring', {}).get('queryScore', 0.9)
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _reverse_geocode_here(self, lat, lng):
        """Reverse geocode using HERE API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.here_api_key')
        
        if not api_key:
            raise UserError(_("HERE API key not configured"))
        
        url = "https://revgeocode.search.hereapi.com/v1/revgeocode"
        params = {
            'at': f"{lat},{lng}",
            'apiKey': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('items'):
            item = data['items'][0]
            address = item['address']
            
            return {
                'success': True,
                'address': address['label'],
                'city': address.get('city', 'Unknown'),
                'country': address.get('countryName', 'Ethiopia'),
                'provider': 'here'
            }
        else:
            return {'success': False, 'error': 'No results found'}

    def _autocomplete_here(self, query, limit):
        """Autocomplete using HERE API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param('messob_fms.here_api_key')
        
        if not api_key:
            raise UserError(_("HERE API key not configured"))
        
        url = "https://autosuggest.search.hereapi.com/v1/autosuggest"
        params = {
            'q': query,
            'apiKey': api_key,
            'in': 'countryCode:ETH',
            'limit': limit
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        suggestions = []
        for item in data.get('items', []):
            if item.get('position'):
                suggestions.append({
                    'address': item['address']['label'],
                    'latitude': item['position']['lat'],
                    'longitude': item['position']['lng'],
                    'relevance': 0.9
                })
        
        return {'success': True, 'suggestions': suggestions}

    # =========================================================================
    # FALLBACK & CACHING
    # =========================================================================

    def _geocode_fallback(self, address):
        """Fallback geocoding using local database."""
        # Ethiopian cities database
        cities = {
            'addis ababa': {'lat': 9.0320, 'lng': 38.7469},
            'dire dawa': {'lat': 9.5930, 'lng': 41.8661},
            'mekelle': {'lat': 13.4967, 'lng': 39.4753},
            'gondar': {'lat': 12.6000, 'lng': 37.4667},
            'bahir dar': {'lat': 11.5933, 'lng': 37.3905},
            'hawassa': {'lat': 7.0500, 'lng': 38.4833},
            'adama': {'lat': 8.5400, 'lng': 39.2700},
            'jimma': {'lat': 7.6700, 'lng': 36.8333},
            'dessie': {'lat': 11.1333, 'lng': 39.6333},
            'jijiga': {'lat': 9.3500, 'lng': 42.8000},
        }
        
        address_lower = address.lower()
        for city, coords in cities.items():
            if city in address_lower:
                return {
                    'success': True,
                    'latitude': coords['lat'],
                    'longitude': coords['lng'],
                    'formatted_address': f"{city.title()}, Ethiopia",
                    'provider': 'fallback',
                    'confidence': 0.7
                }
        
        # Default to Addis Ababa
        return {
            'success': True,
            'latitude': 9.0320,
            'longitude': 38.7469,
            'formatted_address': 'Addis Ababa, Ethiopia',
            'provider': 'fallback',
            'confidence': 0.5
        }

    def _autocomplete_fallback(self, query, limit):
        """Fallback autocomplete using local database."""
        Location = self.env['messob.fms.location']
        locations = Location.search([
            ('name', 'ilike', query)
        ], limit=limit)
        
        suggestions = []
        for loc in locations:
            suggestions.append({
                'address': loc.name,
                'latitude': loc.latitude,
                'longitude': loc.longitude,
                'relevance': 0.8
            })
        
        return {'success': True, 'suggestions': suggestions}

    def _get_provider_priority(self):
        """Get provider priority order based on configuration."""
        # Check which API keys are configured
        ICP = self.env['ir.config_parameter'].sudo()
        
        providers = []
        if ICP.get_param('messob_fms.google_maps_api_key'):
            providers.append('google')
        if ICP.get_param('messob_fms.mapbox_api_key'):
            providers.append('mapbox')
        if ICP.get_param('messob_fms.here_api_key'):
            providers.append('here')
        
        # Always add OSM as free fallback
        providers.append('osm')
        
        return providers

    def _get_cached_geocode(self, address):
        """Get cached geocoding result."""
        try:
            Cache = self.env['messob.fms.geocode.cache']
            
            # Search for cached result
            cache_entry = Cache.search([
                ('address', '=', address.lower().strip()),
                ('cache_type', '=', 'forward'),
                ('expiry_date', '>', datetime.now())
            ], limit=1)
            
            if cache_entry:
                _logger.debug(f"Geocode cache hit for: {address}")
                return {
                    'success': True,
                    'latitude': cache_entry.latitude,
                    'longitude': cache_entry.longitude,
                    'formatted_address': cache_entry.formatted_address,
                    'provider': cache_entry.provider,
                    'confidence': cache_entry.confidence,
                    'cached': True
                }
            
            return None
            
        except Exception as e:
            _logger.warning(f"Cache lookup failed: {e}")
            return None

    def _cache_geocode(self, address, result):
        """Cache geocoding result."""
        try:
            Cache = self.env['messob.fms.geocode.cache']
            
            # Cache for 30 days
            expiry = datetime.now() + timedelta(days=30)
            
            # Check if already cached
            existing = Cache.search([
                ('address', '=', address.lower().strip()),
                ('cache_type', '=', 'forward')
            ], limit=1)
            
            vals = {
                'address': address.lower().strip(),
                'cache_type': 'forward',
                'latitude': result.get('latitude'),
                'longitude': result.get('longitude'),
                'formatted_address': result.get('formatted_address'),
                'provider': result.get('provider'),
                'confidence': result.get('confidence', 0.9),
                'expiry_date': expiry
            }
            
            if existing:
                existing.write(vals)
            else:
                Cache.create(vals)
                
            _logger.debug(f"Cached geocode result for: {address}")
            
        except Exception as e:
            _logger.warning(f"Failed to cache geocode result: {e}")

    def _get_cached_reverse_geocode(self, cache_key):
        """Get cached reverse geocoding result."""
        try:
            Cache = self.env['messob.fms.geocode.cache']
            
            # Search for cached result
            cache_entry = Cache.search([
                ('cache_key', '=', cache_key),
                ('cache_type', '=', 'reverse'),
                ('expiry_date', '>', datetime.now())
            ], limit=1)
            
            if cache_entry:
                _logger.debug(f"Reverse geocode cache hit for: {cache_key}")
                return {
                    'success': True,
                    'address': cache_entry.formatted_address,
                    'city': cache_entry.city,
                    'country': cache_entry.country,
                    'provider': cache_entry.provider,
                    'cached': True
                }
            
            return None
            
        except Exception as e:
            _logger.warning(f"Cache lookup failed: {e}")
            return None

    def _cache_reverse_geocode(self, cache_key, result):
        """Cache reverse geocoding result."""
        try:
            Cache = self.env['messob.fms.geocode.cache']
            
            # Cache for 30 days
            expiry = datetime.now() + timedelta(days=30)
            
            # Parse coordinates from cache_key
            lat, lng = cache_key.split(',')
            
            # Check if already cached
            existing = Cache.search([
                ('cache_key', '=', cache_key),
                ('cache_type', '=', 'reverse')
            ], limit=1)
            
            vals = {
                'cache_key': cache_key,
                'cache_type': 'reverse',
                'latitude': float(lat),
                'longitude': float(lng),
                'formatted_address': result.get('address'),
                'city': result.get('city'),
                'country': result.get('country'),
                'provider': result.get('provider'),
                'expiry_date': expiry
            }
            
            if existing:
                existing.write(vals)
            else:
                Cache.create(vals)
                
            _logger.debug(f"Cached reverse geocode result for: {cache_key}")
            
        except Exception as e:
            _logger.warning(f"Failed to cache reverse geocode result: {e}")
