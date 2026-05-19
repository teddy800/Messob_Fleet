import { useEffect, useState } from "react";
import { FileText, Car, CheckCircle, Clock, XCircle, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { searchRead } from "@/lib/odooApi";

export default function Reports() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchRead(
      "messob.fms.trip",
      [],
      ["name", "state", "purpose", "pickup", "destination", "start_dt", "requester_id", "assigned_vehicle_id", "assigned_driver_id"],
      100
    ).then(setTrips).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stateBadge = {
    draft:       "bg-gray-100 text-gray-500",
    pending:     "bg-yellow-100 text-yellow-700",
    approved:    "bg-green-100 text-green-700",
    rejected:    "bg-red-100 text-red-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed:   "bg-purple-100 text-purple-700",
    closed:      "bg-gray-200 text-gray-600",
  };

  const counts = {
    total:    trips.length,
    pending:  trips.filter(t => t.state === "pending").length,
    approved: trips.filter(t => ["approved","in_progress"].includes(t.state)).length,
    completed:trips.filter(t => t.state === "completed").length,
    rejected: trips.filter(t => t.state === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-brand-blue">Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Trips",  value: counts.total,     icon: Car,         color: "text-brand-blue" },
          { label: "Pending",      value: counts.pending,   icon: Clock,       color: "text-yellow-600" },
          { label: "Approved",     value: counts.approved,  icon: CheckCircle, color: "text-green-600" },
          { label: "Completed",    value: counts.completed, icon: BadgeCheck, color: "text-purple-600" },
          { label: "Rejected",     value: counts.rejected,  icon: XCircle,     color: "text-red-500" },
        ].map((s) => (
          <Card key={s.label} className="border border-gray-100 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trip log table */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <h2 className="font-bold text-brand-blue mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-gold" /> All Trip Requests
          </h2>
          {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Request ID", "Requester", "Route", "Start Date", "Status"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-bold uppercase tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                      <td className="py-3 px-3 font-bold text-brand-blue">{t.name}</td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{Array.isArray(t.requester_id) ? t.requester_id[1] : "—"}</td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{t.pickup} → {t.destination}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs dark:text-gray-400">{t.start_dt ? new Date(t.start_dt).toLocaleDateString() : "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${stateBadge[t.state] || "bg-gray-100 text-gray-500"}`}>
                          {t.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {trips.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-8">No trip records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
