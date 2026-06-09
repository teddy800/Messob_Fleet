import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ArrowLeft, MapPin, Calendar, Car, Users, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTripRequests } from "@/lib/useTripRequests";

const statusConfig = {
  pending: {
    label: "Pending", icon: Clock,
    color: "text-amber-400/70", bg: "bg-amber-50/40",
    border: "border-amber-200/50", badgeClass: "bg-amber-100/40 text-amber-600/80 border-amber-200/40",
  },
  approved: {
    label: "Approved", icon: CheckCircle,
    color: "text-emerald-500/70", bg: "bg-emerald-50/40",
    border: "border-emerald-200/50", badgeClass: "bg-emerald-100/40 text-emerald-600/80 border-emerald-200/40",
  },
  in_progress: {
    label: "In Progress", icon: CheckCircle,
    color: "text-emerald-500/70", bg: "bg-emerald-50/40",
    border: "border-emerald-200/50", badgeClass: "bg-emerald-100/40 text-emerald-600/80 border-emerald-200/40",
  },
  rejected: {
    label: "Rejected", icon: XCircle,
    color: "text-rose-400/70", bg: "bg-rose-50/40",
    border: "border-rose-200/50", badgeClass: "bg-rose-100/40 text-rose-600/80 border-rose-200/40",
  },
  completed: {
    label: "Completed", icon: CheckCircle,
    color: "text-purple-500/70", bg: "bg-purple-50/40",
    border: "border-purple-200/50", badgeClass: "bg-purple-100/40 text-purple-600/80 border-purple-200/40",
  },
  draft: {
    label: "Draft", icon: Clock,
    color: "text-gray-400/70", bg: "bg-gray-50/40",
    border: "border-gray-200/50", badgeClass: "bg-gray-100/40 text-gray-600/80 border-gray-200/40",
  },
  closed: {
    label: "Closed", icon: CheckCircle,
    color: "text-slate-500/70", bg: "bg-slate-50/40",
    border: "border-slate-200/50", badgeClass: "bg-slate-100/40 text-slate-600/80 border-slate-200/40",
  },
};

export default function RequestList() {
  const { status } = useParams();
  const navigate = useNavigate();
  
  // Advanced filters for FR-2.1 Priority Queueing
  const [filters, setFilters] = useState({
    search: '',
    vehicleCategory: 'all',
    dateRange: 'all',
    sortBy: 'date_desc'
  });

  const stateFilter = status === "approved" ? ["approved", "in_progress"] : [status];
  const { trips, loading } = useTripRequests(stateFilter);

  // Apply filters and sorting
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(trip => 
        trip.purpose?.toLowerCase().includes(searchLower) ||
        trip.pickup?.toLowerCase().includes(searchLower) ||
        trip.destination?.toLowerCase().includes(searchLower) ||
        trip.name?.toLowerCase().includes(searchLower)
      );
    }

    // Vehicle category filter
    if (filters.vehicleCategory !== 'all') {
      result = result.filter(trip => trip.vehicle_category === filters.vehicleCategory);
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange !== 'all') {
      result = result.filter(trip => {
        const tripDate = new Date(trip.start_dt);
        const daysDiff = Math.floor((tripDate - now) / (1000 * 60 * 60 * 24));
        
        switch(filters.dateRange) {
          case 'today':
            return daysDiff === 0;
          case 'tomorrow':
            return daysDiff === 1;
          case 'week':
            return daysDiff >= 0 && daysDiff <= 7;
          case 'month':
            return daysDiff >= 0 && daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch(filters.sortBy) {
        case 'date_asc':
          return new Date(a.start_dt) - new Date(b.start_dt);
        case 'date_desc':
          return new Date(b.start_dt) - new Date(a.start_dt);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [trips, filters]);

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/requests/status")}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <h1 className="text-2xl font-black text-brand-blue dark:text-blue-400">{config.label} Requests</h1>
            <span className={`ml-2 text-xs font-black px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
              {filteredTrips.length}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-700/50 dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search requests..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            />
          </div>

          {/* Vehicle Category */}
          <Select
            value={filters.vehicleCategory}
            onValueChange={(value) => setFilters(prev => ({ ...prev, vehicleCategory: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vehicle Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sedan">Sedan</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="minibus">Mini-Bus</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="name_asc">ID: A-Z</SelectItem>
              <SelectItem value="name_desc">ID: Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {(filters.search || filters.vehicleCategory !== 'all' || filters.dateRange !== 'all') && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Active filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                Search: {filters.search}
              </Badge>
            )}
            {filters.vehicleCategory !== 'all' && (
              <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                Category: {filters.vehicleCategory}
              </Badge>
            )}
            {filters.dateRange !== 'all' && (
              <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                Date: {filters.dateRange}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ search: '', vehicleCategory: 'all', dateRange: 'all', sortBy: 'date_desc' })}
              className="h-6 text-xs dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Clear All
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">
            {trips.length === 0 
              ? `No ${config.label.toLowerCase()} requests`
              : 'No requests match your filters'
            }
          </p>
          {trips.length > 0 && (
            <Button
              variant="link"
              onClick={() => setFilters({ search: '', vehicleCategory: 'all', dateRange: 'all', sortBy: 'date_desc' })}
              className="mt-2 dark:text-blue-400"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((req) => (
            <Card key={req.id} className={`border-l-4 ${config.border} hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-brand-blue dark:text-blue-400 text-sm">{req.name}</span>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${config.badgeClass}`}>
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-brand-gold dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Route</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{req.pickup} → {req.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-brand-gold dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Date & Time</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">
                        {req.start_dt ? new Date(req.start_dt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-brand-gold dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Vehicle Category</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{req.vehicle_category || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-brand-gold dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Requested By</p>
                      <p className="font-bold text-gray-800 dark:text-gray-200">
                        {Array.isArray(req.requester_id) ? req.requester_id[1] : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Purpose: </span>
                  <span className="text-sm font-bold text-brand-blue dark:text-blue-400">{req.purpose}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
