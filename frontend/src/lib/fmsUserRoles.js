/** FMS security group names in Odoo (MESSOB Fleet Management category). */
export const FMS_ROLE_OPTIONS = [
  { name: "Staff (User)", label: "Staff" },
  { name: "Dispatcher", label: "Dispatcher" },
  { name: "Driver", label: "Driver" },
  { name: "Mechanic", label: "Mechanic" },
  { name: "Administrator", label: "Administrator" },
];

const ROLE_PRIORITY = FMS_ROLE_OPTIONS.map((r) => r.name);

export function pickPrimaryFmsRoleName(roleNames = []) {
  for (const name of ROLE_PRIORITY) {
    if (roleNames.includes(name)) return name;
  }
  return roleNames[0] || "Staff (User)";
}

export function buildUserGroupsCommand(fmsGroups, selectedRoleName, existingGroupIds = [], baseGroupId = null) {
  const fmsIds = fmsGroups.map((g) => g.id);
  const selected = fmsGroups.find((g) => g.name === selectedRoleName);
  const kept = existingGroupIds.filter((id) => !fmsIds.includes(id));
  const next = selected ? [...kept, selected.id] : kept;
  if (baseGroupId && !next.includes(baseGroupId)) next.push(baseGroupId);
  return [[6, 0, next]];
}
