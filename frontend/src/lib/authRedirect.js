const roleRoutes = {
  Admin: "/dashboard/dispatch/home",
  Dispatcher: "/dashboard/dispatch/home",
  Staff: "/dashboard/requests/status",
  Driver: "/dashboard/driver/requests",
  Maintainer: "/dashboard/mechanic",
};

export function getRedirectPathByRole(role) {
  return roleRoutes[role] || "/dashboard";
}
