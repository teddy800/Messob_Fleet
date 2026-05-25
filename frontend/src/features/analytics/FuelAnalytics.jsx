import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Fuel, TrendingUp, TrendingDown, DollarSign, Activity, 
  AlertTriangle, BarChart3, PieChart, Calendar 
} from 'lucide-react';
import { callOdooMethod, searchRead } from '@/lib/odooApi';
import { Button } from '@/components/ui/button';

export default function FuelAnalytics() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    loadVehicles();
    loadAlerts();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleAnalytics(selectedVehicle);
    }
  }, [selectedVehicle, timeRange]);

  const loadVehicles = async () => {
    try {
      const vehicleData = await searchRead('fleet.vehicle', [], ['license_plate', 'model_id', 'category_id'], 100);
      setVehicles(vehicleData);
      if (vehicleData.length > 0) {
        setSelectedVehicle(vehicleData[0].id);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  const loadVehicleAnalytics = async (vehicleId) => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Load efficiency data
      const efficiency = await callOdooMethod(
        'messob.fms.fuel.log',
        'calculate_fuel_efficiency',
        [vehicleId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );
      setEfficiencyData(efficiency);

      // Load trend data
      const trend = await callOdooMethod(
        'messob.fms.fuel.log',
        'get_fuel_efficiency_trend',
        [vehicleId, 6]
      );
      setTrendData(trend);

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    try {
      const vehicleIds = vehicles.map(v => v.id);
      const comparison = await callOdooMethod(
        'messob.fms.fuel.log',
        'compare_vehicle_efficiency',
        [vehicleIds]
      );
      setComparisonData(comparison);
    } catch (error) {
      console.error('Failed to load comparison:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const alertData = await callOdooMethod(
        'messob.fms.fuel.log',
        'get_fuel_alerts',
        []
      );
      if (alertData.success) {
        setAlerts(alertData.alerts);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Fuel Analytics</h1>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="h-5 w-5" />
              Fuel Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md">
                  <div>
                    <p className="font-semibold text-sm">{alert.vehicle_plate}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{alert.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {alert.type}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold">Select Vehicle:</label>
            <select
              value={selectedVehicle || ''}
              onChange={(e) => setSelectedVehicle(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} - {Array.isArray(v.model_id) ? v.model_id[1] : 'Unknown Model'}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison" onClick={loadComparison}>Fleet Comparison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Loading analytics...
              </CardContent>
            </Card>
          ) : efficiencyData?.success ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Efficiency</p>
                        <p className="text-2xl font-black text-blue-600">
                          {efficiencyData.statistics.efficiency_km_per_liter} km/L
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Fuel className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Fuel</p>
                        <p className="text-2xl font-black text-green-600">
                          {efficiencyData.statistics.total_fuel_liters} L
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Cost</p>
                        <p className="text-2xl font-black text-purple-600">
                          ${efficiencyData.statistics.total_cost}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Cost/km</p>
                        <p className="text-2xl font-black text-orange-600">
                          ${efficiencyData.statistics.cost_per_km}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-brand-gold" />
                    Detailed Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Distance Traveled</p>
                      <p className="text-xl font-bold text-brand-blue">
                        {efficiencyData.statistics.total_distance_km} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Refuel Count</p>
                      <p className="text-xl font-bold text-brand-blue">
                        {efficiencyData.statistics.refuel_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Avg Refuel</p>
                      <p className="text-xl font-bold text-brand-blue">
                        {efficiencyData.statistics.average_refuel_liters} L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Avg Cost/Refuel</p>
                      <p className="text-xl font-bold text-brand-blue">
                        ${efficiencyData.statistics.average_refuel_cost}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Period</p>
                      <p className="text-xl font-bold text-brand-blue">
                        {efficiencyData.period.days} days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {efficiencyData?.error || 'No fuel data available for this period'}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {trendData?.success ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-gold" />
                  6-Month Efficiency Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trendData.trend.map((month, idx) => (
                    <div key={idx} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-brand-blue">{month.month_name}</h3>
                        <span className="text-sm text-gray-500">{month.refuel_count} refuels</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Efficiency</p>
                          <p className="font-bold text-blue-600">{month.efficiency_km_per_liter} km/L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="font-bold">{month.distance_km} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuel Used</p>
                          <p className="font-bold">{month.total_fuel_liters} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Cost</p>
                          <p className="font-bold text-purple-600">${month.total_cost}</p>
                        </div>
                      </div>
                      {/* Visual bar */}
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min((month.efficiency_km_per_liter / 20) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No trend data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          {comparisonData?.success ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-brand-gold" />
                  Fleet Fuel Efficiency Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.vehicles.map((vehicle, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-brand-blue">{vehicle.plate_no}</h3>
                          <p className="text-xs text-gray-500">{vehicle.model} - {vehicle.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-blue-600">{vehicle.efficiency_km_per_liter} km/L</p>
                          <p className="text-xs text-gray-500">Rank #{idx + 1}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="font-bold">{vehicle.total_distance_km} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuel Used</p>
                          <p className="font-bold">{vehicle.total_fuel_liters} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cost/km</p>
                          <p className="font-bold text-purple-600">${vehicle.cost_per_km}</p>
                        </div>
                      </div>
                      {/* Efficiency bar */}
                      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            idx === 0 ? 'bg-green-600' : idx === 1 ? 'bg-blue-600' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min((vehicle.efficiency_km_per_liter / 20) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Button onClick={loadComparison}>Load Fleet Comparison</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
