import { useState, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, createRecord, writeRecord } from "@/lib/odooApi";

const statusBadge = {
  normal:      "bg-green-100 text-green-700 border-green-200",
  accident:    "bg-red-100 text-red-700 border-red-200",
  good_condition: "bg-blue-100 text-blue-700 border-blue-200",
  write_off:   "bg-gray-100 text-gray-500 border-gray-200",
};

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name: "", license_plate: "" });
  const [error, setError]       = useState(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await searchRead(
        "fleet.vehicle",
        [["active", "=", true]],
        ["id", "name", "license_plate", "model_id", "state_id"],
        200
      );
      setVehicles(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const openAdd = () => {
    setEditing(null); setForm({ name: "", license_plate: "" }); setError(null); setDialogOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v); setForm({ name: v.name, license_plate: v.license_plate || "" }); setError(null); setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name) { setError("Vehicle name is required."); return; }
    try {
      if (editing) {
        await writeRecord("fleet.vehicle", [editing.id], { name: form.name, license_plate: form.license_plate });
      } else {
        await createRecord("fleet.vehicle", { name: form.name, license_plate: form.license_plate });
      }
      setDialogOpen(false); fetchVehicles();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    try { await writeRecord("fleet.vehicle", [id], { active: false }); fetchVehicles(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Vehicle Management</h1>
        <Button onClick={openAdd} className="bg-brand-blue hover:bg-blue-900 text-white font-bold rounded-xl gap-2">
          <PlusCircle className="h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                {["Name", "Plate No.", "Model", "Status", "Action"].map((h) => (
                  <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest ${h === "Action" ? "text-right" : ""}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                  <TableCell className="font-bold text-sm">{v.name}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">{v.license_plate || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">{Array.isArray(v.model_id) ? v.model_id[1] : "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest border ${statusBadge[v.state_id?.[0]] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {Array.isArray(v.state_id) ? v.state_id[1] : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(v)} className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
                      <Pencil className="h-3.5 w-3.5 dark:text-gray-300" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(v.id)} className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white">
                      <Trash2 className="h-3.5 w-3.5 dark:text-gray-300" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No vehicles found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">{editing ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vehicle Name</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. Toyota Land Cruiser"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Plate Number</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. AA-12345"
                value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
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
