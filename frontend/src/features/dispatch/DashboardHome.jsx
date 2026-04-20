import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Clock, CheckCircle, AlertCircle, Users, Settings, BarChart3 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export default function DashboardHome() {
  const user = useUserStore((state) => state.user);
  
  // Role-specific stats and content
  const getRoleData = (role) => {
    switch (role) {
      case "Admin":
        return {
          title: "System Administration Overview",
          stats: [
            { title: "Total Users", value: "45", icon: Users, color: "text-blue-600" },
            { title: "Active Vehicles", value: "23", icon: Car, color: "text-green-600" },
            { title: "Pending Approvals", value: "8", icon: Clock, color: "text-orange-600" },
            { title: "System Health", value: "98%", icon: BarChart3, color: "text-purple-600" },
          ],
          quickActions: ["User Management", "System Settings", "Generate Reports", "Fleet Analytics"]
        };
      case "Dispatcher":
        return {
          title: "Dispatch Operations Center",
          stats: [
            { title: "Pending Requests", value: "12", icon: Clock, color: "text-brand-gold" },
            { title: "Active Trips", value: "5", icon: Car, color: "text-brand-blue" },
            { title: "Completed Today", value: "8", icon: CheckCircle, color: "text-green-600" },
            { title: "Vehicles Available", value: "15", icon: AlertCircle, color: "text-blue-600" },
          ],
          quickActions: ["Approve Requests", "Assign Vehicles", "Track Trips", "View Schedule"]
        };
      case "Staff":
        return {
          title: "My Travel Requests",
          stats: [
            { title: "My Requests", value: "3", icon: Clock, color: "text-brand-gold" },
            { title: "Approved", value: "7", icon: CheckCircle, color: "text-green-600" },
            { title: "Upcoming Trips", value: "2", icon: Car, color: "text-brand-blue" },
            { title: "Rejected", value: "1", icon: AlertCircle, color: "text-red-600" },
          ],
          quickActions: ["New Request", "View History", "Track Trip", "Contact Support"]
        };
      default:
        return {
          title: "System Overview",
          stats: [
            { title: "Pending Requests", value: "12", icon: Clock, color: "text-brand-gold" },
            { title: "Active Trips", value: "5", icon: Car, color: "text-brand-blue" },
            { title: "Completed Today", value: "8", icon: CheckCircle, color: "text-green-600" },
            { title: "Maintenance Due", value: "2", icon: AlertCircle, color: "text-red-600" },
          ],
          quickActions: ["New Request", "View Status", "Contact Support"]
        };
    }
  };

  const roleData = getRoleData(user?.role);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-brand-blue">{roleData.title}</h1>
        <div className="text-sm text-gray-500">
          Welcome back, {user?.name || "User"}
        </div>
      </div>
      
      {/* Stat Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roleData.stats.map((stat) => (
          <Card key={stat.title} className="border-b-4 border-b-brand-blue shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Visualization Area */}
      <div className="grid gap-4 md:grid-cols-7">
         <Card className="md:col-span-4 p-6">
            <h3 className="font-bold mb-4">Recent Activity</h3>
            {/* Role-specific content would go here */}
            <div className="space-y-3">
              {user?.role === "Admin" && (
                <div className="text-sm text-gray-600">
                  <p>• System maintenance completed</p>
                  <p>• 3 new user registrations</p>
                  <p>• Fleet utilization report generated</p>
                </div>
              )}
              {user?.role === "Dispatcher" && (
                <div className="text-sm text-gray-600">
                  <p>• 5 trip requests approved</p>
                  <p>• Vehicle assignment completed</p>
                  <p>• Route optimization applied</p>
                </div>
              )}
              {user?.role === "Staff" && (
                <div className="text-sm text-gray-600">
                  <p>• Trip to Adama approved</p>
                  <p>• Vehicle assigned: Toyota Corolla</p>
                  <p>• Reminder: Safety briefing required</p>
                </div>
              )}
            </div>
         </Card>
         <Card className="md:col-span-3 p-6 bg-brand-blue text-white">
            <h3 className="font-bold mb-2 text-brand-gold">Quick Actions</h3>
            <p className="text-sm opacity-80 mb-4">Commonly used tools for your role.</p>
            <div className="space-y-2">
              {roleData.quickActions.map((action, index) => (
                <button 
                  key={index}
                  className="w-full bg-white text-brand-blue py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
         </Card>
      </div>
    </div>
  );
}