const roleRoutes = {
  Admin: "/dashboard",
  Dispatcher: "/dispatch/approvals",
  Staff: "/dashboard",
  Maintainer: "/dashboard"
};

export function getRedirectPathByRole(role) {
  return roleRoutes[role] || "/dashboard";
}
