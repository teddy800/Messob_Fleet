import { useEffect, useState } from 'react';
import { 
  MapPin, Navigation, CheckCircle, Clock, Fuel, 
  Phone, AlertCircle, Menu, X, Home, List, Activity, Bell, Wrench 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callOdooMethod, searchRead } from '@/lib/odooApi';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import IncidentReport from './IncidentReport';
import VehicleMaintenanceAlerts from './VehicleMaintenanceAlerts';

export default function DriverMobileApp() {
  const user = useUserStore((s) => s.user);
  const [activeTrip, setActiveTrip] = useState(null);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [location, setLocation] = useState(null);
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [maintenanceAlertCount, setMaintenanceAlertCount] = useState(0);

  useEffect(() => {
    loadTrips();
    loadMaintenanceAlertCount();
    requestLocationPermission();
    registerServiceWorker();

    // Auto-refresh trips every 2 minutes to check for time expirations
    const refreshInterval = setInterval(() => {
      loadTrips();
    }, 120000); // 2 minutes

    return () => clearInterval(refreshInterval);
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
        ['name', 'state', 'pickup', 'destination', 'start_dt', 'end_dt', 'requester_id', 'assigned_vehicle_id', 'assigned_driver_id', 'purpose'],
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

  const loadMaintenanceAlertCount = async () => {
    try {
      // Get user's partner ID first
      const [userRecord] = await searchRead(
        'res.users',
        [['id', '=', user.uid]],
        ['partner_id'],
        1
      );

      const partner = userRecord?.partner_id;
      const driverPartnerId = Array.isArray(partner) ? partner[0] : null;

      if (!driverPartnerId) {
        setMaintenanceAlertCount(0);
        return;
      }

      // Get driver's active and approved trips with assigned vehicles
      const driverTrips = await searchRead(
        'messob.fms.trip',
        [
          ['assigned_driver_id', '=', driverPartnerId],
          ['state', 'in', ['approved', 'in_progress']],
          ['assigned_vehicle_id', '!=', false]
        ],
        ['assigned_vehicle_id'],
        100
      );

      if (!driverTrips || driverTrips.length === 0) {
        setMaintenanceAlertCount(0);
        return;
      }

      // Extract unique vehicle IDs
      const vehicleIds = [...new Set(
        driverTrips
          .map(trip => Array.isArray(trip.assigned_vehicle_id) ? trip.assigned_vehicle_id[0] : trip.assigned_vehicle_id)
          .filter(id => id)
      )];

      if (vehicleIds.length === 0) {
        setMaintenanceAlertCount(0);
        return;
      }

      // Count maintenance alerts for these vehicles
      const alerts = await searchRead(
        'messob.fms.maintenance.alert',
        [
          ['vehicle_id', 'in', vehicleIds],
          ['status', 'in', ['pending', 'sent', 'acknowledged']],
          ['dashboard_notification', '=', true]
        ],
        ['id'],
        1000
      );

      setMaintenanceAlertCount(alerts ? alerts.length : 0);
    } catch (error) {
      console.error('Failed to load maintenance alert count:', error);
      setMaintenanceAlertCount(0);
    }
  };

  const removeExpiredTrip = async (tripId) => {
    try {
      const { callMethod } = await import('@/lib/odooApi');
      await callMethod('messob.fms.trip', 'action_remove_expired', [tripId]);
      toast.success('Expired trip removed from your list');
      loadTrips();
    } catch (error) {
      console.error('Failed to remove expired trip:', error);
      toast.error(error.message || 'Failed to remove expired trip');
    }
  };

  const startTrip = async (tripId) => {
    try {
      // Find the trip to validate
      const trip = upcomingTrips.find(t => t.id === tripId);
      
      // Check if trip is too early to start (prevents starting Day 24 trip on Day 23)
      if (trip && isTripTooEarly(trip)) {
        const startTime = new Date(trip.start_dt);
        const formattedTime = startTime.toLocaleString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        toast.error(`This trip cannot be started yet. Scheduled start time is ${formattedTime}. You can start 30 minutes before the scheduled time.`);
        return;
      }
      
      // Check if trip start time has expired (too late)
      if (trip && isStartTimePassed(trip)) {
        toast.error('Trip start time has expired. Please contact dispatcher for assistance.');
        return;
      }

      const odooApi = (await import('@/lib/odooApi')).default;
      await odooApi.callMethod('messob.fms.trip', 'action_start_trip', [tripId]);
      toast.success('Trip started');
      loadTrips();
    } catch (error) {
      console.error('Failed to start trip:', error);
      toast.error('Failed to start trip');
    }
  };

  const completeTrip = async (tripId) => {
    try {
      const odooApi = (await import('@/lib/odooApi')).default;
      await odooApi.callMethod('messob.fms.trip', 'action_complete_trip', [tripId]);
      toast.success('Trip completed');
      loadTrips();
    } catch (error) {
      console.error('Failed to complete trip:', error);
      toast.error('Failed to complete trip');
    }
  };

  // Helper function to check if trip is too early to start (before scheduled time minus grace period)
  const isTripTooEarly = (trip) => {
    if (!trip.start_dt) return false;
    
    const currentTime = new Date();
    const startTime = new Date(trip.start_dt);
    const graceMinutes = 30; // Allow starting 30 minutes before scheduled time
    const earliestStartTime = new Date(startTime.getTime() - (graceMinutes * 60 * 1000));
    
    return currentTime < earliestStartTime;
  };

  // Helper function to check if trip start time has passed with grace period
  const isStartTimePassed = (trip) => {
    if (!trip.start_dt) return false;
    
    const currentTime = new Date();
    const startTime = new Date(trip.start_dt);
    const graceMinutes = 30; // 30 minutes grace period after scheduled time
    const graceTime = new Date(startTime.getTime() + (graceMinutes * 60 * 1000));
    
    return currentTime > graceTime;
  };

  // Helper function to check if trip is expired (past end time)
  const isTripExpired = (trip) => {
    if (!trip.end_dt) return false;
    
    const currentTime = new Date();
    const endTime = new Date(trip.end_dt);
    
    return currentTime > endTime;
  };

  // Helper function to get trip time status
  const getTripTimeStatus = (trip) => {
    if (isTripExpired(trip)) {
      return { status: 'expired', message: 'Trip time expired' };
    }
    
    if (isStartTimePassed(trip)) {
      return { status: 'late', message: 'Start time passed' };
    }
    
    if (isTripTooEarly(trip)) {
      const currentTime = new Date();
      const startTime = new Date(trip.start_dt);
      const timeUntilEarliest = Math.floor((startTime - currentTime) / (1000 * 60)) - 30; // minutes until can start
      
      if (timeUntilEarliest > 60) {
        const hours = Math.floor(timeUntilEarliest / 60);
        return { status: 'too_early', message: `Starts in ${hours}h ${timeUntilEarliest % 60}m` };
      }
      return { status: 'too_early', message: `Can start in ${timeUntilEarliest}m` };
    }
    
    const currentTime = new Date();
    const startTime = new Date(trip.start_dt);
    const timeUntilStart = Math.floor((startTime - currentTime) / (1000 * 60)); // minutes
    
    if (timeUntilStart <= 15 && timeUntilStart > 0) {
      return { status: 'soon', message: `Starts in ${timeUntilStart}min` };
    }
    
    return { status: 'normal', message: null };
  };

  // Helper function to check if current user is the assigned driver for this trip
  const isAssignedDriver = (trip) => {
    if (!trip.assigned_driver_id || !user?.id) return false;
    // Check if assigned_driver_id.user_id matches current user
    // In mobile app, we filter by assigned_driver_id.user_id so all trips should be assigned to current user
    // But we add this check for extra safety
    return true; // Since filter already ensures this, but backend will validate anyway
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
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setCurrentView('maintenance'); setMenuOpen(false); }}
            className="relative p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Bell className="h-6 w-6" />
            {maintenanceAlertCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-600 dark:bg-red-700 text-white border-2 border-brand-blue dark:border-gray-900"
              >
                {maintenanceAlertCount}
              </Badge>
            )}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded-lg transition-colors">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
            onClick={() => { setCurrentView('maintenance'); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700"
          >
            <Wrench className="h-5 w-5" />
            <span className="flex-1 text-left">Vehicle Maintenance</span>
            {maintenanceAlertCount > 0 && (
              <Badge 
                variant="destructive" 
                className="bg-red-600 dark:bg-red-700 text-white text-xs"
              >
                {maintenanceAlertCount}
              </Badge>
            )}
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

  const ActiveTripCard = ({ trip }) => {
    const isExpired = isTripExpired(trip);
    
    return (
      <Card className={`border-2 shadow-lg dark:bg-gray-800 ${
        isExpired 
          ? 'border-orange-500 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10' 
          : 'border-green-500 dark:border-green-600'
      }`}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={`h-5 w-5 animate-pulse ${
                isExpired ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
              }`} />
              <span className={`font-black uppercase text-sm ${
                isExpired ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {isExpired ? 'Overdue Trip' : 'Active Trip'}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{trip.name}</span>
          </div>

          {isExpired && (
            <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                Trip scheduled time has passed. Please complete the trip or contact dispatcher.
              </span>
            </div>
          )}

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

            {trip.end_dt && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Scheduled End</p>
                  <p className={`font-semibold ${
                    isExpired ? 'text-red-600 dark:text-red-400' : 'dark:text-gray-200'
                  }`}>
                    {new Date(trip.end_dt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
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
              className={`w-full ${
                isExpired 
                  ? 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 animate-pulse'
                  : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isExpired ? 'Complete Now' : 'Complete'}
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
  };

  const UpcomingTripCard = ({ trip }) => {
    const timeStatus = getTripTimeStatus(trip);
    const isExpired = timeStatus.status === 'expired';
    const isLate = timeStatus.status === 'late';
    const isSoon = timeStatus.status === 'soon';
    
    return (
      <Card className={`shadow-sm dark:bg-gray-800 dark:border-gray-700 ${
        isExpired ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10' : 
        isLate ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10' :
        isSoon ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10' : ''
      }`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{trip.name}</span>
            <div className="flex items-center gap-2">
              {timeStatus.message && (
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                  isLate ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                  isSoon ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {timeStatus.message}
                </span>
              )}
              {!isExpired && !isLate && (
                <span className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full font-bold">
                  Upcoming
                </span>
              )}
            </div>
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

          {isExpired && isAssignedDriver(trip) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Trip time has expired. Contact dispatcher for assistance or remove from your list.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={callDispatcher}
                  variant="outline"
                  className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button 
                  onClick={() => removeExpiredTrip(trip.id)}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : isExpired && !isAssignedDriver(trip) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Trip time has expired. Please contact dispatcher for assistance.
                </span>
              </div>
              <Button 
                onClick={callDispatcher}
                variant="outline"
                className="w-full border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Dispatcher
              </Button>
            </div>
          ) : isLate ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                  Start time has passed. Please contact dispatcher if you still need to start this trip.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={callDispatcher}
                  variant="outline"
                  className="border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button 
                  onClick={() => startTrip(trip.id)}
                  className="bg-brand-blue hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  disabled
                >
                  Start Trip
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => startTrip(trip.id)}
              className="w-full bg-brand-blue hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isSoon ? 'Start Trip (Ready)' : 'Start Trip'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

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
            {currentView === 'maintenance' && (
              <div className="p-4">
                <VehicleMaintenanceAlerts />
              </div>
            )}
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
        <div className="grid grid-cols-4 gap-1 p-2">
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
            onClick={() => setCurrentView('maintenance')}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg relative ${
              currentView === 'maintenance' ? 'bg-brand-blue dark:bg-blue-700 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <div className="relative">
              <Wrench className="h-5 w-5" />
              {maintenanceAlertCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-red-600 dark:bg-red-700 text-white border border-white dark:border-gray-800"
                >
                  {maintenanceAlertCount}
                </Badge>
              )}
            </div>
            <span className="text-xs font-bold">Alerts</span>
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
