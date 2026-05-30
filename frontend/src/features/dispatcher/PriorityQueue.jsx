import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callOdooMethod } from '@/lib/odooApi';
import { toast } from 'sonner';
import {
  AlertCircle,
  Clock,
  MapPin,
  User,
  Car,
  TrendingUp,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PriorityQueue() {
  const [queue, setQueue] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPriorityQueue();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPriorityQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPriorityQueue = async () => {
    try {
      // Load priority queue
      const queueResult = await callOdooMethod(
        'messob.fms.trip',
        'get_priority_queue',
        [50]
      );

      if (queueResult.success) {
        setQueue(queueResult.queue);
      }

      // Load statistics
      const statsResult = await callOdooMethod(
        'messob.fms.trip',
        'get_priority_statistics',
        []
      );

      if (statsResult.success) {
        setStatistics(statsResult);
      }

    } catch (error) {
      console.error('Failed to load priority queue:', error);
      toast.error('Failed to load priority queue');
    } finally {
      setLoading(false);
    }
  };

  const setPriority = async (tripId, priority) => {
    try {
      await callOdooMethod(
        'messob.fms.trip',
        'action_set_manual_priority',
        [[tripId], priority]
      );

      toast.success(`Priority set to ${priority.toUpperCase()}`);
      loadPriorityQueue();

    } catch (error) {
      console.error('Failed to set priority:', error);
      toast.error('Failed to set priority');
    }
  };

  const getPriorityColor = (level) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      urgent: 'bg-orange-100 text-orange-700 border-orange-300',
      high: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      normal: 'bg-blue-100 text-blue-700 border-blue-300',
      low: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[level] || colors.normal;
  };

  const getPriorityIcon = (level) => {
    if (level === 'critical' || level === 'urgent') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <TrendingUp className="h-4 w-4" />;
  };

  const getUrgencyLabel = (reason) => {
    const labels = {
      emergency: 'Emergency',
      medical: 'Medical',
      vip: 'VIP Transport',
      time_sensitive: 'Time Sensitive',
      official_duty: 'Official Duty',
      routine: 'Routine',
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500">Loading priority queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-blue">Priority Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Intelligent request prioritization with multi-factor scoring
          </p>
        </div>
        <Button onClick={loadPriorityQueue} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Total Pending</p>
              <p className="text-2xl font-black text-brand-blue mt-1">
                {statistics.total_pending}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-xs text-red-600 uppercase font-bold">Critical</p>
              <p className="text-2xl font-black text-red-700 mt-1">
                {statistics.by_level.critical}
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <p className="text-xs text-orange-600 uppercase font-bold">Urgent</p>
              <p className="text-2xl font-black text-orange-700 mt-1">
                {statistics.by_level.urgent}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Avg Score</p>
              <p className="text-2xl font-black text-brand-blue mt-1">
                {statistics.average_score.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Avg Wait</p>
              <p className="text-2xl font-black text-brand-blue mt-1">
                {statistics.average_wait_time_hours.toFixed(1)}h
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Priority Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests (Sorted by Priority)</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No pending requests</p>
              <p className="text-sm text-gray-500 mt-1">All requests have been processed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((trip, idx) => (
                <div
                  key={trip.id}
                  className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${
                    idx === 0 ? 'border-brand-blue bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Trip Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-bold text-brand-blue">{trip.name}</span>
                        <Badge className={getPriorityColor(trip.priority_level)}>
                          {getPriorityIcon(trip.priority_level)}
                          <span className="ml-1">{trip.priority_level.toUpperCase()}</span>
                        </Badge>
                        {trip.urgency_reason !== 'routine' && (
                          <Badge className="bg-purple-100 text-purple-700">
                            {getUrgencyLabel(trip.urgency_reason)}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{trip.requester}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">
                            {new Date(trip.start_dt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 truncate">{trip.pickup}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700">{trip.vehicle_category}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2">{trip.purpose}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Score: {trip.priority_score.toFixed(1)}</span>
                        <span>Wait: {trip.wait_time_hours.toFixed(1)}h</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/dashboard/dispatch/approve/${trip.id}`)}
                      >
                        Review
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>

                      <select
                        className="px-2 py-1 text-xs border rounded"
                        onChange={(e) => setPriority(trip.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Set Priority
                        </option>
                        <option value="critical">Critical</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
