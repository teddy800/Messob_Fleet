import { useState } from "react";
import { UserCheck, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialDrivers = [
  { id: "DRV-001", name: "Dawit Bekele",  licenseNo: "ETH-DL-001234", phone: "+251 91 234 5678", status: "Available" },
  { id: "DRV-002", name: "Yonas Tesfaye", licenseNo: "ETH-DL-005678", phone: "+251 92 345 6789", status: "On Trip" },
  { id: "DRV-003", name: "Mekdes Alemu",  licenseNo: "ETH-DL-009012", phone: "+251 93 456 7890", status: "Available" },
  { id: "DRV-004", name: "Biruk Haile",   licenseNo: "ETH-DL-003456", phone: "+251 94 567 8901", status: "Off Duty" },
];

const statusBadge = {
  Available: "bg-green-100 text-green-700 border-green-200",
  "On Trip": "bg-blue-100 text-blue-700 border-blue-200",
  "Off Duty":"bg-gray-100 text-gray-500 border-gray-200",
  Suspended: "bg-red-100 text-red-600 border-red-200",
};

const emptyForm = { name: "", licenseNo: "", phone: "", status: "Available" };

export default function DriverManagement() {
  const [drivers, setDrivers]   = useState(initialDrivers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [statusVal, setStatusVal] = useState("Available");

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setStatusVal("Available");
    setDialogOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, licenseNo: d.licenseNo, phone: d.phone, status: d.status });
    setStatusVal(d.status);
    setDialogOpen(true);
  };

  const handleDelete = (id) => setDrivers((prev) => prev.filter((d) => d.id !== id));

  const handleSave = () => {
    const data = { ...form, status: statusVal };
    if (!data.name || !data.licenseNo || !data.phone) return;

    if (editing) {
      setDrivers((prev) => prev.map((d) => d.id === editing.id ? { ...d, ...data } : d));
    } else {
      const newId = `DRV-${String(drivers.length + 1).padStart(3, "0")}`;
      setDrivers((prev) => [...prev, { id: newId, ...data }]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Driver Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <UserCheck className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {["ID", "Name", "License No.", "Phone No.", "Status", "Action"].map((h) => (
                <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d) => (
              <TableRow key={d.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="text-xs text-gray-400 font-mono">{d.id}</TableCell>
                <TableCell className="font-bold text-sm">{d.name}</TableCell>
                <TableCell className="text-sm text-gray-600 font-mono">{d.licenseNo}</TableCell>
                <TableCell className="text-sm text-gray-600">{d.phone}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${statusBadge[d.status] || "bg-gray-100 text-gray-500"}`}>
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)} className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(d.id)} className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">
              {editing ? "Edit Driver" : "Add New Driver"}
            </DialogTitle>
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
                value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Phone Number</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. +251 91 234 5678"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Available", "On Trip", "Off Duty", "Suspended"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
