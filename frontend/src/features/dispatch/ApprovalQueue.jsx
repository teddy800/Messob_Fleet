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
import { useTripRequests, fetchVehicles, fetchDrivers, approveTrip, rejectTrip } from "@/lib/useTripRequests";
import { searchRead } from "@/lib/odooApi";

const statusBadge = {
  Pending:  "bg-gradient-to-r from-amber-400 to-yellow-500 dark:from-amber-600 dark:to-yellow-700 text-white border-2 border-amber-300 dark:border-amber-800 shadow-md",
  Approved: "bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white border-2 border-green-300 dark:border-green-800 shadow-md",
  Rejected: "bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 text-white border-2 border-red-300 dark:border-red-800 shadow-md",
  "In Progress": "bg-gradient-to-r from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 text-white border-2 border-blue-300 dark:border-blue-800 shadow-md",
  Completed: "bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 text-white border-2 border-purple-300 dark:border-purple-800 shadow-md",
};

const statusIcon = {
  Pending:  <Clock className="h-3.5 w-3.5" />,
  Approved: <CheckCircle className="h-3.5 w-3.5" />,
  Rejected: <XCircle className="h-3.5 w-3.5" />,
  "In Progress": <Clock className="h-3.5 w-3.5" />,
  Completed: <CheckCircle className="h-3.5 w-3.5" />,
};

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-brand-gold mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="font-bold text-gray-800 text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function ApprovalQueue() {
  const { trips, loading, refetch } = useTripRequests(["pending", "approved", "rejected", "in_progress", "completed"]);
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

  const handleApprove = async () => {
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
    const order = { pending: 0, approved: 1, in_progress: 2, completed: 3, rejected: 4 };
    return (order[a.state] ?? 5) - (order[b.state] ?? 5);
  });

  const pendingCount = trips.filter((r) => r.state === "pending").length;

  const stateLabel = (state) => {
    const labels = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      in_progress: "In Progress",
      completed: "Completed",
    };
    return labels[state] || state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Current Requests</h1>
        <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 dark:from-amber-600 dark:to-yellow-700 text-white border-2 border-amber-300 dark:border-amber-800 shadow-lg px-4 py-2 font-black text-sm">
          <Clock className="h-4 w-4 mr-2" />
          {pendingCount} Pending
        </Badge>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-gray-600 border border-gray-100 dark:border-gray-600 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="hidden sm:flex flex-col items-center justify-center bg-brand-blue/5 rounded-lg px-3 py-2 shrink-0 dark:bg-gray-800">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {new Date(req.create_date).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="text-xl font-black text-brand-blue leading-none">
                    {new Date(req.create_date).getDate()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-brand-blue">{req.name}</span>
                    <Badge className={`text-xs font-black uppercase tracking-widest border-2 shadow-md flex items-center gap-1.5 px-3 py-1.5 ${statusBadge[stateLabel(req.state)] || statusBadge.Pending}`}>
                      {statusIcon[stateLabel(req.state)] || statusIcon.Pending} {stateLabel(req.state)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 font-medium mt-0.5 truncate">
                    <span className="font-bold text-gray-800">
                      {Array.isArray(req.requester_id) ? req.requester_id[1] : "—"}
                    </span>
                    {" · "}
                    {req.pickup} <ChevronRight className="inline h-3 w-3" /> {req.destination}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {req.start_dt ? new Date(req.start_dt).toLocaleString() : "—"} · {req.purpose}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDialog(req)}
                className="shrink-0 ml-4 rounded-lg cursor-pointer border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900 dark:bg-gray-800 dark:hover:text-white"
              >
                <Eye className="h-4 w-4 mr-1.5" /> View
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-6">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-brand-blue font-black flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-gold" />
                  Request {selected.name}
                </DialogTitle>
              </DialogHeader>

              {!approving && (
                <div className="space-y-5 py-2">
                  <div className="flex items-center gap-3 bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/10">
                    <div className="bg-brand-blue rounded-full p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-brand-blue text-sm">
                        {Array.isArray(selected.requester_id) ? selected.requester_id[1] : "—"}
                      </p>
                    </div>
                    <Badge className={`ml-auto text-xs font-black uppercase tracking-widest border-2 shadow-md px-3 py-1.5 ${statusBadge[stateLabel(selected.state)] || statusBadge.Pending}`}>
                      {stateLabel(selected.state)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow icon={MapPin}   label="Route"       value={`${selected.pickup} → ${selected.destination}`} />
                    <DetailRow icon={Calendar} label="Start"       value={selected.start_dt ? new Date(selected.start_dt).toLocaleString() : "—"} />
                    <DetailRow icon={Car}      label="Vehicle Cat" value={selected.vehicle_category || "—"} />
                    <DetailRow icon={FileText} label="Purpose"     value={selected.purpose} />
                  </div>

                  {selected.state === "approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
                      <p className="font-bold text-green-700">
                        Vehicle: {Array.isArray(selected.assigned_vehicle_id) ? selected.assigned_vehicle_id[1] : "—"}
                      </p>
                      <p className="font-bold text-green-700">
                        Driver: {Array.isArray(selected.assigned_driver_id) ? selected.assigned_driver_id[1] : "—"}
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

                  {selected.state === "pending" && (
                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={handleReject}
                        disabled={submitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setApproving(true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Approve
                      </Button>
                    </DialogFooter>
                  )}
                </div>
              )}

              {approving && (
                <div className="space-y-5 py-2">
                  <p className="text-sm text-gray-500">
                    Assign a vehicle and driver for this trip to <span className="font-bold">{selected.destination}</span>.
                  </p>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vehicle</Label>
                    <Select onValueChange={setVehicleId} value={vehicleId}>
                      <SelectTrigger className="h-12 border-2 rounded-xl">
                        <SelectValue placeholder="Select a vehicle..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name} {v.license_plate ? `(${v.license_plate})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Driver</Label>
                    <Select onValueChange={setDriverId} value={driverId}>
                      <SelectTrigger className="h-12 border-2 rounded-xl">
                        <SelectValue placeholder="Select a driver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setApproving(false)} disabled={submitting}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
