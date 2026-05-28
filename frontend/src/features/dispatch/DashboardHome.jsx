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
        {roleData.stats.map((stat) => {
          // Enhanced color schemes for better visibility in dark/light modes
          const colorSchemes = {
            'text-brand-gold': {
              iconBg: 'bg-amber-500 dark:bg-amber-600',
              cardBg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
              border: 'border-amber-300 dark:border-amber-700',
              textColor: 'text-amber-800 dark:text-amber-200',
              valueColor: 'text-amber-950 dark:text-amber-50'
            },
            'text-green-600': {
              iconBg: 'bg-green-500 dark:bg-green-600',
              cardBg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
              border: 'border-green-300 dark:border-green-700',
              textColor: 'text-green-800 dark:text-green-200',
              valueColor: 'text-green-950 dark:text-green-50'
            },
            'text-brand-blue': {
              iconBg: 'bg-blue-500 dark:bg-blue-600',
              cardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
              border: 'border-blue-300 dark:border-blue-700',
              textColor: 'text-blue-800 dark:text-blue-200',
              valueColor: 'text-blue-950 dark:text-blue-50'
            },
            'text-red-600': {
              iconBg: 'bg-red-500 dark:bg-red-600',
              cardBg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
              border: 'border-red-300 dark:border-red-700',
              textColor: 'text-red-800 dark:text-red-200',
              valueColor: 'text-red-950 dark:text-red-50'
            },
            'text-blue-600': {
              iconBg: 'bg-blue-500 dark:bg-blue-600',
              cardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
              border: 'border-blue-300 dark:border-blue-700',
              textColor: 'text-blue-800 dark:text-blue-200',
              valueColor: 'text-blue-950 dark:text-blue-50'
            },
            'text-orange-600': {
              iconBg: 'bg-orange-500 dark:bg-orange-600',
              cardBg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
              border: 'border-orange-300 dark:border-orange-700',
              textColor: 'text-orange-800 dark:text-orange-200',
              valueColor: 'text-orange-950 dark:text-orange-50'
            },
            'text-purple-600': {
              iconBg: 'bg-purple-500 dark:bg-purple-600',
              cardBg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
              border: 'border-purple-300 dark:border-purple-700',
              textColor: 'text-purple-800 dark:text-purple-200',
              valueColor: 'text-purple-950 dark:text-purple-50'
            }
          };
          
          const scheme = colorSchemes[stat.color] || colorSchemes['text-blue-600'];
          
          return (
            <Card key={stat.title} className={`${scheme.cardBg} border-2 ${scheme.border} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-extrabold uppercase tracking-wide ${scheme.textColor}`}>{stat.title}</CardTitle>
                <div className={`${scheme.iconBg} p-2.5 rounded-xl shadow-md`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black ${scheme.valueColor} drop-shadow-sm`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
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