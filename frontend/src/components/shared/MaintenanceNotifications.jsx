import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Bell, 
  X, 
  Clock, 
  Car,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { searchRead, writeRecord } from '@/lib/odooApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

const priorityConfig = {
  critical: { 
    color: 'bg-red-500', 
    textColor: 'text-red-700', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  high: { 
    color: 'bg-orange-500', 
    textColor: 'text-orange-700', 
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200',
    icon: AlertTriangle
  },
  medium: { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200',
    icon: Clock
  },
  low: { 
    color: 'bg-blue-500', 
    textColor: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200',
    icon: Clock
  }
};

export default function MaintenanceNotifications({ 
  className = "", 
  maxAlerts = 5, 
  showHeader = true,
  compact = false 
}) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    total: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchAlerts();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      const response = await searchRead(
        'messob.fms.maintenance.alert',
        [
          ['status', 'in', ['pending', 'sent']],
          ['dashboard_notification', '=', true]
        ],
        [
          'id', 'alert_title', 'alert_message', 'vehicle_id', 'service_type',
          'scheduled_date', 'days_until_due', 'priority', 'status', 'is_overdue',
          'alert_date'
        ],
        maxAlerts
      );

      setAlerts(response || []);
      calculateStats(response || []);
    } catch (error) {
      console.error('Failed to fetch maintenance notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (alertData) => {
    const stats = {
      critical: alertData.filter(a => a.priority === 'critical').length,
      high: alertData.filter(a => a.priority === 'high').length,
      total: alertData.length,
      overdue: alertData.filter(a => a.is_overdue).length
    };
    setStats(stats);
  };

  const handleDismissAlert = async (alertId, event) => {
    event.stopPropagation();
    
    try {
      await writeRecord(
        'messob.fms.maintenance.alert',
        [alertId],
        { dashboard_notification: false }
      );
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alert dismissed from dashboard');
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      toast.error('Failed to dismiss alert');
    }
  };

  const handleViewAllAlerts = () => {
    navigate('/dashboard/maintenance/alerts');
  };

  const AlertItem = ({ alert, isCompact = false }) => {
    const priority = priorityConfig[alert.priority];
    const PriorityIcon = priority.icon;
    
    return (
      <div 
        className={`p-3 rounded-lg border ${priority.borderColor} ${priority.bgColor} hover:shadow-sm transition-shadow cursor-pointer`}
        onClick={() => navigate(`/dashboard/maintenance/alerts`)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-full ${priority.color.replace('bg-', 'bg-').replace('500', '100')}`}>
            <PriorityIcon className={`h-3 w-3 ${priority.textColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm ${priority.textColor} truncate`}>
                  {alert.alert_title}
                </h4>
                {!isCompact && (
                  <p className="text-xs text-gray-600 mt-1">
                    {Array.isArray(alert.vehicle_id) ? alert.vehicle_id[1] : 'Unknown Vehicle'}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge className={`${priority.color} text-white text-xs`}>
                  {alert.priority.toUpperCase()}
                </Badge>
                <Button
                  onClick={(e) => handleDismissAlert(alert.id, e)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {!isCompact && (
              <div className="mt-2">
                <p className={`text-xs ${priority.textColor}`}>
                  {alert.alert_message}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {alert.days_until_due < 0 ? `${Math.abs(alert.days_until_due)}d overdue` : 
                       alert.days_until_due === 0 ? 'Due today' : 
                       `${alert.days_until_due}d left`}
                    </span>
                  </div>
                  
                  {alert.scheduled_date && (
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span>{format(new Date(alert.scheduled_date), 'MMM d')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-green-600" />
              Maintenance Alerts
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : "p-4"}>
          <div className="text-center py-4">
            <Bell className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-600 font-medium">All caught up!</p>
            <p className="text-xs text-gray-500">No pending maintenance alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-brand-blue" />
                  Maintenance Alerts
                  {stats.total > 0 && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {stats.total}
                    </Badge>
                  )}
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  {stats.critical > 0 && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {stats.critical} Critical
                    </Badge>
                  )}
                  {stats.overdue > 0 && (
                    <Badge className="bg-rose-500/70 text-white text-xs">
                      {stats.overdue} Overdue
                    </Badge>
                  )}
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {/* Critical/High Priority Summary */}
              {(stats.critical > 0 || stats.high > 0) && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">
                    {stats.critical > 0 && stats.high > 0 
                      ? `${stats.critical} critical and ${stats.high} high priority alerts require immediate attention`
                      : stats.critical > 0 
                      ? `${stats.critical} critical alert${stats.critical > 1 ? 's' : ''} require${stats.critical === 1 ? 's' : ''} immediate attention`
                      : `${stats.high} high priority alert${stats.high > 1 ? 's' : ''} need${stats.high === 1 ? 's' : ''} attention`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Alert List */}
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} isCompact={compact} />
                ))}
              </div>

              {/* View All Button */}
              <div className="pt-2">
                <Button
                  onClick={handleViewAllAlerts}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  View All Maintenance Alerts
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}

      {!showHeader && (
        <CardContent className="p-4 space-y-3">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} isCompact={compact} />
          ))}
          
          {alerts.length >= maxAlerts && (
            <Button
              onClick={handleViewAllAlerts}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              View All Alerts
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}