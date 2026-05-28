import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, MapPin, Clock, AlertTriangle, CheckCircle, 
  Navigation, Users, Car, Phone, RefreshCw, BarChart3,
  Calendar, FileText, Settings, TrendingUp, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { callOdooMethod, searchRead } from '@/lib/odooApi';
import { toast } from 'sonner';
import { useUserStore } from '@/store/useUserStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const [activeTrips, setActiveTrips] = useState([]);
  const [vehiclePositions, setVehiclePositions] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    activeTrips: 0,
    approved: 0,
    vehiclesOnline: 0,
    pendingApprovals: 0,
    completedToday: 0,
    totalVehicles: 0,
    totalUsers: 0,
    totalDrivers: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
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

      // Load pending approvals count
      const pendingTrips = await searchRead(
        'messob.fms.trip',
        [['state', '=', 'pending']],
        ['id'],
        100
      );

      // Load completed today count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedTrips = await searchRead(
        'messob.fms.trip',
        [
          ['state', '=', 'completed'],
          ['write_date', '>=', today.toISOString()]
        ],
        ['id'],
        100
      );

      // Load total vehicles
      const vehicles = await searchRead(
        'fleet.vehicle',
        [],
        ['id'],
        1000
      );

      // Load total users
      const users = await searchRead(
        'res.users',
        [],
        ['id'],
        1000
      );

      // Load total drivers
      const drivers = await searchRead(
        'messob.fms.driver',
        [],
        ['id'],
        1000
      );

      // Load vehicle positions
      const vehicleIds = trips
        .filter(t => t.assigned_vehicle_id)
        .map(t => Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[0] : t.assigned_vehicle_id);
      
      if (vehicleIds.length > 0) {
        try {
          const positions = await searchRead(
            'messob.fms.gps.position',
            [['vehicle_id', 'in', vehicleIds]],
            ['vehicle_id', 'latitude', 'longitude', 'speed', 'heading', 'timestamp'],
            vehicleIds.length
          );
          
          const positionMap = {};
          positions.forEach(pos => {
            const vId = Array.isArray(pos.vehicle_id) ? pos.vehicle_id[0] : pos.vehicle_id;
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
        
        const formattedAlerts = alertData.map(alert => ({
          title: `${alert.alert_type || 'Maintenance'} Alert`,
          message: alert.alert_message || 'Maintenance required',
          created_at: alert.alert_date,
          priority: alert.priority,
          vehicle: Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle'
        }));
        
        setAlerts(formattedAlerts);
      } catch (alertError) {
        console.warn('Could not load alerts:', alertError);
        setAlerts([]);
      }

      // Update stats
      setStats({
        activeTrips: trips.filter(t => t.state === 'in_progress').length,
        approved: trips.filter(t => t.state === 'approved').length,
        vehiclesOnline: Object.keys(vehiclePositions).length,
        pendingApprovals: pendingTrips.length,
        completedToday: completedTrips.length,
        totalVehicles: vehicles.length,
        totalUsers: users.length,
        totalDrivers: drivers.length
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (state) => {
    const colors = {
      approved: 'bg-emerald-100/40 text-emerald-600/80',
      in_progress: 'bg-blue-100 text-blue-700',
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
      return { status: 'Live', color: 'text-emerald-600/80', icon: Activity };
    } else if (minutesAgo < 30) {
      return { status: `${minutesAgo}m ago`, color: 'text-amber-600/80', icon: Clock };
    } else {
      return { status: 'Offline', color: 'text-rose-600/80', icon: AlertTriangle };
    }
  };

  const callDriver = (driverId, driverName) => {
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
      <Card className="hover:shadow-md transition-shadow border-l-4 border-brand-blue">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(trip.state)}>
                {trip.state.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm font-bold text-brand-blue">{trip.name}</span>
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
              <MapPin className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{trip.pickup}</p>
                <p className="text-gray-600">→ {trip.destination}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="text-gray-700">{requesterName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-emerald-600/80 flex-shrink-0" />
              <span className="text-gray-700">{vehicleName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <span className="text-gray-700">{driverName}</span>
            </div>

            {position && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="text-gray-700">
                  {position.speed || 0} km/h • {new Date(position.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white"
              onClick={() => navigate(`/dashboard/tracking/${trip.id}`)}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Track
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-white"
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
    <Card className="border-l-4 border-orange-500 bg-orange-50/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">{alert.title}</p>
            <p className="text-xs text-orange-700 mt-1">{alert.message}</p>
            <p className="text-xs text-gray-600 mt-1">
              {alert.vehicle} • {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ icon: Icon, title, description, onClick, color = "brand-blue" }) => (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 border-2 hover:border-brand-blue/30" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-brand-blue">Operations Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name} • Real-time fleet monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            onClick={loadDashboardData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Beautiful Summary Cards - New Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <Card className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Total Users</p>
                <p className="text-5xl font-black text-blue-700">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-500 p-4 rounded-2xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Vehicles Card */}
        <Card className="bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 border-2 border-emerald-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Total Vehicles</p>
                <p className="text-5xl font-black text-emerald-700">{stats.totalVehicles}</p>
              </div>
              <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg">
                <Car className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Drivers Card */}
        <Card className="bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 border-2 border-purple-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Total Drivers</p>
                <p className="text-5xl font-black text-purple-700">{stats.totalDrivers}</p>
              </div>
              <div className="bg-purple-500 p-4 rounded-2xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests Card */}
        <Card className="bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100 border-2 border-amber-200 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">Pending Requests</p>
                <p className="text-5xl font-black text-amber-700">{stats.pendingApprovals}</p>
              </div>
              <div className="bg-amber-500 p-4 rounded-2xl shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-300 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-500 dark:bg-blue-600 p-3 rounded-xl shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-200 uppercase font-bold tracking-wide">Active Trips</p>
              <p className="text-3xl font-black text-blue-950 dark:text-blue-50">{stats.activeTrips}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 dark:from-emerald-950 dark:to-emerald-900 border-2 border-emerald-200/50 dark:border-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-400/70 dark:bg-emerald-500/70 p-3 rounded-xl shadow-md">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200 uppercase font-bold tracking-wide">Approved</p>
              <p className="text-3xl font-black text-emerald-900/80 dark:text-emerald-50">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-2 border-purple-300 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-purple-500 dark:bg-purple-600 p-3 rounded-xl shadow-md">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-800 dark:text-purple-200 uppercase font-bold tracking-wide">Vehicles Online</p>
              <p className="text-3xl font-black text-purple-950 dark:text-purple-50">{stats.vehiclesOnline}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-2 border-orange-300 dark:border-orange-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-orange-500 dark:bg-orange-600 p-3 rounded-xl shadow-md">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-800 dark:text-orange-200 uppercase font-bold tracking-wide">Alerts</p>
              <p className="text-3xl font-black text-orange-950 dark:text-orange-50">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white border-2 border-gray-200 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="realtime" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <Activity className="h-4 w-4 mr-2" />
            Real-Time
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-brand-blue data-[state=active]:text-white">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-brand-blue flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Today's Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-black text-blue-600">{stats.pendingApprovals}</p>
                    <p className="text-xs text-gray-600 mt-1">Pending Approvals</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50/40 rounded-xl">
                    <p className="text-2xl font-black text-emerald-600/80">{stats.completedToday}</p>
                    <p className="text-xs text-gray-600 mt-1">Completed Today</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-black text-purple-600">{stats.totalVehicles}</p>
                    <p className="text-xs text-gray-600 mt-1">Total Vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-brand-blue flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full bg-brand-blue hover:bg-blue-900 text-white font-bold"
                  onClick={() => navigate('/dashboard/dispatch/approvals')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Approve Requests
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white font-bold"
                  onClick={() => navigate('/dashboard/dispatch/fleet-calendar')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Fleet Calendar
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-white font-bold"
                  onClick={() => navigate('/dashboard/admin/reports')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              icon={FileText}
              title="Approval Queue"
              description={`${stats.pendingApprovals} requests pending`}
              onClick={() => navigate('/dashboard/dispatch/approvals')}
              color="brand-blue"
            />
            <QuickActionCard
              icon={Calendar}
              title="Fleet Calendar"
              description="View vehicle schedules"
              onClick={() => navigate('/dashboard/dispatch/fleet-calendar')}
              color="brand-blue"
            />
            <QuickActionCard
              icon={Car}
              title="Vehicle Management"
              description={`${stats.totalVehicles} vehicles in fleet`}
              onClick={() => navigate('/dashboard/admin/vehicles')}
              color="brand-blue"
            />
            <QuickActionCard
              icon={Users}
              title="Driver Management"
              description="Manage driver assignments"
              onClick={() => navigate('/dashboard/admin/drivers')}
              color="brand-blue"
            />
            <QuickActionCard
              icon={BarChart3}
              title="Analytics & Reports"
              description="View performance metrics"
              onClick={() => navigate('/dashboard/admin/reports')}
              color="brand-blue"
            />
            <QuickActionCard
              icon={AlertTriangle}
              title="Maintenance Alerts"
              description={`${alerts.length} active alerts`}
              onClick={() => navigate('/dashboard/maintenance/alerts')}
              color="brand-blue"
            />
          </div>
        </TabsContent>

        {/* Real-Time Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Trips */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-brand-blue">
                  Active Trips ({activeTrips.length})
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/dashboard/dispatch/real-time')}
                  className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  View Full Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
              
              {activeTrips.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-semibold">No active trips</p>
                    <p className="text-sm text-gray-500 mt-1">All trips are completed or pending</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeTrips.slice(0, 5).map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                  {activeTrips.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white"
                      onClick={() => navigate('/dashboard/dispatch/real-time')}
                    >
                      View All {activeTrips.length} Trips
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Alerts Sidebar */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-brand-blue">
                Recent Alerts
              </h2>
              
              {alerts.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400/70 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No active alerts</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert, idx) => (
                    <AlertCard key={idx} alert={alert} />
                  ))}
                  {alerts.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => navigate('/dashboard/maintenance/alerts')}
                    >
                      View All Alerts
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-16 w-16 text-emerald-400/70 mx-auto mb-4" />
                  <p className="text-xl font-bold text-gray-600">No Active Alerts</p>
                  <p className="text-sm text-gray-500 mt-2">All systems are operating normally</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))
            )}
          </div>
          {alerts.length > 0 && (
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/dashboard/maintenance/alerts')}
                className="bg-brand-blue hover:bg-blue-900 text-white font-bold"
              >
                Manage All Alerts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
