import { useState, useEffect } from "react";
import { UserPlus, Pencil, Trash2, X, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, createRecord, writeRecord } from "@/lib/odooApi";
import {
  FMS_ROLE_OPTIONS,
  pickPrimaryFmsRoleName,
  buildUserGroupsCommand,
} from "@/lib/fmsUserRoles";

const roleBadge = {
  Administrator: "bg-blue-100 text-blue-700",
  Dispatcher: "bg-purple-100 text-purple-700",
  "Staff (User)": "bg-yellow-100 text-yellow-700",
  Driver: "bg-green-100 text-green-700",
  Mechanic: "bg-orange-100 text-orange-700",
};

const emptyForm = () => ({
  name: "",
  login: "",
  role: "Staff (User)",
  password: "",
  confirmPassword: "",
  licenseNo: "",
  phone: "",
});

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [fmsGroups, setFmsGroups] = useState([]);
  const [baseGroupId, setBaseGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);

  const loadGroups = async () => {
    const groups = await searchRead(
      "res.groups",
      [["category_id.name", "=", "MESSOB Fleet Management"]],
      ["id", "name", "users"],
      20
    );
    setFmsGroups(groups);

    // Get base user group without accessing ir.model.data
    // Search for the group directly by its XML ID pattern
    try {
      const baseGroups = await searchRead(
        "res.groups",
        [
          ["name", "=", "Internal User"],
          ["category_id.name", "=", "User types"]
        ],
        ["id"],
        1
      );
      if (baseGroups[0]?.id) setBaseGroupId(baseGroups[0].id);
    } catch (e) {
      console.warn("Could not load base user group:", e.message);
      // Continue without base group - it's optional for FMS groups
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await searchRead(
        "res.users",
        [
          ["active", "=", true],
          ["share", "=", false],
        ],
        ["id", "name", "login"],
        200
      );

      const fmsGroupsData =
        fmsGroups.length > 0 && fmsGroups[0]?.users !== undefined
          ? fmsGroups
          : await searchRead(
              "res.groups",
              [["category_id.name", "=", "MESSOB Fleet Management"]],
              ["id", "name", "users"],
              20
            );

      const userRoleMap = {};
      for (const group of fmsGroupsData) {
        for (const uid of group.users || []) {
          if (!userRoleMap[uid]) userRoleMap[uid] = [];
          userRoleMap[uid].push(group.name);
        }
      }

      setUsers(
        data.map((u) => ({
          ...u,
          roleName: pickPrimaryFmsRoleName(userRoleMap[u.id] || []),
        }))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (fmsGroups.length) fetchUsers();
  }, [fmsGroups]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = async (u) => {
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    try {
      const [userData] = await searchRead("res.users", [["id", "=", u.id]], ["groups_id"]);
      const groupIds = userData?.groups_id || [];
      const fmsNames = fmsGroups.filter((g) => groupIds.includes(g.id)).map((g) => g.name);
      const roleName = pickPrimaryFmsRoleName(fmsNames);

      let licenseNo = "";
      let phone = "";
      if (roleName === "Driver") {
        const [driverRecord] = await searchRead(
          "messob.fms.driver",
          [["name", "=", u.name]],
          ["license_no", "phone"],
          1
        );
        licenseNo = driverRecord?.license_no || "";
        phone = driverRecord?.phone || "";
      }

      setEditing({ ...u, groupIds });
      setForm({
        name: u.name,
        login: u.login,
        role: roleName,
        password: "",
        confirmPassword: "",
        licenseNo,
        phone,
      });
      setDialogOpen(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const validateForm = () => {
    if (!form.name?.trim()) {
      setError("Full name is required.");
      return false;
    }
    if (!editing && !form.login?.trim()) {
      setError("Email (login) is required.");
      return false;
    }
    if (!form.role) {
      setError("Please select a role.");
      return false;
    }
    if (form.role === "Driver" && !form.licenseNo?.trim()) {
      setError("Driver license number is required.");
      return false;
    }

    if (!editing) {
      if (!form.password || form.password.length < 6) {
        setError("Password is required and must be at least 6 characters.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      return true;
    }

    if (form.password || form.confirmPassword) {
      if (form.password.length < 6) {
        setError("New password must be at least 6 characters.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError(null);
    if (!validateForm()) return;

    try {
      if (editing) {
        const values = {
          name: form.name.trim(),
          groups_id: buildUserGroupsCommand(
            fmsGroups,
            form.role,
            editing.groupIds || [],
            baseGroupId
          ),
        };
        if (form.password) values.password = form.password;

        await writeRecord("res.users", [editing.id], values);

        if (form.role === "Driver") {
          const [existingDriver] = await searchRead(
            "messob.fms.driver",
            [["name", "=", form.name.trim()]],
            ["id"],
            1
          );
          const [updatedUser] = await searchRead(
            "res.users",
            [["id", "=", editing.id]],
            ["partner_id"],
            1
          );
          const partner = Array.isArray(updatedUser?.partner_id) ? updatedUser.partner_id[0] : updatedUser?.partner_id;
          const driverValues = {
            name: form.name.trim(),
            license_no: form.licenseNo.trim(),
            phone: form.phone.trim(),
            is_active: true,
            partner_id: partner,
          };
          if (existingDriver?.id) {
            await writeRecord("messob.fms.driver", [existingDriver.id], driverValues);
          } else {
            await createRecord("messob.fms.driver", driverValues);
          }
        }
      } else {
        const userId = await createRecord("res.users", {
          name: form.name.trim(),
          login: form.login.trim(),
          password: form.password,
          groups_id: buildUserGroupsCommand(fmsGroups, form.role, [], baseGroupId),
        });

        if (form.role === "Driver") {
          const [createdUser] = await searchRead(
            "res.users",
            [["id", "=", userId]],
            ["partner_id"],
            1
          );
          const partner = Array.isArray(createdUser?.partner_id) ? createdUser.partner_id[0] : createdUser?.partner_id;
          const [existingDriver] = await searchRead(
            "messob.fms.driver",
            [["name", "=", form.name.trim()]],
            ["id"],
            1
          );
          const driverValues = {
            name: form.name.trim(),
            license_no: form.licenseNo.trim(),
            phone: form.phone.trim(),
            is_active: true,
            partner_id: partner,
          };
          if (existingDriver?.id) {
            await writeRecord("messob.fms.driver", [existingDriver.id], driverValues);
          } else {
            await createRecord("messob.fms.driver", driverValues);
          }
        }
      }

      setDialogOpen(false);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await writeRecord("res.users", [id], { active: false });
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          className="h-11 border-2 rounded-xl pr-10"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={editing ? "new-password" : "new-password"}
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">User Management</h1>
        <Button
          onClick={openAdd}
          className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2"
        >
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                {["Name", "Email / Login", "Role", "Action"].map((h) => (
                  <TableHead
                    key={h}
                    className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                  <TableCell className="font-bold text-sm">{u.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">{u.login}</TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${roleBadge[u.roleName] || "bg-gray-100 text-gray-500"}`}
                    >
                      {u.roleName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(u)}
                      className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900 dark:bg-gray-800 dark:hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(u.id)}
                      className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white dark:border-red-700 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black dark:text-gray-100">
              {editing ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Full Name
              </Label>
              <Input
                className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                placeholder="e.g. Sumeya Hassen"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Email (Login)
                </Label>
                <Input
                  className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  placeholder="name@mesobcenter.et"
                  type="email"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                />
              </div>
            )}

            {editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Email (Login)
                </Label>
                <Input className="h-11 border-2 rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" value={form.login} readOnly />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                FMS Role
              </Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {FMS_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.role === "Driver" && (
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    License Number
                  </Label>
                  <Input
                    className="h-11 border-2 rounded-xl"
                    placeholder="e.g. ETH-DL-001234"
                    value={form.licenseNo}
                    onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Phone Number
                  </Label>
                  <Input
                    className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    placeholder="e.g. +251 91 234 5678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                {editing ? "Change password (optional)" : "Set password"}
              </p>

              <PasswordField
                id="user-password"
                label={editing ? "New password" : "Password"}
                placeholder={editing ? "Leave blank to keep current" : "Minimum 6 characters"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <PasswordField
                id="user-confirm-password"
                label="Confirm password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
              />
            </div>

            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          </div>
          <DialogFooter className="gap-2 dark:bg-gray-700">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4 mr-1 dark:text-gray-200" /> Cancel
            </Button>
            <Button onClick={handleSave} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
              <Check className="h-4 w-4 mr-1" /> {editing ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
