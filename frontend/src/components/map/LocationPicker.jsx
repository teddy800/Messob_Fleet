import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchRead } from "@/lib/odooApi";

// Fix Leaflet default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
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

const startIcon = createCustomIcon("#10b981"); // Green for start
const destinationIcon = createCustomIcon("#ef4444"); // Red for destination

// Component to handle map clicks with visual feedback
function MapClickHandler({ onLocationSelect, markerType }) {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng, markerType);
      
      // Visual feedback: briefly pulse the clicked location
      const circle = L.circle(e.latlng, {
        color: markerType === "start" ? '#10b981' : '#ef4444',
        fillColor: markerType === "start" ? '#10b981' : '#ef4444',
        fillOpacity: 0.3,
        radius: 500,
        weight: 2
      }).addTo(map);
      
      // Remove the circle after animation
      setTimeout(() => {
        map.removeLayer(circle);
      }, 800);
    },
    mousemove() {
      // Change cursor to crosshair when hovering over map
      map.getContainer().style.cursor = 'crosshair';
    }
  });
  
  return null;
}

export default function LocationPicker({ 
  startPoint, 
  destination, 
  onStartPointChange, 
  onDestinationChange 
}) {
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [activeMarker, setActiveMarker] = useState("destination"); // "start" or "destination"
  const [showSearch, setShowSearch] = useState(false);
  const [ethiopiaCities, setEthiopiaCities] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const mapRef = useRef(null);

  // Load locations from backend API on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLocationsLoading(true);
        const locations = await searchRead(
          'messob.fms.location',
          [['active', '=', true]],
          ['name', 'area', 'city', 'latitude', 'longitude'],
          500 // Get all active locations
        );

        // Transform backend data to component format
        const transformedLocations = locations.map(loc => ({
          name: loc.name,
          lat: loc.latitude,
          lng: loc.longitude,
          region: loc.area ? `${loc.city} - ${loc.area}` : loc.city
        }));

        setEthiopiaCities(transformedLocations);
        console.log(`✅ Loaded ${transformedLocations.length} locations from backend API`);
      } catch (error) {
        console.error('Failed to load locations from backend:', error);
        // Fallback: Set default Addis Ababa location if API fails
        setEthiopiaCities([
          { name: "Addis Ababa", lat: 9.0320, lng: 38.7469, region: "Addis Ababa - Central" }
        ]);
      } finally {
        setLocationsLoading(false);
      }
    };

    loadLocations();
  }, []);

  // Initialize with MESSOB Center HQ as start point (from backend data)
  useEffect(() => {
    if (ethiopiaCities.length > 0 && !startCoords) {
      const messobHQ = ethiopiaCities.find(city => city.name.includes("MESSOB")) 
                      || ethiopiaCities.find(city => city.name === "Addis Ababa")
                      || ethiopiaCities[0];
      
      if (messobHQ) {
        setStartCoords({ lat: messobHQ.lat, lng: messobHQ.lng });
      }
    }
  }, [ethiopiaCities]);

  // Search cities
  useEffect(() => {
    if (searchQuery.trim() && ethiopiaCities.length > 0) {
      const filtered = ethiopiaCities.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.region.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities([]);
    }
  }, [searchQuery, ethiopiaCities]);

  const handleLocationSelect = (latlng, type) => {
    if (type === "start") {
      setStartCoords(latlng);
      // Try to find city name from coordinates (reverse geocoding simulation)
      const nearestCity = findNearestCity(latlng);
      onStartPointChange(nearestCity || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    } else {
      setDestCoords(latlng);
      const nearestCity = findNearestCity(latlng);
      onDestinationChange(nearestCity || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    }
  };

  const findNearestCity = (latlng) => {
    if (ethiopiaCities.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    ethiopiaCities.forEach(city => {
      const distance = Math.sqrt(
        Math.pow(city.lat - latlng.lat, 2) + Math.pow(city.lng - latlng.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = city;
      }
    });

    // If within ~50km (rough approximation), return city name
    return minDistance < 0.5 ? nearest.name : null;
  };

  const selectCity = (city) => {
    const coords = { lat: city.lat, lng: city.lng };
    
    if (activeMarker === "start") {
      setStartCoords(coords);
      onStartPointChange(city.name);
    } else {
      setDestCoords(coords);
      onDestinationChange(city.name);
    }

    // Fly to selected location
    if (mapRef.current) {
      mapRef.current.flyTo([city.lat, city.lng], 10, {
        duration: 1.5
      });
    }

    setSearchQuery("");
    setFilteredCities([]);
    setShowSearch(false);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          if (activeMarker === "start") {
            setStartCoords(coords);
            const nearestCity = findNearestCity(coords);
            onStartPointChange(nearestCity || "Current Location");
          } else {
            setDestCoords(coords);
            const nearestCity = findNearestCity(coords);
            onDestinationChange(nearestCity || "Current Location");
          }

          if (mapRef.current) {
            mapRef.current.flyTo([coords.lat, coords.lng], 13, {
              duration: 1.5
            });
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your current location. Please select from the map or search.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {locationsLoading && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-brand-blue">
            <div className="animate-spin h-5 w-5 border-2 border-brand-blue border-t-transparent rounded-full"></div>
            <span className="text-sm font-semibold">Loading locations from backend...</span>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-700 p-4 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-gold" />
            Interactive Location Picker
          </h3>
          <Button
            type="button"
            size="sm"
            onClick={getCurrentLocation}
            className="bg-brand-gold hover:bg-yellow-500 text-brand-blue h-8 text-xs font-bold"
          >
            <Navigation className="h-3 w-3 mr-1" />
            My Location
          </Button>
        </div>

        {/* Marker Selection */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setActiveMarker("start")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMarker === "start"
                ? "bg-green-500 text-white shadow-lg scale-105"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              Set Start Point
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveMarker("destination")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMarker === "destination"
                ? "bg-red-500 text-white shadow-lg scale-105"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
              Set Destination
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search Ethiopian cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="pl-10 h-10 bg-white border-0 rounded-lg text-sm"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearch && filteredCities.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50 border-2 border-brand-blue/20">
              {filteredCities.map((city, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectCity(city)}
                  className="w-full px-4 py-3 text-left hover:bg-brand-blue/5 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="font-bold text-brand-blue text-sm">{city.name}</div>
                  <div className="text-xs text-gray-500">{city.region} Region</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-blue-100 mt-2 text-center flex items-center justify-center gap-2">
          {activeMarker === "start" 
            ? <><span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Click anywhere on map or search to set starting point</> 
            : <><span className="inline-block w-2 h-2 bg-red-400 rounded-full animate-pulse"></span> Click anywhere on map or search to set destination</>}
        </p>
      </div>

      {/* Map Container with Click Instructions */}
      <div className="rounded-xl overflow-hidden shadow-2xl border-4 border-brand-blue/20 relative">
        {/* Click Instruction Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className={`px-4 py-2 rounded-lg shadow-lg font-bold text-xs backdrop-blur-sm ${
            activeMarker === "start" 
              ? "bg-green-500/90 text-white border-2 border-green-300" 
              : "bg-red-500/90 text-white border-2 border-red-300"
          }`}>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {activeMarker === "start" 
                  ? "Click map to set PICKUP location" 
                  : "Click map to set DESTINATION"}
              </span>
            </div>
          </div>
        </div>

        <MapContainer
          center={[9.0320, 38.7469]} // Addis Ababa center
          zoom={6}
          style={{ height: "400px", width: "100%", cursor: "crosshair" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler 
            onLocationSelect={handleLocationSelect} 
            markerType={activeMarker}
          />

          {/* Start Point Marker */}
          {startCoords && (
            <Marker position={[startCoords.lat, startCoords.lng]} icon={startIcon}>
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-green-600 flex items-center justify-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Starting Point
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{startPoint}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Lat: {startCoords.lat.toFixed(4)}, Lng: {startCoords.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {destCoords && (
            <Marker position={[destCoords.lat, destCoords.lng]} icon={destinationIcon}>
              <Popup>
                <div className="text-center">
                  <div className="font-bold text-red-600 flex items-center justify-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Destination
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{destination}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Lat: {destCoords.lat.toFixed(4)}, Lng: {destCoords.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Selected Locations Display */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs font-bold text-green-700 uppercase">Start</span>
          </div>
          <div className="text-sm font-bold text-green-900">
            {startPoint || "Not set"}
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs font-bold text-red-700 uppercase">Destination</span>
          </div>
          <div className="text-sm font-bold text-red-900">
            {destination || "Not set"}
          </div>
        </div>
      </div>
    </div>
  );
}
