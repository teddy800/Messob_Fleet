import { useState } from "react";
import { UserPlus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLES = ["Admin", "Dispatcher", "Staff", "Driver", "Maintainer"];
const DEPARTMENTS = ["Programs", "Finance", "IT", "Logistics", "HR", "Operations"];

const initialUsers = [
  { id: "USR-001", name: "Admin User",        email: "admin@mesobcenter.et",      department: "IT",         role: "Admin",      status: "Active" },
  { id: "USR-002", name: "Abebe (Dispatcher)",email: "dispatcher@mesobcenter.et", department: "Operations", role: "Dispatcher", status: "Active" },
  { id: "USR-003", name: "Sumeya (Staff)",    email: "staff@mesobcenter.et",      department: "Programs",   role: "Staff",      status: "Active" },
  { id: "USR-004", name: "Dawit (Driver)",    email: "driver@mesobcenter.et",     department: "Logistics",  role: "Driver",     status: "Active" },
  { id: "USR-005", name: "Mike (Maintainer)", email: "maintainer@mesobcenter.et", department: "Operations", role: "Maintainer", status: "Inactive" },
];

const statusBadge = {
  Active:   "bg-green-100 text-green-700 border-green-200",
  Inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

const roleBadge = {
  Admin:      "bg-blue-100 text-blue-700",
  Dispatcher: "bg-purple-100 text-purple-700",
  Staff:      "bg-yellow-100 text-yellow-700",
  Driver:     "bg-green-100 text-green-700",
  Maintainer: "bg-orange-100 text-orange-700",
};

const emptyForm = { name: "", email: "", department: "", role: "", status: "Active" };

export default function UserManagement() {
  const [users, setUsers]       = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null); // null = add, object = edit
  const [form, setForm]         = useState(emptyForm);
  const [roleVal, setRoleVal]   = useState("");
  const [deptVal, setDeptVal]   = useState("");
  const [statusVal, setStatusVal] = useState("Active");

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setRoleVal(""); setDeptVal(""); setStatusVal("Active");
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, department: user.department, role: user.role, status: user.status });
    setRoleVal(user.role); setDeptVal(user.department); setStatusVal(user.status);
    setDialogOpen(true);
  };

  const handleDelete = (id) => setUsers((prev) => prev.filter((u) => u.id !== id));

  const handleSave = () => {
    const data = { ...form, role: roleVal, department: deptVal, status: statusVal };
    if (!data.name || !data.email || !data.role || !data.department) return;

    if (editing) {
      setUsers((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...data } : u));
    } else {
      const newId = `USR-${String(users.length + 1).padStart(3, "0")}`;
      setUsers((prev) => [...prev, { id: newId, ...data }]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">User Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase tracking-widest">ID</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest">Name</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest">Email</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest">Department</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest">Role</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest">Status</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="text-xs text-gray-400 font-mono">{u.id}</TableCell>
                <TableCell className="font-bold text-sm">{u.name}</TableCell>
                <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                <TableCell className="text-sm text-gray-600">{u.department}</TableCell>
                <TableCell>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${roleBadge[u.role] || "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${statusBadge[u.status]}`}>
                    {u.status}
                  </Badge>
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">
              {editing ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. Sumeya Hassen"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="name@mesobcenter.et" type="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Department</Label>
              <Select value={deptVal} onValueChange={setDeptVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Role</Label>
              <Select value={roleVal} onValueChange={setRoleVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
