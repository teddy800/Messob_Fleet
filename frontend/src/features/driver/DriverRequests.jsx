import { useEffect, useState } from "react";
import { MapPin, Clock, Calendar, User, Play, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/useUserStore";
import { searchRead, callMethod } from "@/lib/odooApi";

const statusStyle = {
  approved:    { label: "Assigned",    cls: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  completed:   { label: "Completed",   cls: "bg-green-100 text-green-700 border-green-200" },
};

export default function DriverRequests() {
  const user = useUserStore((s) => s.user);
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await searchRead(
        "messob.fms.trip",
        [["state", "in", ["approved", "in_progress", "completed"]]],
        ["id", "name", "state", "pickup", "destination", "start_dt", "end_dt", "requester_id", "assigned_vehicle_id", "purpose"],
        100
      );
      setTrips(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrips(); }, []);

  const handleStart = async (id) => {
    try {
      await callMethod("messob.fms.trip", "write", [id], { state: "in_progress" });
      fetchTrips();
    } catch (e) { console.error(e); }
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
            return (
              <Card key={trip.id} className="border border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-black text-brand-blue text-sm">{trip.name}</span>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest border ${st.cls}`}>{st.label}</Badge>
                  </div>

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
                      <Calendar className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Purpose</p>
                        <p className="font-bold text-gray-800 text-sm">{trip.purpose}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    {trip.state === "approved" && (
                      <Button onClick={() => handleStart(trip.id)}
                        className="w-full bg-brand-blue hover:bg-blue-900 text-white font-black h-12 rounded-xl gap-2">
                        <Play className="h-4 w-4 fill-white" /> Start Trip
                      </Button>
                    )}
                    {trip.state === "in_progress" && (
                      <div className="flex items-center justify-center gap-2 py-2 text-yellow-600 font-bold text-sm">
                        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" /> Trip in progress...
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
