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

const priorityConfig = {
  critical: { 
    color: 'bg-red-500', 
    textColor: 'text-red-700', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200',
    icon: AlertTriangle,
    label: 'Critical'
  },
  high: { 
    color: 'bg-orange-500', 
    textColor: 'text-orange-700', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    label: 'High'
  },
  medium: { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200',
    icon: Clock,
    label: 'Medium'
  },
  low: { 
    color: 'bg-blue-500', 
    textColor: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200',
    icon: Clock,
    label: 'Low'
  }
};

const statusConfig = {
  pending: { color: 'bg-gray-500', label: 'Pending' },
  sent: { color: 'bg-blue-500', label: 'Sent' },
  acknowledged: { color: 'bg-yellow-500', label: 'Acknowledged' },
  completed: { color: 'bg-green-500', label: 'Completed' },
  dismissed: { color: 'bg-gray-400', label: 'Dismissed' }
};

export default function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    overdue: 0,
    total: 0
  });

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
          order: 'priority desc, scheduled_date asc'
        }
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
      <Card className={`${priority.borderColor} border-l-4 hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${priority.bgColor}`}>
                <PriorityIcon className={`h-4 w-4 ${priority.textColor}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  {alert.alert_title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
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
          <Alert className={alert.is_overdue ? 'border-red-200 bg-red-50' : priority.bgColor}>
            <AlertDescription className={alert.is_overdue ? 'text-red-700' : priority.textColor}>
              {alert.alert_message}
            </AlertDescription>
          </Alert>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-gray-500">Due Date:</span>
                <span className="ml-1 font-medium">
                  {alert.scheduled_date ? format(new Date(alert.scheduled_date), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-gray-500">Days:</span>
                <span className={`ml-1 font-medium ${
                  alert.days_until_due < 0 ? 'text-red-600' : 
                  alert.days_until_due <= 3 ? 'text-orange-600' : 'text-gray-700'
                }`}>
                  {alert.days_until_due < 0 ? `${Math.abs(alert.days_until_due)} overdue` : 
                   alert.days_until_due === 0 ? 'Due today' : 
                   `${alert.days_until_due} days`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-gray-500">Service:</span>
                <span className="ml-1 font-medium">{alert.service_type}</span>
              </div>
            </div>

            {alert.scheduled_odometer && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-gray-500">Odometer:</span>
                  <span className="ml-1 font-medium">
                    {alert.scheduled_odometer.toLocaleString()} km
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notification Status */}
          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1 ${alert.email_sent ? 'text-green-600' : 'text-gray-400'}`}>
              <Mail className="h-3 w-3" />
              <span>{alert.email_sent ? 'Email sent' : 'Email pending'}</span>
            </div>
            <div className={`flex items-center gap-1 ${alert.sms_sent ? 'text-green-600' : 'text-gray-400'}`}>
              <MessageSquare className="h-3 w-3" />
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

            {!['completed', 'dismissed'].includes(alert.status) && (
              <Button
                onClick={() => handleAlertAction(alert.id, 'action_complete_maintenance')}
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-brand-blue" />
            Maintenance Alerts
          </h1>
          <p className="text-gray-600">Preventive maintenance scheduling and notifications</p>
        </div>
        
        <Button onClick={fetchAlerts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-red-600 font-medium">Critical</div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-xs text-orange-600 font-medium">High</div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-xs text-yellow-600 font-medium">Medium</div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
            <div className="text-xs text-blue-600 font-medium">Low</div>
          </CardContent>
        </Card>
        
        <Card className="border-red-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
            <div className="text-xs text-red-700 font-medium">Overdue</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-xs text-gray-600 font-medium">Total</div>
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
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    No {tab === 'all' ? '' : tab} alerts
                  </h3>
                  <p className="text-gray-500 text-sm">
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

      {/* Alert Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-brand-blue" />
              Alert Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${priorityConfig[selectedAlert.priority]?.color} text-white`}>
                  {priorityConfig[selectedAlert.priority]?.label}
                </Badge>
                <Badge className={`${statusConfig[selectedAlert.status]?.color} text-white`}>
                  {statusConfig[selectedAlert.status]?.label}
                </Badge>
                {selectedAlert.is_overdue && (
                  <Badge className="bg-red-600 text-white">OVERDUE</Badge>
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg">{selectedAlert.alert_title}</h3>
                <p className="text-gray-600">{selectedAlert.alert_message}</p>
              </div>

              {selectedAlert.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedAlert.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Vehicle:</span>
                  <p className="text-gray-600">
                    {Array.isArray(selectedAlert.vehicle_id) ? selectedAlert.vehicle_id[1] : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Service Type:</span>
                  <p className="text-gray-600">{selectedAlert.service_type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Scheduled Date:</span>
                  <p className="text-gray-600">
                    {selectedAlert.scheduled_date ? format(new Date(selectedAlert.scheduled_date), 'MMMM d, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Days Until Due:</span>
                  <p className={`${
                    selectedAlert.days_until_due < 0 ? 'text-red-600' : 
                    selectedAlert.days_until_due <= 3 ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {selectedAlert.days_until_due < 0 ? `${Math.abs(selectedAlert.days_until_due)} days overdue` : 
                     selectedAlert.days_until_due === 0 ? 'Due today' : 
                     `${selectedAlert.days_until_due} days`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'action_acknowledge');
                    setViewDialogOpen(false);
                  }}
                  disabled={selectedAlert.status !== 'pending'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
                
                <Button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'action_complete_maintenance');
                    setViewDialogOpen(false);
                  }}
                  disabled={['completed', 'dismissed'].includes(selectedAlert.status)}
                  variant="outline"
                  className="text-green-600 hover:text-green-700"
                >
                  Mark Complete
                </Button>
                
                <Button
                  onClick={() => {
                    handleAlertAction(selectedAlert.id, 'action_dismiss');
                    setViewDialogOpen(false);
                  }}
                  disabled={['completed', 'dismissed'].includes(selectedAlert.status)}
                  variant="outline"
                  className="text-gray-600 hover:text-gray-700"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}