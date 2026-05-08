const roleRoutes = {
  Admin: "/dashboard/admin",
  Dispatcher: "/dashboard/dispatch/approvals",
  Staff: "/dashboard/requests/status",
  Driver: "/dashboard/driver/requests",
  Maintainer: "/dashboard/mechanic",
};

export function getRedirectPathByRole(role) {
  return roleRoutes[role] || "/dashboard";
}
