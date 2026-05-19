import { useState } from "react";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BG_URL = "https://www.ena.et/o/adaptive-media/image/6826100/Preview-1000x0/Moseb%20ethiopian%20service.jpg";

const requestSchema = z
  .object({
    purpose: z
      .string()
      .min(1, "Trip purpose is required")
      .min(10, "Purpose must be at least 10 characters"),
    vehicleCategory: z.string().min(1, "Please select a vehicle category"),
    departureDate: z.date({ required_error: "Departure date is required" }),
    arrivalDate: z.date({ required_error: "Arrival date is required" }),
    startPoint: z.string().min(1, "Starting point is required"),
    destination: z.string().min(1, "Destination is required"),
    passengers: z.string().optional(),
    tripType: z.string().optional(),
  })
  .refine((data) => data.arrivalDate >= data.departureDate, {
    message: "Arrival date must be on or after departure date",
    path: ["arrivalDate"],
  });

const TOTAL_STEPS = 5;

const STEP_FIELDS = {
  1: ["purpose", "vehicleCategory"],
  2: ["departureDate", "arrivalDate"],
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
  if (errors.departureDate || errors.arrivalDate) return 2;
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
      title: "Travel dates",
      items: [
        {
          label: "Departure",
          value: data.departureDate ? format(data.departureDate, "PPP") : null,
        },
        {
          label: "Arrival",
          value: data.arrivalDate ? format(data.arrivalDate, "PPP") : null,
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
    <div className="space-y-4">
      {rows.map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border-2 border-brand-blue/10 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 bg-brand-blue/5 border-b border-brand-blue/10">
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-blue">
              {section.title}
            </h4>
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(section.step)}
                className="h-8 text-xs font-bold text-brand-blue hover:text-brand-gold"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <div className="px-5 py-4 grid gap-4 sm:grid-cols-2">
            {section.items.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {item.label}
                </span>
                <span className="font-bold text-brand-blue text-base">
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
    shouldUnregister: false,
    mode: "onTouched",
    defaultValues: {
      purpose: "",
      vehicleCategory: "",
      departureDate: undefined,
      arrivalDate: undefined,
      passengers: "1",
      startPoint: "MESSOB Center HQ",
      destination: "",
      tripType: "One-Way",
    },
  });

  const formData = watch();

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
        toast.error("Please fill in all required fields before reviewing.");
        return;
      }
      goToStep(4);
      return;
    }

    if (step === 4) {
      const valid = await trigger();
      if (!valid) {
        setStep(stepForErrors(errors));
        toast.error("Some required fields are missing. Please edit and try again.");
        return;
      }
      goToStep(5);
      return;
    }

    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields);
    if (!valid) {
      toast.error("Please fill in all required fields before continuing.");
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
    <div className="relative -m-4 md:-m-8 min-h-screen overflow-hidden bg-brand-blue">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-700">
        <div className="flex items-center justify-between my-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/20 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-brand-gold -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />

          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((item) => (
            <div key={item} className="z-10 flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all border-4 shadow-xl",
                  step >= item
                    ? "bg-brand-gold text-brand-blue border-white scale-110"
                    : "bg-brand-blue text-blue-200 border-blue-800"
                )}
              >
                {step > item ? <CheckCircle2 className="h-6 w-6" /> : item}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-2 font-black uppercase tracking-widest hidden sm:block",
                  step >= item ? "text-white" : "text-blue-300"
                )}
              >
                {STEP_LABELS[item - 1]}
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
              {step === 4 && <ClipboardCheck className="text-brand-gold" />}
              {step === 5 && <CheckCircle2 className="text-brand-gold" />}
              Step {step}:{" "}
              {step === 1
                ? "Trip Basics"
                : step === 2
                  ? "Travel Dates"
                  : step === 3
                    ? "Destination"
                    : step === 4
                      ? "Review Your Request"
                      : "Confirm & Submit"}
            </h2>
            <p className="text-blue-100 text-sm opacity-80 mt-1 font-medium">
              {step === 4
                ? "Check every detail below. Use Edit to change anything before continuing."
                : step === 5
                  ? "Confirm that your information is correct, then submit your request."
                  : "Please fill out the official MESSOB trip request form."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
            <CardContent className="p-10 bg-white min-h-[350px]">
              {step === 1 && (
                <div className="grid gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
                      Trip Purpose <span className="text-red-500">*</span>
                    </Label>
                    <input
                      {...register("purpose")}
                      placeholder="Briefly describe the purpose of your trip"
                      className={cn(
                        "h-14 border-2 rounded-xl text-lg px-4 w-full outline-none focus:border-brand-blue",
                        errors.purpose ? "border-red-400" : "border-gray-100"
                      )}
                    />
                    <FieldError message={errors.purpose?.message} />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
                      Vehicle Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      {...register("vehicleCategory")}
                      className={cn(
                        "h-14 border-2 rounded-xl text-lg px-4 w-full outline-none focus:border-brand-blue",
                        errors.vehicleCategory ? "border-red-400" : "border-gray-100"
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
                <div className="grid gap-8 animate-in fade-in slide-in-from-right-4">
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
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
                                "w-full h-14 justify-start border-2 rounded-xl text-lg font-bold",
                                errors.departureDate ? "border-red-400" : "border-gray-100 hover:border-brand-blue"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-5 w-5 text-brand-gold" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    <FieldError message={errors.departureDate?.message} />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
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
                                "w-full h-14 justify-start border-2 rounded-xl text-lg font-bold",
                                errors.arrivalDate ? "border-red-400" : "border-gray-100 hover:border-brand-blue"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-5 w-5 text-brand-gold" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    <FieldError message={errors.arrivalDate?.message} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-8 animate-in fade-in slide-in-from-right-4">
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
                      From (Starting Point) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...register("startPoint")}
                      className="h-14 border-2 border-gray-100 rounded-xl text-lg font-bold bg-gray-50"
                      readOnly
                    />
                    <FieldError message={errors.startPoint?.message} />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-brand-blue font-black uppercase text-xs tracking-widest">
                      To (Destination City/Area) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...register("destination")}
                      placeholder="e.g. Adama, Bahir Dar"
                      className={cn(
                        "h-14 border-2 rounded-xl text-lg font-bold",
                        errors.destination ? "border-red-400" : "border-gray-100 focus:border-brand-blue"
                      )}
                    />
                    <FieldError message={errors.destination?.message} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <ReviewSummary data={formData} onEdit={goToStep} />
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <ClipboardCheck className="h-5 w-5 text-brand-blue shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-blue font-medium">
                      When everything looks correct, continue to the final step to confirm and
                      submit your request to the dispatcher.
                    </p>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <ReviewSummary data={formData} />
                  <label
                    className={cn(
                      "flex items-start gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors",
                      confirmed
                        ? "border-brand-gold bg-brand-gold/10"
                        : "border-gray-200 bg-gray-50 hover:border-brand-blue/30"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm font-medium text-gray-800 leading-relaxed">
                      I have reviewed my trip request and confirm that all information above is
                      accurate. I understand this will be sent to the dispatcher for approval and
                      vehicle assignment.
                    </span>
                  </label>
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5 shrink-0" />
                    <p className="text-xs text-yellow-800 font-medium">
                      After you submit, you will receive a confirmation and your request will appear
                      in Request Status while it is being processed.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-8 bg-gray-50 flex justify-between items-center border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                disabled={step === 1}
                className="font-black text-brand-blue uppercase tracking-widest text-xs"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-brand-blue hover:bg-blue-900 px-10 h-14 font-black shadow-xl rounded-2xl text-white transition-all active:scale-95"
                >
                  {step === 4 ? (
                    <>
                      Continue to Confirm <ChevronRight className="ml-3 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="ml-3 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!confirmed || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-10 h-14 font-black shadow-xl rounded-2xl text-white transition-all active:scale-95"
                >
                  {isSubmitting ? "Submitting…" : "Confirm & Submit"}
                  {!isSubmitting && <CheckCircle2 className="ml-3 h-5 w-5" />}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
