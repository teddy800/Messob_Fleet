import { useState } from "react";
import { PlusCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAKES = ["Toyota", "Nissan", "Isuzu", "Hyundai", "Ford", "Mitsubishi"];
const MODELS = ["Land Cruiser", "Corolla", "Patrol", "H1 Van", "Hilux", "Truck", "Canter"];
const YEARS = Array.from({ length: 15 }, (_, i) => String(2025 - i));

const initialVehicles = [
  { id: "VEH-001", plateNo: "AA-12345", model: "Land Cruiser", make: "Toyota",   year: "2020", status: "Available" },
  { id: "VEH-002", plateNo: "AA-67890", model: "Corolla",      make: "Toyota",   year: "2019", status: "In Use" },
  { id: "VEH-003", plateNo: "AA-11223", model: "Truck",        make: "Isuzu",    year: "2018", status: "Maintenance" },
  { id: "VEH-004", plateNo: "AA-55678", model: "Patrol",       make: "Nissan",   year: "2021", status: "Available" },
  { id: "VEH-005", plateNo: "AA-99001", model: "H1 Van",       make: "Hyundai",  year: "2022", status: "Available" },
];

const statusBadge = {
  Available:   "bg-green-100 text-green-700 border-green-200",
  "In Use":    "bg-blue-100 text-blue-700 border-blue-200",
  Maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Retired:     "bg-gray-100 text-gray-500 border-gray-200",
};

const emptyForm = { plateNo: "", model: "", make: "", year: "", status: "Available" };

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [makeVal, setMakeVal]   = useState("");
  const [modelVal, setModelVal] = useState("");
  const [yearVal, setYearVal]   = useState("");
  const [statusVal, setStatusVal] = useState("Available");

  const openAdd = () => {
    setEditing(null); setForm(emptyForm);
    setMakeVal(""); setModelVal(""); setYearVal(""); setStatusVal("Available");
    setDialogOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ plateNo: v.plateNo, model: v.model, make: v.make, year: v.year, status: v.status });
    setMakeVal(v.make); setModelVal(v.model); setYearVal(v.year); setStatusVal(v.status);
    setDialogOpen(true);
  };

  const handleDelete = (id) => setVehicles((prev) => prev.filter((v) => v.id !== id));

  const handleSave = () => {
    const data = { ...form, make: makeVal, model: modelVal, year: yearVal, status: statusVal };
    if (!data.plateNo || !data.make || !data.model || !data.year) return;

    if (editing) {
      setVehicles((prev) => prev.map((v) => v.id === editing.id ? { ...v, ...data } : v));
    } else {
      const newId = `VEH-${String(vehicles.length + 1).padStart(3, "0")}`;
      setVehicles((prev) => [...prev, { id: newId, ...data }]);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Vehicle Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <PlusCircle className="h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {["ID", "Plate No.", "Model", "Make", "Year", "Status", "Action"].map((h) => (
                <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="text-xs text-gray-400 font-mono">{v.id}</TableCell>
                <TableCell className="font-bold text-sm">{v.plateNo}</TableCell>
                <TableCell className="text-sm text-gray-700">{v.model}</TableCell>
                <TableCell className="text-sm text-gray-700">{v.make}</TableCell>
                <TableCell className="text-sm text-gray-700">{v.year}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border ${statusBadge[v.status] || "bg-gray-100 text-gray-500"}`}>
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(v)} className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(v.id)} className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white">
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
              {editing ? "Edit Vehicle" : "Add New Vehicle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Plate Number</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. AA-12345"
                value={form.plateNo} onChange={(e) => setForm({ ...form, plateNo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Make</Label>
              <Select value={makeVal} onValueChange={setMakeVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select make..." /></SelectTrigger>
                <SelectContent>{MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Model</Label>
              <Select value={modelVal} onValueChange={setModelVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select model..." /></SelectTrigger>
                <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Year</Label>
              <Select value={yearVal} onValueChange={setYearVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select year..." /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Available", "In Use", "Maintenance", "Retired"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={handleSave} className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> {editing ? "Save Changes" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
