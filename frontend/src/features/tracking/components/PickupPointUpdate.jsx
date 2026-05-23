import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Navigation, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePickupUpdate } from '../hooks/useRouteTracking';
import { toast } from 'sonner';

// Custom marker icon
const createCustomIcon = (color) => {
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
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const pickupIcon = createCustomIcon("#10b981"); // Green

// Component to handle map clicks
function MapClickHandler({ onLocationSelect, isEditing }) {
  useMapEvents({
    click(e) {
      if (isEditing) {
        onLocationSelect(e.latlng);
      }
    },
  });
  return null;
}

export default function PickupPointUpdate({ 
  tripId, 
  currentPickup, 
  currentCoordinates, 
  onUpdate,
  className = "" 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAddress, setNewAddress] = useState(currentPickup || '');
  const [newCoordinates, setNewCoordinates] = useState(currentCoordinates || null);
  const [tempCoordinates, setTempCoordinates] = useState(currentCoordinates || null);
  const { updatePickupPoint, updating, error } = usePickupUpdate(tripId);
  const mapRef = useRef(null);

  const handleStartEdit = () => {
    setIsEditing(true);
    setNewAddress(currentPickup || '');
    setTempCoordinates(currentCoordinates || null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewAddress(currentPickup || '');
    setTempCoordinates(currentCoordinates || null);
  };

  const handleMapClick = (latlng) => {
    setTempCoordinates({ lat: latlng.lat, lng: latlng.lng });
    
    // Simple reverse geocoding simulation
    const address = `Location at ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    setNewAddress(address);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setTempCoordinates(coords);
          setNewAddress(`Current Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
          
          if (mapRef.current) {
            mapRef.current.flyTo([coords.lat, coords.lng], 15);
          }
        },
        (error) => {
          toast.error("Unable to get your current location");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  const handleSave = async () => {
    if (!newAddress.trim()) {
      toast.error("Please enter a pickup address");
      return;
    }

    if (!tempCoordinates) {
      toast.error("Please select a location on the map");
      return;
    }

    try {
      const result = await updatePickupPoint(newAddress.trim(), tempCoordinates);
      
      setNewCoordinates(tempCoordinates);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate(newAddress.trim(), tempCoordinates);
      }
      
      toast.success("Pickup point updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update pickup point");
    }
  };

  const displayCoordinates = isEditing ? tempCoordinates : (newCoordinates || currentCoordinates);
  const displayAddress = isEditing ? newAddress : (currentPickup || '');

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-white" />
            <h3 className="text-white font-bold">Pickup Point</h3>
          </div>
          
          {!isEditing ? (
            <Button
              onClick={handleStartEdit}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Update
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                disabled={updating}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={handleCancelEdit}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                disabled={updating}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Current Address Display */}
      <div className="p-4 bg-green-50 border-b">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Current Pickup Location</p>
            <p className="font-medium text-gray-900">{displayAddress}</p>
            {displayCoordinates && (
              <p className="text-xs text-gray-500 mt-1">
                {displayCoordinates.lat.toFixed(4)}, {displayCoordinates.lng.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="p-4 bg-yellow-50 border-b">
          <div className="space-y-3">
            <div>
              <Label htmlFor="pickup-address" className="text-sm font-medium">
                New Pickup Address
              </Label>
              <Input
                id="pickup-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Enter new pickup address..."
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={getCurrentLocation}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Use My Location
              </Button>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Click on the map below to select your new pickup location, or use "My Location" button.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Map */}
      <div className="h-64">
        <MapContainer
          center={displayCoordinates ? [displayCoordinates.lat, displayCoordinates.lng] : [9.0320, 38.7469]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler 
            onLocationSelect={handleMapClick} 
            isEditing={isEditing}
          />

          {/* Pickup Marker */}
          {displayCoordinates && (
            <Marker 
              position={[displayCoordinates.lat, displayCoordinates.lng]} 
              icon={pickupIcon}
            />
          )}
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50">
        {isEditing ? (
          <div className="flex items-start gap-2">
            <Edit3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Editing Mode</p>
              <p className="text-xs text-blue-700 mt-1">
                Click anywhere on the map to set your new pickup location. The driver and dispatcher will be notified of the change.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Pickup Point Set</p>
              <p className="text-xs text-green-700 mt-1">
                Click "Update" to change your pickup location. Only approved trips can be updated.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}