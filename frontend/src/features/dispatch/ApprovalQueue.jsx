import { useState, useEffect } from "react";
import {
  Eye, CheckCircle, XCircle, Clock, MapPin, Calendar,
  Car, ChevronRight, User, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTripRequests, fetchVehicles, fetchDrivers, approveTrip, rejectTrip, closeTrip } from "@/lib/useTripRequests";
import { searchRead } from "@/lib/odooApi";

const statusBadge = {
  Pending:  "bg-amber-50/40 dark:bg-amber-900/10 text-amber-600/80 dark:text-amber-400/60 border-2 border-amber-200/50 dark:border-amber-700/30",
  Approved: "bg-emerald-50/40 dark:bg-emerald-900/10 text-emerald-600/80 dark:text-emerald-400/60 border-2 border-emerald-200/50 dark:border-emerald-700/30",
  Rejected: "bg-rose-50/40 dark:bg-rose-900/10 text-rose-600/80 dark:text-rose-400/60 border-2 border-rose-200/50 dark:border-rose-700/30",
  "In Progress": "bg-emerald-50/40 dark:bg-emerald-900/10 text-emerald-600/80 dark:text-emerald-400/60 border-2 border-emerald-200/50 dark:border-emerald-700/30",
  Completed: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700",
  Closed: "bg-gray-50 dark:bg-gray-700/20 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600",
};

