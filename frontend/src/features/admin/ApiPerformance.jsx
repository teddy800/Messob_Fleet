import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callOdooMethod } from '@/lib/odooApi';
import { toast } from 'sonner';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function ApiPerformance() {
  const [statistics, setStatistics] = useState(null);
  const [slowQueries, setSlowQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    loadPerformanceData();
  }, [hours]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // Load statistics
      const statsResult = await callOdooMethod(
        'messob.fms.api.performance',
        'get_performance_statistics',
        [hours]
      );

      if (statsResult.success) {
        setStatistics(statsResult);
      }

      // Load slow queries
      const slowResult = await fetch('/odoo/api/performance/slow-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: { limit: 20 },
        }),
      });

      const slowJson = await slowResult.json();
      if (slowJson.result?.success) {
        setSlowQueries(slowJson.result.slow_queries);
      }

    } catch (error) {
      console.error('Failed to load performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (category) => {
    const colors = {
      excellent: 'bg-green-100 text-green-700',
      good: 'bg-blue-100 text-blue-700',
      slow: 'bg-yellow-100 text-yellow-700',
      critical: 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getComplianceIcon = (compliant) => {
    return compliant ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No performance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-blue">API Performance Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time API performance metrics and monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
          <Button onClick={loadPerformanceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Total Requests</p>
              <p className="text-2xl font-black text-blue-600">
                {statistics.total_requests.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Avg Response</p>
              <p className="text-2xl font-black text-green-600">
                {statistics.average_response_time_ms.toFixed(0)}ms
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">P95 Response</p>
              <p className="text-2xl font-black text-purple-600">
                {statistics.p95_response_time_ms.toFixed(0)}ms
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Slow Requests</p>
              <p className="text-2xl font-black text-orange-600">
                {statistics.slow_requests_count}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getComplianceIcon(statistics.performance_compliance.compliant)}
            Performance Compliance (NFR-1.1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Target:</span>
              <span className="text-sm text-gray-600">
                {statistics.performance_compliance.target}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Actual:</span>
              <Badge
                className={
                  statistics.performance_compliance.compliant
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }
              >
                {statistics.performance_compliance.actual_percentage}% under 500ms
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
              <div
                className={`h-3 rounded-full transition-all ${
                  statistics.performance_compliance.compliant
                    ? 'bg-green-600'
                    : 'bg-red-600'
                }`}
                style={{
                  width: `${statistics.performance_compliance.actual_percentage}%`,
                }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests by Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle>Requests by Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.requests_by_endpoint || {})
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 10)
              .map(([endpoint, stats]) => (
                <div
                  key={endpoint}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {endpoint}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.count} requests • Avg: {stats.average_response_time_ms.toFixed(0)}ms
                    </p>
                  </div>
                  {stats.slow_requests > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      {stats.slow_requests} slow
                    </Badge>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Slow Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            Slow Queries (> 500ms)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slowQueries.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No slow queries detected!</p>
              <p className="text-sm text-gray-500 mt-1">All requests are performing well</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slowQueries.map((query, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-orange-200 bg-orange-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {query.method} {query.endpoint}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        User: {query.user} • {new Date(query.timestamp).toLocaleString()}
                      </p>
                      {query.error_message && (
                        <p className="text-xs text-red-600 mt-1">Error: {query.error_message}</p>
                      )}
                    </div>
                    <Badge className={getPerformanceColor(query.performance_category)}>
                      {query.response_time_ms.toFixed(0)}ms
                    </Badge>
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
