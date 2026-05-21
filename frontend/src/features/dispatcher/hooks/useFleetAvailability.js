import { useState, useEffect } from 'react';
import { callMethod } from '@/lib/odooApi';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Custom hook to fetch and manage fleet availability data
 * @param {Date} date - The date to fetch availability for
 * @param {Object} filters - Filter options (category, status, searchQuery)
 * @returns {Object} - { data, loading, error, refetch }
 */
export function useFleetAvailability(date, filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const response = await callMethod(
        'messob.fms.trip',
        'get_fleet_availability',
        [],
        {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          category: filters.category || null,
          status: filters.status || null,
        }
      );

      if (response.success) {
        // Filter by search query if provided
        let vehicles = response.vehicles || [];
        
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          vehicles = vehicles.filter(v => 
            v.plate_no.toLowerCase().includes(query)
          );
        }

        setData({ vehicles });
      } else {
        setError(response.error || 'Failed to fetch availability');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Fleet availability error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAvailability, 30000);
    return () => clearInterval(interval);
  }, [date, filters.category, filters.status, filters.searchQuery]);

  return { data, loading, error, refetch: fetchAvailability };
}
