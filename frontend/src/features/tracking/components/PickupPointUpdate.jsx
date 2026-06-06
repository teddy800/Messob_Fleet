import { useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Navigation, 
  AlertCircle,
  CheckCircle,
  Move,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePickupUpdate } from '../hooks/useRouteTracking';
import { toast } from 'sonner';
import './pickup-marker.css'; // FR-3.4: Draggable marker styles

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

// Draggable Marker Component (FR-3.4: Dynamic Pickup Point Update)
function DraggableMarker({ position, onDragEnd, icon, isEditable }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onDragEnd(newPos);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      draggable={isEditable}
      eventHandlers={isEditable ? eventHandlers : {}}
    >
      <Popup>
        <div className="text-center">
          <div className="font-bold text-green-600 mb-1">
            {isEditable ? '📍 Drag to Move' : '📍 Pickup Point'}
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </div>
          {isEditable && (
            <div className="text-xs text-blue-600 font-medium animate-pulse">
              ✨ Drag this pin to adjust location
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
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
    toast.success("📍 Location selected! You can also drag the marker to fine-tune.");
  };

  const handleMarkerDrag = (latlng) => {
    setTempCoordinates({ lat: latlng.lat, lng: latlng.lng });
    
    // Update address when marker is dragged
    const address = `Adjusted location at ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    setNewAddress(address);
    toast.success("📍 Pickup point adjusted via drag!");
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
                <strong>Two ways to set location:</strong>
                <br />• Click anywhere on the map
                <br />• Or drag the green pin to fine-tune position
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
      <div className="h-64 relative">
        <MapContainer
          center={displayCoordinates ? [displayCoordinates.lat, displayCoordinates.lng] : [9.0320, 38.7469]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className={isEditing ? 'editing-mode' : ''}
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

          {/* Draggable Pickup Marker (FR-3.4) */}
          {displayCoordinates && (
            <DraggableMarker
              position={[displayCoordinates.lat, displayCoordinates.lng]}
              onDragEnd={handleMarkerDrag}
              icon={pickupIcon}
              isEditable={isEditing}
            />
          )}
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Edit3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">✨ Editing Mode - FR-3.4 Enhanced</p>
                <p className="text-xs text-blue-700 mt-1">
                  <strong>Method 1:</strong> Click anywhere on the map to set location
                  <br />
                  <strong>Method 2:</strong> Drag the green pin for precise positioning
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
              <Move className="h-4 w-4 animate-pulse" />
              <span className="font-medium">
                💡 Pro Tip: Click the pin on the map, then drag it to your exact pickup spot!
              </span>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-md border border-amber-200">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Notification:</strong> Driver and dispatcher will be automatically notified when you save the updated pickup location.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">✅ Pickup Point Confirmed</p>
              <p className="text-xs text-green-700 mt-1">
                Click "Update" to change your pickup location with drag-and-drop precision. Only approved trips can be updated.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}