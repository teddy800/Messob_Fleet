import { useState, useEffect } from 'react';
import { 
  Activity, MapPin, Clock, AlertTriangle, CheckCircle, 
  Navigation, Users, Car, Fuel, Phone, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callOdooMethod, searchRead } from '@/lib/odooApi';
import { toast } from 'sonner';

export default function RealTimeDashboard() {
  const [activeTrips, setActiveTrips] = useState([]);
  const [vehiclePositions, setVehiclePositions] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    // Set up WebSocket connection for real-time GPS updates
    setupWebSocketConnection();
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load active trips
      const trips = await searchRead(
        'messob.fms.trip',
        [['state', 'in', ['approved', 'in_progress']]],
        [
          'name', 'state', 'pickup', 'destination', 'start_dt', 'end_dt',
          'requester_id', 'assigned_vehicle_id', 'assigned_driver_id', 'purpose'
        ],
        50
      );
      setActiveTrips(trips);

      // Load vehicle positions - get latest GPS positions for assigned vehicles
      const vehicleIds = trips
        .filter(t => t.assigned_vehicle_id)
        .map(t => Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[0] : t.assigned_vehicle_id);
      
      if (vehicleIds.length > 0) {
        try {
          // Get latest GPS positions for each vehicle
          const positions = await searchRead(
            'messob.fms.gps.position',
            [['vehicle_id', 'in', vehicleIds]],
            ['vehicle_id', 'latitude', 'longitude', 'speed', 'heading', 'timestamp'],
            vehicleIds.length
          );
          
          // Create a map of vehicle_id to latest position
          const positionMap = {};
          positions.forEach(pos => {
            const vId = Array.isArray(pos.vehicle_id) ? pos.vehicle_id[0] : pos.vehicle_id;
            // Keep only the latest position for each vehicle
            if (!positionMap[vId] || new Date(pos.timestamp) > new Date(positionMap[vId].timestamp)) {
              positionMap[vId] = pos;
            }
          });
          setVehiclePositions(positionMap);
        } catch (posError) {
          console.warn('Could not load GPS positions:', posError);
          setVehiclePositions({});
        }
      }

      // Load maintenance alerts
      try {
        const alertData = await searchRead(
          'messob.fms.maintenance.alert',
          [['status', 'in', ['pending', 'sent']]],
          ['vehicle_id', 'alert_type', 'priority', 'alert_message', 'alert_date'],
          10
        );
        
        // Format alerts for display
        const formattedAlerts = alertData.map(alert => ({
          title: `${alert.alert_type || 'Maintenance'} Alert`,
          message: alert.alert_message || 'Maintenance required',
          created_at: alert.alert_date,
          priority: alert.priority
        }));
        
        setAlerts(formattedAlerts);
      } catch (alertError) {
        console.warn('Could not load alerts:', alertError);
        setAlerts([]);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketConnection = () => {
    // This would connect to the WebSocket server for real-time updates
    // Implementation depends on your WebSocket setup
    console.log('Setting up WebSocket connection for real-time updates');
  };

  const getStatusColor = (state) => {
    const colors = {
      approved: 'bg-emerald-100/40 text-emerald-600/80',
      in_progress: 'bg-emerald-100/40 text-emerald-600/80',
      departed: 'bg-purple-100 text-purple-700',
      en_route: 'bg-orange-100 text-orange-700',
      arrived: 'bg-indigo-100 text-indigo-700'
    };
    return colors[state] || 'bg-gray-100 text-gray-700';
  };

  const getVehicleStatus = (vehicleId) => {
    const position = vehiclePositions[vehicleId];
    if (!position) return { status: 'No GPS', color: 'text-gray-500', icon: AlertTriangle };
    
    const lastUpdate = new Date(position.timestamp);
    const minutesAgo = Math.floor((new Date() - lastUpdate) / (1000 * 60));
    
    if (minutesAgo < 5) {
      return { status: 'Live', color: 'text-green-600', icon: Activity };
    } else if (minutesAgo < 30) {
      return { status: `${minutesAgo}m ago`, color: 'text-yellow-600', icon: Clock };
    } else {
      return { status: 'Offline', color: 'text-red-600', icon: AlertTriangle };
    }
  };

  const callDriver = (driverId, driverName) => {
    // This would integrate with a calling system
    toast.info(`Calling ${driverName}...`);
  };

  const TripCard = ({ trip }) => {
    const vehicleId = Array.isArray(trip.assigned_vehicle_id) ? trip.assigned_vehicle_id[0] : trip.assigned_vehicle_id;
    const vehicleName = Array.isArray(trip.assigned_vehicle_id) ? trip.assigned_vehicle_id[1] : 'Unknown Vehicle';
    const driverName = Array.isArray(trip.assigned_driver_id) ? trip.assigned_driver_id[1] : 'Unknown Driver';
    const requesterName = Array.isArray(trip.requester_id) ? trip.requester_id[1] : 'Unknown';
    
    const vehicleStatus = getVehicleStatus(vehicleId);
    const position = vehiclePositions[vehicleId];

    return (
      <Card className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(trip.state)}>
                {trip.state.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{trip.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <vehicleStatus.icon className={`h-4 w-4 ${vehicleStatus.color}`} />
              <span className={`text-xs font-semibold ${vehicleStatus.color}`}>
                {vehicleStatus.status}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{trip.pickup}</p>
                <p className="text-gray-600 dark:text-gray-400">→ {trip.destination}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{requesterName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{vehicleName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{driverName}</span>
            </div>

            {position && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {position.speed || 0} km/h • {new Date(position.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              onClick={() => window.open(`/dashboard/tracking/${trip.id}`, '_blank')}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Track
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              onClick={() => callDriver(trip.assigned_driver_id, driverName)}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AlertCard = ({ alert }) => (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{alert.title}</p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">{alert.message}</p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
              {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-blue dark:border-blue-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading real-time dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue dark:text-blue-400">Real-Time Operations Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            onClick={loadDashboardData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Active Trips</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {activeTrips.filter(t => t.state === 'in_progress').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Approved</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400">
                {activeTrips.filter(t => t.state === 'approved').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Car className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Vehicles Online</p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {Object.keys(vehiclePositions).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Alerts</p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Trips */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-black text-brand-blue dark:text-blue-400">
            Active Trips ({activeTrips.length})
          </h2>
          
          {activeTrips.length === 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300 font-semibold">No active trips</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All trips are completed or pending</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>

        {/* Alerts Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-brand-blue dark:text-blue-400">
            System Alerts ({alerts.length})
          </h2>
          
          {alerts.length === 0 ? (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 dark:text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">No active alerts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}