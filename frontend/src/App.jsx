import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Login from "./features/auth/Login";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import RequestWizard from "./features/requests/components/RequestWizard";
import ApprovalQueue from "./features/dispatch/ApprovalQueue";
import DashboardHome from "./features/dispatch/DashboardHome"; 
import Profile from "./features/profile/profile";
import ManageFleet from "./features/fleet/ManageFleet";
import FuelLog from "./features/fleet/FuelLog";
import Maintenance from "./features/fleet/Maintenance";
import { useUserStore } from "./store/useUserStore";
import { getRedirectPathByRole } from "./lib/authRedirect";

export default function App() {
  const userRole = useUserStore((state) => state.user?.role);

  return (
    <Routes>
      {/* 1. Public Route */}
      <Route path="/login" element={<Login />} />

      {/* 2. Protected Routes */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          
          {/* Redirect base URL to dashboard */}
          <Route index element={<Navigate to={getRedirectPathByRole(userRole)} replace />} />

          {/* These children will appear inside the <Outlet /> */}
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="requests/new" element={<RequestWizard />} />
          <Route path="dispatch/approvals" element={<ApprovalQueue />} />
          <Route path="profile" element={<Profile />} />
          <Route path="fleet" element={<ManageFleet />} />
          <Route path="fuel-log" element={<FuelLog />} />
          <Route path="maintenance" element={<Maintenance />} />
        </Route>
      </Route>

      {/* 3. Catch-all: Redirect unknown paths to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}