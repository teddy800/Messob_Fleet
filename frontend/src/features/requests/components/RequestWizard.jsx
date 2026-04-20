import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Car, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BG_URL = "https://www.ena.et/o/adaptive-media/image/6826100/Preview-1000x0/Moseb%20ethiopian%20service.jpg";

export default function RequestWizard() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(new Date());

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      purpose: "",
      passengers: "1",
      startPoint: "MESSOB Center HQ",
      destination: "",
      tripType: "One-Way"
    }
  });

  const formData = watch();

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = (data) => {
    const finalData = { ...data, date: format(date, "PPP") };
    console.log("Submitting:", finalData);
    alert("Request Submitted Successfully!");
    setStep(1);
  };

  return (
    <div className="relative -m-4 md:-m-8 min-h-screen overflow-hidden bg-brand-blue">
      
      {/* 1. BACKGROUND IMAGE LAYER (Fixed Opacity here only) */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for better form contrast */}
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* 2. CONTENT LAYER (relative z-10 makes text 100% visible) */}
      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-700">
        
        {/* --- STEP PROGRESS BAR --- */}
        <div className="flex items-center justify-between my-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/20 -translate-y-1/2 z-0"></div>
          <div 
              className="absolute top-1/2 left-0 h-1 bg-brand-gold -translate-y-1/2 z-0 transition-all duration-500" 
              style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="z-10 flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all border-4 shadow-xl",
                step >= item ? "bg-brand-gold text-brand-blue border-white scale-110" : "bg-brand-blue text-blue-200 border-blue-800"
              )}>
                {step > item ? <CheckCircle2 className="h-6 w-6" /> : item}
              </div>
              <span className={cn(
                "text-[10px] mt-2 font-black uppercase tracking-widest hidden sm:block",
                step >= item ? "text-white" : "text-blue-300"
              )}>
                {item === 1 ? "Basics" : item === 2 ? "Route" : item === 3 ? "Details" : "Review"}
              </span>
            </div>
          ))}
        </div>

        <Card className="border-none shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden rounded-[2rem]">
          <div className="bg-brand-blue p-8 text-white border-b-4 border-brand-gold">
              <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  {step === 1 && <Car className="text-brand-gold" />}
                  {step === 2 && <MapPin className="text-brand-gold" />}
                  {step === 3 && <Users className="text-brand-gold" />}
                  {step === 4 && <CheckCircle2 className="text-brand-gold" />}
                  Step {step}: {step === 1 ? "Trip Basics" : step === 2 ? "Destination" : step === 3 ? "Passengers" : "Confirm Request"}
              </h2>
              <p className="text-blue-100 text-sm opacity-80 mt-1 font-medium">Please fill out the official MESSOB trip request form.</p>
          </div>

          <CardContent className="p-10 bg-white min-h-[350px]">
            {step === 1 && (
              <div className="grid gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-14 justify-start border-2 border-gray-100 hover:border-brand-blue rounded-xl text-lg font-bold">
                        <CalendarIcon className="mr-3 h-5 w-5 text-brand-gold" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">Trip Purpose</Label>
                  <Select onValueChange={(val) => setValue("purpose", val)}>
                    <SelectTrigger className="h-14 border-2 border-gray-100 rounded-xl text-lg font-bold">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent >
                      <SelectItem value="Field Work">Field Work</SelectItem>
                      <SelectItem value="Meeting">Official Meeting</SelectItem>
                      <SelectItem value="Maintenance">Vehicle Maintenance</SelectItem>
                      <SelectItem value="Delivery">Cargo Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-8 animate-in fade-in slide-in-from-right-4">
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">From (Starting Point)</Label>
                  <Input {...register("startPoint")} className="h-14 border-2 border-gray-100 rounded-xl text-lg font-bold bg-gray-50" readOnly />
                </div>
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">To (Destination City/Area)</Label>
                  <Input {...register("destination")} placeholder="e.g. Adama, Bahir Dar" className="h-14 border-2 border-gray-100 focus:border-brand-blue rounded-xl text-lg font-bold" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-8 animate-in fade-in slide-in-from-right-4">
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">Number of Passengers</Label>
                  <Input type="number" {...register("passengers")} className="h-14 border-2 border-gray-100 rounded-xl text-lg font-bold" />
                </div>
                <div className="grid gap-3">
                  <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">Trip Type</Label>
                  <div className="flex gap-4">
                      {["One-Way", "Round Trip"].map((t) => (
                          <Button 
                              key={t}
                              type="button"
                              variant={formData.tripType === t ? "default" : "outline"}
                              className={cn("flex-1 h-14 border-2 rounded-xl font-bold transition-all", 
                                formData.tripType === t ? "bg-brand-blue text-white border-brand-blue scale-105 shadow-lg" : "border-gray-100 hover:border-brand-blue")}
                              onClick={() => setValue("tripType", t)}
                          >
                              {t}
                          </Button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="bg-brand-blue/5 p-8 rounded-[2rem] border-2 border-dashed border-brand-blue/20 shadow-inner">
                  <h3 className="font-black text-brand-blue mb-6 border-b border-brand-blue/10 pb-4 uppercase text-sm tracking-widest">Official Trip Summary</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Date</span>
                        <span className="font-black text-brand-blue text-lg">{format(date, "PPP")}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Purpose</span>
                        <span className="font-black text-brand-gold text-lg">{formData.purpose || "Not Specified"}</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Route</span>
                        <span className="font-black text-brand-blue text-lg">{formData.startPoint} <ChevronRight className="inline h-4 w-4 mx-2" /> {formData.destination}</span>
                      </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                   <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5" />
                   <p className="text-xs text-yellow-800 font-medium">Finalizing this request sends a formal notification to the Dispatcher for review and vehicle assignment.</p>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-8 bg-gray-50 flex justify-between items-center border-t border-gray-100">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="font-black text-brand-blue uppercase tracking-widest text-xs">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            
            {step < 4 ? (
              <Button onClick={nextStep} className="bg-brand-blue hover:bg-blue-900 px-10 h-14 font-black shadow-xl rounded-2xl text-white transition-all active:scale-95">
                Continue <ChevronRight className="ml-3 h-5 w-5" />
              </Button>
            ) : (
              <Button onClick={handleSubmit(onSubmit)} className="bg-green-600 hover:bg-green-700 px-10 h-14 font-black shadow-xl rounded-2xl text-white transition-all active:scale-95">
                Send Request <CheckCircle2 className="ml-3 h-5 w-5" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}