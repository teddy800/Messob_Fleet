import { useState, useEffect } from "react";
import { UserCheck, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, createRecord, writeRecord } from "@/lib/odooApi";

const statusBadge = {
  active:   "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function DriverManagement() {
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name: "", license_no: "", phone: "" });
  const [isActive, setIsActive] = useState("active");
  const [error, setError]       = useState(null);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await searchRead("messob.fms.driver", [], ["id", "name", "license_no", "phone", "status", "is_active"], 200);
      setDrivers(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const openAdd = () => {
    setEditing(null); setForm({ name: "", license_no: "", phone: "" }); setIsActive("active"); setError(null); setDialogOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d); setForm({ name: d.name, license_no: d.license_no || "", phone: d.phone || "" });
    setIsActive(d.is_active ? "active" : "inactive"); setError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name || !form.license_no) { setError("Name and license number are required."); return; }
    try {
      const vals = { name: form.name, license_no: form.license_no, phone: form.phone, is_active: isActive === "active" };
      if (editing) {
        await writeRecord("messob.fms.driver", [editing.id], vals);
      } else {
        await createRecord("messob.fms.driver", vals);
      }
      setDialogOpen(false); fetchDrivers();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    try { await writeRecord("messob.fms.driver", [id], { is_active: false }); fetchDrivers(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Driver Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <UserCheck className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                {["Name", "License No.", "Phone No.", "Status", "Action"].map((h) => (
                  <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                  <TableCell className="font-bold text-sm">{d.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 font-mono dark:text-gray-300">{d.license_no || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">{d.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest border ${statusBadge[d.status] || statusBadge.active}`}>
                      {d.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(d)} className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
                      <Pencil className="h-3.5 w-3.5 dark:text-gray-300" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(d.id)} className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white">
                      <Trash2 className="h-3.5 w-3.5 dark:text-gray-300" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {drivers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No drivers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">{editing ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. Dawit Bekele"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">License Number</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. ETH-DL-001234"
                value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. +251 91 234 5678"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</Label>
              <Select value={isActive} onValueChange={setIsActive}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={handleSave} className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> {editing ? "Save Changes" : "Add Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
