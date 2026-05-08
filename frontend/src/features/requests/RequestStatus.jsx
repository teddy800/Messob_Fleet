import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserStore } from "@/store/useUserStore";
import { mockRequests } from "./mockRequests";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    activeBg: "bg-yellow-500",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    activeBg: "bg-green-600",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    activeBg: "bg-red-500",
  },
};

export default function RequestStatus() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);

  const counts = {
    pending: mockRequests.filter((r) => r.status === "pending").length,
    approved: mockRequests.filter((r) => r.status === "approved").length,
    rejected: mockRequests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Request Status</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.name}. Here's an overview of your vehicle requests.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <Card
              key={status}
              onClick={() => navigate(`/dashboard/requests/status/${status}`)}
              className={`cursor-pointer border-2 ${config.border} ${config.bg} hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group`}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${config.activeBg} bg-opacity-10`}>
                    <Icon className={`h-7 w-7 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {config.label}
                    </p>
                    <p className={`text-4xl font-black ${config.color}`}>
                      {counts[status]}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Requests Preview */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">
          Recent Requests
        </h2>
        <div className="space-y-3">
          {mockRequests.slice(0, 3).map((req) => {
            const config = statusConfig[req.status];
            const Icon = config.icon;
            return (
              <div
                key={req.id}
                onClick={() => navigate(`/dashboard/requests/status/${req.status}`)}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 cursor-pointer hover:shadow-md hover:border-brand-blue/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <p className="font-bold text-sm text-gray-800">{req.id}</p>
                    <p className="text-xs text-gray-400">
                      {req.startPoint} → {req.destination}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${config.bg} ${config.color}`}
                  >
                    {config.label}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{req.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
