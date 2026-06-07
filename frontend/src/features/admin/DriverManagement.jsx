import { useState, useEffect } from "react";
import { UserCheck, Pencil, Trash2, X, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, createRecord, writeRecord } from "@/lib/odooApi";
import { buildUserGroupsCommand } from "@/lib/fmsUserRoles";

const statusBadge = {
  active:   "bg-green-50 text-green-600 border-green-100",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function DriverManagement() {
  const [drivers, setDrivers]   = useState([]);
  const [fmsGroups, setFmsGroups] = useState([]);
  const [baseGroupId, setBaseGroupId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name: "", license_no: "", phone: "", email: "", password: "", confirmPassword: "" });
  const [isActive, setIsActive] = useState("active");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]       = useState(null);

  const loadGroups = async () => {
    const groups = await searchRead(
      "res.groups",
      [["category_id.name", "=", "MESSOB Fleet Management"]],
      ["id", "name", "users"],
      20
    );
    setFmsGroups(groups);

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
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await searchRead("messob.fms.driver", [], ["id", "name", "license_no", "phone", "status", "is_active", "partner_id"], 200);
      
      // Fetch email for each driver if partner_id exists
      const driversWithEmail = await Promise.all(
        data.map(async (driver) => {
          if (driver.partner_id) {
            const partnerId = Array.isArray(driver.partner_id) ? driver.partner_id[0] : driver.partner_id;
            try {
              const [partner] = await searchRead("res.partner", [["id", "=", partnerId]], ["email"], 1);
              return { ...driver, email: partner?.email || "" };
            } catch (e) {
              return { ...driver, email: "" };
            }
          }
          return { ...driver, email: "" };
        })
      );
      
      setDrivers(driversWithEmail);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    loadGroups(); 
  }, []);

  useEffect(() => { 
    if (fmsGroups.length) fetchDrivers(); 
  }, [fmsGroups]);

  const openAdd = () => {
    setEditing(null); 
    setForm({ name: "", license_no: "", phone: "", email: "", password: "", confirmPassword: "" }); 
    setIsActive("active"); 
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null); 
    setDialogOpen(true);
  };

  const openEdit = async (d) => {
    setEditing(d); 
    setForm({ 
      name: d.name, 
      license_no: d.license_no || "", 
      phone: d.phone || "",
      email: d.email || "",
      password: "",
      confirmPassword: ""
    });
    setIsActive(d.is_active ? "active" : "inactive"); 
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null); 
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    
    // Validation
    if (!form.name || !form.license_no) { 
      setError("Name and license number are required."); 
      return; 
    }
    
    if (!editing) {
      // Creating new driver - email and password required
      if (!form.email?.trim()) {
        setError("Email (login) is required.");
        return;
      }
      if (!form.password || form.password.length < 6) {
        setError("Password is required and must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else {
      // Editing existing driver - password is optional
      if (form.password || form.confirmPassword) {
        if (form.password.length < 6) {
          setError("New password must be at least 6 characters.");
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
      }
    }
    
    try {
      if (editing) {
        // Update existing driver
        const driverVals = { 
          name: form.name, 
          license_no: form.license_no, 
          phone: form.phone, 
          is_active: isActive === "active" 
        };
        await writeRecord("messob.fms.driver", [editing.id], driverVals);
        
        // Update user password if provided
        if (form.password && editing.partner_id) {
          const partnerId = Array.isArray(editing.partner_id) ? editing.partner_id[0] : editing.partner_id;
          const [user] = await searchRead("res.users", [["partner_id", "=", partnerId]], ["id"], 1);
          if (user?.id) {
            await writeRecord("res.users", [user.id], { password: form.password });
          }
        }
      } else {
        // Create new driver with user account
        const userId = await createRecord("res.users", {
          name: form.name.trim(),
          login: form.email.trim(),
          password: form.password,
          groups_id: buildUserGroupsCommand(fmsGroups, "Driver", [], baseGroupId),
        });
        
        // Get the partner_id from created user
        const [createdUser] = await searchRead("res.users", [["id", "=", userId]], ["partner_id"], 1);
        const partnerId = Array.isArray(createdUser?.partner_id) ? createdUser.partner_id[0] : createdUser?.partner_id;
        
        // Create driver record
        await createRecord("messob.fms.driver", {
          name: form.name.trim(),
          license_no: form.license_no.trim(),
          phone: form.phone.trim(),
          is_active: isActive === "active",
          partner_id: partnerId,
        });
      }
      
      setDialogOpen(false); 
      fetchDrivers();
    } catch (e) { 
      setError(e.message); 
    }
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
                {["Name", "License No.", "Phone No.", "Email", "Status", "Action"].map((h) => (
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
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">{d.email || "—"}</TableCell>
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
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No drivers found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">{editing ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</Label>
              <Input className="h-11 border-2 rounded-xl" placeholder="e.g. Dawit Bekele"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email (Login)</Label>
                <Input 
                  className="h-11 border-2 rounded-xl" 
                  placeholder="name@mesobcenter.et"
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                />
              </div>
            )}
            
            {editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email (Login)</Label>
                <Input 
                  className="h-11 border-2 rounded-xl bg-gray-50" 
                  value={form.email} 
                  readOnly 
                />
              </div>
            )}
            
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
            
            <div className="pt-2 border-t border-gray-100 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">
                {editing ? "Change password (optional)" : "Set password"}
              </p>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  {editing ? "New Password" : "Password"}
                </Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    className="h-11 border-2 rounded-xl pr-10" 
                    placeholder={editing ? "Leave blank to keep current" : "Minimum 6 characters"}
                    value={form.password} 
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-11 border-2 rounded-xl pr-10" 
                    placeholder="Re-enter password"
                    value={form.confirmPassword} 
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
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
