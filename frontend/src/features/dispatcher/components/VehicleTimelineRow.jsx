import { startOfDay, differenceInMinutes } from 'date-fns';
import { Car, Wrench } from 'lucide-react';
import TripBlock from './TripBlock';

export default function VehicleTimelineRow({ vehicle, date, onRefresh }) {
  const dayStart = startOfDay(date);
  const minutesInDay = 1440; // 24 hours * 60 minutes

  // Debug: Log vehicle trips
  console.log(`🚗 Vehicle ${vehicle.plate_no}:`, {
    trips: vehicle.trips?.length || 0,
    tripDetails: vehicle.trips,
    maintenance: vehicle.maintenance?.length || 0
  });

  // Calculate position and width for a time block
  const calculateBlockStyle = (startDt, endDt) => {
    const start = new Date(startDt);
    const end = new Date(endDt);
    
    const startMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    
    // Clamp to day boundaries
    const clampedStart = Math.max(0, Math.min(startMinutes, minutesInDay));
    const clampedDuration = Math.min(durationMinutes, minutesInDay - clampedStart);
    
    return {
      left: `${(clampedStart / minutesInDay) * 100}%`,
      width: `${(clampedDuration / minutesInDay) * 100}%`,
    };
  };

  // Determine vehicle status
  // Priority: Active trips override maintenance status
  const getVehicleStatus = () => {
    // If vehicle is actively on a trip, show as Occupied (highest priority)
    if (vehicle.trips && vehicle.trips.length > 0) {
      return { color: 'red', label: 'Occupied', icon: Car };
    }
    // If vehicle has maintenance but no active trip, show as Maintenance
    if (vehicle.maintenance && vehicle.maintenance.length > 0) {
      return { color: 'yellow', label: 'Maintenance', icon: Wrench };
    }
    // Otherwise, vehicle is available
    return { color: 'green', label: 'Available', icon: Car };
  };

  const status = getVehicleStatus();
  const StatusIcon = status.icon;

  return (
    <div className="flex hover:bg-blue-50 transition-colors">
      {/* Vehicle Info (Sticky Left) */}
      <div className="w-48 flex-shrink-0 p-4 border-r border-gray-200 bg-white sticky left-0 z-10">
        <div className="flex items-start gap-2">
          <StatusIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
            status.color === 'green' ? 'text-green-500' :
            status.color === 'red' ? 'text-red-500' :
            'text-yellow-500'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-brand-blue text-sm truncate">
              {vehicle.plate_no}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {vehicle.category}
            </div>
            <div className={`text-xs font-medium mt-1 ${
              status.color === 'green' ? 'text-green-600' :
              status.color === 'red' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {status.label}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline (24 hours) */}
      <div className="flex-1 relative h-20 overflow-x-auto">
        {/* Hour Grid Background */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="w-20 flex-shrink-0 border-r border-gray-100"
            />
          ))}
        </div>

        {/* Trip Blocks */}
        {vehicle.trips && vehicle.trips.length > 0 ? (
          vehicle.trips.map(trip => (
            <TripBlock
              key={trip.id}
              trip={trip}
              style={calculateBlockStyle(trip.start_dt, trip.end_dt)}
              onRefresh={onRefresh}
            />
          ))
        ) : null}

        {/* Maintenance Blocks */}
        {vehicle.maintenance && vehicle.maintenance.map(maint => (
          <div
            key={maint.id}
            className="absolute top-2 bottom-2 bg-amber-400/70 rounded-lg px-2 py-1 text-white text-xs font-bold cursor-pointer hover:shadow-lg hover:scale-105 transition-all overflow-hidden flex items-center gap-1"
            style={calculateBlockStyle(maint.start_dt, maint.end_dt || maint.start_dt)}
            title={maint.description}
          >
            <Wrench className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Maintenance</span>
          </div>
        ))}

        {/* Available Indicator */}
        {(!vehicle.trips || vehicle.trips.length === 0) && 
         (!vehicle.maintenance || vehicle.maintenance.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-green-600 font-medium text-sm">
              Available All Day
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
