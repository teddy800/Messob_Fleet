// ============================================================================
// MESSOB Fleet Management System
// Incident Reporting Component for Driver Mobile App
// Allows drivers to report accidents, breakdowns, delays, etc.
// ============================================================================

import { useState } from 'react';
import { AlertTriangle, MapPin, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { callOdooMethod } from '@/lib/odooApi';
import { toast } from 'sonner';

export default function IncidentReport({ tripId, onClose }) {
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const incidentTypes = [
    { value: 'accident', label: '🚗 Accident', color: 'bg-red-100 text-red-800' },
    { value: 'breakdown', label: '🔧 Vehicle Breakdown', color: 'bg-orange-100 text-orange-800' },
    { value: 'delay', label: '⏰ Significant Delay', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'traffic', label: '🚦 Traffic Jam', color: 'bg-blue-100 text-blue-800' },
    { value: 'weather', label: '🌧️ Weather Issue', color: 'bg-gray-100 text-gray-800' },
    { value: 'medical', label: '🏥 Medical Emergency', color: 'bg-red-100 text-red-800' },
    { value: 'other', label: '📝 Other', color: 'bg-purple-100 text-purple-800' },
  ];

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          toast.success('Location captured');
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Failed to get location');
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!incidentType) {
      toast.error('Please select incident type');
      return;
    }
    
    if (!description || description.trim().length < 10) {
      toast.error('Please provide detailed description (min 10 characters)');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const locationStr = location 
        ? `${location.latitude}, ${location.longitude} (±${location.accuracy}m)`
        : null;
      
      await callOdooMethod(
        'messob.fms.trip',
        'action_report_incident',
        [tripId],
        {
          incident_type: incidentType,
          description: description.trim(),
          location: locationStr,
        }
      );
      
      toast.success('Incident reported successfully');
      onClose();
    } catch (error) {
      console.error('Failed to report incident:', error);
      toast.error('Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl">
        <CardHeader className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-900 dark:text-red-100 font-black">Report Incident</CardTitle>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Incident Type Selection */}
            <div>
              <Label className="text-sm font-black text-gray-900 dark:text-gray-100 mb-3 block uppercase tracking-wider">
                Incident Type *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {incidentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setIncidentType(type.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      incidentType === type.value
                        ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2 block uppercase tracking-wider">
                Description * (min 10 characters)
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about the incident..."
                className="w-full min-h-[120px] p-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg focus:border-red-500 dark:focus:border-red-600 focus:outline-none resize-none font-medium"
                required
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold">
                {description.length} / 10 characters minimum
              </p>
            </div>

            {/* Location Capture */}
            <div>
              <Label className="text-sm font-black text-gray-900 dark:text-gray-100 mb-2 block uppercase tracking-wider">
                Location (Optional)
              </Label>
              <Button
                type="button"
                onClick={getCurrentLocation}
                variant="outline"
                className="w-full border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {location ? '✓ Location Captured' : 'Capture Current Location'}
              </Button>
              {location && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-bold bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  <br />
                  Accuracy: ±{location.accuracy.toFixed(0)}m
                </p>
              )}
            </div>

            {/* Warning Message */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100 font-semibold">
                <strong className="font-black">⚠️ Important:</strong> This report will be sent immediately to the dispatcher.
                For medical emergencies, call emergency services first.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white font-black"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Report Incident
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
