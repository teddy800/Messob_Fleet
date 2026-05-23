import { useState } from 'react';
import { X, Car, User, Calendar, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Quick Assign Modal - Assign vehicle and driver to a trip from calendar
 */
export default function QuickAssignModal({ 
  isOpen, 
  onClose, 
  vehicle, 
  date,
  onAssign 
}) {
  const [formData, setFormData] = useState({
    tripId: '',
    driverId: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onAssign({
        vehicleId: vehicle.id,
        ...formData,
        date: date.toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-blue to-blue-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Car className="h-6 w-6 text-brand-gold" />
                Quick Assign Vehicle
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Assign {vehicle?.plate_no} to a trip
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Vehicle Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="font-bold text-brand-blue">{vehicle?.plate_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-bold text-gray-900">{vehicle?.category}</p>
              </div>
            </div>
          </div>

          {/* Trip Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Select Trip Request
            </label>
            <Select
              value={formData.tripId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tripId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a pending trip request..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trip1">TR-001 - Staff Meeting</SelectItem>
                <SelectItem value="trip2">TR-002 - Airport Pickup</SelectItem>
                <SelectItem value="trip3">TR-003 - Site Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Assign Driver
            </label>
            <Select
              value={formData.driverId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, driverId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an available driver..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver1">John Doe - License: DL-12345</SelectItem>
                <SelectItem value="driver2">Jane Smith - License: DL-67890</SelectItem>
                <SelectItem value="driver3">Mike Johnson - License: DL-11111</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time
              </label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full"
                required
              />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Trip Purpose
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              rows="3"
              placeholder="Enter trip purpose or notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.tripId || !formData.driverId}
              className="bg-brand-blue hover:bg-blue-700"
            >
              {loading ? 'Assigning...' : 'Assign Vehicle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
