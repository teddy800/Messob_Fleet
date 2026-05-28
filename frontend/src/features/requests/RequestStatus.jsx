import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserStore } from "@/store/useUserStore";
import { useTripRequests } from "@/lib/useTripRequests";

const statusConfig = {
  pending: {
    label: "Pending", icon: Clock,
    color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-600", activeBg: "bg-amber-100 dark:bg-amber-800/30",
  },
  approved: {
    label: "Approved", icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-600", activeBg: "bg-emerald-100 dark:bg-emerald-800/30",
  },
  rejected: {
    label: "Rejected", icon: XCircle,
    color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-300 dark:border-rose-600", activeBg: "bg-rose-100 dark:bg-rose-800/30",
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
        <h1 className="text-3xl font-black text-brand-blue dark:text-blue-400">Request Status</h1>
        <p className="text-base font-medium text-gray-700 dark:text-gray-200 mt-2">
          Welcome back, {user?.name}. Here's an overview of your vehicle requests.
        </p>
      </div>

      {loading ? (
        <p className="text-base font-semibold text-gray-600 dark:text-gray-300">Loading...</p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              return (
                <Card
                  key={status}
                  onClick={() => navigate(`/dashboard/requests/status/${status}`)}
                  className={`cursor-pointer border-2 ${config.border} ${config.bg} hover:shadow-xl hover:scale-[1.03] transition-all duration-200 group`}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${config.activeBg} group-hover:shadow-md`}>
                        <Icon className={`h-8 w-8 ${config.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">{config.label}</p>
                        <p className={`text-5xl font-black ${config.color}`}>{counts[status]}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-gray-700 dark:text-gray-200 mb-4">Recent Requests</h2>
            <div className="space-y-3">
              {recent.map((req) => {
                const displayState = ["approved", "in_progress"].includes(req.state) ? "approved" : req.state;
                const config = statusConfig[displayState] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <div
                    key={req.id}
                    onClick={() => navigate(`/dashboard/requests/status/${displayState}`)}
                    className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-xl px-6 py-5 cursor-pointer hover:shadow-lg hover:border-brand-blue/50 transition-all dark:bg-gray-800 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={`h-6 w-6 ${config.color}`} />
                      <div>
                        <p className="font-black text-base text-gray-900 dark:text-gray-100">{req.name}</p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{req.pickup} → {req.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
                        {req.start_dt ? new Date(req.start_dt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {recent.length === 0 && (
                <p className="text-base font-semibold text-gray-600 dark:text-gray-300 text-center py-8">No requests yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
