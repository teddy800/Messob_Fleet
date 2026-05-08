import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Login from "./features/auth/Login";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import RequestWizard from "./features/requests/components/RequestWizard";
import RequestStatus from "./features/requests/RequestStatus";
import RequestList from "./features/requests/RequestList";
import ApprovalQueue from "./features/dispatch/ApprovalQueue";
import DashboardHome from "./features/dispatch/DashboardHome"; 
import Profile from "./features/profile/profile";
import ManageFleet from "./features/fleet/ManageFleet";
import FuelLog from "./features/fleet/FuelLog";
import Maintenance from "./features/fleet/Maintenance";
import DriverRequests from "./features/driver/DriverRequests";
import DriverFuelChange from "./features/driver/DriverFuelChange";
import AdminDashboard from "./features/admin/AdminDashboard";
import UserManagement from "./features/admin/UserManagement";
import VehicleManagement from "./features/admin/VehicleManagement";
import DriverManagement from "./features/admin/DriverManagement";
import Reports from "./features/admin/Reports";

export default function App() {
  return (
    <Routes>
      {/* 1. Public Login Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* 2. Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          {/* Staff */}
          <Route path="requests/new" element={<RequestWizard />} />
          <Route path="requests/status" element={<RequestStatus />} />
          <Route path="requests/status/:status" element={<RequestList />} />
          {/* Driver */}
          <Route path="driver/requests" element={<DriverRequests />} />
          <Route path="driver/fuel" element={<DriverFuelChange />} />
          {/* Dispatcher */}
          <Route path="dispatch/approvals" element={<ApprovalQueue />} />
          {/* Admin */}
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/vehicles" element={<VehicleManagement />} />
          <Route path="admin/drivers" element={<DriverManagement />} />
          <Route path="admin/reports" element={<Reports />} />
          {/* Shared */}
          <Route path="profile" element={<Profile />} />
          <Route path="fleet" element={<ManageFleet />} />
          <Route path="fuel-log" element={<FuelLog />} />
          <Route path="maintenance" element={<Maintenance />} />
        </Route>
      </Route>

      {/* 3. Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}