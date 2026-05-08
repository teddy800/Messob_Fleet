import { useState } from "react";
import {
  Eye, CheckCircle, XCircle, Clock, MapPin, Calendar,
  Users, Car, ChevronRight, User, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockDrivers = [
  { id: "D1", name: "Dawit Bekele" },
  { id: "D2", name: "Yonas Tesfaye" },
  { id: "D3", name: "Mekdes Alemu" },
  { id: "D4", name: "Biruk Haile" },
];

const vehicleTypes = [
  "Toyota Land Cruiser",
  "Toyota Corolla",
  "Nissan Patrol",
  "Isuzu Truck",
  "Hyundai H1 Van",
  "Toyota Hilux",
];

const initialRequests = [
  {
    id: "REQ-001",
    status: "Pending",
    submittedAt: "2026-05-08T07:15:00",
    requester: { name: "Sumeya Hassen", email: "staff@mesobcenter.et", department: "Programs" },
    purpose: "Field Work",
    startPoint: "MESSOB Center HQ",
    destination: "Adama",
    date: "2026-05-10",
    time: "08:00 AM",
    passengers: 3,
    tripType: "Round Trip",
  },
  {
    id: "REQ-002",
    status: "Pending",
    submittedAt: "2026-05-08T09:40:00",
    requester: { name: "Kebede Girma", email: "kebede@mesobcenter.et", department: "Logistics" },
    purpose: "Cargo Delivery",
    startPoint: "MESSOB Center HQ",
    destination: "Hawassa",
    date: "2026-05-11",
    time: "07:00 AM",
    passengers: 1,
    tripType: "One-Way",
  },
  {
    id: "REQ-003",
    status: "Pending",
    submittedAt: "2026-05-08T11:05:00",
    requester: { name: "Tigist Worku", email: "tigist@mesobcenter.et", department: "Finance" },
    purpose: "Official Meeting",
    startPoint: "MESSOB Center HQ",
    destination: "Dire Dawa",
    date: "2026-05-12",
    time: "10:00 AM",
    passengers: 4,
    tripType: "Round Trip",
  },
  {
    id: "REQ-004",
    status: "Approved",
    submittedAt: "2026-05-07T08:00:00",
    requester: { name: "Abebe Tadesse", email: "abebe@mesobcenter.et", department: "IT" },
    purpose: "Official Meeting",
    startPoint: "MESSOB Center HQ",
    destination: "Bahir Dar",
    date: "2026-05-08",
    time: "09:30 AM",
    passengers: 2,
    tripType: "One-Way",
    assignedVehicle: "Toyota Corolla",
    assignedDriver: "Dawit Bekele",
  },
  {
    id: "REQ-005",
    status: "Rejected",
    submittedAt: "2026-05-06T14:20:00",
    requester: { name: "Meron Alemu", email: "meron@mesobcenter.et", department: "HR" },
    purpose: "Field Work",
    startPoint: "MESSOB Center HQ",
    destination: "Jimma",
    date: "2026-05-09",
    time: "06:30 AM",
    passengers: 5,
    tripType: "One-Way",
    rejectNote: "No vehicles available on this date.",
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusOrder = { Pending: 0, Approved: 1, Rejected: 2 };

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

// ─── Detail row helper ────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ApprovalQueue() {
  const [requests, setRequests] = useState(
    [...initialRequests].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  );

  const [selected, setSelected]     = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // approval sub-step state
  const [approving, setApproving]       = useState(false);
  const [vehicleType, setVehicleType]   = useState("");
  const [driverId, setDriverId]         = useState("");

  // rejection state
  const [rejecting, setRejecting]       = useState(false);
  const [rejectNote, setRejectNote]     = useState("");

  const openDialog = (req) => {
    setSelected(req);
    setApproving(false);
    setRejecting(false);
    setVehicleType("");
    setDriverId("");
    setRejectNote("");
    setDialogOpen(true);
  };

  const handleReject = () => {
    setRequests((prev) =>
      prev
        .map((r) => r.id === selected.id ? { ...r, status: "Rejected", rejectNote } : r)
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    );
    setDialogOpen(false);
  };

  const handleApprove = () => {
    const driver = mockDrivers.find((d) => d.id === driverId);
    setRequests((prev) =>
      prev
        .map((r) =>
          r.id === selected.id
            ? { ...r, status: "Approved", assignedVehicle: vehicleType, assignedDriver: driver?.name }
            : r
        )
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    );
    setDialogOpen(false);
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Current Requests</h1>
        <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 font-bold">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          {pendingCount} Pending
        </Badge>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="hidden sm:flex flex-col items-center justify-center bg-brand-blue/5 rounded-lg px-3 py-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {new Date(req.submittedAt).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-xl font-black text-brand-blue leading-none">
                  {new Date(req.submittedAt).getDate()}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm text-brand-blue">{req.id}</span>
                  <Badge className={`text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${statusBadge[req.status]}`}>
                    {statusIcon[req.status]} {req.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 font-medium mt-0.5 truncate">
                  <span className="font-bold text-gray-800">{req.requester.name}</span>
                  {" · "}
                  {req.startPoint} <ChevronRight className="inline h-3 w-3" /> {req.destination}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{req.date} at {req.time} · {req.purpose}</p>
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

      {/* ── Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-6">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-brand-blue font-black flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-gold" />
                  Request {selected.id}
                </DialogTitle>
              </DialogHeader>

              {/* ── Step 1: View details ── */}
              {!approving && !rejecting && (
                <div className="space-y-5 py-2">
                  {/* Requester info */}
                  <div className="flex items-center gap-3 bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/10">
                    <div className="bg-brand-blue rounded-full p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-brand-blue text-sm">{selected.requester.name}</p>
                      <p className="text-xs text-gray-500">{selected.requester.email}</p>
                      <p className="text-xs text-gray-400">{selected.requester.department} Department</p>
                    </div>
                    <Badge className={`ml-auto text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${statusBadge[selected.status]}`}>
                      {statusIcon[selected.status]} {selected.status}
                    </Badge>
                  </div>

                  {/* Trip details */}
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow icon={MapPin}   label="Route"       value={`${selected.startPoint} → ${selected.destination}`} />
                    <DetailRow icon={Calendar} label="Date & Time" value={`${selected.date} at ${selected.time}`} />
                    <DetailRow icon={Users}    label="Passengers"  value={`${selected.passengers} pax · ${selected.tripType}`} />
                    <DetailRow icon={Car}      label="Purpose"     value={selected.purpose} />
                  </div>

                  {/* Already assigned info */}
                  {selected.status === "Approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-1">
                      <p className="font-bold text-green-700">Assigned Vehicle: {selected.assignedVehicle}</p>
                      <p className="font-bold text-green-700">Driver: {selected.assignedDriver}</p>
                    </div>
                  )}
                  {selected.status === "Rejected" && selected.rejectNote && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                      <p className="font-bold text-red-600">Rejection note:</p>
                      <p className="text-red-500 mt-1">{selected.rejectNote}</p>
                    </div>
                  )}

                  {/* Action buttons — only for pending */}
                  {selected.status === "Pending" && (
                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => setRejecting(true)}
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

              {/* ── Step 2a: Approve — assign vehicle & driver ── */}
              {approving && (
                <div className="space-y-5 py-2">
                  <p className="text-sm text-gray-500">
                    Assign a vehicle and driver for <span className="font-bold text-brand-blue">{selected.requester.name}</span>'s trip to <span className="font-bold">{selected.destination}</span>.
                  </p>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Vehicle Type</Label>
                    <Select onValueChange={setVehicleType} value={vehicleType}>
                      <SelectTrigger className="h-12 border-2 rounded-xl">
                        <SelectValue placeholder="Select a vehicle..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Assign Driver</Label>
                    <Select onValueChange={setDriverId} value={driverId}>
                      <SelectTrigger className="h-12 border-2 rounded-xl">
                        <SelectValue placeholder="Select a driver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockDrivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setApproving(false)}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={!vehicleType || !driverId}
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Confirm Approval
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* ── Step 2b: Reject — add note ── */}
              {rejecting && (
                <div className="space-y-5 py-2">
                  <p className="text-sm text-gray-500">
                    Provide a reason for rejecting <span className="font-bold text-brand-blue">{selected.requester.name}</span>'s request.
                  </p>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Rejection Reason</Label>
                    <Textarea
                      placeholder="e.g. No vehicles available on this date..."
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className="resize-none border-2 rounded-xl"
                      rows={4}
                    />
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setRejecting(false)}>
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={!rejectNote.trim()}
                      onClick={handleReject}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Confirm Rejection
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
