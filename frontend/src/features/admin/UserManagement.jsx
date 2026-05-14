import { useState, useEffect } from "react";
import { UserPlus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, createRecord, writeRecord, callMethod } from "@/lib/odooApi";

const roleBadge = {
  "Administrator": "bg-blue-100 text-blue-700",
  "Dispatcher":    "bg-purple-100 text-purple-700",
  "Staff (User)":  "bg-yellow-100 text-yellow-700",
  "Driver":        "bg-green-100 text-green-700",
  "Mechanic":      "bg-orange-100 text-orange-700",
};

const shortRole = (fullName) => {
  if (!fullName || typeof fullName !== "string") return "—";
  return fullName.split(" / ")[1] || fullName;
};

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name: "", login: "" });
  const [error, setError]       = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await searchRead(
        "res.users",
        [["active", "=", true], ["share", "=", false]],
        ["id", "name", "login"],
        200
      );

      // Fetch FMS groups for each user
      const fmsGroups = await searchRead(
        "res.groups",
        [["category_id.name", "=", "MESSOB Fleet Management"]],
        ["id", "name", "users"],
        50
      );

      // Map user id → role name
      const userRoleMap = {};
      for (const group of fmsGroups) {
        for (const uid of (group.users || [])) {
          userRoleMap[uid] = group.name;
        }
      }

      setUsers(data.map((u) => ({ ...u, roleName: userRoleMap[u.id] || "—" })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", login: "" });
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, login: u.login });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name || !form.login) { setError("Name and email are required."); return; }
    try {
      if (editing) {
        await writeRecord("res.users", [editing.id], { name: form.name });
      } else {
        await createRecord("res.users", { name: form.name, login: form.login });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">User Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {["Name", "Email / Login", "Role", "Action"].map((h) => (
                  <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-bold text-sm">{u.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{u.login}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${roleBadge[u.roleName] || "bg-gray-100 text-gray-500"}`}>
                      {u.roleName}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)} className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(u.id)} className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white">
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
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">{editing ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. Sumeya Hassen"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email (Login)</Label>
                <Input className="h-11 border-2 rounded-xl" placeholder="name@mesobcenter.et" type="email"
                  value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
              </div>
            )}
            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={handleSave} className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> {editing ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
