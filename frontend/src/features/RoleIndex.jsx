import { Navigate } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { getRedirectPathByRole } from "@/lib/authRedirect";

// Renders at /dashboard index and redirects each role to their home page
export default function RoleIndex() {
  const role = useUserStore((s) => s.user?.role);
  return <Navigate to={getRedirectPathByRole(role)} replace />;
}
