import { useState } from "react";
import { MapPin, Clock, Gauge, Calendar, User, Play, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/useUserStore";

// Mock trips assigned to this driver
const mockTrips = [
  {
    id: "REQ-002",
    requester: "Abebe Tadesse",
    department: "IT",
    startPoint: "MESSOB Center HQ",
    destination: "Bahir Dar",
    time: "09:30 AM",
    day: "Friday, May 8 2026",
    odometer: "54,320 km",
    tripType: "One-Way",
    status: "assigned", // assigned | started | completed
  },
  {
    id: "REQ-006",
    requester: "Tigist Worku",
    department: "Finance",
    startPoint: "MESSOB Center HQ",
    destination: "Adama",
    time: "07:00 AM",
    day: "Saturday, May 9 2026",
    odometer: "54,450 km",
    tripType: "Round Trip",
    status: "assigned",
  },
];

const statusStyle = {
  assigned:  { label: "Assigned",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  started:   { label: "In Progress", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700 border-green-200" },
};

export default function DriverRequests() {
  const user = useUserStore((s) => s.user);
  const [trips, setTrips] = useState(mockTrips);

  const handleStart = (id) => {
    setTrips((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: "started" } : t)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-brand-blue">My Assigned Trips</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {user?.name}. Here are your upcoming and active trips.
        </p>
      </div>

      {trips.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No trips assigned yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {trips.map((trip) => {
          const st = statusStyle[trip.status];
          return (
            <Card
              key={trip.id}
              className="border border-gray-100 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6 space-y-5">
                {/* Top row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-black text-brand-blue text-sm">{trip.id}</span>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${st.cls}`}>
                    {st.label}
                  </Badge>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Requester</p>
                      <p className="font-bold text-gray-800 text-sm">{trip.requester}</p>
                      <p className="text-xs text-gray-400">{trip.department} Dept.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Route</p>
                      <p className="font-bold text-gray-800 text-sm">
                        {trip.startPoint} → {trip.destination}
                      </p>
                      <p className="text-xs text-gray-400">{trip.tripType}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Starting Time</p>
                      <p className="font-bold text-gray-800 text-sm">{trip.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Day</p>
                      <p className="font-bold text-gray-800 text-sm">{trip.day}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 sm:col-span-2">
                    <Gauge className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Odometer Reading</p>
                      <p className="font-bold text-gray-800 text-sm">{trip.odometer}</p>
                    </div>
                  </div>
                </div>

                {/* Start button */}
                <div className="pt-2 border-t border-gray-100">
                  {trip.status === "assigned" && (
                    <Button
                      onClick={() => handleStart(trip.id)}
                      className="w-full bg-brand-blue hover:bg-blue-900 text-white font-black h-12 rounded-xl gap-2"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Start Trip
                    </Button>
                  )}
                  {trip.status === "started" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-yellow-600 font-bold text-sm">
                      <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                      Trip in progress...
                    </div>
                  )}
                  {trip.status === "completed" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Trip completed
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
