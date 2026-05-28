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
        <h1 className="text-3xl font-black text-brand-blue dark:text-blue-400">Fuel Analytics</h1>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border-2 rounded-md text-base font-semibold"
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
        <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300 text-xl font-black">
              <AlertTriangle className="h-6 w-6" />
              Fuel Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200">
                  <div>
                    <p className="font-black text-base text-gray-900 dark:text-gray-100">{alert.vehicle_plate}</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{alert.message}</p>
                  </div>
                  <span className={`text-sm font-black px-3 py-1.5 rounded-full ${
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
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
            <label className="text-base font-black text-gray-900 dark:text-gray-100">Select Vehicle:</label>
            <select
              value={selectedVehicle || ''}
              onChange={(e) => setSelectedVehicle(parseInt(e.target.value))}
              className="flex-1 px-4 py-3 border-2 rounded-md text-base font-semibold"
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
              <CardContent className="py-12 text-center text-gray-700 dark:text-gray-200 text-lg font-semibold">
                Loading analytics...
              </CardContent>
            </Card>
          ) : efficiencyData?.success ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-gray-200 bg-white dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <Activity className="h-8 w-8 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black">Efficiency</p>
                        <p className="text-3xl font-black text-blue-700 dark:text-blue-400">
                          {efficiencyData.statistics.efficiency_km_per_liter} km/L
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-emerald-100">
                        <Fuel className="h-8 w-8 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black">Total Fuel</p>
                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {efficiencyData.statistics.total_fuel_liters} L
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-purple-100">
                        <DollarSign className="h-8 w-8 text-purple-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black">Total Cost</p>
                        <p className="text-3xl font-black text-purple-700 dark:text-purple-400">
                          ${efficiencyData.statistics.total_cost}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-orange-100">
                        <TrendingUp className="h-8 w-8 text-orange-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black">Cost/km</p>
                        <p className="text-3xl font-black text-orange-700 dark:text-orange-400">
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
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <BarChart3 className="h-6 w-6 text-brand-gold" />
                    Detailed Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black mb-1">Distance Traveled</p>
                      <p className="text-2xl font-black text-brand-blue dark:text-blue-400">
                        {efficiencyData.statistics.total_distance_km} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black mb-1">Refuel Count</p>
                      <p className="text-2xl font-black text-brand-blue dark:text-blue-400">
                        {efficiencyData.statistics.refuel_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black mb-1">Avg Refuel</p>
                      <p className="text-2xl font-black text-brand-blue dark:text-blue-400">
                        {efficiencyData.statistics.average_refuel_liters} L
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black mb-1">Avg Cost/Refuel</p>
                      <p className="text-2xl font-black text-brand-blue dark:text-blue-400">
                        ${efficiencyData.statistics.average_refuel_cost}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-200 uppercase font-black mb-1">Period</p>
                      <p className="text-2xl font-black text-brand-blue dark:text-blue-400">
                        {efficiencyData.period.days} days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-700 dark:text-gray-200 text-lg font-semibold">
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
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-black text-lg text-brand-blue dark:text-blue-400">{month.month_name}</h3>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{month.refuel_count} refuels</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Efficiency</p>
                          <p className="font-black text-xl text-blue-700 dark:text-blue-400">{month.efficiency_km_per_liter} km/L</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Distance</p>
                          <p className="font-black text-xl text-gray-900 dark:text-gray-100">{month.distance_km} km</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Fuel Used</p>
                          <p className="font-black text-xl text-gray-900 dark:text-gray-100">{month.total_fuel_liters} L</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Total Cost</p>
                          <p className="font-black text-xl text-purple-700 dark:text-purple-400">${month.total_cost}</p>
                        </div>
                      </div>
                      {/* Visual bar */}
                      <div className="mt-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
                    <div key={idx} className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hover:shadow-md bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-black text-xl text-brand-blue dark:text-blue-400">{vehicle.plate_no}</h3>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{vehicle.model} - {vehicle.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{vehicle.efficiency_km_per_liter} km/L</p>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Rank #{idx + 1}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-base">
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Distance</p>
                          <p className="font-black text-lg text-gray-900 dark:text-gray-100">{vehicle.total_distance_km} km</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Fuel Used</p>
                          <p className="font-black text-lg text-gray-900 dark:text-gray-100">{vehicle.total_fuel_liters} L</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-700 dark:text-gray-200">Cost/km</p>
                          <p className="font-black text-lg text-purple-700 dark:text-purple-400">${vehicle.cost_per_km}</p>
                        </div>
                      </div>
                      {/* Efficiency bar */}
                      <div className="mt-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            idx === 0 ? 'bg-emerald-600' : idx === 1 ? 'bg-blue-600' : 'bg-gray-500'
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
