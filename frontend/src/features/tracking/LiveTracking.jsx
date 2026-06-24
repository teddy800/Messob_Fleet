/**
 * Live Tracking Component
 * MESSOB Fleet Management System
 * 
 * Features:
 * - Real-time vehicle position tracking
 * - Route visualization with pickup/destination markers
 * - Live speed, heading, and status display
 * - Auto-center map on vehicle
 * - View progress button
 * - FR-3.3: Multi-user pickup visualization (service users sharing same vehicle)
 * 
 * SRS Requirements: FR-3.1, FR-3.2, FR-3.3
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useGPSTracking } from '@/lib/websocket';
import { callMethod } from '@/lib/odooApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  Activity, 
  Clock, 
  MapPin, 
  Target,
  Wifi,
  WifiOff,
  RefreshCw,
  Maximize2,
  Users
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Custom vehicle marker icon with rotation
 */
const createVehicleIcon = (heading = 0, speed = 0) => {
  const color = speed > 0 ? '#3B82F6' : '#9CA3AF'; // Blue if moving, gray if stopped
  
  return L.divIcon({
    className: 'vehicle-marker',
    html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 8V14L12 20L20 14V8L12 2Z" fill="${color}" stroke="#1E40AF" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="3" fill="white"/>
          <path d="M12 2L12 8" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

/**
 * Pickup location marker icon (primary user - current trip)
 */
const pickupIcon = L.divIcon({
  className: 'pickup-marker',
  html: `
    <div style="background: #10B981; border-radius: 50%; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

/**
 * FR-3.3: Service user pickup marker icon (other passengers sharing vehicle)
 * Different color to distinguish from primary pickup point
 */
const serviceUserPickupIcon = L.divIcon({
  className: 'service-user-pickup-marker',
  html: `
    <div style="background: #3B82F6; border-radius: 50%; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
});

/**
 * Destination marker icon
 */
const destinationIcon = L.divIcon({
  className: 'destination-marker',
  html: `
    <div style="background: #EF4444; border-radius: 50%; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

/**
 * Map controller component to handle auto-centering
 */
function MapController({ center, autoCenter }) {
  const map = useMap();

  useEffect(() => {
    if (autoCenter && center) {
      map.setView(center, map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [center, autoCenter, map]);

  return null;
}

/**
 * Format speed for display
 */
function formatSpeed(speed) {
  return speed ? `${speed.toFixed(1)} km/h` : '0.0 km/h';
}

/**
 * Format heading for display
 */
function formatHeading(heading) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return `${heading}° ${directions[index]}`;
}

/**
 * Calculate time ago from timestamp
 */
function timeAgo(timestamp) {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Main LiveTracking Component
 */
export default function LiveTracking({ 
  tripId, 
  vehicleId, 
  route,
  onClose 
}) {
  const { position, isConnected, error, reconnect } = useGPSTracking(vehicleId);
  const [mapCenter, setMapCenter] = useState([9.0320, 38.7469]); // Addis Ababa default
  const [autoCenter, setAutoCenter] = useState(true);
  const [mapZoom, setMapZoom] = useState(15);
  const mapRef = useRef(null);
  
  // FR-3.3: Multi-user pickup visualization state
  const [serviceUsers, setServiceUsers] = useState([]);
  const [showServiceUsers, setShowServiceUsers] = useState(true);

  // Update map center when position changes
  useEffect(() => {
    if (position && autoCenter) {
      setMapCenter([position.latitude, position.longitude]);
    }
  }, [position, autoCenter]);

  // Set initial map center from route
  useEffect(() => {
    if (route && route.pickup) {
      setMapCenter([route.pickup.lat, route.pickup.lng]);
    }
  }, [route]);

  // FR-3.3: Fetch collaborative service users on same vehicle
  useEffect(() => {
    /**
     * FR-3.3: Fetch all service users sharing the same vehicle
     */
    const fetchServiceUsers = async () => {
      if (!tripId) return;
      
      try {
        // Call the backend method to get collaborative users
        const response = await callMethod(
          'messob.fms.trip',
          'get_collaborative_users',
          [tripId]
        );
        
        if (response && response.success && response.service_users) {
          setServiceUsers(response.service_users);
        }
      } catch (err) {
        console.error('Failed to fetch service users:', err);
        // Don't show error to user - this is an enhancement feature
      }
    };
    
    if (tripId) {
      fetchServiceUsers();
    }
  }, [tripId]);

  /**
   * Handle "View Progress" button click
   */
  const handleViewProgress = () => {
    if (position) {
      setMapCenter([position.latitude, position.longitude]);
      setAutoCenter(true);
      setMapZoom(16);
    }
  };

  /**
   * Handle "Fit Route" button click
   */
  const handleFitRoute = () => {
    if (mapRef.current && route && route.coordinates) {
      const bounds = L.latLngBounds(route.coordinates);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      setAutoCenter(false);
    }
  };

  /**
   * Toggle auto-center
   */
  const toggleAutoCenter = () => {
    setAutoCenter(!autoCenter);
  };

  return (
    <div className="space-y-4">
      {/* Connection Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              Live Vehicle Tracking
              {/* FR-3.3: Show passenger count badge */}
              {serviceUsers.length > 0 && (
                <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {serviceUsers.length + 1} Passengers
                </Badge>
              )}
            </span>
            <div className="flex items-center gap-3">
              {error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reconnect
                </Button>
              )}
              <Badge variant={isConnected ? 'success' : 'destructive'} className="flex items-center gap-1">
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm font-medium">Connection Error</p>
              <p className="text-red-600 text-xs mt-1">{error.message || 'Failed to connect to tracking server'}</p>
            </div>
          )}
          
          {/* Vehicle Status */}
          {position ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Activity className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Speed</p>
                  <p className="text-lg font-bold text-gray-900">{formatSpeed(position.speed)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Navigation className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Heading</p>
                  <p className="text-lg font-bold text-gray-900">{formatHeading(position.heading)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Clock className="h-6 w-6 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Last Update</p>
                  <p className="text-lg font-bold text-gray-900">{timeAgo(position.timestamp)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Target className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Accuracy</p>
                  <p className="text-lg font-bold text-gray-900">{position.accuracy ? `±${position.accuracy}m` : 'N/A'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Navigation className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Waiting for GPS data...</p>
              <p className="text-xs mt-1">Make sure the vehicle's GPS device is active</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '600px', width: '100%' }}
              className="rounded-lg"
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapController center={mapCenter} autoCenter={autoCenter} />
              
              {/* Route polyline */}
              {route && route.coordinates && route.coordinates.length > 0 && (
                <Polyline
                  positions={route.coordinates}
                  color="#3B82F6"
                  weight={5}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
              
              {/* Pickup marker (primary user - current trip) */}
              {route && route.pickup && (
                <Marker 
                  position={[route.pickup.lat, route.pickup.lng]}
                  icon={pickupIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <strong className="text-sm">Your Pickup Location</strong>
                      </div>
                      <p className="text-xs text-gray-600">{route.pickup.address || 'Pickup Point'}</p>
                      {route.pickup.time && (
                        <p className="text-xs text-gray-500 mt-1">
                          Time: {new Date(route.pickup.time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* FR-3.3: Service user pickup markers (other passengers sharing vehicle) */}
              {showServiceUsers && serviceUsers.map((user, index) => (
                user.pickup_coordinates && user.pickup_coordinates.lat && user.pickup_coordinates.lng && (
                  <Marker
                    key={`service-user-${user.trip_id}-${index}`}
                    position={[user.pickup_coordinates.lat, user.pickup_coordinates.lng]}
                    icon={serviceUserPickupIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <strong className="text-sm">Co-Passenger Pickup</strong>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs">
                            <strong>Name:</strong> {user.requester || 'Unknown'}
                          </p>
                          {user.department && (
                            <p className="text-xs">
                              <strong>Dept:</strong> {user.department}
                            </p>
                          )}
                          <p className="text-xs">
                            <strong>Request ID:</strong> {user.request_id}
                          </p>
                          <p className="text-xs text-gray-600">
                            {user.pickup_address || 'Pickup Point'}
                          </p>
                          {user.start_time && (
                            <p className="text-xs text-gray-500 mt-1">
                              Time: {user.start_time}
                            </p>
                          )}
                          {user.status && (
                            <Badge 
                              variant={user.status === 'in_progress' ? 'default' : 'secondary'}
                              className="mt-2 text-xs"
                            >
                              {user.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
              
              {/* Destination marker */}
              {route && route.destination && (
                <Marker 
                  position={[route.destination.lat, route.destination.lng]}
                  icon={destinationIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-red-600" />
                        <strong className="text-sm">Destination</strong>
                      </div>
                      <p className="text-xs text-gray-600">{route.destination.address || 'Destination Point'}</p>
                      {route.destination.time && (
                        <p className="text-xs text-gray-500 mt-1">
                          ETA: {new Date(route.destination.time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Vehicle marker */}
              {position && (
                <Marker
                  position={[position.latitude, position.longitude]}
                  icon={createVehicleIcon(position.heading, position.speed)}
                >
                  <Popup>
                    <div className="p-2">
                      <strong className="text-sm block mb-2">Vehicle Position</strong>
                      <div className="space-y-1 text-xs">
                        <p><strong>Speed:</strong> {formatSpeed(position.speed)}</p>
                        <p><strong>Heading:</strong> {formatHeading(position.heading)}</p>
                        <p><strong>Altitude:</strong> {position.altitude ? `${position.altitude.toFixed(0)}m` : 'N/A'}</p>
                        <p><strong>Time:</strong> {new Date(position.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
            
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <Button
                onClick={handleViewProgress}
                disabled={!position}
                className="shadow-lg"
                size="sm"
              >
                <Navigation className="h-4 w-4 mr-2" />
                View Progress
              </Button>
              
              {route && route.coordinates && (
                <Button
                  onClick={handleFitRoute}
                  variant="outline"
                  className="shadow-lg bg-white"
                  size="sm"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Fit Route
                </Button>
              )}
              
              {/* FR-3.3: Toggle service users visibility */}
              {serviceUsers.length > 0 && (
                <Button
                  onClick={() => setShowServiceUsers(!showServiceUsers)}
                  variant={showServiceUsers ? 'default' : 'outline'}
                  className="shadow-lg bg-white"
                  size="sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showServiceUsers ? 'Hide' : 'Show'} Co-Passengers
                </Button>
              )}
            </div>
            
            {/* Auto-center toggle */}
            <div className="absolute bottom-4 right-4 z-[1000]">
              <Button
                variant={autoCenter ? 'default' : 'outline'}
                size="sm"
                onClick={toggleAutoCenter}
                className="shadow-lg"
              >
                <Target className="h-4 w-4 mr-2" />
                {autoCenter ? 'Auto-center ON' : 'Auto-center OFF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
