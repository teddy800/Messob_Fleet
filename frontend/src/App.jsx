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

export default function App() {
  return (
    <Routes>
      {/* 1. Public Login Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* 2. Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="requests/new" element={<RequestWizard />} />
          <Route path="requests/status" element={<RequestStatus />} />
          <Route path="requests/status/:status" element={<RequestList />} />
          <Route path="dispatch/approvals" element={<ApprovalQueue />} />
          <Route path="profile" element={<Profile />} />
          <Route path="fleet" element={<ManageFleet />} />
          <Route path="fuel-log" element={<FuelLog />} />
          <Route path="maintenance" element={<Maintenance />} />
        </Route>
      </Route>

      {/* 3. Catch-all: Redirect unknown paths to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}