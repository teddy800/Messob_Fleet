import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Car, 
  CheckCircle, 
  X, 
  Bell, 
  Mail, 
  MessageSquare,
  Calendar,
  Gauge,
  RefreshCw,
  Filter,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { searchRead, callMethod } from '@/lib/odooApi';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CompleteMaintenanceDialog from '@/components/shared/CompleteMaintenanceDialog';
import { useUserStore } from '@/store/useUserStore';

const priorityConfig = {
  critical: { 
    color: 'bg-rose-600', 
    textColor: 'text-rose-700 dark:text-rose-600', 
    bgColor: 'bg-rose-50 dark:bg-rose-900/20', 
    borderColor: 'border-gray-200 dark:border-gray-600',
    iconBg: 'bg-rose-100',
    icon: AlertTriangle,
    label: 'Critical'
  },
  high: { 
    color: 'bg-orange-600', 
    textColor: 'text-orange-700 dark:text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
    borderColor: 'border-gray-200 dark:border-gray-600',
    iconBg: 'bg-orange-100',
    icon: AlertTriangle,
    label: 'High'
  },
  medium: { 
    color: 'bg-amber-600', 
    textColor: 'text-amber-700 dark:text-amber-600', 
    bgColor: 'bg-amber-50 dark:bg-amber-900/20', 
    borderColor: 'border-gray-200 dark:border-gray-600',
    iconBg: 'bg-amber-100',
    icon: Clock,
    label: 'Medium'
  },
  low: { 
    color: 'bg-blue-600', 
    textColor: 'text-blue-700 dark:text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
    borderColor: 'border-gray-200 dark:border-gray-600',
    iconBg: 'bg-blue-100',
    icon: Clock,
    label: 'Low'
  }
};

const statusConfig = {
  pending: { color: 'bg-gray-600', label: 'Pending' },
  sent: { color: 'bg-blue-600', label: 'Sent' },
  acknowledged: { color: 'bg-amber-600', label: 'Acknowledged' },
  completed: { color: 'bg-emerald-600', label: 'Completed' },
  dismissed: { color: 'bg-gray-500', label: 'Dismissed' }
};

