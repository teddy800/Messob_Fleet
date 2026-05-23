import { useState } from 'react';
import { callMethod } from '@/lib/odooApi';
import { toast } from 'sonner';

/**
 * Custom hook to handle quick vehicle assignment from calendar
 * @returns {Object} - { assignVehicle, assigning, error }
 */
export function useQuickAssign() {
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  const assignVehicle = async (tripId, vehicleId, driverId) => {
    setAssigning(true);
    setError(null);

    try {
      const response = await callMethod(
        'messob.fms.trip',
        'quick_assign_vehicle',
        [tripId],
        {
          vehicle_id: vehicleId,
          driver_id: driverId,
        }
      );

      if (response.success) {
        toast.success('Vehicle assigned successfully!');
        return response.trip;
      } else {
        const errorMsg = response.message || 'Assignment failed';
        setError(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      toast.error(`Assignment failed: ${errorMsg}`);
      throw err;
    } finally {
      setAssigning(false);
    }
  };

  return { assignVehicle, assigning, error };
}
