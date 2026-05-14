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

const statusBadge = {
  Pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

const statusIcon = {
  Pending:  <Clock className="h-3.5 w-3.5" />,
  Approved: <CheckCircle className="h-3.5 w-3.5" />,
  Rejected: <XCircle className="h-3.5 w-3.5" />,
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
  const { trips, loading, refetch } = useTripRequests(["pending", "approved", "rejected"]);
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
      await approveTrip(selected.id, parseInt(vehicleId), parseInt(driverId));
      setDialogOpen(false);
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sorted = [...trips].sort((a, b) => {
    const order = { pending: 0, approved: 1, rejected: 2 };
    return (order[a.state] ?? 3) - (order[b.state] ?? 3);
  });

  const pendingCount = trips.filter((r) => r.state === "pending").length;

  const stateLabel = (state) => state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Current Requests</h1>
        <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 font-bold">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
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
              className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="hidden sm:flex flex-col items-center justify-center bg-brand-blue/5 rounded-lg px-3 py-2 shrink-0">
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
                    <Badge className={`text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${statusBadge[stateLabel(req.state)] || statusBadge.Pending}`}>
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
                className="shrink-0 ml-4 rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white transition-colors"
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
                    <Badge className={`ml-auto text-[10px] font-black uppercase tracking-widest border ${statusBadge[stateLabel(selected.state)] || statusBadge.Pending}`}>
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
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
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
