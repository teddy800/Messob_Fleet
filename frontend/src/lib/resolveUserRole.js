const FMS_CATEGORY = "MESSOB Fleet Management";

// Odoo group display names → app roles (priority: highest first)
const ODOO_GROUP_ROLE_MAP = [
  { name: "Administrator", role: "Admin" },
  { name: "Dispatcher", role: "Dispatcher" },
  { name: "Driver", role: "Driver" },
  { name: "Mechanic", role: "Maintainer" },
  { name: "Staff (User)", role: "Staff" },
];

const ROLE_PRIORITY = ["Admin", "Dispatcher", "Maintainer", "Driver", "Staff"];

/** Only groups under the MESSOB FMS module category (avoids Odoo's generic "Administrator", etc.). */
export function isFmsGroup(group) {
  const full = group.full_name || "";
  const category = group.category_id?.[1] || "";
  return (
    category === FMS_CATEGORY ||
    full.startsWith(`${FMS_CATEGORY} /`)
  );
}

function groupMatchesFmsRole(group, fmsGroupName) {
  if (!isFmsGroup(group)) return false;
  const full = group.full_name || "";
  const name = group.name || "";
  return (
    full === `${FMS_CATEGORY} / ${fmsGroupName}` ||
    full.endsWith(` / ${fmsGroupName}`) ||
    name === fmsGroupName
  );
}

/**
 * Resolve app role from Odoo res.groups records for the logged-in user.
 * Pass only MESSOB Fleet Management groups (filter in the RPC domain).
 */
export function resolveUserRole(userGroups = []) {
  const matchedRoles = [];

  for (const group of userGroups) {
    for (const mapping of ODOO_GROUP_ROLE_MAP) {
      if (groupMatchesFmsRole(group, mapping.name)) {
        matchedRoles.push(mapping.role);
        break;
      }
    }
  }

  for (const role of ROLE_PRIORITY) {
    if (matchedRoles.includes(role)) return role;
  }

  return "Staff";
}
