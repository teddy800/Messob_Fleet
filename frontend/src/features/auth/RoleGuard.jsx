import { Navigate, Outlet } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { getRedirectPathByRole } from "@/lib/authRedirect";

export default function RoleGuard({ allowedRoles }) {
  const role = useUserStore((state) => state.user?.role);

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={getRedirectPathByRole(role)} replace />;
  }

  return <Outlet />;
}
