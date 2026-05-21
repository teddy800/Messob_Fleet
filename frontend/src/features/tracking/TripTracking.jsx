import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Edit3, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RouteDisplay from './components/RouteDisplay';
import CollaborativePickup from './components/CollaborativePickup';
import PickupPointUpdate from './components/PickupPointUpdate';
import { odooApi } from '@/lib/odooApi';
import { toast } from 'sonner';

export default function TripTracking() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch basic trip data
  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch trip details from existing API
        const response = await odooApi.call(
          'messob.fms.trip',
          'read',
          [parseInt(tripId)],
          {
            fields: [
              'name', 'requester_id', 'purpose', 'state', 
              'start_dt', 'end_dt', 'pickup', 'destination',
              'assigned_vehicle_id', 'assigned_driver_id'
            ]
          }
        );

        if (response && response.length > 0) {
          setTripData(response[0]);
        } else {
          setError('Trip not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [tripId]);

  const handlePickupUpdate = (newAddress, newCoordinates) => {
    if (tripData) {
      setTripData(prev => ({
        ...prev,
        pickup: newAddress
      }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto mb-2"></div>
            <p className="text-gray-600">Loading trip details...</p>
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
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No trip data available</p>
        </div>
      </div>
    );
  }

  // Check if trip is trackable (approved or in progress)
  const isTrackable = ['approved', 'in_progress'].includes(tripData.state);
  const canUpdatePickup = tripData.state === 'approved';

  if (!isTrackable) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Route className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Trip Tracking Not Available</h2>
            <p className="text-gray-500 mb-4">
              Route tracking is only available for approved and in-progress trips.
            </p>
            <p className="text-sm text-gray-400">
              Current status: <span className="font-medium">{tripData.state.replace('_', ' ').toUpperCase()}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trip Tracking</h1>
            <p className="text-gray-600">{tripData.name} • {tripData.requester_id[1]}</p>
          </div>
        </div>
      </div>

      {/* Tracking Interface */}
      <Tabs defaultValue="route" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="route" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route & GPS
          </TabsTrigger>
          <TabsTrigger value="collaborative" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Service Users
          </TabsTrigger>
          <TabsTrigger value="pickup" className="flex items-center gap-2" disabled={!canUpdatePickup}>
            <Edit3 className="h-4 w-4" />
            Update Pickup
          </TabsTrigger>
        </TabsList>

        {/* Route Display Tab (FR-3.1 & FR-3.2) */}
        <TabsContent value="route">
          <RouteDisplay tripId={parseInt(tripId)} />
        </TabsContent>

        {/* Collaborative Pickup Tab (FR-3.3) */}
        <TabsContent value="collaborative">
          <CollaborativePickup tripId={parseInt(tripId)} />
        </TabsContent>

        {/* Pickup Update Tab (FR-3.4) */}
        <TabsContent value="pickup">
          {canUpdatePickup ? (
            <PickupPointUpdate
              tripId={parseInt(tripId)}
              currentPickup={tripData.pickup}
              currentCoordinates={null} // Will be geocoded by component
              onUpdate={handlePickupUpdate}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">Pickup Update Not Available</h3>
              <p className="text-gray-500">
                Pickup points can only be updated for approved trips that haven't started yet.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}