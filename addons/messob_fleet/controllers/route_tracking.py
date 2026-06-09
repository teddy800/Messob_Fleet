# -*- coding: utf-8 -*-
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# Controller: RouteTrackingController
# Description: API endpoints for Staff Route Tracking & Collaboration (Module 3)
# Features: FR-3.1, FR-3.2, FR-3.3, FR-3.4
# ---------------------------------------------------------------------------

from odoo import http
from odoo.http import request
from datetime import datetime, timedelta
import json
import random


class RouteTrackingController(http.Controller):
    """
    API endpoints for Staff Route Tracking & Collaboration.
    Handles route display, GPS tracking, collaborative pickup, and dynamic updates.
    """

    @http.route(
        '/api/route/display',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def get_route_display(self, trip_id):
        """
        FR-3.1: Get assigned route display data for approved/active trips.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Route display data with pickup/destination POIs and route line
        """
        try:
            Trip = request.env['messob.fms.trip']
            trip = Trip.browse(trip_id)
            
            if not trip.exists():
                return {'success': False, 'error': 'Trip not found'}
            
            # Check if user can view this trip (requester or dispatcher/admin)
            user = request.env.user
            if (trip.requester_id.id != user.partner_id.id and 
                not user.has_group('messob_fleet.group_fms_dispatcher')):
                return {'success': False, 'error': 'Access denied'}
            
            # Only show route for approved or active trips
            if trip.state not in ['approved', 'in_progress']:
                return {'success': False, 'error': 'Route not available for this trip status'}
            
            # Get pickup and destination coordinates
            pickup_coords = self._geocode_location(trip.pickup)
            dest_coords = self._geocode_location(trip.destination)
            
            # Try to use real routing service for accurate road distance
            try:
                routing_service = request.env['messob.fms.routing.service']
                route_result = routing_service.calculate_route(
                    origin=pickup_coords,
                    destination=dest_coords,
                    provider='auto'
                )
                
                if route_result.get('success'):
                    # Use real routing data
                    route_data = route_result['route']
                    distance_km = route_data['distance_km']
                    duration_min = route_data['duration_minutes']
                    route_line = route_data.get('polyline', [])
                else:
                    # Fallback to straight-line calculation
                    route_line = self._generate_route_line(pickup_coords, dest_coords)
                    distance_km = self._calculate_distance(pickup_coords, dest_coords)
                    duration_min = self._estimate_duration(pickup_coords, dest_coords)
            except Exception as e:
                # Fallback if routing service fails
                _logger.warning(f"Routing service failed: {e}. Using fallback calculation.")
                route_line = self._generate_route_line(pickup_coords, dest_coords)
                distance_km = self._calculate_distance(pickup_coords, dest_coords)
                duration_min = self._estimate_duration(pickup_coords, dest_coords)
            
            return {
                'success': True,
                'trip': {
                    'id': trip.id,
                    'request_id': trip.name,
                    'requester': trip.requester_id.name,
                    'purpose': trip.purpose,
                    'state': trip.state,
                    'start_dt': trip.start_dt.isoformat(),
                    'end_dt': trip.end_dt.isoformat(),
                    'vehicle': {
                        'id': trip.assigned_vehicle_id.id if trip.assigned_vehicle_id else None,
                        'plate_no': trip.assigned_vehicle_id.license_plate if trip.assigned_vehicle_id else None,
                        'category': trip.assigned_vehicle_id.category_id.name if trip.assigned_vehicle_id and trip.assigned_vehicle_id.category_id else None,
                    },
                    'driver': {
                        'id': trip.assigned_driver_id.id if trip.assigned_driver_id else None,
                        'name': trip.assigned_driver_id.name if trip.assigned_driver_id else None,
                    }
                },
                'route': {
                    'pickup': {
                        'address': trip.pickup,
                        'coordinates': pickup_coords,
                        'type': 'pickup'
                    },
                    'destination': {
                        'address': trip.destination,
                        'coordinates': dest_coords,
                        'type': 'destination'
                    },
                    'route_line': route_line,
                    'distance_km': distance_km,
                    'estimated_duration_minutes': duration_min
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/route/gps-position',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def get_gps_position(self, trip_id):
        """
        FR-3.2: Get real-time GPS position of assigned vehicle.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Real-time vehicle position and status
        """
        try:
            Trip = request.env['messob.fms.trip']
            trip = Trip.browse(trip_id)
            
            if not trip.exists():
                return {'success': False, 'error': 'Trip not found'}
            
            # Check access permissions
            user = request.env.user
            if (trip.requester_id.id != user.partner_id.id and 
                not user.has_group('messob_fleet.group_fms_dispatcher')):
                return {'success': False, 'error': 'Access denied'}
            
            if trip.state not in ['approved', 'in_progress']:
                return {'success': False, 'error': 'GPS tracking not available for this trip status'}
            
            if not trip.assigned_vehicle_id:
                return {'success': False, 'error': 'No vehicle assigned to this trip'}
            
            # Simulate GPS data (in real implementation, this would call GPS Gateway)
            gps_data = self._simulate_gps_position(trip)
            
            return {
                'success': True,
                'vehicle': {
                    'id': trip.assigned_vehicle_id.id,
                    'plate_no': trip.assigned_vehicle_id.license_plate,
                },
                'gps': gps_data,
                'trip_status': trip.state,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/route/collaborative-pickup',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def get_collaborative_pickup(self, trip_id):
        """
        FR-3.3: Get collaborative pickup information for shared trips.
        
        Args:
            trip_id (int): Trip request ID
            
        Returns:
            dict: Other service users on the same vehicle/route
        """
        try:
            Trip = request.env['messob.fms.trip']
            trip = Trip.browse(trip_id)
            
            if not trip.exists():
                return {'success': False, 'error': 'Trip not found'}
            
            # Check access permissions
            user = request.env.user
            if (trip.requester_id.id != user.partner_id.id and 
                not user.has_group('messob_fleet.group_fms_dispatcher')):
                return {'success': False, 'error': 'Access denied'}
            
            if not trip.assigned_vehicle_id:
                return {'success': False, 'error': 'No vehicle assigned'}
            
            # Find other trips using the same vehicle on the same day
            same_day_trips = Trip.search([
                ('assigned_vehicle_id', '=', trip.assigned_vehicle_id.id),
                ('state', 'in', ['approved', 'in_progress']),
                ('start_dt', '>=', trip.start_dt.replace(hour=0, minute=0, second=0)),
                ('start_dt', '<', trip.start_dt.replace(hour=23, minute=59, second=59)),
                ('id', '!=', trip.id)
            ])
            
            service_users = []
            for other_trip in same_day_trips:
                pickup_coords = self._geocode_location(other_trip.pickup)
                service_users.append({
                    'trip_id': other_trip.id,
                    'request_id': other_trip.name,
                    'requester': other_trip.requester_id.name,
                    'pickup_address': other_trip.pickup,
                    'pickup_coordinates': pickup_coords,
                    'start_time': other_trip.start_dt.strftime('%H:%M'),
                    'status': other_trip.state,
                    'contact_allowed': True  # In real system, check privacy settings
                })
            
            return {
                'success': True,
                'current_trip': {
                    'id': trip.id,
                    'requester': trip.requester_id.name,
                    'pickup_address': trip.pickup,
                    'pickup_coordinates': self._geocode_location(trip.pickup)
                },
                'service_users': service_users,
                'vehicle': {
                    'plate_no': trip.assigned_vehicle_id.license_plate,
                    'category': trip.assigned_vehicle_id.category_id.name if trip.assigned_vehicle_id.category_id else 'Unknown'
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/route/update-pickup',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def update_pickup_point(self, trip_id, new_pickup_address, new_coordinates):
        """
        FR-3.4: Update pickup point dynamically.
        
        Args:
            trip_id (int): Trip request ID
            new_pickup_address (str): New pickup address
            new_coordinates (dict): New coordinates {lat, lng}
            
        Returns:
            dict: Update result
        """
        try:
            Trip = request.env['messob.fms.trip']
            trip = Trip.browse(trip_id)
            
            if not trip.exists():
                return {'success': False, 'error': 'Trip not found'}
            
            # Check if user is the requester
            user = request.env.user
            if trip.requester_id.id != user.partner_id.id:
                return {'success': False, 'error': 'Only the trip requester can update pickup point'}
            
            # Only allow updates for approved trips (not yet in progress)
            if trip.state != 'approved':
                return {'success': False, 'error': 'Pickup point can only be updated for approved trips'}
            
            # Update pickup location
            trip.write({
                'pickup': new_pickup_address
            })
            
            # Log the pickup point change
            trip.message_post(
                body=f"Pickup point updated by {user.name}: {new_pickup_address}",
                message_type='notification'
            )
            
            # In real system, notify driver and dispatcher
            self._notify_pickup_change(trip, new_pickup_address, new_coordinates)
            
            return {
                'success': True,
                'message': 'Pickup point updated successfully',
                'trip': {
                    'id': trip.id,
                    'pickup': trip.pickup,
                    'coordinates': new_coordinates
                }
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # =========================================================================
    # HELPER METHODS (Simulate external services)
    # =========================================================================

    def _geocode_location(self, address):
        """Simulate geocoding service - convert address to coordinates."""
        # Ethiopian cities coordinates (comprehensive list)
        city_coords = {
            # =====================================================================
            # ADDIS ABABA - Comprehensive Locations (60+ locations)
            # =====================================================================
            
            # Central Addis Ababa
            'MESSOB Center HQ': {'lat': 9.0320, 'lng': 38.7469},
            'Addis Ababa': {'lat': 9.0320, 'lng': 38.7469},
            'Meskel Square': {'lat': 9.0105, 'lng': 38.7614},
            'Mexico Square': {'lat': 9.0192, 'lng': 38.7525},
            'Arat Kilo': {'lat': 9.0400, 'lng': 38.7600},
            'Sidist Kilo': {'lat': 9.0380, 'lng': 38.7630},
            'Saris': {'lat': 9.0150, 'lng': 38.7400},
            '6 Kilo': {'lat': 9.0410, 'lng': 38.7640},
            
            # Bole Area
            'Bole': {'lat': 8.9950, 'lng': 38.7850},
            'Bole Airport': {'lat': 8.9806, 'lng': 38.7992},
            'Bole International Airport': {'lat': 8.9779, 'lng': 38.7993},
            'Bole Medhanialem': {'lat': 9.0050, 'lng': 38.7850},
            'Bole Arabsa': {'lat': 8.9950, 'lng': 38.8100},
            'Bole Bulbula': {'lat': 8.9806, 'lng': 38.7578},
            'Bole Road': {'lat': 8.9900, 'lng': 38.7700},
            'Bole Michael': {'lat': 9.0000, 'lng': 38.7800},
            'Bole Rwanda': {'lat': 8.9980, 'lng': 38.7920},
            'Bole Atlas': {'lat': 8.9930, 'lng': 38.7880},
            'Edna Mall': {'lat': 8.9970, 'lng': 38.7920},
            
            # Kirkos Sub-city
            'Kirkos': {'lat': 9.0250, 'lng': 38.7550},
            'CMC': {'lat': 9.0100, 'lng': 38.7650},
            'Mekanisa': {'lat': 9.0050, 'lng': 38.7700},
            'Akaki Kality': {'lat': 8.8950, 'lng': 38.7650},
            
            # Arada Sub-city  
            'Piazza': {'lat': 9.0420, 'lng': 38.7500},
            'Arada': {'lat': 9.0380, 'lng': 38.7450},
            'De Gaulle Square': {'lat': 9.0330, 'lng': 38.7420},
            'Tewodros Square': {'lat': 9.0390, 'lng': 38.7480},
            'Churchill Avenue': {'lat': 9.0280, 'lng': 38.7450},
            'Arada Giorgis': {'lat': 9.0360, 'lng': 38.7460},
            
            # Lideta Sub-city
            'Mercato': {'lat': 9.0370, 'lng': 38.7444},
            'Merkato': {'lat': 9.0300, 'lng': 38.7350},
            'Lideta': {'lat': 9.0320, 'lng': 38.7380},
            'Autobus Tera': {'lat': 9.0340, 'lng': 38.7360},
            'Legehar': {'lat': 9.0450, 'lng': 38.7550},
            
            # Gulele Sub-city
            'Gulele': {'lat': 9.0650, 'lng': 38.7300},
            'Entoto': {'lat': 9.0800, 'lng': 38.7400},
            'Shiromeda': {'lat': 9.0550, 'lng': 38.7350},
            'Gullele Botanic Garden': {'lat': 9.0680, 'lng': 38.7320},
            
            # Yeka Sub-city
            'Megenagna': {'lat': 9.0250, 'lng': 38.7950},
            'Gerji': {'lat': 9.0100, 'lng': 38.8050},
            'Summit': {'lat': 9.0200, 'lng': 38.8100},
            'Ayat': {'lat': 9.0450, 'lng': 38.8300},
            'CMC Mazoria': {'lat': 9.0080, 'lng': 38.8000},
            'Kality': {'lat': 8.9200, 'lng': 38.7500},
            'Yeka Abado': {'lat': 9.0350, 'lng': 38.8200},
            'Megenagna 2': {'lat': 9.0280, 'lng': 38.7980},
            
            # Nifas Silk-Lafto
            'Nifas Silk': {'lat': 8.9800, 'lng': 38.7200},
            'Lafto': {'lat': 8.9650, 'lng': 38.7300},
            'Gotera': {'lat': 8.9700, 'lng': 38.7350},
            
            # Addis Ketema
            'Addis Ketema': {'lat': 9.0380, 'lng': 38.7350},
            'Shiro Meda': {'lat': 9.0550, 'lng': 38.7350},
            
            # Kolfe Keranio
            'Kolfe': {'lat': 9.0150, 'lng': 38.6950},
            'Keranio': {'lat': 9.0200, 'lng': 38.6900},
            'Sebategna': {'lat': 9.0100, 'lng': 38.7000},
            
            # Lemi Kura
            'Lemi Kura': {'lat': 9.0000, 'lng': 38.6800},
            'Gurd Shola': {'lat': 9.0050, 'lng': 38.6850},
            
            # Akaki Kaliti
            'Akaki': {'lat': 8.8800, 'lng': 38.7600},
            'Kaliti': {'lat': 8.9100, 'lng': 38.7450},
            
            # Major Landmarks & Institutions
            'National Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'University': {'lat': 9.0370, 'lng': 38.7620},
            'Addis Ababa University': {'lat': 9.0370, 'lng': 38.7620},
            'Black Lion Hospital': {'lat': 9.0380, 'lng': 38.7650},
            'Menelik II Hospital': {'lat': 9.0350, 'lng': 38.7600},
            'National Theatre': {'lat': 9.0310, 'lng': 38.7440},
            'Hilton Hotel': {'lat': 9.0320, 'lng': 38.7490},
            'Sheraton Hotel': {'lat': 9.0380, 'lng': 38.7520},
            'African Union': {'lat': 9.0150, 'lng': 38.7630},
            'AU Headquarters': {'lat': 9.0150, 'lng': 38.7630},
            'ECA Conference Center': {'lat': 9.0130, 'lng': 38.7620},
            'Millennium Hall': {'lat': 9.0280, 'lng': 38.7580},
            'National Palace': {'lat': 9.0330, 'lng': 38.7470},
            'Menelik Palace': {'lat': 9.0340, 'lng': 38.7460},
            'Holy Trinity Cathedral': {'lat': 9.0350, 'lng': 38.7550},
            
            # Shopping & Commercial Areas
            'Shola Market': {'lat': 9.0400, 'lng': 38.7500},
            'Asko': {'lat': 9.0100, 'lng': 38.7400},
            'Tor Hailoch': {'lat': 9.0150, 'lng': 38.7300},
            
            # Residential Areas
            'Old Airport': {'lat': 9.0080, 'lng': 38.7850},
            'Kazanchis': {'lat': 9.0220, 'lng': 38.7620},
            'Sarbet': {'lat': 9.0200, 'lng': 38.7500},
            'Mexico': {'lat': 9.0192, 'lng': 38.7525},
            '22 Mazoria': {'lat': 9.0150, 'lng': 38.7950},
            'CMC Area': {'lat': 9.0100, 'lng': 38.7650},
            
            # =====================================================================
            # MAJOR ETHIOPIAN CITIES
            # =====================================================================
            'Dire Dawa': {'lat': 9.5930, 'lng': 41.8661},
            'Mekelle': {'lat': 13.4967, 'lng': 39.4753},
            'Gondar': {'lat': 12.6000, 'lng': 37.4667},
            'Bahir Dar': {'lat': 11.5933, 'lng': 37.3905},
            'Hawassa': {'lat': 7.0500, 'lng': 38.4667},
            'Adama': {'lat': 8.5400, 'lng': 39.2700},
            'Adama (Nazret)': {'lat': 8.5400, 'lng': 39.2700},
            'Nazret': {'lat': 8.5400, 'lng': 39.2700},
            'Jimma': {'lat': 7.6667, 'lng': 36.8333},
            'Jijiga': {'lat': 9.3500, 'lng': 42.8000},
            'Dessie': {'lat': 11.1333, 'lng': 39.6333},
            'Harar': {'lat': 9.3100, 'lng': 42.1200},
            'Shashamane': {'lat': 7.2000, 'lng': 38.6000},
            'Debre Birhan': {'lat': 9.6833, 'lng': 39.5333},
            'Arba Minch': {'lat': 6.0333, 'lng': 37.5500},
            'Nekemte': {'lat': 9.0833, 'lng': 36.5333},
            'Debre Markos': {'lat': 10.3500, 'lng': 37.7167},
            'Asella': {'lat': 7.9500, 'lng': 39.1333},
            'Gambela': {'lat': 8.2500, 'lng': 34.5833},
            'Semera': {'lat': 11.7833, 'lng': 41.0000},
        }
        
        # Check if address matches known locations (case-insensitive)
        address_lower = address.lower().strip()
        for city, coords in city_coords.items():
            if city.lower() in address_lower:
                return coords
        
        # If no match found, return Addis Ababa as default
        _logger.warning(f"Location not found in database: {address}. Defaulting to Addis Ababa.")
        return {'lat': 9.0320, 'lng': 38.7469}

    def _generate_route_line(self, start_coords, end_coords):
        """Simulate routing service - generate route line between two points."""
        # Simple straight line with some waypoints for demonstration
        lat_diff = end_coords['lat'] - start_coords['lat']
        lng_diff = end_coords['lng'] - start_coords['lng']
        
        route_points = []
        steps = 5  # Number of intermediate points
        
        for i in range(steps + 1):
            progress = i / steps
            # Add some curve to make it look more realistic
            curve_offset = 0.01 * (1 - (2 * progress - 1) ** 2)  # Parabolic curve
            
            point = {
                'lat': start_coords['lat'] + lat_diff * progress + curve_offset,
                'lng': start_coords['lng'] + lng_diff * progress
            }
            route_points.append(point)
        
        return route_points

    def _calculate_distance(self, start_coords, end_coords):
        """Calculate distance between two coordinates using Haversine formula."""
        import math
        
        # Earth's radius in kilometers
        R = 6371.0
        
        # Convert coordinates to radians
        lat1 = math.radians(start_coords['lat'])
        lon1 = math.radians(start_coords['lng'])
        lat2 = math.radians(end_coords['lat'])
        lon2 = math.radians(end_coords['lng'])
        
        # Haversine formula (straight-line distance)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        straight_distance = R * c
        
        # Apply road distance multiplier for more realistic estimates
        # Roads in mountainous Ethiopia are rarely straight
        if straight_distance < 50:  # Short urban distances
            road_distance = straight_distance * 1.3  # 30% longer due to streets
        elif straight_distance < 200:  # Medium distances
            road_distance = straight_distance * 1.5  # 50% longer due to terrain
        else:  # Long distances
            road_distance = straight_distance * 1.8  # 80% longer due to mountains/valleys
        
        return round(road_distance, 2)

    def _estimate_duration(self, start_coords, end_coords):
        """Estimate travel duration based on distance."""
        distance = self._calculate_distance(start_coords, end_coords)
        
        # Use realistic average speeds based on distance
        if distance < 20:  # City driving
            avg_speed = 25  # km/h in heavy traffic
        elif distance < 100:  # Regional roads
            avg_speed = 50  # km/h
        else:  # Highway/long distance
            avg_speed = 65  # km/h (accounting for road conditions in Ethiopia)
        
        duration_hours = distance / avg_speed
        return round(duration_hours * 60)  # Convert to minutes

    def _simulate_gps_position(self, trip):
        """Simulate real-time GPS position for demonstration."""
        pickup_coords = self._geocode_location(trip.pickup)
        dest_coords = self._geocode_location(trip.destination)
        
        # Simulate vehicle movement based on trip progress
        now = datetime.now()
        trip_start = trip.start_dt
        trip_duration = (trip.end_dt - trip.start_dt).total_seconds()
        
        if now < trip_start:
            # Trip hasn't started yet - vehicle at pickup
            progress = 0
            status = 'waiting_at_pickup'
        elif now > trip.end_dt:
            # Trip completed - vehicle at destination
            progress = 1
            status = 'completed'
        else:
            # Trip in progress
            elapsed = (now - trip_start).total_seconds()
            progress = min(elapsed / trip_duration, 1)
            status = 'en_route'
        
        # Calculate current position based on progress
        current_lat = pickup_coords['lat'] + (dest_coords['lat'] - pickup_coords['lat']) * progress
        current_lng = pickup_coords['lng'] + (dest_coords['lng'] - pickup_coords['lng']) * progress
        
        # Add some random variation to simulate real GPS
        current_lat += (random.random() - 0.5) * 0.001
        current_lng += (random.random() - 0.5) * 0.001
        
        return {
            'latitude': round(current_lat, 6),
            'longitude': round(current_lng, 6),
            'speed_kmh': random.randint(0, 60) if status == 'en_route' else 0,
            'heading': random.randint(0, 360),
            'accuracy_meters': random.randint(3, 15),
            'status': status,
            'progress_percent': round(progress * 100, 1),
            'timestamp': now.isoformat()
        }

    def _notify_pickup_change(self, trip, new_address, new_coordinates):
        """Notify driver and dispatcher about pickup point change."""
        # In real implementation, this would send notifications
        # For now, just log the change
        message = f"Pickup point changed for trip {trip.name}: {new_address}"
        
        # Log to trip chatter
        trip.message_post(
            body=message,
            message_type='notification'
        )
        
        # In real system: send email/SMS to driver and dispatcher
        return True

    @http.route(
        '/api/fleet/availability',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def get_fleet_availability(self, start_date, end_date, category=None):
        """
        FR-2.3: Get fleet availability calendar data.
        Shows all vehicles with their scheduled trips and maintenance.
        
        Args:
            start_date (str): ISO datetime string
            end_date (str): ISO datetime string
            category (str, optional): Filter by vehicle category
            
        Returns:
            dict: Fleet availability data for calendar/timeline view
        """
        try:
            # Check if user is dispatcher or admin
            user = request.env.user
            if not user.has_group('messob_fleet.group_fms_dispatcher'):
                return {'success': False, 'error': 'Access denied. Dispatcher role required.'}
            
            Trip = request.env['messob.fms.trip']
            result = Trip.get_fleet_availability(start_date, end_date, category)
            
            return {
                'success': True,
                'start_date': start_date,
                'end_date': end_date,
                'vehicles': result['vehicles']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @http.route(
        '/api/fleet/quick-assign',
        type='json',
        auth='user',
        methods=['POST'],
        csrf=False
    )
    def quick_assign_vehicle(self, trip_id, vehicle_id, driver_id):
        """
        FR-2.3: Quick assign vehicle and driver from calendar view.
        
        Args:
            trip_id (int): Trip request ID
            vehicle_id (int): Vehicle ID to assign
            driver_id (int): Driver ID to assign
            
        Returns:
            dict: Assignment result
        """
        try:
            # Check if user is dispatcher or admin
            user = request.env.user
            if not user.has_group('messob_fleet.group_fms_dispatcher'):
                return {'success': False, 'error': 'Access denied. Dispatcher role required.'}
            
            Trip = request.env['messob.fms.trip']
            result = Trip.quick_assign_vehicle(trip_id, vehicle_id, driver_id)
            
            return result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}