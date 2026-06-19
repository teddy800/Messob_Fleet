import { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, CheckCircle, Calendar, Gauge, 
  Wrench, X, RefreshCw, Clock, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchRead } from '@/lib/odooApi';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';

export default function VehicleMaintenanceAlerts() {
  const user = useUserStore((s) => s.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [partnerId, setPartnerId] = useState(null);

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
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Step 1: Get driver's active and approved trips with assigned vehicles
      const driverTrips = await searchRead(
        'messob.fms.trip',
        [
          ['assigned_driver_id', '=', partnerId],
          ['state', 'in', ['approved', 'in_progress']],
          ['assigned_vehicle_id', '!=', false]
        ],
        ['assigned_vehicle_id'],
        100
      );

      if (!driverTrips || driverTrips.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Step 2: Extract unique vehicle IDs
      const vehicleIds = [...new Set(
        driverTrips
          .map(trip => Array.isArray(trip.assigned_vehicle_id) ? trip.assigned_vehicle_id[0] : trip.assigned_vehicle_id)
          .filter(id => id)
      )];

      if (vehicleIds.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      // Step 3: Fetch maintenance alerts for these vehicles
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
        className={`cursor-pointer transition-all hover:shadow-md dark:bg-gray-800 dark:border-gray-700 ${
          alert.is_overdue ? 'border-l-4 border-l-red-600 dark:border-l-red-500' : ''
        }`}
        onClick={() => openAlertDetails(alert)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              alert.is_overdue 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue dark:text-blue-400'
            }`}>
              <ServiceIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">
                    {getServiceTypeLabel(alert.service_type)}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {vehicleName}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getPriorityBadgeStyles(alert.priority)} text-xs font-bold whitespace-nowrap`}
                >
                  {alert.priority.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Due: {formatDate(alert.scheduled_date)}
                  </span>
                  {alert.is_overdue && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 dark:bg-red-800 dark:text-red-100">
                      OVERDUE
                    </Badge>
                  )}
                </div>

                {alert.days_until_due !== undefined && !alert.is_overdue && (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className={`font-semibold ${
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
                  <div className="flex items-center gap-2 text-xs">
                    <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {Math.abs(alert.days_until_due)} day{Math.abs(alert.days_until_due) !== 1 ? 's' : ''} overdue
                    </span>
                  </div>
                )}

                {alert.scheduled_odometer && (
                  <div className="flex items-center gap-2 text-xs">
                    <Gauge className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Due at {alert.scheduled_odometer.toLocaleString()} km
                    </span>
                  </div>
                )}
              </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                  Maintenance Alert
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

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Badge 
                variant="outline" 
                className={`${getPriorityBadgeStyles(alert.priority)} text-sm font-bold`}
              >
                {alert.priority.toUpperCase()} PRIORITY
              </Badge>
              {alert.is_overdue && (
                <Badge variant="destructive" className="text-sm font-bold dark:bg-red-800 dark:text-red-100">
                  OVERDUE
                </Badge>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
                {getServiceTypeLabel(alert.service_type)}
              </h3>
              {alert.alert_message && (
                <p className={`text-sm ${
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
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Description
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {alert.description}
                </p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Scheduled Date
                  </span>
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-bold">
                  {formatDate(alert.scheduled_date)}
                </span>
              </div>

              {alert.days_until_due !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Time Until Due
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${
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
                    <Gauge className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Scheduled Odometer
                    </span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-bold">
                    {alert.scheduled_odometer.toLocaleString()} km
                  </span>
                </div>
              )}

              {alert.current_odometer && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Current Odometer
                    </span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100 font-bold">
                    {alert.current_odometer.toLocaleString()} km
                  </span>
                </div>
              )}
            </div>

            <div className={`${
              alert.is_overdue 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            } rounded-lg p-4`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  alert.is_overdue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold mb-1 ${
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
              className="w-full bg-brand-blue hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
      <CardContent className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-black text-green-900 dark:text-green-100 mb-2">
          All Clear!
        </h3>
        <p className="text-green-700 dark:text-green-300 max-w-md mx-auto">
          No maintenance alerts for your assigned vehicles at this time.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-blue/10 dark:bg-blue-900/30 rounded-lg">
                <Bell className="h-5 w-5 text-brand-blue dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-black dark:text-gray-100">
                  Vehicle Maintenance
                </CardTitle>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Alerts for your assigned vehicles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {alerts.length > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 font-bold"
                >
                  {alerts.length}
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={loadMaintenanceAlerts}
                disabled={loading}
                className="h-8 w-8 p-0 dark:hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-brand-blue dark:border-blue-400 border-t-transparent rounded-full" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Loading maintenance alerts...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {showModal && selectedAlert && (
        <AlertModal alert={selectedAlert} />
      )}
    </div>
  );
}
