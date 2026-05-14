import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Car, UserCheck, Clock, UserPlus, PlusCircle, FileText, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/useUserStore";
import { searchRead } from "@/lib/odooApi";

const quickActions = [
  { label: "Add User",    icon: UserPlus,   path: "/dashboard/admin/users",   color: "bg-blue-600 hover:bg-blue-700" },
  { label: "Add Vehicle", icon: PlusCircle, path: "/dashboard/admin/vehicles", color: "bg-green-600 hover:bg-green-700" },
  { label: "Add Driver",  icon: UserCheck,  path: "/dashboard/admin/drivers",  color: "bg-purple-600 hover:bg-purple-700" },
  { label: "View Reports",icon: LogIn,      path: "/dashboard/admin/reports",  color: "bg-gray-700 hover:bg-gray-800" },
];

export default function AdminDashboard() {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, vehicles: 0, drivers: 0, pending: 0 });

  useEffect(() => {
    Promise.all([
      searchRead("res.users", [["active", "=", true]], ["id"], 200),
      searchRead("fleet.vehicle", [["active", "=", true]], ["id"], 200),
      searchRead("messob.fms.driver", [["is_active", "=", true]], ["id"], 200),
      searchRead("messob.fms.trip", [["state", "=", "pending"]], ["id"], 200),
    ]).then(([users, vehicles, drivers, pending]) => {
      setStats({
        users: users.length,
        vehicles: vehicles.length,
        drivers: drivers.length,
        pending: pending.length,
      });
    }).catch(() => {});
  }, []);

  const statCards = [
    { label: "Total Users",      value: stats.users,   icon: Users,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
    { label: "Total Vehicles",   value: stats.vehicles, icon: Car,      color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
    { label: "Total Drivers",    value: stats.drivers,  icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Pending Requests", value: stats.pending,  icon: Clock,    color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className={`border ${s.border} ${s.bg} shadow-sm`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white shadow-sm">
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Button key={a.label} onClick={() => navigate(a.path)}
              className={`h-14 font-black text-white rounded-xl gap-2 ${a.color}`}>
              <a.icon className="h-5 w-5" /> {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
