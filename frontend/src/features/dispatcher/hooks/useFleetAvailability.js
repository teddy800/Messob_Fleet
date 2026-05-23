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

      console.log('🚗 Fetching fleet availability:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        filters
      });

      const response = await callMethod(
        'messob.fms.trip',
        'get_fleet_availability',
        [startDate.toISOString(), endDate.toISOString()],
        {
          category: (filters.category && filters.category !== 'all') ? filters.category : null,
          status: filters.status || null,
        }
      );

      console.log('📦 Fleet availability response:', response);

      // Handle different response formats
      if (!response) {
        console.error('❌ No response received from API');
        setError('No response from server');
        return;
      }

      // Check if response has success flag
      if (response.success === false) {
        const errorMsg = response.error || 'API returned success: false';
        console.error('❌ API returned error:', errorMsg);
        setError(errorMsg);
        return;
      }

      // Extract vehicles array
      let vehicles = [];
      if (response.success && response.vehicles) {
        vehicles = response.vehicles;
      } else if (Array.isArray(response.vehicles)) {
        vehicles = response.vehicles;
      } else if (Array.isArray(response)) {
        vehicles = response;
      }
      
      console.log(`✅ Received ${vehicles.length} vehicles`);
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        vehicles = vehicles.filter(v => 
          v.plate_no && v.plate_no.toLowerCase().includes(query)
        );
        console.log(`🔍 Filtered to ${vehicles.length} vehicles matching "${query}"`);
      }

      setData({ vehicles });
    } catch (err) {
      const errorMsg = err.message || 'An error occurred';
      console.error('❌ Fleet availability error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(errorMsg);
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
