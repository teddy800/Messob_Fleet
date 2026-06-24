import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Route, 
  MapPin, 
  Clock, 
  Car, 
  User, 
  ArrowRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { searchRead, callMethod } from '@/lib/odooApi';
import { useUserStore } from '@/store/useUserStore';
import { format } from 'date-fns';

export default function TripSelection() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchCurrentUserAndTrips();
  }, []);

  const fetchCurrentUserAndTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user's ID from Odoo session
      const userId = await callMethod('res.users', 'search_read', [
        [['id', '=', window.odoo?.session_info?.uid || 2]],
        ['id', 'partner_id']
      ]);

      const currentPartnerId = userId && userId.length > 0 ? userId[0].partner_id[0] : null;
      setCurrentUserId(currentPartnerId);

      // Build domain based on user role
      let domain = [
        ['state', 'in', ['approved', 'in_progress']],
        ['assigned_vehicle_id', '!=', false]
      ];

      // If user is Driver role, filter to show ONLY trips assigned to this driver
      if (user?.role === 'Driver' && currentPartnerId) {
        domain.push(['assigned_driver_id', '=', currentPartnerId]);
      }

      // Fetch trips that can be tracked
      const response = await searchRead(
        'messob.fms.trip',
        domain,
        [
          'id', 'name', 'requester_id', 'start_dt', 'end_dt',
          'pickup', 'destination', 'state', 'assigned_vehicle_id',
          'assigned_driver_id', 'purpose'
        ],
        50
      );

      setTrips(response || []);
    } catch (err) {
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackableTrips = fetchCurrentUserAndTrips;

  // ⚡ OPTIMIZED: Instant navigation with tripData passed via state
  const handleTripSelect = (trip) => {
    navigate(`/dashboard/tracking/${trip.id}`, {
      state: { tripData: trip } // Pass trip data to avoid extra API call
    });
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'approved':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTrips = trips.filter(trip =>
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.requester_id[1].toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.pickup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-blue dark:text-blue-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-300">Loading trackable trips...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchTrackableTrips} variant="outline" className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Route className="h-6 w-6 text-brand-blue dark:text-blue-400" />
            Trip Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Select a trip to track its route and progress</p>
        </div>
        
        <Button onClick={fetchTrackableTrips} variant="outline" className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder="Search trips by ID, requester, pickup, or destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-8 text-center">
            <Route className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">No Trackable Trips</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm 
                ? "No trips match your search criteria." 
                : "There are no approved or in-progress trips available for tracking."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Trip Header */}
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{trip.name}</h3>
                      <Badge className={`${getStatusColor(trip.state)} text-white`}>
                        {trip.state.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    {/* Trip Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Requester:</span>
                          <span className="font-medium dark:text-gray-200">{trip.requester_id[1]}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Schedule:</span>
                          <span className="font-medium dark:text-gray-200">
                            {format(new Date(trip.start_dt), 'MMM d, HH:mm')}
                          </span>
                        </div>

                        {trip.assigned_vehicle_id && (
                          <div className="flex items-center gap-2 text-sm">
                            <Car className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                            <span className="font-medium dark:text-gray-200">{trip.assigned_vehicle_id[1]}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 block">Pickup:</span>
                            <span className="font-medium text-sm dark:text-gray-200">{trip.pickup}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 block">Destination:</span>
                            <span className="font-medium text-sm dark:text-gray-200">{trip.destination}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    {trip.purpose && (
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Purpose:</span>
                        <span className="ml-2 text-gray-800 dark:text-gray-200">{trip.purpose}</span>
                      </div>
                    )}
                  </div>

                  {/* Track Button - OPTIMIZED: Pass full trip data */}
                  <div className="ml-6">
                    <Button
                      onClick={() => handleTripSelect(trip)}
                      className="bg-brand-blue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      Track Trip
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}