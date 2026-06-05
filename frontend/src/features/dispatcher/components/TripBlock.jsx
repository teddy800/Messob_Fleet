import { format } from 'date-fns';
import { MapPin, User, Clock, FileText } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function TripBlock({ trip, style, onRefresh }) {
  // Color based on trip state
  const getStateColor = (state) => {
    switch (state) {
      case 'approved':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'in_progress':
        return 'bg-emerald-500/80 hover:bg-emerald-600/80';
      case 'completed':
        return 'bg-purple-500 hover:bg-purple-600';
      default:
        return 'bg-rose-400/70 hover:bg-rose-500/70';
    }
  };

  const formatTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch {
      return 'N/A';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            key={trip.id}
            className={`absolute top-2 bottom-2 ${getStateColor(trip.state)} rounded-lg px-2 py-1 text-white text-xs font-bold cursor-pointer hover:shadow-lg hover:scale-105 transition-all overflow-hidden z-10`}
            style={style}
          >
            <div className="flex flex-col h-full justify-center">
              <div className="truncate font-bold">{trip.request_id}</div>
              <div className="truncate text-[10px] opacity-90">{trip.requester}</div>
              <div className="truncate text-[9px] opacity-75">
                {trip.state === 'approved' ? '✓ APPROVED' : '● IN PROGRESS'}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4 bg-white border-2 border-brand-blue shadow-xl">
          <div className="space-y-2">
            {/* Request ID */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <FileText className="h-4 w-4 text-brand-blue flex-shrink-0" />
              <span className="font-bold text-brand-blue">{trip.request_id}</span>
              <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                trip.state === 'approved' ? 'bg-blue-100 text-blue-600' :
                trip.state === 'in_progress' ? 'bg-emerald-100 text-emerald-600' :
                'bg-gray-100 text-gray-700'
              }`}>
                {trip.state.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Requester */}
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Requester</div>
                <div className="font-medium text-gray-900">{trip.requester}</div>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Time</div>
                <div className="font-medium text-gray-900">
                  {formatTime(trip.start_dt)} - {formatTime(trip.end_dt)}
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Route</div>
                <div className="font-medium text-gray-900">
                  <div className="truncate">{trip.pickup}</div>
                  <div className="text-gray-400 text-xs my-1">↓</div>
                  <div className="truncate">{trip.destination}</div>
                </div>
              </div>
            </div>

            {/* Purpose */}
            {trip.purpose && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Purpose</div>
                <div className="text-sm text-gray-700">{trip.purpose}</div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
