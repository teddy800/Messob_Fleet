import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Route, 
  Car, 
  User, 
  RefreshCw,
  Play,
  Pause,
  Eye,
  Edit3,
  MapPinned,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouteTracking } from '../hooks/useRouteTracking';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { callMethod } from '@/lib/odooApi';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons with vehicle category support (UI-5)
const getVehicleCategoryIcon = (category) => {
  // Vehicle category emoji/icons
  const categoryIcons = {
    sedan: '🚗',
    suv: '🚙',
    bus: '🚌',
    minibus: '🚐',
    pickup: '🛻',
    default: '🚗'
  };
  
  return categoryIcons[category?.toLowerCase()] || categoryIcons.default;
};

const createCustomIcon = (color, iconType = 'circle', vehicleCategory = null) => {
  let iconHtml;
  
  if (iconType === 'car' && vehicleCategory) {
    // UI-5: Vehicle category-specific icon
    const categoryIcon = getVehicleCategoryIcon(vehicleCategory);
    iconHtml = `<div style="font-size: 18px; transform: rotate(45deg);">${categoryIcon}</div>`;
  } else if (iconType === 'car') {
    iconHtml = `<div style="color: white; font-size: 16px;">🚗</div>`;
  } else {
    iconHtml = `<div style="width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`;
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${iconHtml}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const pickupIcon = createCustomIcon("#10b981"); // Green
const destinationIcon = createCustomIcon("#ef4444"); // Red
// Vehicle icon is now dynamic based on category - see below

// FR-3.3: Service user pickup marker (other passengers sharing vehicle)
const serviceUserPickupIcon = L.divIcon({
  className: 'service-user-pickup-marker',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export default function RouteDisplay({ tripId, className = "", onEditPickup }) {
  const navigate = useNavigate();
  const { 
    routeData, 
    gpsPosition, 
    loading, 
    error, 
    isTracking, 
    startTracking, 
    stopTracking, 
    refreshRoute 
  } = useRouteTracking(tripId);

  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([9.0320, 38.7469]); // Default to Addis Ababa
  const [showEditPickupTooltip, setShowEditPickupTooltip] = useState(false);
  
  // FR-3.3: Collaborative pickup state
  const [serviceUsers, setServiceUsers] = useState([]);
  const [showServiceUsers, setShowServiceUsers] = useState(true);
  const [loadingServiceUsers, setLoadingServiceUsers] = useState(false);

  // Update map center when route data loads
  useEffect(() => {
    if (routeData?.route?.pickup?.coordinates) {
      const { lat, lng } = routeData.route.pickup.coordinates;
      setMapCenter([lat, lng]);
    }
  }, [routeData]);

  // FR-3.3: Fetch collaborative service users when route loads
  useEffect(() => {
    const fetchServiceUsers = async () => {
      if (!tripId || !routeData) return;
      
      try {
        setLoadingServiceUsers(true);
        
        const response = await callMethod(
          'messob.fms.trip',
          'get_collaborative_users',
          [tripId]
        );
        
        if (response && response.success && response.service_users) {
          // Filter service users with valid coordinates
          const validServiceUsers = response.service_users.filter(user => 
            user.pickup_coordinates && 
            user.pickup_coordinates.lat && 
            user.pickup_coordinates.lng
          );
          setServiceUsers(validServiceUsers);
        }
      } catch (err) {
        console.error('Failed to fetch service users:', err);
        // Silent fail - this is an enhancement feature
      } finally {
        setLoadingServiceUsers(false);
      }
    };
    
    if (routeData) {
      fetchServiceUsers();
    }
  }, [tripId, routeData]);

  // Auto-fit map bounds when route loads
  useEffect(() => {
    if (mapRef.current && routeData?.route) {
      const map = mapRef.current;
      const { pickup, destination } = routeData.route;
      
      if (pickup.coordinates && destination.coordinates) {
        const bounds = L.latLngBounds([
          [pickup.coordinates.lat, pickup.coordinates.lng],
          [destination.coordinates.lat, destination.coordinates.lng]
        ]);
        
        // Add GPS position to bounds if available
        if (gpsPosition?.gps) {
          bounds.extend([gpsPosition.gps.latitude, gpsPosition.gps.longitude]);
        }
        
        // FR-3.3: Add service user pickups to bounds
        if (showServiceUsers && serviceUsers.length > 0) {
          serviceUsers.forEach(user => {
            if (user.pickup_coordinates?.lat && user.pickup_coordinates?.lng) {
              bounds.extend([user.pickup_coordinates.lat, user.pickup_coordinates.lng]);
            }
          });
        }
        
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routeData, gpsPosition, serviceUsers, showServiceUsers]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-2" />
            <p className="text-gray-600">Loading route information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={refreshRoute} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No route data available</p>
        </div>
      </div>
    );
  }

  const { trip, route } = routeData;
  const routeLineCoords = route.route_line?.map(point => [point.lat, point.lng]) || [];
  
  // UI-5: Create vehicle icon with category-specific emoji
  const vehicleCategory = trip?.vehicle?.category || trip?.vehicle_category || 'sedan';
  const vehicleIcon = createCustomIcon("#3b82f6", "car", vehicleCategory); // Blue with category icon
  
  // Check if pickup can be edited (only for approved trips)
  const canEditPickup = trip.state === 'approved';

  const handleEditPickupClick = () => {
    if (onEditPickup) {
      onEditPickup();
    } else {
      // Fallback: navigate to tracking page with pickup tab
      navigate(`/dashboard/tracking/${tripId}?tab=pickup`);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-700 dark:from-blue-900 dark:to-blue-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Route className="h-6 w-6 text-brand-gold dark:text-yellow-400" />
            <div>
              <h3 className="text-white font-bold text-lg">{trip.request_id}</h3>
              <p className="text-blue-100 dark:text-blue-200 text-sm">{trip.requester}</p>
            </div>
            {/* FR-3.3: Show passenger count badge */}
            {serviceUsers.length > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 bg-white/20 text-white border-white/30 flex items-center gap-1"
              >
                <Users className="h-3 w-3" />
                {serviceUsers.length + 1} Passengers
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={trip.state === 'approved' ? 'default' : 'secondary'}
              className={trip.state === 'approved' ? 'bg-emerald-500/70' : trip.state === 'in_progress' ? 'bg-emerald-500/70' : 'bg-amber-500'}
            >
              {trip.state.replace('_', ' ').toUpperCase()}
            </Badge>
            
            {trip.state === 'in_progress' && (
              <Button
                onClick={isTracking ? stopTracking : startTracking}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 dark:hover:bg-white/10"
              >
                {isTracking ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Stop Tracking
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Start Tracking
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={refreshRoute}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 dark:hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-brand-blue" />
            <div>
              <p className="text-xs text-gray-500">Vehicle</p>
              <p className="font-medium">{trip.vehicle?.plate_no || 'Not assigned'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-blue" />
            <div>
              <p className="text-xs text-gray-500">Driver</p>
              <p className="font-medium">{trip.driver?.name || 'Not assigned'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-blue" />
            <div>
              <p className="text-xs text-gray-500">Schedule</p>
              <p className="font-medium">
                {format(new Date(trip.start_dt), 'MMM d, HH:mm')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Route Info with Edit Pickup Button */}
      <div className="p-4 bg-blue-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pickup</p>
              <p className="font-medium text-sm truncate dark:text-gray-200">{route.pickup.address}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Destination</p>
              <p className="font-medium text-sm truncate dark:text-gray-200">{route.destination.address}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Distance: {route.distance_km} km</span>
            <span>•</span>
            <span>Est. Duration: {route.estimated_duration_minutes} min</span>
          </div>
          
          {/* Prominent Edit Pickup Button (FR-3.4) */}
          {canEditPickup && (
            <div className="relative">
              <Button
                onClick={handleEditPickupClick}
                onMouseEnter={() => setShowEditPickupTooltip(true)}
                onMouseLeave={() => setShowEditPickupTooltip(false)}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 dark:from-emerald-600 dark:to-emerald-700"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Edit Pickup Point
                <MapPinned className="h-4 w-4 ml-1.5" />
              </Button>
              
              {/* Tooltip */}
              {showEditPickupTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  Update your pickup location to coordinate with driver
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GPS Status */}
      {gpsPosition && (
        <div className="p-3 bg-green-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500/70 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium text-emerald-600/80">
                GPS: {gpsPosition.gps.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs text-green-600">
                ({gpsPosition.gps.progress_percent}% complete)
              </span>
            </div>
            
            <div className="text-xs text-green-600">
              Speed: {gpsPosition.gps.speed_kmh} km/h
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-96">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Pickup Marker */}
          {route.pickup.coordinates && (
            <Marker 
              position={[route.pickup.coordinates.lat, route.pickup.coordinates.lng]} 
              icon={pickupIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-green-600">Your Pickup Point</div>
                  <div className="text-sm text-gray-600">{route.pickup.address}</div>
                  <div className="text-xs text-gray-500 mt-1">Primary pickup location</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* FR-3.3: Service user pickup markers (other passengers sharing vehicle) */}
          {showServiceUsers && serviceUsers.map((user, index) => (
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
          ))}

          {/* Destination Marker */}
          {route.destination.coordinates && (
            <Marker 
              position={[route.destination.coordinates.lat, route.destination.coordinates.lng]} 
              icon={destinationIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-red-600">Destination</div>
                  <div className="text-sm text-gray-600">{route.destination.address}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Line */}
          {routeLineCoords.length > 0 && (
            <Polyline
              positions={routeLineCoords}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
            />
          )}

          {/* Vehicle GPS Position with Category Icon (UI-5) */}
          {gpsPosition?.gps && (
            <Marker 
              position={[gpsPosition.gps.latitude, gpsPosition.gps.longitude]} 
              icon={vehicleIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-blue-600 flex items-center justify-center gap-2">
                    <span>{getVehicleCategoryIcon(vehicleCategory)}</span>
                    Vehicle Position
                  </div>
                  <div className="text-sm text-gray-600">{trip.vehicle?.plate_no}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Speed: {gpsPosition.gps.speed_kmh} km/h<br/>
                    Updated: {format(new Date(gpsPosition.gps.timestamp), 'HH:mm:ss')}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* View Progress Button */}
      {trip.state === 'in_progress' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                if (mapRef.current && gpsPosition?.gps) {
                  mapRef.current.flyTo([gpsPosition.gps.latitude, gpsPosition.gps.longitude], 15);
                }
              }}
              className="flex-1 bg-brand-blue hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              disabled={!gpsPosition}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Current Progress
            </Button>
            
            {/* FR-3.3: Toggle service users visibility */}
            {serviceUsers.length > 0 && (
              <Button
                onClick={() => setShowServiceUsers(!showServiceUsers)}
                variant={showServiceUsers ? 'default' : 'outline'}
                className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                {showServiceUsers ? 'Hide' : 'Show'} Co-Passengers
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* FR-3.3: Show service users toggle for approved trips too */}
      {trip.state === 'approved' && serviceUsers.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
          <Button
            onClick={() => setShowServiceUsers(!showServiceUsers)}
            variant={showServiceUsers ? 'default' : 'outline'}
            className="w-full"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            {showServiceUsers ? 'Hide' : 'Show'} Co-Passengers ({serviceUsers.length})
          </Button>
        </div>
      )}
    </div>
  );
}