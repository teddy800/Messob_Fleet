import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Fuel, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { searchRead, createRecord } from "@/lib/odooApi";

export default function DriverFuelChange() {
  const [submitted, setSubmitted] = useState(false);
  const [tripId, setTripId]       = useState("");
  const [trips, setTrips]         = useState([]);
  const [error, setError]         = useState(null);
  const [searchParams] = useSearchParams();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: { station_name: "", liters: "", price: "", odometer: "", date: "" },
  });

  useEffect(() => {
    // Load active trips for the driver to link fuel log to
    const tripKey = searchParams.get("tripId");
    searchRead("messob.fms.trip", [["state", "in", ["approved", "in_progress"]]], ["id", "name", "destination"], 50)
      .then((activeTrips) => {
        setTrips(activeTrips);
        if (tripKey && activeTrips.some((t) => String(t.id) === String(tripKey))) {
          setTripId(tripKey);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const onSubmit = async (data) => {
    setError(null);
    if (!tripId) { setError("Please select a trip."); return; }
    try {
      await createRecord("messob.fms.fuel.log", {
        trip_id:      parseInt(tripId),
        station_name: data.station_name,
        liters:       parseFloat(data.liters),
        price:        parseFloat(data.price),
        odometer:     parseInt(data.odometer),
        date:         data.date,
      });
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setTripId(""); reset(); }, 3000);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-black text-brand-blue">Fuel Change Log</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details every time you refuel the vehicle.</p>
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
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Trip</Label>
                <Select onValueChange={setTripId} value={tripId}>
                  <SelectTrigger className="h-12 border-2 rounded-xl"><SelectValue placeholder="Select active trip..." /></SelectTrigger>
                  <SelectContent>
                    {trips.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name} — {t.destination}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Fuel Station Name</Label>
                <Input placeholder="e.g. NOC Bole Station"
                  className={cn("h-12 border-2 rounded-xl", errors.station_name && "border-red-400")}
                  {...register("station_name", { required: "Station name is required" })} />
                {errors.station_name && <p className="text-xs text-red-500 font-semibold">{errors.station_name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Liters</Label>
                  <Input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 40"
                    className={cn("h-12 border-2 rounded-xl", errors.liters && "border-red-400")}
                    {...register("liters", { 
                      required: "Liters is required", 
                      min: { value: 0.01, message: "Must be positive number" } 
                    })} 
                  />
                  {errors.liters && <p className="text-xs text-red-500 font-semibold">{errors.liters.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Price (ETB)</Label>
                  <Input 
                    type="number" 
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 2800"
                    className={cn("h-12 border-2 rounded-xl", errors.price && "border-red-400")}
                    {...register("price", { 
                      required: "Price is required", 
                      min: { value: 0.01, message: "Must be positive number" } 
                    })} 
                  />
                  {errors.price && <p className="text-xs text-red-500 font-semibold">{errors.price.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Odometer Reading (km)</Label>
                <Input 
                  type="number" 
                  min="1"
                  step="1"
                  placeholder="e.g. 54320"
                  className={cn("h-12 border-2 rounded-xl", errors.odometer && "border-red-400")}
                  {...register("odometer", { 
                    required: "Odometer is required", 
                    min: { value: 1, message: "Must be positive number" } 
                  })} 
                />
                {errors.odometer && <p className="text-xs text-red-500 font-semibold">{errors.odometer.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Date</Label>
                <Input type="date" className={cn("h-12 border-2 rounded-xl", errors.date && "border-red-400")}
                  {...register("date", { required: "Date is required" })} />
                {errors.date && <p className="text-xs text-red-500 font-semibold">{errors.date.message}</p>}
              </div>

              {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

              <Button type="submit" className="w-full h-12 bg-brand-blue hover:bg-blue-900 text-white font-black rounded-xl gap-2">
                <Fuel className="h-4 w-4" /> Submit Fuel Log
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
