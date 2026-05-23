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
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFleetAvailability } from '../hooks/useFleetAvailability';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import VehicleTimelineRow from './VehicleTimelineRow';

export default function FleetCalendar() {
  const [filters, setFilters] = useState({
    category: 'all',
    status: '',
    searchQuery: '',
  });
  const [viewMode, setViewMode] = useState('timeline'); // timeline, list, stats

  const {
    currentDate,
    viewMode: calendarViewMode,
    setViewMode: setCalendarViewMode,
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter(v => 
      (!v.trips || v.trips.length === 0) && 
      (!v.maintenance || v.maintenance.length === 0)
    ).length;
    const occupied = vehicles.filter(v => v.trips && v.trips.length > 0).length;
    const maintenance = vehicles.filter(v => v.maintenance && v.maintenance.length > 0).length;
    const utilizationRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;

    return { total, available, occupied, maintenance, utilizationRate };
  }, [vehicles]);

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Vehicle', 'Category', 'Status', 'Trips', 'Maintenance'],
      ...vehicles.map(v => [
        v.plate_no,
        v.category,
        v.status,
        v.trips?.length || 0,
        v.maintenance?.length || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-calendar-${format(currentDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Print calendar
  const handlePrint = () => {
    window.print();
  };
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

  const vehicles = data?.vehicles || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-700 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={goToPrevious}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
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
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <Button
              onClick={goToToday}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              Today
            </Button>
          </div>

          <Button
            onClick={refetch}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
              className="pl-10 bg-white border-0 h-10"
            />
          </div>

          <Select
            value={filters.category || "all"}
            onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-48 bg-white border-0 h-10">
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

          {(filters.category !== 'all' || filters.searchQuery) && (
            <Button
              onClick={() => setFilters({ category: 'all', status: '', searchQuery: '' })}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Time Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-brand-blue to-blue-700 flex">
          <div className="w-48 flex-shrink-0 p-4 border-r border-white/20">
            <span className="text-white font-bold text-sm">Vehicle</span>
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {hours.map(hour => (
              <div
                key={hour}
                className="w-20 flex-shrink-0 text-center py-4 border-r border-white/20 text-white text-xs font-bold"
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
              <p className="text-sm">Try adjusting your filters</p>
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

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span className="text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-700">Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
