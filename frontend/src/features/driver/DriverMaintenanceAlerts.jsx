import { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, CheckCircle, Calendar, Gauge, 
  Wrench, X, RefreshCw, Clock, AlertCircle, FileWarning 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchRead } from '@/lib/odooApi';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import IncidentReport from './IncidentReport';

export default function DriverMaintenanceAlerts() {
  const user = useUserStore((s) => s.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    fetchPartnerId();
  }, [user?.uid]);

  useEffect(() => {
    if (partnerId) {
      loadMaintenanceAlerts();
    }
  }, [partnerId]);

  const fetchPartnerId = async () => {
    if (!user?.uid) {
      return;
    }

    try {
      const [userRecord] = await searchRead(
        'res.users',
        [['id', '=', user.uid]],
        ['partner_id'],
        1
      );

      const partner = userRecord?.partner_id;
      if (Array.isArray(partner)) {
        setPartnerId(partner[0]);
      }
    } catch (e) {
      console.error('Driver partner lookup failed:', e);
    }
  };

  const loadMaintenanceAlerts = async () => {
    setLoading(true);
    try {
      if (!partnerId) {
        console.log('❌ No partnerId found');
        setAlerts([]);
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching trips for partnerId:', partnerId);

      // Step 1: Get driver's active and approved trips (for incident reporting)
      // Fetch ALL trips using partnerId, even without vehicles, so driver can always report incidents
      const allDriverTrips = await searchRead(
        'messob.fms.trip',
        [
          ['assigned_driver_id', '=', partnerId],
          ['state', 'in', ['approved', 'in_progress']]
        ],
        ['assigned_vehicle_id', 'name', 'state', 'pickup', 'destination'],
        100
      );

      console.log('📋 Found trips:', allDriverTrips?.length || 0, allDriverTrips);

      // Store active trip for incident reporting (even if no vehicle assigned)
      if (allDriverTrips && allDriverTrips.length > 0) {
        const active = allDriverTrips.find(t => t.state === 'in_progress');
        const selectedTrip = active || allDriverTrips[0];
        setActiveTrip(selectedTrip);
        console.log('✅ Active trip set:', selectedTrip);
      } else {
        setActiveTrip(null);
        console.log('❌ No trips found - Report Incident button will be hidden');
      }

      // Step 2: Get trips WITH assigned vehicles for maintenance alerts
      const tripsWithVehicles = (allDriverTrips || []).filter(
        trip => trip.assigned_vehicle_id && trip.assigned_vehicle_id !== false
      );

      if (tripsWithVehicles.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Step 3: Extract unique vehicle IDs
      const vehicleIds = [...new Set(
        tripsWithVehicles
          .map(trip => Array.isArray(trip.assigned_vehicle_id) ? trip.assigned_vehicle_id[0] : trip.assigned_vehicle_id)
          .filter(id => id)
      )];

      if (vehicleIds.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Step 4: Fetch maintenance alerts for these vehicles
      const maintenanceAlerts = await searchRead(
        'messob.fms.maintenance.alert',
        [
          ['vehicle_id', 'in', vehicleIds],
          ['status', 'in', ['pending', 'sent', 'acknowledged']],
          ['dashboard_notification', '=', true]
        ],
        [
          'alert_title',
          'vehicle_id',
          'service_type',
          'scheduled_date',
          'scheduled_odometer',
          'current_odometer',
          'priority',
          'status',
          'days_until_due',
          'odometer_difference',
          'is_overdue',
          'alert_message',
          'description'
        ],
        100,
        'priority desc, scheduled_date asc'
      );

      setAlerts(maintenanceAlerts || []);
    } catch (error) {
      console.error('Failed to load maintenance alerts:', error);
      toast.error('Failed to load maintenance alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeStyles = (priority) => {
    const styles = {
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    };
    return styles[priority] || styles.medium;
  };

  const getServiceTypeLabel = (serviceType) => {
    const labels = {
      full_change: 'Oil & Filter Change',
      brake: 'Brake Service',
      tire: 'Tire Replacement',
      engine: 'Engine Repair',
      transmission: 'Transmission Service',
      electrical: 'Electrical Repair',
      body: 'Body & Paint',
      inspection: 'General Inspection',
      other: 'Other Service'
    };
    return labels[serviceType] || serviceType;
  };

  const getServiceIcon = (serviceType) => {
    const icons = {
      full_change: Wrench,
      brake: AlertTriangle,
      tire: Gauge,
      engine: Wrench,
      transmission: Wrench,
      electrical: AlertCircle,
      body: Wrench,
      inspection: CheckCircle,
      other: Wrench
    };
    return icons[serviceType] || Wrench;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const openAlertDetails = (alert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAlert(null);
  };

  const AlertCard = ({ alert }) => {
    const ServiceIcon = getServiceIcon(alert.service_type);
    const vehicleName = Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle';

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-lg dark:bg-gray-800 dark:border-gray-700 ${
          alert.is_overdue ? 'border-l-4 border-l-red-600 dark:border-l-red-500' : ''
        }`}
        onClick={() => openAlertDetails(alert)}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              alert.is_overdue 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue dark:text-blue-400'
            }`}>
              <ServiceIcon className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-black text-brand-blue dark:text-blue-400 text-lg mb-1">
                    {getServiceTypeLabel(alert.service_type)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                    {vehicleName}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getPriorityBadgeStyles(alert.priority)} text-xs font-black whitespace-nowrap`}
                >
                  {alert.priority.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">
                    Due: {formatDate(alert.scheduled_date)}
                  </span>
                  {alert.is_overdue && (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 dark:bg-red-800 dark:text-red-100 font-black">
                      OVERDUE
                    </Badge>
                  )}
                </div>

                {alert.days_until_due !== undefined && !alert.is_overdue && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className={`font-bold ${
                      alert.days_until_due <= 3 
                        ? 'text-red-600 dark:text-red-400' 
                        : alert.days_until_due <= 7 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {alert.days_until_due} day{alert.days_until_due !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                )}

                {alert.is_overdue && alert.days_until_due < 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {Math.abs(alert.days_until_due)} day{Math.abs(alert.days_until_due) !== 1 ? 's' : ''} overdue
                    </span>
                  </div>
                )}

                {alert.scheduled_odometer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">
                      Due at {alert.scheduled_odometer.toLocaleString()} km
                    </span>
                  </div>
                )}
              </div>

              {alert.alert_message && (
                <div className={`mt-3 p-3 rounded-lg ${
                  alert.is_overdue 
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }`}>
                  <p className={`text-sm ${
                    alert.is_overdue 
                      ? 'text-red-700 dark:text-red-300' 
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {alert.alert_message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const AlertModal = ({ alert }) => {
    if (!alert) return null;

    const ServiceIcon = getServiceIcon(alert.service_type);
    const vehicleName = Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle';

    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                alert.is_overdue 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-brand-blue/10 dark:bg-blue-900/30 text-brand-blue dark:text-blue-400'
              }`}>
                <ServiceIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
                  Maintenance Alert Details
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {vehicleName}
                </p>
              </div>
            </div>
            <button 
              onClick={closeModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className={`${getPriorityBadgeStyles(alert.priority)} text-sm font-black`}
              >
                {alert.priority.toUpperCase()} PRIORITY
              </Badge>
              {alert.is_overdue && (
                <Badge variant="destructive" className="text-sm font-black dark:bg-red-800 dark:text-red-100">
                  OVERDUE
                </Badge>
              )}
            </div>

            <div>
              <h3 className="font-black text-gray-900 dark:text-gray-100 text-xl mb-2">
                {getServiceTypeLabel(alert.service_type)}
              </h3>
              {alert.alert_message && (
                <p className={`text-base ${
                  alert.is_overdue 
                    ? 'text-red-700 dark:text-red-300 font-semibold' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {alert.alert_message}
                </p>
              )}
            </div>

            {alert.description && (
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wider">
                  Description
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {alert.description}
                </p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 space-y-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Scheduled Date
                  </span>
                </div>
                <span className="text-base text-gray-900 dark:text-gray-100 font-black">
                  {formatDate(alert.scheduled_date)}
                </span>
              </div>

              {alert.days_until_due !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Time Until Due
                    </span>
                  </div>
                  <span className={`text-base font-black ${
                    alert.is_overdue 
                      ? 'text-red-600 dark:text-red-400' 
                      : alert.days_until_due <= 3 
                      ? 'text-red-600 dark:text-red-400' 
                      : alert.days_until_due <= 7 
                      ? 'text-orange-600 dark:text-orange-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {alert.is_overdue && alert.days_until_due < 0
                      ? `${Math.abs(alert.days_until_due)} days overdue`
                      : `${alert.days_until_due} days`
                    }
                  </span>
                </div>
              )}

              {alert.scheduled_odometer && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Scheduled Odometer
                    </span>
                  </div>
                  <span className="text-base text-gray-900 dark:text-gray-100 font-black">
                    {alert.scheduled_odometer.toLocaleString()} km
                  </span>
                </div>
              )}

              {alert.current_odometer && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Current Odometer
                    </span>
                  </div>
                  <span className="text-base text-gray-900 dark:text-gray-100 font-black">
                    {alert.current_odometer.toLocaleString()} km
                  </span>
                </div>
              )}
            </div>

            <div className={`${
              alert.is_overdue 
                ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800' 
                : 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800'
            } rounded-xl p-5`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`h-6 w-6 flex-shrink-0 mt-0.5 ${
                  alert.is_overdue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
                <div className="flex-1">
                  <p className={`text-base font-black mb-2 ${
                    alert.is_overdue 
                      ? 'text-red-900 dark:text-red-200' 
                      : 'text-blue-900 dark:text-blue-200'
                  }`}>
                    Driver Notice
                  </p>
                  <p className={`text-sm ${
                    alert.is_overdue 
                      ? 'text-red-700 dark:text-red-300' 
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {alert.is_overdue 
                      ? 'This vehicle requires immediate maintenance. Please notify the dispatcher before your trip.'
                      : 'Please be aware of this upcoming maintenance when planning trips with this vehicle.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
            <Button 
              onClick={closeModal}
              className="w-full bg-brand-blue hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 h-12 text-base font-black"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
      <CardContent className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-black text-green-900 dark:text-green-100 mb-3">
          All Clear!
        </h3>
        <p className="text-base text-green-700 dark:text-green-300 max-w-md mx-auto">
          No maintenance alerts for your assigned vehicles at this time.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-brand-blue dark:text-blue-400">Vehicle Maintenance Alerts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Maintenance alerts for your assigned vehicles. Welcome, {user?.name}.
        </p>
      </div>

      {/* Alert Count & Refresh Card */}
      <Card className="dark:bg-gray-800 dark:border-gray-700 border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-blue/10 dark:bg-blue-900/30 rounded-xl">
                <Bell className="h-6 w-6 text-brand-blue dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-black dark:text-gray-100">
                  Active Alerts
                </CardTitle>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Vehicles assigned to your trips
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {alerts.length > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 font-black text-base h-10 px-4"
                >
                  {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'}
                </Badge>
              )}
              {activeTrip && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowIncidentReport(true)}
                  className="h-10 px-4 font-bold border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <FileWarning className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={loadMaintenanceAlerts}
                disabled={loading}
                className="h-10 px-4 font-bold dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts List or Empty State */}
      {loading ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-spin h-12 w-12 border-4 border-brand-blue dark:border-blue-400 border-t-transparent rounded-full" />
              <p className="text-gray-600 dark:text-gray-400 text-base font-semibold">
                Loading maintenance alerts...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && selectedAlert && (
        <AlertModal alert={selectedAlert} />
      )}

      {/* Incident Report Modal */}
      {showIncidentReport && activeTrip && (
        <IncidentReport
          tripId={activeTrip.id}
          onClose={() => setShowIncidentReport(false)}
        />
      )}
    </div>
  );
}
