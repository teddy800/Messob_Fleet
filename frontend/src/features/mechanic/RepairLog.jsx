import { useState } from "react";
import { useForm } from "react-hook-form";
import { Wrench, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  "Oil Change", "Brake Replacement", "Tire Rotation", "Engine Overhaul",
  "Transmission Service", "Battery Replacement", "AC Service",
  "Suspension Repair", "Electrical Repair", "General Inspection",
];

const VEHICLES = [
  "Toyota Land Cruiser (AA-12345)",
  "Toyota Corolla (AA-67890)",
  "Isuzu Truck (AA-11223)",
  "Nissan Patrol (AA-55678)",
  "Hyundai H1 Van (AA-99001)",
];

const MECHANICS = [
  "Mike (Maintainer)",
  "Selam Girma",
  "Tesfaye Bekele",
];

const STATUSES = ["Active", "Inactive", "Disposed"];

export default function RepairLog() {
  const [submitted, setSubmitted] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [vehicle, setVehicle]         = useState("");
  const [mechanic, setMechanic]       = useState("");
  const [status, setStatus]           = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      date: "", cost: "", odometer: "", serviceProvider: "", nextServiceDue: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Repair log:", { ...data, serviceType, vehicle, mechanic, status });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      reset();
      setServiceType(""); setVehicle(""); setMechanic(""); setStatus("");
    }, 3000);
  };

  // field wrapper for consistent styling
  const Field = ({ label, error, children }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
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

              {/* Row 1: Date + Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date" error={errors.date?.message}>
                  <Input type="date"
                    className={cn("h-11 border-2 rounded-xl", errors.date && "border-red-400")}
                    {...register("date", { required: "Date is required" })}
                  />
                </Field>

                <Field label="Vehicle">
                  <Select value={vehicle} onValueChange={setVehicle}>
                    <SelectTrigger className="h-11 border-2 rounded-xl w-full">
                      <SelectValue placeholder="Select vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Row 2: Service Type + Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Service Type">
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger className="h-11 border-2 rounded-xl w-full">
                      <SelectValue placeholder="Select service type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Cost (ETB)" error={errors.cost?.message}>
                  <Input type="number" placeholder="e.g. 1200"
                    className={cn("h-11 border-2 rounded-xl", errors.cost && "border-red-400")}
                    {...register("cost", { required: "Cost is required", min: { value: 0, message: "Must be 0 or more" } })}
                  />
                </Field>
              </div>

              {/* Row 3: Odometer + Service Provider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Odometer Reading (km)" error={errors.odometer?.message}>
                  <Input type="number" placeholder="e.g. 54320"
                    className={cn("h-11 border-2 rounded-xl", errors.odometer && "border-red-400")}
                    {...register("odometer", { required: "Odometer is required", min: { value: 0, message: "Must be 0 or more" } })}
                  />
                </Field>

                <Field label="Service Provider" error={errors.serviceProvider?.message}>
                  <Input placeholder="e.g. MESSOB Workshop"
                    className={cn("h-11 border-2 rounded-xl", errors.serviceProvider && "border-red-400")}
                    {...register("serviceProvider", { required: "Service provider is required" })}
                  />
                </Field>
              </div>

              {/* Row 4: Mechanic + Next Service Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mechanic">
                  <Select value={mechanic} onValueChange={setMechanic}>
                    <SelectTrigger className="h-11 border-2 rounded-xl w-full">
                      <SelectValue placeholder="Select mechanic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MECHANICS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Next Service Due" error={errors.nextServiceDue?.message}>
                  <Input type="date"
                    className={cn("h-11 border-2 rounded-xl", errors.nextServiceDue && "border-red-400")}
                    {...register("nextServiceDue", { required: "Next service date is required" })}
                  />
                </Field>
              </div>

              {/* Status */}
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 border-2 rounded-xl w-full">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Button
                type="submit"
                disabled={!vehicle || !serviceType || !mechanic || !status}
                className="w-full h-12 bg-brand-blue hover:bg-blue-900 text-white font-black rounded-xl gap-2"
              >
                <Wrench className="h-4 w-4" />
                Submit Log
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
