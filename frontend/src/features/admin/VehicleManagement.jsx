import { useState, useEffect } from "react";
import { PlusCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchRead, createRecord, writeRecord } from "@/lib/odooApi";

const statusBadge = {
  normal:      "bg-green-50 text-green-600 border-green-100",
  accident:    "bg-red-50 text-red-600 border-red-100",
  good_condition: "bg-blue-50 text-blue-600 border-blue-100",
  write_off:   "bg-gray-100 text-gray-500 border-gray-200",
};

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name: "", license_plate: "", model_id: "" });
  const [modelForm, setModelForm] = useState({ name: "", brand_id: "" });
  const [brandForm, setBrandForm] = useState({ name: "" });
  const [error, setError]       = useState(null);
  const [modelError, setModelError] = useState(null);
  const [brandError, setBrandError] = useState(null);

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

  const fetchVehicleModels = async () => {
    try {
      const models = await searchRead(
        "fleet.vehicle.model",
        [],
        ["id", "name"],
        500
      );
      setVehicleModels(models);
    } catch (e) { 
      console.error("Failed to fetch vehicle models:", e); 
    }
  };

  const fetchVehicleBrands = async () => {
    try {
      const brands = await searchRead(
        "fleet.vehicle.model.brand",
        [],
        ["id", "name"],
        500
      );
      setVehicleBrands(brands);
    } catch (e) { 
      console.error("Failed to fetch vehicle brands:", e); 
    }
  };

  useEffect(() => { 
    fetchVehicles(); 
    fetchVehicleModels();
    fetchVehicleBrands();
  }, []);

  const openAdd = () => {
    setEditing(null); 
    setForm({ name: "", license_plate: "", model_id: "" }); 
    setError(null); 
    setDialogOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v); 
    setForm({ 
      name: v.name, 
      license_plate: v.license_plate || "", 
      model_id: Array.isArray(v.model_id) ? v.model_id[0] : v.model_id || "" 
    }); 
    setError(null); 
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name) { setError("Vehicle name is required."); return; }
    if (!form.model_id) { setError("Vehicle model is required."); return; }
    
    try {
      const payload = { 
        name: form.name, 
        license_plate: form.license_plate,
        model_id: parseInt(form.model_id)
      };
      
      if (editing) {
        await writeRecord("fleet.vehicle", [editing.id], payload);
      } else {
        await createRecord("fleet.vehicle", payload);
      }
      setDialogOpen(false); 
      fetchVehicles();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    try { await writeRecord("fleet.vehicle", [id], { active: false }); fetchVehicles(); }
    catch (e) { setError(e.message); }
  };

  const handleCreateModel = async () => {
    setModelError(null);
    if (!modelForm.name) { 
      setModelError("Model name is required."); 
      return; 
    }
    if (!modelForm.brand_id) { 
      setModelError("Manufacturer is required."); 
      return; 
    }
    
    try {
      const newModelId = await createRecord("fleet.vehicle.model", { 
        name: modelForm.name,
        brand_id: parseInt(modelForm.brand_id)
      });
      
      // Refresh the models list
      await fetchVehicleModels();
      
      // Set the newly created model as selected
      setForm({ ...form, model_id: newModelId.toString() });
      
      // Close the model dialog and reset form
      setModelDialogOpen(false);
      setModelForm({ name: "", brand_id: "" });
    } catch (e) { 
      setModelError(e.message); 
    }
  };

  const openCreateModelDialog = () => {
    setModelForm({ name: "", brand_id: "" });
    setModelError(null);
    setModelDialogOpen(true);
  };

  const handleCreateBrand = async () => {
    setBrandError(null);
    if (!brandForm.name) { 
      setBrandError("Brand name is required."); 
      return; 
    }
    
    try {
      const newBrandId = await createRecord("fleet.vehicle.model.brand", { 
        name: brandForm.name 
      });
      
      // Refresh the brands list
      await fetchVehicleBrands();
      
      // Set the newly created brand as selected
      setModelForm({ ...modelForm, brand_id: newBrandId.toString() });
      
      // Close the brand dialog and reset form
      setBrandDialogOpen(false);
      setBrandForm({ name: "" });
    } catch (e) { 
      setBrandError(e.message); 
    }
  };

  const openCreateBrandDialog = () => {
    setBrandForm({ name: "" });
    setBrandError(null);
    setBrandDialogOpen(true);
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
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vehicle Model *</Label>
              <Select value={form.model_id?.toString()} onValueChange={(value) => {
                if (value === "create_new") {
                  openCreateModelDialog();
                } else {
                  setForm({ ...form, model_id: value });
                }
              }}>
                <SelectTrigger className="h-11 border-2 rounded-xl">
                  <SelectValue placeholder="Select a vehicle model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_new" className="text-brand-blue font-bold border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      <span>Create New Model</span>
                    </div>
                  </SelectItem>
                  {vehicleModels.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                  {vehicleModels.length === 0 && (
                    <SelectItem value="no-models" disabled>
                      No models available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
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

      {/* Create New Model Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">Create New Vehicle Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Model Name *</Label>
              <Input 
                className="h-11 border-2 rounded-xl" 
                placeholder="e.g. Land Cruiser V8"
                value={modelForm.name} 
                onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} 
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Manufacturer *</Label>
              <Select value={modelForm.brand_id?.toString()} onValueChange={(value) => {
                if (value === "create_new_brand") {
                  openCreateBrandDialog();
                } else {
                  setModelForm({ ...modelForm, brand_id: value });
                }
              }}>
                <SelectTrigger className="h-11 border-2 rounded-xl">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_new_brand" className="text-brand-blue font-bold border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      <span>Create New Manufacturer</span>
                    </div>
                  </SelectItem>
                  {vehicleBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                  {vehicleBrands.length === 0 && (
                    <SelectItem value="no-brands" disabled>
                      No manufacturers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {modelError && <p className="text-sm text-red-500 font-semibold">{modelError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setModelDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleCreateModel} className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> Create Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Brand Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">Create New Manufacturer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Manufacturer Name *</Label>
              <Input 
                className="h-11 border-2 rounded-xl" 
                placeholder="e.g. Toyota, BYD, Mercedes-Benz"
                value={brandForm.name} 
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} 
                autoFocus
              />
            </div>
            {brandError && <p className="text-sm text-red-500 font-semibold">{brandError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBrandDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleCreateBrand} className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> Create Manufacturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
