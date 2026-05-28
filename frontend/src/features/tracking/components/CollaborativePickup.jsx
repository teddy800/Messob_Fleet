import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Users, 
  MapPin, 
  Clock, 
  Car, 
  RefreshCw, 
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCollaborativePickup } from '../hooks/useRouteTracking';

// Custom marker icons
const createCustomIcon = (color, label) => {
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
        <div style="
          width: 16px;
          height: 16px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: ${color};
        ">${label}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function CollaborativePickup({ tripId, className = "" }) {
  const { collaborativeData, loading, error, refresh } = useCollaborativePickup(tripId);
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-brand-blue mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Loading service users...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!collaborativeData || collaborativeData.service_users.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-brand-blue" />
            Service Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No other service users on this vehicle</p>
            <p className="text-gray-400 text-xs mt-1">You're traveling solo today!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { current_trip, service_users, vehicle } = collaborativeData;
  const allUsers = [current_trip, ...service_users];

  // Calculate map bounds
  const bounds = L.latLngBounds(
    allUsers.map(user => [
      user.pickup_coordinates.lat,
      user.pickup_coordinates.lng
    ])
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-brand-blue" />
            Service Users ({service_users.length + 1})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Car className="h-3 w-3 mr-1" />
              {vehicle.plate_no}
            </Badge>
            <Button onClick={refresh} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Shared {vehicle.category} • {service_users.length + 1} passengers
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map View */}
        <div className="h-64 rounded-lg overflow-hidden border">
          <MapContainer
            bounds={bounds}
            style={{ height: '100%', width: '100%' }}
            boundsOptions={{ padding: [20, 20] }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Current User Marker */}
            <Marker
              position={[current_trip.pickup_coordinates.lat, current_trip.pickup_coordinates.lng]}
              icon={createCustomIcon("#10b981", "ME")}
            >
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-green-600">Your Pickup</div>
                  <div className="text-sm text-gray-600">{current_trip.pickup_address}</div>
                  <div className="text-xs text-gray-500 mt-1">{current_trip.requester}</div>
                </div>
              </Popup>
            </Marker>

            {/* Other Users Markers */}
            {service_users.map((user, index) => (
              <Marker
                key={user.trip_id}
                position={[user.pickup_coordinates.lat, user.pickup_coordinates.lng]}
                icon={createCustomIcon("#3b82f6", (index + 1).toString())}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">Pickup Point {index + 1}</div>
                    <div className="text-sm text-gray-600">{user.pickup_address}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {user.requester} • {user.start_time}
                    </div>
                    <Badge 
                      variant={user.status === 'approved' ? 'default' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      {user.status}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Service Users List */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium text-sm">Pickup Schedule</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 mt-3">
            {/* Current User */}
            <div className="flex items-start gap-3 p-3 bg-emerald-50/40 rounded-lg border-l-4 border-emerald-200/50">
              <div className="w-8 h-8 bg-emerald-500/70 rounded-full flex items-center justify-center text-white text-xs font-bold">
                ME
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-emerald-600/80">{current_trip.requester}</span>
                  <Badge variant="secondary" className="text-xs bg-emerald-100/40 text-emerald-600/80">
                    You
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{current_trip.pickup_address}</span>
                </div>
              </div>
            </div>

            {/* Other Service Users */}
            {service_users.map((user, index) => (
              <div key={user.trip_id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-blue-700">{user.requester}</span>
                    <Badge 
                      variant={user.status === 'approved' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {user.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{user.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>{user.start_time}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs">{user.request_id}</span>
                  </div>
                </div>
                
                {user.contact_allowed && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Coordination Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Coordination Tips</p>
              <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                <li>• Be ready 5 minutes before your pickup time</li>
                <li>• Check the map for the exact pickup location</li>
                <li>• Contact other passengers if needed for coordination</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}