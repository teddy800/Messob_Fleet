import { 
  LayoutDashboard, 
  Car, 
  ClipboardList, 
  CheckSquare, 
  User, 
  Fuel, 
  Gauge, 
  LogOut,
  ShieldCheck,
  Users,
  UserCheck,
  FileText,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/useUserStore";

// The Master Menu List with Role-Based Access Control (RBAC)
const menuItems = [
  // Staff: request-focused menu
  {
    name: "Request Status",
    path: "/dashboard/requests/status",
    icon: ClipboardList,
    roles: ["Staff"],
  },
  {
    name: "New Request",
    path: "/dashboard/requests/new",
    icon: Car,
    roles: ["Staff"],
  },
  // Driver: trips + fuel
  {
    name: "Requests",
    path: "/dashboard/driver/requests",
    icon: ClipboardList,
    roles: ["Driver"],
  },
  {
    name: "Fuel Change",
    path: "/dashboard/driver/fuel",
    icon: Fuel,
    roles: ["Driver"],
  },
  {
    name: "Dashboard",
    path: "/dashboard/admin",
    icon: LayoutDashboard,
    roles: ["Admin"],
  },
  // Dispatcher: current requests only
  {
    name: "Current Requests",
    path: "/dashboard/dispatch/approvals",
    icon: CheckSquare,
    roles: ["Dispatcher", "Admin"],
  },
  // Admin: full operations menu
  {
    name: "User Management",
    path: "/dashboard/admin/users",
    icon: Users,
    roles: ["Admin"],
  },
  {
    name: "Vehicles",
    path: "/dashboard/admin/vehicles",
    icon: Car,
    roles: ["Admin"],
  },
  {
    name: "Drivers",
    path: "/dashboard/admin/drivers",
    icon: UserCheck,
    roles: ["Admin"],
  },
  {
    name: "Reports",
    path: "/dashboard/admin/reports",
    icon: FileText,
    roles: ["Admin"],
  },
  // Maintainer (Mechanic)
  {
    name: "Dashboard",
    path: "/dashboard/mechanic",
    icon: LayoutDashboard,
    roles: ["Maintainer"],
  },
  {
    name: "Repair & Maintenance Log",
    path: "/dashboard/mechanic/repair-log",
    icon: Gauge,
    roles: ["Maintainer"],
  },
  {
    name: "Fuel Logs",
    path: "/dashboard/fuel-log",
    icon: Fuel,
    roles: ["Maintainer"],
  },
  {
    name: "Maintenance",
    path: "/dashboard/maintenance",
    icon: Gauge,
    roles: ["Admin"],
  },
];

/** Highlight only the most specific menu path that matches the current URL. */
function getActiveMenuPath(pathname, paths) {
  const matches = paths.filter(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, path) => (path.length > best.length ? path : best));
}

export default function Sidebar({ setOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get User Data and Logout Function from Zustand Store
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  // Filter items based on the user's role. 
  // If no user is logged in, show an empty array to prevent errors.
  const filteredMenu = menuItems.filter(item => 
    user?.role ? item.roles.includes(user.role) : false
  );

  const activePath = getActiveMenuPath(
    location.pathname,
    filteredMenu.map((item) => item.path)
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full bg-brand-blue text-white w-64 p-6 border-r border-white/10 shadow-2xl">
      
      {/* --- Logo & Identity Section --- */}
      <div className="flex flex-col items-center mb-10">
        <div className="bg-white p-2 rounded-full mb-3 shadow-lg group transition-all hover:ring-4 hover:ring-brand-gold/30">
          <img 
            src={logo} 
            className="w-16 h-16 object-contain rounded-full" 
            alt="MESSOB Logo" 
          />
        </div>
        <h1 className="text-xl font-black tracking-wider text-white">MESSOB-FMS</h1>
        
        {/* User Role Badge */}
        <div className="flex items-center gap-1.5 mt-2 bg-brand-gold/20 px-3 py-1 rounded-full border border-brand-gold/30">
          <ShieldCheck className="h-3 w-3 text-brand-gold" />
          <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">
            {user?.role || "Guest"}
          </span>
        </div>
      </div>

      {/* --- Navigation Menu --- */}
      <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
        {filteredMenu.map((item) => {
          const isActive = item.path === activePath;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen?.(false)} // Closes mobile drawer
              className={cn(
                "flex items-center px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-brand-gold text-brand-blue font-bold shadow-lg scale-[1.02]" 
                  : "hover:bg-white/10 text-white/70 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 transition-transform group-hover:scale-110",
                isActive ? "text-brand-blue" : "text-brand-gold"
              )} />
              <span className="text-sm tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* --- Footer / User Account Section --- */}
      <div className="pt-6 border-t border-white/10 mt-auto space-y-1">
        <div className="px-4 py-3 mb-2 bg-white/5 rounded-xl border border-white/5">
           <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Current User</p>
           <p className="text-sm font-bold truncate text-brand-gold">{user?.name || "Unauthorized"}</p>
        </div>

        <Link 
              to="/dashboard/profile" 
              onClick={() => setOpen?.(false)}
              className="flex items-center px-4 py-3 hover:bg-white/10 rounded-xl transition-all"
            >
              <User className="mr-3 h-5 w-5 text-gray-400" />
              <span className="text-sm">Account Profile</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 hover:bg-red-500/20 text-red-400 rounded-xl transition-all group mt-2"
        >
          <LogOut className="mr-3 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Sign Out</span>
        </button>
      </div>
    </div>
  );
}