const statusIcon = {
  Pending:  <Clock className="h-3.5 w-3.5" />,
  Approved: <CheckCircle className="h-3.5 w-3.5" />,
  Rejected: <XCircle className="h-3.5 w-3.5" />,
  "In Progress": <Clock className="h-3.5 w-3.5" />,
  Completed: <CheckCircle className="h-3.5 w-3.5" />,
  Closed: <CheckCircle className="h-3.5 w-3.5" />,
};

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-brand-gold dark:text-yellow-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function ApprovalQueue() {
  const { trips, loading, refetch } = useTripRequests(["pending", "approved", "rejected", "in_progress", "completed", "closed"]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approving, setApproving]   = useState(false);
  const [vehicleId, setVehicleId]   = useState("");
  const [driverId, setDriverId]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    fetchVehicles().then(setVehicles).catch(() => {});
    fetchDrivers().then(setDrivers).catch(() => {});
  }, []);

  const openDialog = (req) => {
    setSelected(req);
    setApproving(false);
    setVehicleId("");
    setDriverId("");
    setError(null);
    setDialogOpen(true);
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await rejectTrip(selected.id);
      setDialogOpen(false);
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await closeTrip(selected.id);
      setDialogOpen(false);
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    // CRITICAL VALIDATION: Check if trip schedule has passed
    if (selected.start_dt) {
      const scheduledDateTime = new Date(selected.start_dt);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        setError(`Cannot approve this request. The scheduled departure time (${scheduledDateTime.toLocaleString()}) has already passed. Please ask the requester to submit a new request with a future date/time.`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const selectedDriver = drivers.find((d) => String(d.id) === String(driverId));
      let driverPartnerId = Array.isArray(selectedDriver?.partner_id)
        ? selectedDriver.partner_id[0]
        : selectedDriver?.partner_id;

      if (!driverPartnerId && selectedDriver?.name) {
        const [partner] = await searchRead(
          "res.partner",
          [["name", "ilike", selectedDriver.name]],
          ["id"],
          1
        );
        driverPartnerId = partner?.id;
      }

      if (!driverPartnerId) {
        throw new Error("Unable to resolve partner for selected driver.");
      }

      await approveTrip(selected.id, parseInt(vehicleId), driverPartnerId);
      setDialogOpen(false);
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sorted = [...trips].sort((a, b) => {
    const order = { pending: 0, approved: 1, in_progress: 2, completed: 3, rejected: 4, closed: 5 };
    return (order[a.state] ?? 6) - (order[b.state] ?? 6);
  });

  const pendingCount = trips.filter((r) => r.state === "pending").length;

  const stateLabel = (state) => {
    const labels = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      in_progress: "In Progress",
      completed: "Completed",
      closed: "Closed",
    };
    return labels[state] || state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue dark:text-blue-400">Current Requests</h1>
        <Badge className="bg-amber-50/40 dark:bg-amber-900/10 text-amber-600/80 dark:text-amber-400/60 border-2 border-amber-200/50 dark:border-amber-700/30 px-4 py-2 font-black text-sm">
          <Clock className="h-4 w-4 mr-2" />
          {pendingCount} Pending
        </Badge>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((req) => {
            // Check if trip schedule has passed
            const isExpired = req.start_dt && new Date(req.start_dt) <= new Date() && req.state === "pending";
            
            return (
            <div
              key={req.id}
              className={`bg-white dark:bg-gray-800 border rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow ${
                isExpired ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/20" : "border-gray-100 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="hidden sm:flex flex-col items-center justify-center bg-brand-blue/5 dark:bg-blue-900/20 rounded-lg px-3 py-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {new Date(req.create_date).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="text-xl font-black text-brand-blue dark:text-blue-400 leading-none">
                    {new Date(req.create_date).getDate()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-brand-blue dark:text-blue-400">{req.name}</span>
                    <Badge className={`text-xs font-black uppercase tracking-widest border-2 shadow-md flex items-center gap-1.5 px-3 py-1.5 ${statusBadge[stateLabel(req.state)] || statusBadge.Pending}`}>
                      {statusIcon[stateLabel(req.state)] || statusIcon.Pending} {stateLabel(req.state)}
                    </Badge>
                    {isExpired && (
                      <Badge className="text-xs font-black uppercase tracking-widest border-2 shadow-md flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                        <XCircle className="h-3 w-3" /> EXPIRED
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-0.5 truncate">
                    <span className="font-bold text-gray-800 dark:text-gray-100">
                      {Array.isArray(req.requester_id) ? req.requester_id[1] : "—"}
                    </span>
                    {" · "}
                    {req.pickup} <ChevronRight className="inline h-3 w-3" /> {req.destination}
                  </p>
                  <p className={`text-xs mt-0.5 ${isExpired ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-400 dark:text-gray-500"}`}>
                    {req.start_dt ? new Date(req.start_dt).toLocaleString() : "—"} · {req.purpose}
                    {isExpired && " (Schedule has passed)"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(req)}
                className="shrink-0 ml-4 rounded-lg cursor-pointer border-brand-blue/30 dark:border-blue-700 text-brand-blue dark:text-blue-400 hover:bg-brand-blue dark:hover:bg-blue-700 hover:text-white dark:hover:text-white transition-colors dark:bg-gray-800"
              >
                <Eye className="h-4 w-4 mr-1.5" /> View
              </Button>
            </div>
          )})}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-6 dark:bg-gray-800 dark:border-gray-700">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-brand-blue dark:text-blue-400 font-black flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-gold dark:text-yellow-400" />
                  Request {selected.name}
                </DialogTitle>
              </DialogHeader>

              {!approving && (
                <div className="space-y-5 py-2">
                  <div className="flex items-center gap-3 bg-brand-blue/5 dark:bg-blue-900/20 rounded-xl p-4 border border-brand-blue/10 dark:border-blue-700/30">
                    <div className="bg-brand-blue dark:bg-blue-700 rounded-full p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-brand-blue dark:text-blue-400 text-sm">
                        {Array.isArray(selected.requester_id) ? selected.requester_id[1] : "—"}
                      </p>
                    </div>
                    <Badge className={`ml-auto text-xs font-black uppercase tracking-widest border-2 shadow-md px-3 py-1.5 ${statusBadge[stateLabel(selected.state)] || statusBadge.Pending}`}>
                      {stateLabel(selected.state)}
                    </Badge>
                  </div>

                  {/* WARNING: Check if trip schedule has passed */}
                  {selected.start_dt && new Date(selected.start_dt) <= new Date() && selected.state === "pending" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-red-700 dark:text-red-400 text-sm">⚠️ EXPIRED REQUEST</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          The scheduled departure time ({new Date(selected.start_dt).toLocaleString()}) has already passed. 
                          This request cannot be approved. The requester must submit a new request with a future date/time.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow icon={MapPin}   label="Route"       value={`${selected.pickup} → ${selected.destination}`} />
                    <DetailRow icon={Calendar} label="Start"       value={selected.start_dt ? new Date(selected.start_dt).toLocaleString() : "—"} />
                    <DetailRow icon={Car}      label="Vehicle Cat" value={selected.vehicle_category || "—"} />
                    <DetailRow icon={FileText} label="Purpose"     value={selected.purpose} />
                  </div>

                  {selected.state === "approved" && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 text-sm space-y-1">
                      <p className="font-bold text-green-700 dark:text-green-400">
                        Vehicle: {Array.isArray(selected.assigned_vehicle_id) ? selected.assigned_vehicle_id[1] : "—"}
                      </p>
                      <p className="font-bold text-green-700 dark:text-green-400">
                        Driver: {Array.isArray(selected.assigned_driver_id) ? selected.assigned_driver_id[1] : "—"}
                      </p>
                    </div>
                  )}

                  {selected.state === "completed" && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 text-sm space-y-1">
                      <p className="font-bold text-purple-700 dark:text-purple-400">
                        ✅ Trip Completed
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Vehicle: {Array.isArray(selected.assigned_vehicle_id) ? selected.assigned_vehicle_id[1] : "—"}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Driver: {Array.isArray(selected.assigned_driver_id) ? selected.assigned_driver_id[1] : "—"}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                        Click "Close Trip" below to mark this trip as closed (final state).
                      </p>
                    </div>
                  )}

                  {selected.state === "closed" && (
                    <div className="bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm">
                      <p className="font-bold text-gray-600 dark:text-gray-400">
                        🔒 Trip Closed - Final State
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        This trip has been closed and archived.
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-500 dark:text-red-400 font-semibold">{error}</p>}

                  {selected.state === "pending" && (
                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={handleReject}
                        disabled={submitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setApproving(true)}
                        disabled={selected.start_dt && new Date(selected.start_dt) <= new Date()}
                        title={selected.start_dt && new Date(selected.start_dt) <= new Date() ? "Cannot approve expired trip request" : ""}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> 
                        {selected.start_dt && new Date(selected.start_dt) <= new Date() ? "Expired - Cannot Approve" : "Approve"}
                      </Button>
                    </DialogFooter>
                  )}

                  {selected.state === "completed" && (
                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        className="flex-1 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-800 text-white"
                        onClick={handleClose}
                        disabled={submitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {submitting ? "Closing..." : "Close Trip"}
                      </Button>
                    </DialogFooter>
                  )}
                </div>
              )}

              {approving && (
                <div className="space-y-5 py-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Assign a vehicle and driver for this trip to <span className="font-bold dark:text-gray-200">{selected.destination}</span>.
                  </p>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Vehicle</Label>
                    <Select onValueChange={setVehicleId} value={vehicleId}>
                      <SelectTrigger className="h-12 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        <SelectValue placeholder="Select a vehicle..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)} className="dark:text-gray-200 dark:hover:bg-gray-600">
                            {v.name} {v.license_plate ? `(${v.license_plate})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Driver</Label>
                    <Select onValueChange={setDriverId} value={driverId}>
                      <SelectTrigger className="h-12 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        <SelectValue placeholder="Select a driver..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)} className="dark:text-gray-200 dark:hover:bg-gray-600">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {error && <p className="text-sm text-red-500 dark:text-red-400 font-semibold">{error}</p>}

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setApproving(false)} disabled={submitting} className="dark:hover:bg-gray-700">
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white"
                      disabled={!vehicleId || !driverId || submitting}
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {submitting ? "Saving..." : "Confirm Approval"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
