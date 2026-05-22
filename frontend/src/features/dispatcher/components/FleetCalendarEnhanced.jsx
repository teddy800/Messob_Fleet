import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  Download,
  Printer,
  TrendingUp,
  Car,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Grid3x3,
  List,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFleetAvailability } from '../hooks/useFleetAvailability';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import VehicleTimelineRow from './VehicleTimelineRow';

export default function FleetCalendarEnhanced() {
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    searchQuery: '',
  });
  const [viewMode, setViewMode] = useState('timeline'); // timeline, stats
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    currentDate,
    goToToday,
    goToPrevious,
    goToNext,
  } = useCalendarNavigation();

  const { data, loading, error, refetch } = useFleetAvailability(currentDate, filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Generate 24-hour timeline
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const vehicles = data?.vehicles || [];

  // Calculate real-time statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter(v => 
      (!v.trips || v.trips.length === 0) && 
      (!v.maintenance || v.maintenance.length === 0)
    ).length;
    const occupied = vehicles.filter(v => v.trips && v.trips.length > 0).length;
    const maintenance = vehicles.filter(v => v.maintenance && v.maintenance.length > 0).length;
    const utilizationRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    const availabilityRate = total > 0 ? ((available / total) * 100).toFixed(1) : 0;

    // Category breakdown
    const categoryStats = {};
    vehicles.forEach(v => {
      const cat = v.category || 'Unknown';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, available: 0, occupied: 0 };
      }
      categoryStats[cat].total++;
      if (v.trips && v.trips.length > 0) {
        categoryStats[cat].occupied++;
      } else if (!v.maintenance || v.maintenance.length === 0) {
        categoryStats[cat].available++;
      }
    });

    return { 
      total, 
      available, 
      occupied, 
      maintenance, 
      utilizationRate,
      availabilityRate,
      categoryStats 
    };
  }, [vehicles]);

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Vehicle', 'Category', 'Status', 'Trips Today', 'Maintenance', 'Availability'],
      ...vehicles.map(v => [
        v.plate_no,
        v.category,
        v.status,
        v.trips?.length || 0,
        v.maintenance?.length || 0,
        (v.trips?.length === 0 && v.maintenance?.length === 0) ? 'Available' : 'Occupied'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-calendar-${format(currentDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print calendar
  const handlePrint = () => {
    window.print();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-2" />
          <p className="text-gray-600">Loading fleet calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Vehicles */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <Car className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{stats.total}</span>
          </div>
          <p className="text-sm font-medium opacity-90">Total Vehicles</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Available */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{stats.available}</span>
          </div>
          <p className="text-sm font-medium opacity-90">Available Now</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${stats.availabilityRate}%` }}></div>
          </div>
          <p className="text-xs mt-1 opacity-75">{stats.availabilityRate}% availability</p>
        </div>

        {/* Occupied */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{stats.occupied}</span>
          </div>
          <p className="text-sm font-medium opacity-90">In Use</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${stats.utilizationRate}%` }}></div>
          </div>
          <p className="text-xs mt-1 opacity-75">{stats.utilizationRate}% utilization</p>
        </div>

        {/* Maintenance */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{stats.maintenance}</span>
          </div>
          <p className="text-sm font-medium opacity-90">Maintenance</p>
          <div className="mt-2 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: stats.total > 0 ? `${(stats.maintenance / stats.total * 100)}%` : '0%' }}></div>
          </div>
          <p className="text-xs mt-1 opacity-75">Under service</p>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-8 w-8 opacity-80" />
            <span className="text-3xl font-bold">{Object.keys(stats.categoryStats).length}</span>
          </div>
          <p className="text-sm font-medium opacity-90">Categories</p>
          <div className="mt-2 space-y-1">
            {Object.entries(stats.categoryStats).slice(0, 2).map(([cat, data]) => (
              <p key={cat} className="text-xs opacity-75 truncate">
                {cat}: {data.available}/{data.total}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Header with Controls */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-700 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={goToPrevious}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-brand-gold" />
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>

            <Button
              onClick={goToNext}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <Button
              onClick={goToToday}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
              title="Export to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              onClick={handlePrint}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
              title="Print Calendar"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            <Button
              onClick={refetch}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by plate number..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="pl-10 bg-white border-0 h-10 shadow-md"
            />
          </div>

          <Select
            value={filters.category || "all"}
            onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-48 bg-white border-0 h-10 shadow-md">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="minibus">Mini-Bus</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "all"}
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-48 bg-white border-0 h-10 shadow-md">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          {(filters.category !== 'all' || filters.status !== 'all' || filters.searchQuery) && (
            <Button
              onClick={() => setFilters({ category: 'all', status: 'all', searchQuery: '' })}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition-all"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-100">
        {/* Time Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-brand-blue to-blue-700 flex shadow-md">
          <div className="w-48 flex-shrink-0 p-4 border-r border-white/20">
            <span className="text-white font-bold text-sm">Vehicle</span>
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {hours.map(hour => (
              <div
                key={hour}
                className="w-20 flex-shrink-0 text-center py-4 border-r border-white/20 text-white text-xs font-bold hover:bg-white/10 transition-colors"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Rows */}
        <div className="divide-y divide-gray-200">
          {vehicles.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No vehicles found</p>
              <p className="text-sm">Try adjusting your filters or add vehicles to the fleet</p>
            </div>
          ) : (
            vehicles.map(vehicle => (
              <VehicleTimelineRow
                key={vehicle.id}
                vehicle={vehicle}
                date={currentDate}
                onRefresh={refetch}
              />
            ))
          )}
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
              <span className="text-gray-700 font-medium">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
              <span className="text-gray-700 font-medium">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded shadow-sm"></div>
              <span className="text-gray-700 font-medium">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
              <span className="text-gray-700 font-medium">Maintenance</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Last updated: {format(new Date(), 'HH:mm:ss')}
          </div>
        </div>
      </div>
    </div>
  );
}
