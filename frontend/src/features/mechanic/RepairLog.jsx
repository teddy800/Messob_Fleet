import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Wrench, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { searchRead, createRecord } from "@/lib/odooApi";

const SERVICE_TYPES = [
  ["full_change", "Full Change (Oil & Filter)"],
  ["brake", "Brake Service"],
  ["tire", "Tire Replacement"],
  ["engine", "Engine Repair"],
  ["transmission", "Transmission Service"],
  ["electrical", "Electrical Repair"],
  ["body", "Body & Paint"],
  ["inspection", "General Inspection"],
  ["other", "Other"],
];

const STATUSES = [
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["disposed", "Disposed"],
];

export default function RepairLog() {
  const [submitted, setSubmitted] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [vehicleId, setVehicleId]     = useState("");
  const [status, setStatus]           = useState("");
  const [vehicles, setVehicles]       = useState([]);
  const [error, setError]             = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { date: "", cost: "", odometer: "", service_provider: "", next_service_date: "", next_service_odometer: "", description: "" },
  });

  useEffect(() => {
    searchRead("fleet.vehicle", [["active", "=", true]], ["id", "name", "license_plate"], 100)
      .then(setVehicles).catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    setError(null);
    if (!vehicleId || !serviceType || !status) { setError("Vehicle, service type and status are required."); return; }
    try {
      await createRecord("messob.fms.maintenance.log", {
        vehicle_id:       parseInt(vehicleId),
        service_type:     serviceType,
        vehicle_state:    status,
        date:             data.date,
        cost:             parseFloat(data.cost),
        odometer:         parseInt(data.odometer),
        service_provider: data.service_provider,
        next_service_date: data.next_service_date || false,
        next_service_odometer: data.next_service_odometer ? parseInt(data.next_service_odometer) : false,
        description:      data.description,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false); reset();
        setServiceType(""); setVehicleId(""); setStatus("");
      }, 3000);
    } catch (e) { setError(e.message); }
  };

  const Field = ({ label, error: err, children }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</Label>
      {children}
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Repair & Maintenance Log</h1>
        <p className="text-sm text-gray-500 mt-1">Record every service or repair performed on a vehicle.</p>
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-green-600">
              <CheckCircle className="h-12 w-12" />
              <p className="font-black text-lg">Log submitted successfully!</p>
              <p className="text-sm text-gray-400">Form will reset shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date" error={errors.date?.message}>
                  <Input type="date" className={cn("h-11 border-2 rounded-xl", errors.date && "border-red-400")}
                    {...register("date", { required: "Date is required" })} />
                </Field>
                <Field label="Vehicle">
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name}{v.license_plate ? ` (${v.license_plate})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Service Type">
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select service type..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cost (ETB)" error={errors.cost?.message}>
                  <Input type="number" placeholder="e.g. 1200"
                    className={cn("h-11 border-2 rounded-xl", errors.cost && "border-red-400")}
                    {...register("cost", { required: "Cost is required", min: { value: 0, message: "Must be 0 or more" } })} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Odometer (km)" error={errors.odometer?.message}>
                  <Input type="number" placeholder="e.g. 54320"
                    className={cn("h-11 border-2 rounded-xl", errors.odometer && "border-red-400")}
                    {...register("odometer", { required: "Odometer is required", min: { value: 0, message: "Must be 0 or more" } })} />
                </Field>
                <Field label="Service Provider" error={errors.service_provider?.message}>
                  <Input placeholder="e.g. MESSOB Workshop"
                    className={cn("h-11 border-2 rounded-xl", errors.service_provider && "border-red-400")}
                    {...register("service_provider", { required: "Service provider is required" })} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Next Service Due">
                  <Input type="date" className="h-11 border-2 rounded-xl" {...register("next_service_date")} />
                </Field>
                <Field label="Next Service Odometer (km)">
                  <Input 
                    type="number" 
                    placeholder="e.g. 50000"
                    className="h-11 border-2 rounded-xl" 
                    {...register("next_service_odometer", { 
                      min: { value: 0, message: "Must be 0 or more" } 
                    })} 
                  />
                </Field>
              </div>

              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 border-2 rounded-xl w-full"><SelectValue placeholder="Select status..." /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Notes / Description">
                <Input placeholder="Optional notes about the service..."
                  className="h-11 border-2 rounded-xl" {...register("description")} />
              </Field>

              {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

              <Button type="submit" disabled={!vehicleId || !serviceType || !status}
                className="w-full h-12 bg-brand-blue hover:bg-blue-900 text-white font-black rounded-xl gap-2">
                <Wrench className="h-4 w-4" /> Submit Log
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
