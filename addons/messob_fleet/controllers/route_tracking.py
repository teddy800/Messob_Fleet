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
            
            # Get pickup and destination coordinates (simulate geocoding)
            pickup_coords = self._geocode_location(trip.pickup)
            dest_coords = self._geocode_location(trip.destination)
            
            # Generate route line (simulate routing service)
            route_line = self._generate_route_line(pickup_coords, dest_coords)
            
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
                    'distance_km': self._calculate_distance(pickup_coords, dest_coords),
                    'estimated_duration_minutes': self._estimate_duration(pickup_coords, dest_coords)
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
        # Ethiopian cities coordinates (simulate geocoding)
        city_coords = {
            'MESSOB Center HQ': {'lat': 9.0320, 'lng': 38.7469},
            'Addis Ababa': {'lat': 9.0320, 'lng': 38.7469},
            'Bole Airport': {'lat': 8.9806, 'lng': 38.7992},
            'Mercato': {'lat': 9.0370, 'lng': 38.7444},
            'Piazza': {'lat': 9.0420, 'lng': 38.7469},
            'Stadium': {'lat': 9.0180, 'lng': 38.7580},
            'University': {'lat': 9.0370, 'lng': 38.7620},
            'Bole': {'lat': 8.9806, 'lng': 38.7992},
            'Kirkos': {'lat': 9.0250, 'lng': 38.7550},
            'Gulele': {'lat': 9.0650, 'lng': 38.7300},
        }
        
        # Check if address matches known locations
        for city, coords in city_coords.items():
            if city.lower() in address.lower():
                return coords
        
        # Default to Addis Ababa with slight random offset
        return {
            'lat': 9.0320 + (random.random() - 0.5) * 0.1,
            'lng': 38.7469 + (random.random() - 0.5) * 0.1
        }

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
        """Calculate approximate distance between two coordinates."""
        # Simplified distance calculation (Haversine formula approximation)
        lat_diff = abs(end_coords['lat'] - start_coords['lat'])
        lng_diff = abs(end_coords['lng'] - start_coords['lng'])
        
        # Rough conversion: 1 degree ≈ 111 km
        distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
        return round(distance, 2)

    def _estimate_duration(self, start_coords, end_coords):
        """Estimate travel duration based on distance."""
        distance = self._calculate_distance(start_coords, end_coords)
        # Assume average speed of 30 km/h in city traffic
        duration_hours = distance / 30
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