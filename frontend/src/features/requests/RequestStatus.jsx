import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserStore } from "@/store/useUserStore";
import { useTripRequests } from "@/lib/useTripRequests";

const statusConfig = {
  pending: {
    label: "Pending", icon: Clock,
    color: "text-amber-500/70 dark:text-amber-400/60", bg: "bg-amber-50/40 dark:bg-amber-900/10",
    border: "border-amber-200/50 dark:border-amber-700/30", activeBg: "bg-amber-100/30 dark:bg-amber-800/10",
  },
  approved: {
    label: "Approved", icon: CheckCircle,
    color: "text-emerald-500/70 dark:text-emerald-400/60", bg: "bg-emerald-50/40 dark:bg-emerald-900/10",
    border: "border-emerald-200/50 dark:border-emerald-700/30", activeBg: "bg-emerald-100/30 dark:bg-emerald-800/10",
  },
  rejected: {
    label: "Rejected", icon: XCircle,
    color: "text-rose-500/70 dark:text-rose-400/60", bg: "bg-rose-50/40 dark:bg-rose-900/10",
    border: "border-rose-200/50 dark:border-rose-700/30", activeBg: "bg-rose-100/30 dark:bg-rose-800/10",
  },
};

export default function RequestStatus() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const { trips, loading, refetch } = useTripRequests([
    "pending",
    "approved",
    "rejected",
    "in_progress",
    "completed",
    "draft",
  ]);

  useEffect(() => {
    if (location.state?.newTripId) {
      refetch();
    }
  }, [location.state?.newTripId, refetch]);

  const counts = {
    pending:  trips.filter((r) => r.state === "pending").length,
    approved: trips.filter((r) => ["approved", "in_progress"].includes(r.state)).length,
    rejected: trips.filter((r) => r.state === "rejected").length,
  };

  const recent = trips.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Request Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.name}. Here's an overview of your vehicle requests.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              return (
                <Card
                  key={status}
                  onClick={() => navigate(`/dashboard/requests/status/${status}`)}
                  className={`cursor-pointer border-2 ${config.border} ${config.bg} hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group dark:bg-opacity-10 dark:hover:bg-opacity-20`}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 dark:bg-opacity-10">
                      <div className={`p-3 rounded-xl ${config.activeBg} bg-opacity-10 group-hover:bg-opacity-20`}>
                        <Icon className={`h-7 w-7 ${config.color} dark:text-gray-300`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-400">{config.label}</p>
                        <p className={`text-4xl font-black ${config.color} dark:text-gray-400`}>{counts[status]}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors dark:text-gray-400" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Recent Requests</h2>
            <div className="space-y-3">
              {recent.map((req) => {
                const displayState = ["approved", "in_progress"].includes(req.state) ? "approved" : req.state;
                const config = statusConfig[displayState] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <div
                    key={req.id}
                    onClick={() => navigate(`/dashboard/requests/status/${displayState}`)}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 cursor-pointer hover:shadow-md hover:border-brand-blue/20 transition-all dark:bg-gray-800 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <div>
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-300">{req.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400">{req.pickup} → {req.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="text-xs text-gray-400 mt-1 dark:text-gray-400">
                        {req.start_dt ? new Date(req.start_dt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {recent.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6 dark:text-gray-400">No requests yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
