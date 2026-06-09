import { useEffect, useState } from 'react';
import { 
  MapPin, Navigation, CheckCircle, Clock, Fuel, Camera, 
  Phone, AlertCircle, Menu, X, Home, List, Activity 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { callOdooMethod, searchRead } from '@/lib/odooApi';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import IncidentReport from './IncidentReport';

export default function DriverMobileApp() {
  const user = useUserStore((s) => s.user);
  const [activeTrip, setActiveTrip] = useState(null);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [location, setLocation] = useState(null);
  const [showIncidentReport, setShowIncidentReport] = useState(false);

  useEffect(() => {
    loadTrips();
    requestLocationPermission();
    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    // Service Worker registration disabled in development
    // Uncomment for production PWA functionality
    /*
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    */
    console.log('Service Worker disabled in development mode');
  };

  const requestLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Location error:', error);
        },
        { enableHighAccuracy: true }
      );

      // Watch position for continuous tracking
      navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
  };

  const loadTrips = async () => {
    setLoading(true);
    try {
      // Get driver's assigned trips
      const trips = await searchRead(
        'messob.fms.trip',
        [['assigned_driver_id.user_id', '=', user.id], ['state', 'in', ['approved', 'in_progress']]],
        ['name', 'state', 'pickup', 'destination', 'start_dt', 'end_dt', 'requester_id', 'assigned_vehicle_id', 'purpose'],
        50
      );

      const active = trips.find(t => t.state === 'in_progress');
      const upcoming = trips.filter(t => t.state === 'approved');

      setActiveTrip(active);
      setUpcomingTrips(upcoming);
    } catch (error) {
      console.error('Failed to load trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const startTrip = async (tripId) => {
    try {
      await callOdooMethod('messob.fms.trip', 'action_start_trip', [tripId]);
      toast.success('Trip started');
      loadTrips();
    } catch (error) {
      console.error('Failed to start trip:', error);
      toast.error('Failed to start trip');
    }
  };

  const completeTrip = async (tripId) => {
    try {
      await callOdooMethod('messob.fms.trip', 'action_complete_trip', [tripId]);
      toast.success('Trip completed');
      loadTrips();
    } catch (error) {
      console.error('Failed to complete trip:', error);
      toast.error('Failed to complete trip');
    }
  };

  const reportIncident = () => {
    setShowIncidentReport(true);
  };

  const callDispatcher = () => {
    window.location.href = 'tel:+251911234567';
  };

  const openNavigation = (destination) => {
    if (location) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${encodeURIComponent(destination)}`;
      window.open(url, '_blank');
    } else {
      toast.error('Location not available');
    }
  };

  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-brand-blue dark:bg-gray-900 text-white shadow-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-lg font-black">{user?.name?.charAt(0)}</span>
          </div>
          <div>
            <p className="font-bold text-sm">Driver Mode</p>
            <p className="text-xs opacity-80 dark:opacity-70">{user?.name}</p>
          </div>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2">
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-t dark:border-gray-700">
          <button 
            onClick={() => { setCurrentView('home'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button 
            onClick={() => { setCurrentView('trips'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700"
          >
            <List className="h-5 w-5" />
            <span>All Trips</span>
          </button>
          <button 
            onClick={() => { setCurrentView('fuel'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700"
          >
            <Fuel className="h-5 w-5" />
            <span>Log Fuel</span>
          </button>
          <button 
            onClick={callDispatcher}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Phone className="h-5 w-5" />
            <span>Call Dispatcher</span>
          </button>
        </div>
      )}
    </div>
  );

  const ActiveTripCard = ({ trip }) => (
    <Card className="border-2 border-green-500 dark:border-green-600 shadow-lg dark:bg-gray-800">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
            <span className="font-black text-green-600 dark:text-green-400 uppercase text-sm">Active Trip</span>
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{trip.name}</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Pickup</p>
              <p className="font-semibold dark:text-gray-200">{trip.pickup}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Destination</p>
              <p className="font-semibold dark:text-gray-200">{trip.destination}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Passenger</p>
              <p className="font-semibold dark:text-gray-200">{Array.isArray(trip.requester_id) ? trip.requester_id[1] : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button 
            onClick={() => openNavigation(trip.destination)}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Navigate
          </Button>
          <Button 
            onClick={() => completeTrip(trip.id)}
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </Button>
        </div>

        <Button 
          onClick={reportIncident}
          variant="outline"
          className="w-full border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </CardContent>
    </Card>
  );

  const UpcomingTripCard = ({ trip }) => (
    <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{trip.name}</span>
          <span className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full font-bold">
            Upcoming
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{trip.pickup}</span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">{trip.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">
              {new Date(trip.start_dt).toLocaleString()}
            </span>
          </div>
        </div>

        <Button 
          onClick={() => startTrip(trip.id)}
          className="w-full bg-brand-blue hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Start Trip
        </Button>
      </CardContent>
    </Card>
  );

  const HomeView = () => (
    <div className="space-y-4">
      {activeTrip ? (
        <>
          <h2 className="text-lg font-black text-brand-blue dark:text-blue-400 px-4">Active Trip</h2>
          <div className="px-4">
            <ActiveTripCard trip={activeTrip} />
          </div>
        </>
      ) : (
        <div className="px-4">
          <Card className="bg-gray-50 dark:bg-gray-800">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 font-semibold">No active trip</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Check upcoming trips below</p>
            </CardContent>
          </Card>
        </div>
      )}

      {upcomingTrips.length > 0 && (
        <>
          <h2 className="text-lg font-black text-brand-blue dark:text-blue-400 px-4 pt-4">
            Upcoming Trips ({upcomingTrips.length})
          </h2>
          <div className="px-4 space-y-3">
            {upcomingTrips.map(trip => (
              <UpcomingTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </>
      )}

      {!activeTrip && upcomingTrips.length === 0 && (
        <div className="px-4 pt-8">
          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-blue-400 dark:text-blue-500 mx-auto mb-3" />
              <p className="text-blue-900 dark:text-blue-300 font-semibold">No trips assigned</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">You'll be notified when trips are assigned</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 pb-4">
        <Button 
          onClick={callDispatcher}
          variant="outline"
          className="w-full border-brand-blue dark:border-blue-600 text-brand-blue dark:text-blue-400"
        >
          <Phone className="h-4 w-4 mr-2" />
          Contact Dispatcher
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileHeader />
      
      {/* Incident Report Modal */}
      {showIncidentReport && activeTrip && (
        <IncidentReport
          tripId={activeTrip.id}
          onClose={() => setShowIncidentReport(false)}
        />
      )}
      
      <div className="pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-brand-blue dark:border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading trips...</p>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'home' && <HomeView />}
            {currentView === 'trips' && <HomeView />}
            {currentView === 'fuel' && (
              <div className="p-4">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="p-6 text-center">
                    <Fuel className="h-12 w-12 text-brand-blue dark:text-blue-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300 font-semibold">Fuel Logging</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Feature available in desktop view</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
        <div className="grid grid-cols-3 gap-1 p-2">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
              currentView === 'home' ? 'bg-brand-blue dark:bg-blue-700 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button
            onClick={() => setCurrentView('trips')}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
              currentView === 'trips' ? 'bg-brand-blue dark:bg-blue-700 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <List className="h-5 w-5" />
            <span className="text-xs font-bold">Trips</span>
          </button>
          <button
            onClick={() => setCurrentView('fuel')}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg ${
              currentView === 'fuel' ? 'bg-brand-blue dark:bg-blue-700 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <Fuel className="h-5 w-5" />
            <span className="text-xs font-bold">Fuel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
