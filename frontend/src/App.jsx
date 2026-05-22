import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Login from "./features/auth/Login";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import RoleGuard from "./features/auth/RoleGuard";
import RoleIndex from "./features/RoleIndex";
import RequestWizard from "./features/requests/components/RequestWizard";
import RequestStatus from "./features/requests/RequestStatus";
import RequestList from "./features/requests/RequestList";
import ApprovalQueue from "./features/dispatch/ApprovalQueue";
import Profile from "./features/profile/profile";
import ManageFleet from "./features/fleet/ManageFleet";
import DriverRequests from "./features/driver/DriverRequests";
import DriverFuelChange from "./features/driver/DriverFuelChange";
import AdminDashboard from "./features/admin/AdminDashboard";
import UserManagement from "./features/admin/UserManagement";
import VehicleManagement from "./features/admin/VehicleManagement";
import DriverManagement from "./features/admin/DriverManagement";
import Reports from "./features/admin/Reports";
import MechanicDashboard from "./features/mechanic/MechanicDashboard";
import RepairLog from "./features/mechanic/RepairLog";
import FleetCalendarEnhanced from "./features/dispatcher/components/FleetCalendarEnhanced";
import TripTracking from "./features/tracking/TripTracking";
import TripSelection from "./features/tracking/TripSelection";
import MaintenanceAlerts from "./features/maintenance/MaintenanceAlerts";

export default function App() {
  return (
    <Routes>
      {/* 1. Public */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* 2. Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Index: redirect each role to their home */}
          <Route index element={<RoleIndex />} />

          <Route element={<RoleGuard allowedRoles={["Staff", "Dispatcher", "Admin"]} />}>
            <Route path="requests/new" element={<RequestWizard />} />
            <Route path="requests/status" element={<RequestStatus />} />
            <Route path="requests/status/:status" element={<RequestList />} />
            <Route path="tracking" element={<TripSelection />} />
            <Route path="tracking/:tripId" element={<TripTracking />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["Driver"]} />}>
            <Route path="driver/requests" element={<DriverRequests />} />
            <Route path="driver/fuel" element={<DriverFuelChange />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["Dispatcher", "Admin"]} />}>
            <Route path="dispatch/approvals" element={<ApprovalQueue />} />
            <Route path="dispatch/fleet-calendar" element={<FleetCalendarEnhanced />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["Admin"]} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/vehicles" element={<VehicleManagement />} />
            <Route path="admin/drivers" element={<DriverManagement />} />
            <Route path="admin/reports" element={<Reports />} />
            <Route path="fleet" element={<ManageFleet />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["Maintainer"]} />}>
            <Route path="mechanic" element={<MechanicDashboard />} />
            <Route path="mechanic/repair-log" element={<RepairLog />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["Maintainer", "Dispatcher", "Admin"]} />}>
            <Route path="maintenance/alerts" element={<MaintenanceAlerts />} />
          </Route>

          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      {/* 3. Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}