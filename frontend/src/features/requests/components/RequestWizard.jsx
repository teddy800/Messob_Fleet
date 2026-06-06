import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createTripRequest } from "@/lib/useTripRequests";
import {
  Calendar as CalendarIcon,
  Car,
  MapPin,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ClipboardCheck,
  Pencil,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationPicker from "@/components/map/LocationPicker";

const BG_URL = "https://www.ena.et/o/adaptive-media/image/6826100/Preview-1000x0/Moseb%20ethiopian%20service.jpg";

const requestSchema = z
  .object({
    purpose: z
      .string()
      .min(1, "Trip purpose is required")
      .min(10, "Purpose must be at least 10 characters"),
    vehicleCategory: z.string().min(1, "Please select a vehicle category"),
    departureDate: z.date({ required_error: "Departure date is required" }),
    departureTime: z.string().min(1, "Departure time is required"),
    arrivalDate: z.date({ required_error: "Arrival date is required" }),
    arrivalTime: z.string().min(1, "Arrival time is required"),
    startPoint: z.string().min(1, "Starting point is required"),
    destination: z.string().min(1, "Destination is required"),
    passengers: z.string().optional(),
    tripType: z.string().optional(),
  })
  .refine((data) => {
    // Check if departure date/time is in the past
    if (!data.departureDate || !data.departureTime) return true; // Skip if not filled
    
    const now = new Date();
    
    // Work directly with the Date object to avoid timezone issues
    const depDate = new Date(data.departureDate.getTime()); // Create a copy
    const [hours, minutes] = data.departureTime.split(':');
    depDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    // Allow if departure is in the future
    return depDate > now;
  }, {
    message: "Departure date/time cannot be in the past",
    path: ["departureTime"],
  })
  .refine((data) => {
    // Combine date and time for comparison - arrival must be after departure
    if (!data.departureDate || !data.departureTime || !data.arrivalDate || !data.arrivalTime) return true;
    
    // Work directly with Date objects to avoid timezone issues
    const departureDateTime = new Date(data.departureDate.getTime());
    const [depHours, depMinutes] = data.departureTime.split(':');
    departureDateTime.setHours(parseInt(depHours, 10), parseInt(depMinutes, 10), 0, 0);
    
    const arrivalDateTime = new Date(data.arrivalDate.getTime());
    const [arrHours, arrMinutes] = data.arrivalTime.split(':');
    arrivalDateTime.setHours(parseInt(arrHours, 10), parseInt(arrMinutes, 10), 0, 0);
    
    return arrivalDateTime > departureDateTime;
  }, {
    message: "Arrival date/time must be after departure date/time",
    path: ["arrivalTime"],
  });

const TOTAL_STEPS = 5;

const STEP_FIELDS = {
  1: ["purpose", "vehicleCategory"],
  2: ["departureDate", "departureTime", "arrivalDate", "arrivalTime"],
  3: ["startPoint", "destination"],
};

const STEP_LABELS = ["Basics", "Dates", "Route", "Review", "Confirm"];

const VEHICLE_LABELS = {
  sedan: "Sedan",
  suv: "SUV",
  bus: "Bus",
  minibus: "Mini Bus",
  pickup: "Pick-up",
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs font-semibold text-red-500 mt-1">{message}</p>;
}

function stepForErrors(errors) {
  if (errors.purpose || errors.vehicleCategory) return 1;
  if (errors.departureDate || errors.departureTime || errors.arrivalDate || errors.arrivalTime) return 2;
  if (errors.startPoint || errors.destination) return 3;
  return 1;
}

function ReviewSummary({ data, onEdit }) {
  const rows = [
    {
      step: 1,
      title: "Trip basics",
      items: [
        { label: "Purpose", value: data.purpose },
        {
          label: "Vehicle category",
          value: VEHICLE_LABELS[data.vehicleCategory] || data.vehicleCategory,
        },
      ],
    },
    {
      step: 2,
      title: "Travel schedule",
      items: [
        {
          label: "Departure",
          value: data.departureDate && data.departureTime 
            ? `${format(data.departureDate, "PPP")} at ${data.departureTime}` 
            : null,
        },
        {
          label: "Arrival",
          value: data.arrivalDate && data.arrivalTime 
            ? `${format(data.arrivalDate, "PPP")} at ${data.arrivalTime}` 
            : null,
        },
      ],
    },
    {
      step: 3,
      title: "Route",
      items: [
        { label: "From", value: data.startPoint },
        { label: "To", value: data.destination },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {rows.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-brand-blue/10 bg-white overflow-hidden dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-brand-blue/5 border-b border-brand-blue/10 dark:bg-gray-700/30 dark:border-gray-600">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-blue dark:text-gray-300">
              {section.title}
            </h4>
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(section.step)}
                className="h-7 text-[10px] font-bold text-brand-blue hover:text-brand-gold px-2"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <div className="px-4 py-3 grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-400">
                  {item.label}
                </span>
                <span className="font-bold text-brand-blue text-sm dark:text-gray-300">
                  {item.value || <span className="text-red-400">Not provided</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RequestWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    watch,
    control,
    handleSubmit,
    trigger,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
    shouldUnregister: false,
    mode: "onTouched",
    defaultValues: {
      purpose: "",
      vehicleCategory: "",
      departureDate: undefined,
      departureTime: "08:00",
      arrivalDate: undefined,
      arrivalTime: "17:00",
      passengers: "1",
      startPoint: "MESSOB Center HQ",
      destination: "",
      tripType: "One-Way",
    },
  });

  const formData = watch();

  // Helper function to get minimum time for date picker
  const getMinimumTime = (selectedDate) => {
    if (!selectedDate) return "00:00";
    
    const now = new Date();
    const selected = new Date(selectedDate);
    
    // Check if selected date is today
    const isToday = selected.toDateString() === now.toDateString();
    
    if (isToday) {
      // Return current time + 1 hour as minimum (rounded to next hour)
      const minTime = new Date(now.getTime() + 60 * 60 * 1000);
      const hours = String(minTime.getHours()).padStart(2, '0');
      const minutes = String(minTime.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return "00:00";
  };

  // Helper function to get minimum time for arrival based on departure
  const getMinimumArrivalTime = (departureDate, departureTime, arrivalDate) => {
    if (!departureDate || !departureTime || !arrivalDate) return "00:00";
    
    const depDate = new Date(departureDate);
    const arrDate = new Date(arrivalDate);
    
    // If arrival is on same day as departure
    if (depDate.toDateString() === arrDate.toDateString()) {
      // Parse departure time and add minimum 30 minutes
      const [hours, minutes] = departureTime.split(':');
      const depDateTime = new Date(depDate);
      depDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Add 30 minutes minimum
      const minArrivalTime = new Date(depDateTime.getTime() + 30 * 60 * 1000);
      const minHours = String(minArrivalTime.getHours()).padStart(2, '0');
      const minMinutes = String(minArrivalTime.getMinutes()).padStart(2, '0');
      return `${minHours}:${minMinutes}`;
    }
    
    return "00:00";
  };

  const goToStep = (target) => {
    setStep(target);
    if (target < TOTAL_STEPS) setConfirmed(false);
  };

  const prevStep = () => goToStep(Math.max(step - 1, 1));

  const handleNext = async () => {
    if (step === 3) {
      const valid = await trigger(Object.values(STEP_FIELDS).flat());
      if (!valid) {
        setStep(stepForErrors(errors));
        // Show specific error message if available
        const errorMessage = errors.arrivalTime?.message || errors.departureTime?.message || "Please fill in all required fields before reviewing.";
        toast.error(errorMessage);
        return;
      }
      goToStep(4);
      return;
    }

    if (step === 4) {
      const valid = await trigger();
      if (!valid) {
        setStep(stepForErrors(errors));
        // Show specific error message if available
        const errorMessage = errors.arrivalTime?.message || errors.departureTime?.message || "Some required fields are missing. Please edit and try again.";
        toast.error(errorMessage);
        return;
      }
      goToStep(5);
      return;
    }

    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields);
    if (!valid) {
      // Show specific error message if available
      const firstError = Object.values(errors).find(e => e?.message);
      const errorMessage = firstError?.message || "Please fill in all required fields before continuing.";
      toast.error(errorMessage);
      return;
    }
    goToStep(step + 1);
  };

  const onSubmit = async (data) => {
    if (!confirmed) {
      toast.error("Please confirm that your information is correct before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tripId = await createTripRequest(data);
      toast.success("Request submitted successfully! It is now pending dispatcher review.");
      reset();
      setConfirmed(false);
      setStep(1);
      navigate("/dashboard/requests/status", { state: { newTripId: tripId } });
    } catch (err) {
      toast.error(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (formErrors) => {
    setStep(stepForErrors(formErrors));
    toast.error("Please complete all required fields before submitting.");
  };

  return (
    <div className="relative -m-4 md:-m-8 h-screen overflow-hidden bg-white">
      {/* Clean white background with subtle gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-gray-50 to-blue-50">
        <div className="absolute inset-0 bg-white/90" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto h-full flex flex-col py-6 px-4 animate-in fade-in duration-700 dark:text-gray-100">
        {/* Compact Progress Steps */}
        <div className="flex items-center justify-between my-6 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0 dark:bg-gray-600" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-brand-gold -translate-y-1/2 z-0 transition-all duration-500 dark:bg-yellow-400"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />

          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((item) => (
            <div key={item} className="z-10 flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-black transition-all border-2 shadow-lg text-sm dark:border-gray-700",
                  step >= item
                    ? "bg-brand-gold text-brand-blue border-white scale-105 dark:bg-yellow-400 dark:text-gray-800 dark:border-gray-300"
                    : "bg-brand-blue text-blue-200 border-blue-800 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                )}
              >
                {step > item ? <CheckCircle2 className="h-4 w-4" /> : item}
              </div>
              <span
                className={cn(
                  "text-[9px] mt-1.5 font-black uppercase tracking-widest hidden sm:block",
                  step >= item ? "text-brand-blue" : "text-gray-400 dark:text-gray-500"
                )}
              >
                {STEP_LABELS[item - 1]}
              </span>
            </div>
          ))}
        </div>

        {/* Compact Card - Flex grow to fill available space */}
        <Card className="border-none shadow-[0_10px_30px_rgba(59,90,166,0.12)] overflow-hidden rounded-3xl bg-white dark:bg-gray-800 flex-1 flex flex-col">
          {/* Compact Header */}
          <div className="bg-brand-blue px-6 py-4 text-white border-b-2 border-brand-gold dark:border-yellow-400">
            <h2 className="text-xl font-black flex items-center gap-2.5 tracking-tight dark:text-gray-100">
              {step === 1 && <Car className="text-brand-gold dark:text-yellow-400 h-5 w-5" />}
              {step === 2 && <MapPin className="text-brand-gold dark:text-yellow-400 h-5 w-5" />}
              {step === 3 && <Users className="text-brand-gold dark:text-yellow-400 h-5 w-5" />}
              {step === 4 && <ClipboardCheck className="text-brand-gold dark:text-yellow-400 h-5 w-5" />}
              {step === 5 && <CheckCircle2 className="text-brand-gold dark:text-yellow-400 h-5 w-5" />}
              Step {step}:{" "}
              {step === 1
                ? "Trip Basics"
                : step === 2
                  ? "Schedule (Date & Time)"
                  : step === 3
                    ? "Destination"
                    : step === 4
                      ? "Review Your Request"
                      : "Confirm & Submit"}
            </h2>
            <p className="text-blue-100 text-xs opacity-80 mt-0.5 font-medium dark:text-gray-300">
              {step === 4
                ? "Check every detail below. Use Edit to change anything before continuing."
                : step === 5
                  ? "Confirm that your information is correct, then submit your request."
                  : "Please fill out the official MESSOB trip request form."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Content Area */}
            <CardContent className="p-6 bg-white flex-1 overflow-y-auto dark:bg-gray-800">
              {step === 1 && (
                <div className="grid gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest">
                      Trip Purpose <span className="text-red-500">*</span>
                    </Label>
                    <input
                      {...register("purpose")}
                      placeholder="Briefly describe the purpose of your trip"
                      className={cn(
                        "h-11 border-2 rounded-xl text-sm px-3.5 w-full outline-none focus:border-brand-blue transition-colors",
                        errors.purpose ? "border-red-400" : "border-gray-100"
                      )}
                    />
                    <FieldError message={errors.purpose?.message} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest dark:text-gray-400">
                      Vehicle Category <span className="text-red-500 dark:text-red-400">*</span>
                    </Label>
                    <select
                      {...register("vehicleCategory")}
                      className={cn(
                        "h-11 border-2 rounded-xl text-sm px-3.5 w-full outline-none focus:border-brand-blue transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                        errors.vehicleCategory ? "border-red-400" : "border-gray-100 hover:border-brand-blue dark:border-gray-600 dark:hover:border-yellow-400"
                      )}
                    >
                      <option value="">Select a category</option>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="bus">Bus</option>
                      <option value="minibus">Mini Bus</option>
                      <option value="pickup">Pick-up</option>
                    </select>
                    <FieldError message={errors.vehicleCategory?.message} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 animate-in fade-in slide-in-from-right-4">
                  {/* Validation Error Alert */}
                  {(errors.departureTime || errors.arrivalTime) && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-400">
                      <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 dark:text-red-400" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-400">Validation Error</h4>
                        <p className="text-[11px] text-red-600 mt-1 font-medium dark:text-red-300">
                          {errors.departureTime?.message || errors.arrivalTime?.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Departure Date & Time */}
                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest">
                      Departure Date <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="departureDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full h-11 justify-start border-2 rounded-xl text-sm font-bold transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                                errors.departureDate ? "border-red-400" : "border-gray-100 hover:border-brand-blue dark:border-gray-600 dark:hover:border-yellow-400"
                              )}
                            >
                              <CalendarIcon className="mr-2.5 h-4 w-4 text-brand-gold dark:text-yellow-400" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl dark:bg-gray-700" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              disabled={(date) => {
                                // Get today at midnight
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                // Block ALL dates before today (yesterday, last week, last month, etc.)
                                return date < today;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    <FieldError message={errors.departureDate?.message} />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest">
                      Departure Time <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="time"
                      {...register("departureTime")}
                      min={getMinimumTime(formData.departureDate)}
                      className={cn(
                        "h-11 border-2 rounded-xl text-sm px-3.5 w-full outline-none focus:border-brand-blue transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                        errors.departureTime ? "border-red-400" : "border-gray-100 hover:border-brand-blue dark:border-gray-600"
                      )}
                    />
                    <FieldError message={errors.departureTime?.message} />
                    {formData.departureDate && new Date(formData.departureDate).toDateString() === new Date().toDateString() && (
                      <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 dark:text-yellow-400">
                        <span className="inline-block h-1 w-1 bg-amber-500 rounded-full" />
                        Cannot schedule past times for today. Minimum: {getMinimumTime(formData.departureDate)}
                      </p>
                    )}
                  </div>

                  {/* Arrival Date & Time */}
                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest">
                      Arrival Date <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="arrivalDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full h-11 justify-start border-2 rounded-xl text-sm font-bold transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                                errors.arrivalDate ? "border-red-400" : "border-gray-100 hover:border-brand-blue dark:border-gray-600 dark:hover:border-yellow-400"
                              )}
                            >
                              <CalendarIcon className="mr-2.5 h-4 w-4 text-brand-gold dark:text-yellow-400" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl dark:bg-gray-700" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                              }}
                              disabled={(date) => {
                                // Get today at midnight
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                // Block ALL dates before today (yesterday, last week, last month, etc.)
                                if (date < today) return true;
                                
                                // If departure date is set, also block dates before departure
                                if (formData.departureDate) {
                                  const depDate = new Date(formData.departureDate);
                                  depDate.setHours(0, 0, 0, 0);
                                  return date < depDate;
                                }
                                
                                return false;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    <FieldError message={errors.arrivalDate?.message} />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest">
                      Arrival Time <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="time"
                      {...register("arrivalTime")}
                      min={getMinimumArrivalTime(formData.departureDate, formData.departureTime, formData.arrivalDate)}
                      className={cn(
                        "h-11 border-2 rounded-xl text-sm px-3.5 w-full outline-none focus:border-brand-blue transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                        errors.arrivalTime ? "border-red-400" : "border-gray-100 hover:border-brand-blue dark:border-gray-600"
                      )}
                    />
                    <FieldError message={errors.arrivalTime?.message} />
                    {formData.departureDate && formData.arrivalDate && 
                     new Date(formData.departureDate).toDateString() === new Date(formData.arrivalDate).toDateString() && (
                      <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 dark:text-yellow-400">
                        <span className="inline-block h-1 w-1 bg-amber-500 rounded-full" />
                        Same-day trip: Arrival must be at least 30 minutes after departure
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  {/* Interactive Map */}
                  <LocationPicker
                    startPoint={formData.startPoint}
                    destination={formData.destination}
                    onStartPointChange={(value) => {
                      setValue("startPoint", value, { shouldValidate: true, shouldDirty: true });
                    }}
                    onDestinationChange={(value) => {
                      setValue("destination", value, { shouldValidate: true, shouldDirty: true });
                    }}
                  />

                  {/* Text Inputs */}
                  <div className="grid gap-3 pt-3 border-t border-gray-100">
                    <div className="grid gap-1.5">
                      <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest dark:text-gray-400">
                        From (Starting Point) <span className="text-red-500 dark:text-red-400">*</span>
                      </Label>
                      <Input
                        {...register("startPoint")}
                        className={cn(
                          "h-10 border-2 rounded-xl text-sm font-bold transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                          errors.startPoint ? "border-red-400" : "border-gray-100 focus:border-brand-blue dark:border-gray-600 dark:focus:border-yellow-400"
                        )}
                        placeholder="Select from map or type manually"
                      />
                      <FieldError message={errors.startPoint?.message} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-brand-blue font-black uppercase text-[10px] tracking-widest dark:text-gray-400">
                        To (Destination) <span className="text-red-500 dark:text-red-400">*</span>
                      </Label>
                      <Input
                        {...register("destination")}
                        placeholder="Select from map or type manually"
                        className={cn(
                          "h-10 border-2 rounded-xl text-sm font-bold transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300",
                          errors.destination ? "border-red-400" : "border-gray-100 focus:border-brand-blue dark:border-gray-600 dark:focus:border-yellow-400"
                        )}
                      />
                      <FieldError message={errors.destination?.message} />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <ReviewSummary data={formData} onEdit={goToStep} />
                  <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100 dark:bg-gray-700/30 dark:border-gray-600">
                    <ClipboardCheck className="h-4 w-4 text-brand-blue shrink-0 mt-0.5 dark:text-yellow-400" />
                    <p className="text-xs text-brand-blue font-medium dark:text-gray-300 dark:bg-gray-700/30">
                      When everything looks correct, continue to the final step to confirm and
                      submit your request to the dispatcher.
                    </p>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <ReviewSummary data={formData} />
                  <label
                    className={cn(
                      "flex items-start gap-2.5 p-4 rounded-xl border-2 cursor-pointer transition-colors dark:bg-gray-700/30",
                      confirmed
                        ? "border-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 dark:border-yellow-400 dark:bg-yellow-400/10 dark:hover:bg-yellow-400/20"
                        : "border-gray-200 bg-gray-50 hover:border-brand-blue/30 dark:border-gray-600 dark:bg-gray-700/30 dark:hover:border-yellow-400"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue dark:border-gray-600 dark:bg-gray-700 dark:ring-yellow-400 dark:focus:ring-yellow-400"
                    />
                    <span className="text-xs font-medium text-gray-800 leading-relaxed dark:text-gray-300 dark:bg-gray-700/30">
                      I have reviewed my trip request and confirm that all information above is
                      accurate. I understand this will be sent to the dispatcher for approval and
                      vehicle assignment.
                    </span>
                  </label>
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50/40 rounded-xl border border-amber-200/50 dark:bg-gray-700/30 dark:border-gray-600">
                    <div className="h-1.5 w-1.5 bg-amber-500/70 rounded-full mt-1.5 shrink-0" />
                    <p className="text-[11px] text-amber-700/80 font-medium dark:text-gray-300 dark:bg-gray-700/30">
                      After you submit, you will receive a confirmation and your request will appear
                      in Request Status while it is being processed.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Compact Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-gray-100 dark:bg-gray-800 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                disabled={step === 1}
                className="font-black text-brand-blue uppercase tracking-widest text-[10px] h-10 dark:text-gray-300"
              >
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-brand-blue hover:bg-blue-900 px-8 h-11 font-black shadow-lg rounded-xl text-white text-sm transition-all active:scale-95 dark:bg-yellow-400 dark:hover:bg-yellow-500"
                >
                  {step === 4 ? (
                    <>
                      Continue to Confirm <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!confirmed || isSubmitting}
                  className="bg-emerald-500/80 hover:bg-emerald-600/80 disabled:opacity-50 disabled:cursor-not-allowed px-8 h-11 font-black shadow-lg rounded-xl text-white text-sm transition-all active:scale-95"
                >
                  {isSubmitting ? "Submitting…" : "Confirm & Submit"}
                  {!isSubmitting && <CheckCircle2 className="ml-2 h-4 w-4" />}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
