import { useState } from 'react';
import { addDays, subDays, addWeeks, subWeeks } from 'date-fns';

/**
 * Custom hook to manage calendar date navigation
 * @param {Date} initialDate - Initial date (defaults to today)
 * @returns {Object} - Navigation state and methods
 */
export function useCalendarNavigation(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'

  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    setCurrentDate(prev =>
      viewMode === 'daily' ? subDays(prev, 1) : subWeeks(prev, 1)
    );
  };

  const goToNext = () => {
    setCurrentDate(prev =>
      viewMode === 'daily' ? addDays(prev, 1) : addWeeks(prev, 1)
    );
  };

  const goToDate = (date) => setCurrentDate(date);

  return {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
    goToDate,
  };
}