export default function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [alertToComplete, setAlertToComplete] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    overdue: 0,
    total: 0
  });

  // Get user role for permission checks
  const user = useUserStore((state) => state.user);
  const canCompleteMaintenance = user?.role === 'Maintainer' || user?.role === 'Admin';

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      const response = await searchRead(
        'messob.fms.maintenance.alert',
        [],
        [
          'id', 'alert_title', 'alert_message', 'vehicle_id', 'service_type',
          'scheduled_date', 'days_until_due', 'priority', 'status', 'is_overdue',
          'email_sent', 'sms_sent', 'dashboard_notification', 'alert_date',
          'description', 'current_odometer', 'scheduled_odometer'
        ],
        100
      );

      setAlerts(response || []);
      calculateStats(response || []);
    } catch (error) {
      console.error('Failed to fetch maintenance alerts:', error);
      toast.error('Failed to load maintenance alerts');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (alertData) => {
    const stats = {
      critical: alertData.filter(a => a.priority === 'critical').length,
      high: alertData.filter(a => a.priority === 'high').length,
      medium: alertData.filter(a => a.priority === 'medium').length,
      low: alertData.filter(a => a.priority === 'low').length,
      overdue: alertData.filter(a => a.is_overdue).length,
      total: alertData.length
    };
    setStats(stats);
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      await callMethod(
        'messob.fms.maintenance.alert',
        action,
        [alertId]
      );
      
      toast.success(`Alert ${action.replace('action_', '').replace('_', ' ')} successfully`);
      fetchAlerts(); // Refresh the list
    } catch (error) {
      console.error(`Failed to ${action} alert:`, error);
      toast.error(`Failed to ${action.replace('action_', '').replace('_', ' ')} alert`);
    }
  };

  const handleSendNotifications = async (alertId) => {
    try {
      await callMethod(
        'messob.fms.maintenance.alert',
        'action_send_notifications',
        [alertId]
      );
      
      toast.success('Notifications sent successfully');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to send notifications:', error);
      toast.error('Failed to send notifications');
    }
  };

  const getFilteredAlerts = (status) => {
    switch (status) {
      case 'pending':
        return alerts.filter(a => a.status === 'pending');
      case 'urgent':
        return alerts.filter(a => ['critical', 'high'].includes(a.priority) && a.status !== 'completed');
      case 'overdue':
        return alerts.filter(a => a.is_overdue && a.status !== 'completed');
      case 'all':
        return alerts;
      default:
        return alerts.filter(a => a.status === status);
    }
  };

  const AlertCard = ({ alert }) => {
    const priority = priorityConfig[alert.priority];
    const PriorityIcon = priority.icon;
    
    return (
      <Card className={`border-l-4 ${priority.borderColor} bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${priority.iconBg}`}>
                <PriorityIcon className={`h-5 w-5 ${priority.textColor}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl font-black text-gray-900 dark:text-gray-100">
                  {alert.alert_title}
                </CardTitle>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-1">
                  {Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={`${priority.color} text-white`}>
                {priority.label}
              </Badge>
              <Badge className={`${statusConfig[alert.status]?.color || 'bg-gray-500'} text-white`}>
                {statusConfig[alert.status]?.label || alert.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Alert Message */}
          <Alert className={alert.is_overdue ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}>
            <AlertDescription className={alert.is_overdue ? 'text-red-800 dark:text-red-400 font-semibold text-base' : 'text-gray-800 dark:text-gray-200 font-semibold text-base'}>
              {alert.alert_message}
            </AlertDescription>
          </Alert>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div>
                <span className="text-gray-700 dark:text-gray-200 font-semibold">Due Date:</span>
                <span className="ml-1 font-black text-gray-900 dark:text-gray-100">
                  {alert.scheduled_date ? format(new Date(alert.scheduled_date), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <span className="text-gray-700 dark:text-gray-200 font-semibold">Days:</span>
                <span className={`ml-1 font-black ${
                  alert.days_until_due < 0 ? 'text-red-700' : 
                  alert.days_until_due <= 3 ? 'text-orange-700' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {alert.days_until_due < 0 ? `${Math.abs(alert.days_until_due)} overdue` : 
                   alert.days_until_due === 0 ? 'Due today' : 
                   `${alert.days_until_due} days`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-gray-600" />
              <div>
                <span className="text-gray-700 dark:text-gray-200 font-semibold">Service:</span>
                <span className="ml-1 font-black text-gray-900 dark:text-gray-100">{alert.service_type}</span>
              </div>
            </div>

            {alert.scheduled_odometer && (
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="text-gray-700 dark:text-gray-200 font-semibold">Odometer:</span>
                  <span className="ml-1 font-black text-gray-900 dark:text-gray-100">
                    {alert.scheduled_odometer.toLocaleString()} km
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notification Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-1 font-semibold ${alert.email_sent ? 'text-green-700' : 'text-gray-600'}`}>
              <Mail className="h-4 w-4" />
              <span>{alert.email_sent ? 'Email sent' : 'Email pending'}</span>
            </div>
            <div className={`flex items-center gap-1 font-semibold ${alert.sms_sent ? 'text-green-700' : 'text-gray-600'}`}>
              <MessageSquare className="h-4 w-4" />
              <span>{alert.sms_sent ? 'SMS sent' : 'SMS pending'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => {
                setSelectedAlert(alert);
                setViewDialogOpen(true);
              }}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>

            {alert.status === 'pending' && (
              <Button
                onClick={() => handleAlertAction(alert.id, 'action_acknowledge')}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
            )}

            {!alert.email_sent && (
              <Button
                onClick={() => handleSendNotifications(alert.id)}
                variant="outline"
                size="sm"
              >
                <Bell className="h-4 w-4 mr-1" />
                Send Alerts
              </Button>
            )}

            {!['completed', 'dismissed'].includes(alert.status) && canCompleteMaintenance && (
              <Button
                onClick={() => {
                  setAlertToComplete(alert);
                  setCompleteDialogOpen(true);
                }}
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                Mark Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-2" />
            <p className="text-gray-600">Loading maintenance alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-red-700 dark:text-red-400" />
            Maintenance Alerts
          </h1>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-1">Preventive maintenance scheduling and notifications</p>
        </div>
        
        <Button onClick={fetchAlerts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-red-700 dark:text-red-400">{stats.critical}</div>
            <div className="text-sm text-red-700 dark:text-red-400 font-black uppercase">Critical</div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-orange-700 dark:text-orange-400">{stats.high}</div>
            <div className="text-sm text-orange-700 dark:text-orange-400 font-black uppercase">High</div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-amber-700 dark:text-amber-400">{stats.medium}</div>
            <div className="text-sm text-amber-700 dark:text-amber-400 font-black uppercase">Medium</div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400">{stats.low}</div>
            <div className="text-sm text-blue-700 dark:text-blue-400 font-black uppercase">Low</div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-red-800 dark:text-red-400">{stats.overdue}</div>
            <div className="text-sm text-red-800 dark:text-red-400 font-black uppercase">Overdue</div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-gray-800 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-700 dark:text-gray-200 font-black uppercase">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({alerts.filter(a => a.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="urgent" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Urgent ({alerts.filter(a => ['critical', 'high'].includes(a.priority) && a.status !== 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Overdue ({stats.overdue})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Acknowledged ({alerts.filter(a => a.status === 'acknowledged').length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            All ({stats.total})
          </TabsTrigger>
        </TabsList>

        {['pending', 'urgent', 'overdue', 'acknowledged', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {getFilteredAlerts(tab).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-3">
                    No {tab === 'all' ? '' : tab} alerts
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-base font-semibold">
                    {tab === 'pending' && "No pending maintenance alerts at this time."}
                    {tab === 'urgent' && "No urgent maintenance alerts requiring immediate attention."}
                    {tab === 'overdue' && "No overdue maintenance items. Great job keeping up!"}
                    {tab === 'acknowledged' && "No acknowledged alerts waiting for action."}
                    {tab === 'all' && "No maintenance alerts have been generated yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {getFilteredAlerts(tab).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Alert Details Dialog - Enhanced Version */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-brand-blue" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Alert Details</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6 pt-2">
              {/* Status Badges - Prominent Display */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${priorityConfig[selectedAlert.priority]?.color} text-white px-3 py-1.5 text-sm font-semibold shadow-sm`}>
                  {priorityConfig[selectedAlert.priority]?.label} Priority
                </Badge>
                <Badge className={`${statusConfig[selectedAlert.status]?.color} text-white px-3 py-1.5 text-sm font-semibold shadow-sm`}>
                  {statusConfig[selectedAlert.status]?.label}
                </Badge>
                {selectedAlert.is_overdue && (
                  <Badge className="bg-rose-600 text-white px-3 py-1.5 text-sm font-semibold shadow-sm animate-pulse">
                    ⚠️ OVERDUE
                  </Badge>
                )}
              </div>

              {/* Alert Title and Message */}
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 leading-tight">
                  {selectedAlert.alert_title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                  {selectedAlert.alert_message}
                </p>
              </div>

              {/* Description Section */}
              {selectedAlert.description && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Description
                  </h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {selectedAlert.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Key Information Grid - Enhanced with Icons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vehicle</span>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate" title={Array.isArray(selectedAlert.vehicle_id) ? selectedAlert.vehicle_id[1] : 'Unknown'}>
                        {Array.isArray(selectedAlert.vehicle_id) ? selectedAlert.vehicle_id[1] : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Type */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Gauge className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Service Type</span>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1 capitalize">
                        {selectedAlert.service_type}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scheduled Date */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scheduled Date</span>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {selectedAlert.scheduled_date ? format(new Date(selectedAlert.scheduled_date), 'MMMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Days Until Due - Enhanced Visual */}
                <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                  selectedAlert.days_until_due < 0 
                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' 
                    : selectedAlert.days_until_due <= 3 
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedAlert.days_until_due < 0 
                        ? 'bg-rose-100 dark:bg-rose-900/40' 
                        : selectedAlert.days_until_due <= 3 
                          ? 'bg-orange-100 dark:bg-orange-900/40' 
                          : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        selectedAlert.days_until_due < 0 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : selectedAlert.days_until_due <= 3 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Days Until Due</span>
                      <p className={`text-lg font-bold mt-1 ${
                        selectedAlert.days_until_due < 0 
                          ? 'text-rose-700 dark:text-rose-400' 
                          : selectedAlert.days_until_due <= 3 
                            ? 'text-orange-700 dark:text-orange-400' 
                            : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {selectedAlert.days_until_due < 0 
                          ? `${Math.abs(selectedAlert.days_until_due)} days overdue` 
                          : selectedAlert.days_until_due === 0 
                            ? '⚠️ Due today' 
                            : `${selectedAlert.days_until_due} days`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Enhanced Layout */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 flex-wrap">
                <Button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'action_acknowledge');
                    setViewDialogOpen(false);
                  }}
                  disabled={selectedAlert.status !== 'pending'}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Acknowledge
                </Button>
                
                {canCompleteMaintenance && (
                  <Button
                    onClick={() => {
                      handleAlertAction(selectedAlert.id, 'action_complete_maintenance');
                      setViewDialogOpen(false);
                    }}
                    disabled={['completed', 'dismissed'].includes(selectedAlert.status)}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'action_dismiss');
                    setViewDialogOpen(false);
                  }}
                  disabled={['completed', 'dismissed'].includes(selectedAlert.status)}
                  variant="outline"
                  className="flex-1 sm:flex-none border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <X className="h-5 w-5 mr-2" />
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Maintenance Dialog */}
      <CompleteMaintenanceDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        alert={alertToComplete}
        onComplete={fetchAlerts}
      />
    </div>
  );
}