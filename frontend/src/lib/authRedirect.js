const roleRoutes = {
  Admin: "/dashboard",
  Dispatcher: "/dashboard/dispatch/approvals",
  Staff: "/dashboard/requests/status",
  Driver: "/dashboard/requests/status",
  Maintainer: "/dashboard",
};

export function getRedirectPathByRole(role) {
  return roleRoutes[role] || "/dashboard";
}
