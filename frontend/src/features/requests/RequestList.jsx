import { useParams, useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ArrowLeft, MapPin, Calendar, Car, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTripRequests } from "@/lib/useTripRequests";

const statusConfig = {
  pending: {
    label: "Pending", icon: Clock,
    color: "text-yellow-500", bg: "bg-yellow-50",
    border: "border-yellow-300", badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  approved: {
    label: "Approved", icon: CheckCircle,
    color: "text-green-600", bg: "bg-green-50",
    border: "border-green-300", badgeClass: "bg-green-100 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected", icon: XCircle,
    color: "text-red-500", bg: "bg-red-50",
    border: "border-red-300", badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
};

export default function RequestList() {
  const { status } = useParams();
  const navigate = useNavigate();

  const stateFilter = status === "approved" ? ["approved", "in_progress"] : [status];
  const { trips, loading } = useTripRequests(stateFilter);

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/requests/status")}
          className="rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Icon className={`h-6 w-6 ${config.color}`} />
          <h1 className="text-2xl font-black text-brand-blue">{config.label} Requests</h1>
          <span className={`ml-2 text-xs font-black px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
            {trips.length}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No {config.label.toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((req) => (
            <Card key={req.id} className={`border-l-4 ${config.border} hover:shadow-md transition-shadow`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-brand-blue text-sm">{req.name}</span>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${config.badgeClass}`}>
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Route</p>
                      <p className="font-bold text-gray-800">{req.pickup} → {req.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date & Time</p>
                      <p className="font-bold text-gray-800">
                        {req.start_dt ? new Date(req.start_dt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vehicle Category</p>
                      <p className="font-bold text-gray-800">{req.vehicle_category || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Requested By</p>
                      <p className="font-bold text-gray-800">
                        {Array.isArray(req.requester_id) ? req.requester_id[1] : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Purpose: </span>
                  <span className="text-sm font-bold text-brand-blue">{req.purpose}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
