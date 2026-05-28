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
    { label: "Total Users",      value: stats.users,   icon: Users,     color: "text-blue-700",   iconBg: "bg-blue-100",   border: "border-gray-200" },
    { label: "Total Vehicles",   value: stats.vehicles, icon: Car,      color: "text-emerald-700",  iconBg: "bg-emerald-100",  border: "border-gray-200" },
    { label: "Total Drivers",    value: stats.drivers,  icon: UserCheck, color: "text-purple-700", iconBg: "bg-purple-100", border: "border-gray-200" },
    { label: "Pending Requests", value: stats.pending,  icon: Clock,    color: "text-orange-700", iconBg: "bg-orange-100", border: "border-gray-200" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-brand-blue dark:text-blue-400">Admin Dashboard</h1>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-2">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className={`bg-white dark:bg-gray-800 border ${s.border} hover:shadow-lg transition-all duration-200 hover:border-gray-300`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${s.iconBg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400`}>{s.label}</p>
                <p className={`text-4xl font-black ${s.color} dark:text-gray-100`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-base font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Button key={a.label} onClick={() => navigate(a.path)}
              className={`h-14 font-bold text-white rounded-lg gap-2 shadow-md hover:shadow-lg transition-all ${a.color}`}>
              <a.icon className="h-5 w-5" /> {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
