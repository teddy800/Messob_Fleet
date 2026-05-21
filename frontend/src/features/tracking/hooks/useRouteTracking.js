import { useState, useEffect, useRef } from 'react';
import { odooApi } from '@/lib/odooApi';

/**
 * Custom hook for route tracking functionality
 * Handles FR-3.1: Route Display, FR-3.2: GPS Tracking
 */
export function useRouteTracking(tripId) {
  const [routeData, setRouteData] = useState(null);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef(null);

  // Fetch route display data
  const fetchRouteData = async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await odooApi.call(
        '/api/route/display',
        'POST',
        { trip_id: tripId }
      );

      if (response.success) {
        setRouteData(response);
      } else {
        setError(response.error || 'Failed to load route data');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch GPS position
  const fetchGpsPosition = async () => {
    if (!tripId) return;

    try {
      const response = await odooApi.call(
        '/api/route/gps-position',
        'POST',
        { trip_id: tripId }
      );

      if (response.success) {
        setGpsPosition(response);
      } else {
        console.warn('GPS position not available:', response.error);
      }
    } catch (err) {
      console.warn('GPS fetch error:', err.message);
    }
  };

  // Start GPS tracking
  const startTracking = () => {
    if (intervalRef.current) return; // Already tracking

    setIsTracking(true);
    fetchGpsPosition(); // Initial fetch

    // Update GPS position every 10 seconds
    intervalRef.current = setInterval(fetchGpsPosition, 10000);
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  };

  // Refresh route data
  const refreshRoute = () => {
    fetchRouteData();
    if (isTracking) {
      fetchGpsPosition();
    }
  };

  // Initialize route data
  useEffect(() => {
    fetchRouteData();
    return () => stopTracking(); // Cleanup on unmount
  }, [tripId]);

  return {
    routeData,
    gpsPosition,
    loading,
    error,
    isTracking,
    startTracking,
    stopTracking,
    refreshRoute,
  };
}

/**
 * Custom hook for collaborative pickup functionality
 * Handles FR-3.3: Collaborative Pickup
 */
export function useCollaborativePickup(tripId) {
  const [collaborativeData, setCollaborativeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCollaborativeData = async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await odooApi.call(
        '/api/route/collaborative-pickup',
        'POST',
        { trip_id: tripId }
      );

      if (response.success) {
        setCollaborativeData(response);
      } else {
        setError(response.error || 'Failed to load collaborative data');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborativeData();
  }, [tripId]);

  return {
    collaborativeData,
    loading,
    error,
    refresh: fetchCollaborativeData,
  };
}

/**
 * Custom hook for dynamic pickup point updates
 * Handles FR-3.4: Dynamic Pickup Point Update
 */
export function usePickupUpdate(tripId) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const updatePickupPoint = async (newAddress, newCoordinates) => {
    if (!tripId) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await odooApi.call(
        '/api/route/update-pickup',
        'POST',
        {
          trip_id: tripId,
          new_pickup_address: newAddress,
          new_coordinates: newCoordinates,
        }
      );

      if (response.success) {
        return response;
      } else {
        const errorMsg = response.error || 'Failed to update pickup point';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updatePickupPoint,
    updating,
    error,
  };
}