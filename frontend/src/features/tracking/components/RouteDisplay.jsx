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
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouteTracking } from '../hooks/useRouteTracking';
import { format } from 'date-fns';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color, iconType = 'circle') => {
  const iconHtml = iconType === 'car' 
    ? `<div style="color: white; font-size: 16px;">🚗</div>`
    : `<div style="width: 12px; height: 12px; background-color: white; border-radius: 50%;"></div>`;

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
const vehicleIcon = createCustomIcon("#3b82f6", "car"); // Blue

export default function RouteDisplay({ tripId, className = "" }) {
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

  // Update map center when route data loads
  useEffect(() => {
    if (routeData?.route?.pickup?.coordinates) {
      const { lat, lng } = routeData.route.pickup.coordinates;
      setMapCenter([lat, lng]);
    }
  }, [routeData]);

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
        
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [routeData, gpsPosition]);

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

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Route className="h-6 w-6 text-brand-gold" />
            <div>
              <h3 className="text-white font-bold text-lg">{trip.request_id}</h3>
              <p className="text-blue-100 text-sm">{trip.requester}</p>
            </div>
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
                className="text-white hover:bg-white/20"
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
              className="text-white hover:bg-white/20"
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

      {/* Route Info */}
      <div className="p-4 bg-blue-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium text-sm truncate">{route.pickup.address}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Destination</p>
              <p className="font-medium text-sm truncate">{route.destination.address}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span>Distance: {route.distance_km} km</span>
          <span>•</span>
          <span>Est. Duration: {route.estimated_duration_minutes} min</span>
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
                  <div className="font-bold text-green-600">Pickup Point</div>
                  <div className="text-sm text-gray-600">{route.pickup.address}</div>
                </div>
              </Popup>
            </Marker>
          )}

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

          {/* Vehicle GPS Position */}
          {gpsPosition?.gps && (
            <Marker 
              position={[gpsPosition.gps.latitude, gpsPosition.gps.longitude]} 
              icon={vehicleIcon}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-blue-600">Vehicle Position</div>
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
        <div className="p-4 bg-gray-50">
          <Button 
            onClick={() => {
              if (mapRef.current && gpsPosition?.gps) {
                mapRef.current.flyTo([gpsPosition.gps.latitude, gpsPosition.gps.longitude], 15);
              }
            }}
            className="w-full bg-brand-blue hover:bg-blue-700"
            disabled={!gpsPosition}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Current Progress
          </Button>
        </div>
      )}
    </div>
  );
}