import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Calendar, User, Play, Check, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/useUserStore";
import { searchRead, writeRecord } from "@/lib/odooApi";
import { toast } from "sonner";

const statusStyle = {
  approved:    { label: "Assigned",    cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  in_progress: { label: "In Progress", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  completed:   { label: "Completed",   cls: "bg-purple-50 text-purple-600 border-purple-100" },
};

export default function DriverRequests() {
  const user = useUserStore((s) => s.user);
  const [partnerId, setPartnerId] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverLookupLoading, setDriverLookupLoading] = useState(true);

  const fetchPartnerId = async () => {
    if (!user?.uid) {
      setDriverLookupLoading(false);
      return;
    }

    try {
      const [userRecord] = await searchRead(
        "res.users",
        [["id", "=", user.uid]],
        ["partner_id"],
        1
      );

      const partner = userRecord?.partner_id;
      if (Array.isArray(partner)) {
        setPartnerId(partner[0]);
      }
    } catch (e) {
      console.error("Driver partner lookup failed:", e);
    } finally {
      setDriverLookupLoading(false);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const domain = [["state", "in", ["approved", "in_progress", "completed"]]];
      if (partnerId) {
        domain.unshift(["assigned_driver_id", "=", partnerId]);
      }

      const data = await searchRead(
        "messob.fms.trip",
        domain,
        ["id", "name", "state", "pickup", "destination", "start_dt", "end_dt", "requester_id", "assigned_vehicle_id", "purpose"],
        100
      );
      setTrips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPartnerId(); }, [user?.uid]);

  useEffect(() => {
    if (!driverLookupLoading) {
      fetchTrips();
    }

    // Auto-refresh trips every 2 minutes to check for time expirations
    const refreshInterval = setInterval(() => {
      if (!driverLookupLoading) {
        fetchTrips();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, [driverLookupLoading, partnerId]);

  const navigate = useNavigate();

  // Helper function to check if trip start time has passed with grace period
  const isStartTimePassed = (trip) => {
    if (!trip.start_dt) return false;
    
    const currentTime = new Date();
    const startTime = new Date(trip.start_dt);
    const graceMinutes = 30; // 30 minutes grace period
    const graceTime = new Date(startTime.getTime() + (graceMinutes * 60 * 1000));
    
    return currentTime > graceTime;
  };

  // Helper function to check if trip is expired (past end time)
  const isTripExpired = (trip) => {
    if (!trip.end_dt) return false;
    
    const currentTime = new Date();
    const endTime = new Date(trip.end_dt);
    
    return currentTime > endTime;
  };

  // Helper function to get trip time status
  const getTripTimeStatus = (trip) => {
    if (isTripExpired(trip)) {
      return { status: 'expired', message: 'Trip time expired', color: 'red' };
    }
    
    if (isStartTimePassed(trip)) {
      return { status: 'late', message: 'Start time passed', color: 'orange' };
    }
    
    const currentTime = new Date();
    const startTime = new Date(trip.start_dt);
    const timeUntilStart = Math.floor((startTime - currentTime) / (1000 * 60)); // minutes
    
    if (timeUntilStart <= 15 && timeUntilStart > 0) {
      return { status: 'soon', message: `Starts in ${timeUntilStart}min`, color: 'green' };
    }
    
    return { status: 'normal', message: null, color: null };
  };

  const handleStart = async (id) => {
    // Find the trip to validate
    const trip = trips.find(t => t.id === id);
    
    // Validate trip time before starting
    if (trip && isStartTimePassed(trip)) {
      toast.error('Trip start time has expired. Please contact dispatcher for assistance.');
      return;
    }

    if (trip && isTripExpired(trip)) {
      toast.error('Trip time has expired. Please contact dispatcher for assistance.');
      return;
    }

    setLoading(true);
    try {
      await writeRecord("messob.fms.trip", [id], { state: "in_progress" });
      toast.success('Trip started successfully');
      fetchTrips();
    } catch (e) {
      console.error(e);
      toast.error('Failed to start trip');
      setLoading(false);
    }
  };

  const handleComplete = async (id) => {
    setLoading(true);
    try {
      await writeRecord("messob.fms.trip", [id], { state: "completed" });
      toast.success('Trip completed successfully');
      fetchTrips();
    } catch (e) {
      console.error(e);
      toast.error('Failed to complete trip');
      setLoading(false);
    }
  };

  const handleFuelChange = (id) => {
    navigate(`/dashboard/driver/fuel?tripId=${id}`);
  };

  const callDispatcher = () => {
    window.location.href = 'tel:+251911234567';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brand-blue">My Assigned Trips</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome, {user?.name}. Here are your upcoming and active trips.</p>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No trips assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const st = statusStyle[trip.state] || statusStyle.approved;
            const timeStatus = getTripTimeStatus(trip);
            const isExpired = timeStatus.status === 'expired';
            const isLate = timeStatus.status === 'late';
            const isSoon = timeStatus.status === 'soon';
            const isOverdue = trip.state === 'in_progress' && isTripExpired(trip);

            // Determine card styling based on time status
            let cardClass = "border border-gray-100 hover:shadow-md transition-shadow";
            if (trip.state === 'approved') {
              if (isExpired) {
                cardClass = "border-2 border-red-300 bg-red-50 shadow-md";
              } else if (isLate) {
                cardClass = "border-2 border-orange-300 bg-orange-50 shadow-md";
              } else if (isSoon) {
                cardClass = "border-2 border-green-300 bg-green-50 shadow-md";
              }
            } else if (trip.state === 'in_progress' && isOverdue) {
              cardClass = "border-2 border-orange-400 bg-orange-50 shadow-md";
            }

            return (
              <Card key={trip.id} className={cardClass}>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-black text-brand-blue text-sm">{trip.name}</span>
                    <div className="flex items-center gap-2">
                      {timeStatus.message && trip.state === 'approved' && (
                        <Badge className={`text-[10px] font-black uppercase tracking-widest border ${
                          isExpired ? 'bg-red-100 text-red-700 border-red-200' :
                          isLate ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          isSoon ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {timeStatus.message}
                        </Badge>
                      )}
                      {isOverdue && trip.state === 'in_progress' && (
                        <Badge className="text-[10px] font-black uppercase tracking-widest border bg-orange-100 text-orange-700 border-orange-200 animate-pulse">
                          Overdue
                        </Badge>
                      )}
                      <Badge className={`text-[10px] font-black uppercase tracking-widest border ${st.cls}`}>{st.label}</Badge>
                    </div>
                  </div>

                  {/* Time Warning Messages */}
                  {trip.state === 'approved' && isExpired && (
                    <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Trip time has expired</p>
                        <p className="text-xs text-red-700 mt-1">Please contact the dispatcher for assistance or trip rescheduling.</p>
                      </div>
                    </div>
                  )}

                  {trip.state === 'approved' && isLate && !isExpired && (
                    <div className="flex items-start gap-2 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-orange-800">Start time has passed</p>
                        <p className="text-xs text-orange-700 mt-1">Please contact dispatcher if you still need to start this trip.</p>
                      </div>
                    </div>
                  )}

                  {trip.state === 'in_progress' && isOverdue && (
                    <div className="flex items-start gap-2 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-orange-800">Trip is overdue</p>
                        <p className="text-xs text-orange-700 mt-1">Scheduled end time has passed. Please complete the trip as soon as possible.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Requester</p>
                        <p className="font-bold text-gray-800 text-sm">{Array.isArray(trip.requester_id) ? trip.requester_id[1] : "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Route</p>
                        <p className="font-bold text-gray-800 text-sm">{trip.pickup} → {trip.destination}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Start Time</p>
                        <p className="font-bold text-gray-800 text-sm">{trip.start_dt ? new Date(trip.start_dt).toLocaleString() : "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">End Time</p>
                        <p className={`font-bold text-sm ${
                          (trip.state === 'in_progress' && isOverdue) || (trip.state === 'approved' && isExpired) 
                            ? 'text-red-600' 
                            : 'text-gray-800'
                        }`}>
                          {trip.end_dt ? new Date(trip.end_dt).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 sm:col-span-2">
                      <Calendar className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Purpose</p>
                        <p className="font-bold text-gray-800 text-sm">{trip.purpose}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    {trip.state === "approved" && (
                      <>
                        {isExpired ? (
                          <Button
                            onClick={callDispatcher}
                            variant="outline"
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 font-black h-12 rounded-xl gap-2"
                          >
                            <Phone className="h-4 w-4" /> Call Dispatcher
                          </Button>
                        ) : isLate ? (
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={callDispatcher}
                              variant="outline"
                              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 font-black h-12 rounded-xl gap-2"
                            >
                              <Phone className="h-4 w-4" /> Call
                            </Button>
                            <Button
                              onClick={() => handleStart(trip.id)}
                              disabled
                              className="w-full bg-gray-400 text-white font-black h-12 rounded-xl gap-2 cursor-not-allowed opacity-50"
                            >
                              <Play className="h-4 w-4 fill-white" /> Start Trip
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleStart(trip.id)}
                            className={`w-full text-white font-black h-12 rounded-xl gap-2 ${
                              isSoon 
                                ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                                : 'bg-brand-blue hover:bg-blue-900'
                            }`}
                          >
                            <Play className="h-4 w-4 fill-white" /> {isSoon ? 'Start Trip (Ready)' : 'Start Trip'}
                          </Button>
                        )}
                      </>
                    )}
                    {trip.state === "in_progress" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleComplete(trip.id)}
                          className={`w-full text-white font-black h-12 rounded-xl gap-2 ${
                            isOverdue 
                              ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <Check className="h-4 w-4" /> {isOverdue ? 'Complete Now' : 'Complete'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleFuelChange(trip.id)}
                          className="w-full bg-brand-blue border-brand-blue/30 hover:bg-brand-blue/50 font-black h-12 rounded-xl text-white gap-2"
                        >
                          Fuel Buy
                        </Button>
                      </div>
                    )}
                    {trip.state === "completed" && (
                      <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold text-sm">
                        <CheckCircle className="h-4 w-4" /> Trip completed
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
