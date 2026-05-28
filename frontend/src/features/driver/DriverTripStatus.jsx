import { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, CheckCircle, Clock, AlertCircle, 
  Camera, FileText, User, Phone, Fuel, Gauge 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { callOdooMethod } from '@/lib/odooApi';
import { toast } from 'sonner';

export default function DriverTripStatus({ trip, onStatusUpdate }) {
  const [currentStatus, setCurrentStatus] = useState(trip?.state || 'approved');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  }, []);

  const updateTripStatus = async (newStatus, additionalData = {}) => {
    setLoading(true);
    try {
      const updateData = {
        trip_id: trip.id,
        status: newStatus,
        timestamp: new Date().toISOString(),
        location: location,
        odometer: odometer ? parseInt(odometer) : null,
        notes: notes,
        ...additionalData
      };

      await callOdooMethod('messob.fms.trip', 'update_trip_status', [updateData]);
      
      setCurrentStatus(newStatus);
      toast.success(`Trip status updated to ${newStatus}`);
      
      if (onStatusUpdate) {
        onStatusUpdate(newStatus);
      }
    } catch (error) {
      console.error('Failed to update trip status:', error);
      toast.error('Failed to update trip status');
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = [
    { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
    { key: 'departed', label: 'Departed', icon: Navigation, color: 'text-blue-600' },
    { key: 'picked_up', label: 'Picked Up', icon: User, color: 'text-purple-600' },
    { key: 'en_route', label: 'En Route', icon: MapPin, color: 'text-orange-600' },
    { key: 'arrived', label: 'Arrived', icon: MapPin, color: 'text-indigo-600' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-700' }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === currentStatus);
  };

  const getNextStatus = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < statusSteps.length - 1) {
      return statusSteps[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus();

  return (
    <div className="space-y-4">
      {/* Trip Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5 text-brand-blue" />
            {trip.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Pickup</p>
                <p className="text-sm font-semibold">{trip.pickup}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Navigation className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Destination</p>
                <p className="text-sm font-semibold">{trip.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Passenger</p>
                <p className="text-sm font-semibold">
                  {Array.isArray(trip.requester_id) ? trip.requester_id[1] : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= getCurrentStepIndex();
              const isCurrent = step.key === currentStatus;
              
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      isCurrent ? 'text-brand-blue' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-blue-600 font-bold">CURRENT STATUS</p>
                    )}
                  </div>
                  {isCompleted && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Update Form */}
      {nextStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Update Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                <Gauge className="h-4 w-4 inline mr-1" />
                Odometer Reading (km)
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="Enter current odometer reading"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                <FileText className="h-4 w-4 inline mr-1" />
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this status update..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <Button
              onClick={() => updateTripStatus(nextStatus.key)}
              disabled={loading}
              className="w-full bg-brand-blue hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Updating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <nextStatus.icon className="h-4 w-4" />
                  Mark as {nextStatus.label}
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.destination)}`;
              window.open(url, '_blank');
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Open Navigation
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.location.href = 'tel:+251911234567'}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Dispatcher
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => toast.info('Incident reporting feature coming soon')}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Report Incident
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast.info('Photo capture feature coming soon')}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}