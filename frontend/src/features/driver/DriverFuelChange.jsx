import { useState } from "react";
import { useForm } from "react-hook-form";
import { Fuel, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fuelStatuses = ["Full", "Half", "Quarter", "Low", "Empty"];

export default function DriverFuelChange() {
  const [submitted, setSubmitted] = useState(false);
  const [fuelStatus, setFuelStatus] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      stationName: "",
      liters: "",
      price: "",
      odometer: "",
      date: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Fuel log submitted:", { ...data, fuelStatus });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFuelStatus("");
      reset();
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Fuel Change Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the details every time you refuel the vehicle.
        </p>
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-green-600">
              <CheckCircle className="h-12 w-12" />
              <p className="font-black text-lg">Fuel log submitted!</p>
              <p className="text-sm text-gray-400">Form will reset shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Fuel Status */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Fuel Status
                </Label>
                <Select onValueChange={setFuelStatus} value={fuelStatus}>
                  <SelectTrigger className={cn("h-12 border-2 rounded-xl", !fuelStatus && "text-gray-400")}>
                    <SelectValue placeholder="Select fuel level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Station Name */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Fuel Station Name
                </Label>
                <Input
                  placeholder="e.g. NOC Bole Station"
                  className={cn("h-12 border-2 rounded-xl", errors.stationName && "border-red-400")}
                  {...register("stationName", { required: "Station name is required" })}
                />
                {errors.stationName && (
                  <p className="text-xs text-red-500 font-semibold">{errors.stationName.message}</p>
                )}
              </div>

              {/* Liters + Price side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Liters
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 40"
                    className={cn("h-12 border-2 rounded-xl", errors.liters && "border-red-400")}
                    {...register("liters", {
                      required: "Required",
                      min: { value: 1, message: "Must be > 0" },
                    })}
                  />
                  {errors.liters && (
                    <p className="text-xs text-red-500 font-semibold">{errors.liters.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Price (ETB)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2800"
                    className={cn("h-12 border-2 rounded-xl", errors.price && "border-red-400")}
                    {...register("price", {
                      required: "Required",
                      min: { value: 1, message: "Must be > 0" },
                    })}
                  />
                  {errors.price && (
                    <p className="text-xs text-red-500 font-semibold">{errors.price.message}</p>
                  )}
                </div>
              </div>

              {/* Odometer */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Odometer Reading (km)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 54320"
                  className={cn("h-12 border-2 rounded-xl", errors.odometer && "border-red-400")}
                  {...register("odometer", {
                    required: "Odometer reading is required",
                    min: { value: 0, message: "Must be 0 or more" },
                  })}
                />
                {errors.odometer && (
                  <p className="text-xs text-red-500 font-semibold">{errors.odometer.message}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Date
                </Label>
                <Input
                  type="date"
                  className={cn("h-12 border-2 rounded-xl", errors.date && "border-red-400")}
                  {...register("date", { required: "Date is required" })}
                />
                {errors.date && (
                  <p className="text-xs text-red-500 font-semibold">{errors.date.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!fuelStatus}
                className="w-full h-12 bg-brand-blue hover:bg-blue-900 text-white font-black rounded-xl gap-2"
              >
                <Fuel className="h-4 w-4" />
                Submit Fuel Log
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
