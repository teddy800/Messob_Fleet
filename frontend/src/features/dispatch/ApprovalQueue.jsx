import { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";

// Mock Data (In the future, this comes from your MongoDB)
const initialRequests = [
  { id: "REQ-001", user: "Sumeya", date: "2026-04-05", destination: "Adama", purpose: "Field Work", status: "Pending" },
  { id: "REQ-002", user: "Abebe", date: "2026-04-06", destination: "Bishoftu", purpose: "Meeting", status: "Approved" },
  { id: "REQ-003", user: "Kebede", date: "2026-04-04", destination: "Addis Ababa", purpose: "Delivery", status: "Rejected" },
];

export default function ApprovalQueue() {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedReq, setSelectedReq] = useState(null);

  const updateStatus = (id, newStatus) => {
    setRequests(requests.map(req => req.id === id ? { ...req, status: newStatus } : req));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-blue">Incoming Trip Requests</h2>
        <Badge variant="outline" className="text-brand-blue border-brand-blue px-4 py-1">
          {requests.filter(r => r.status === "Pending").length} New Requests
        </Badge>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-700">
            <TableRow>
              <TableHead className="font-bold">ID</TableHead>
              <TableHead className="font-bold">Requested By</TableHead>
              <TableHead className="font-bold">Destination</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id} className="hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <TableCell className="font-medium">{req.id}</TableCell>
                <TableCell>{req.user}</TableCell>
                <TableCell>{req.destination}</TableCell>
                <TableCell>{req.date}</TableCell>
                <TableCell>
                  <Badge className={
                    req.status === "Pending" ? "bg-brand-gold text-black" :
                    req.status === "Approved" ? "bg-green-600" : "bg-red-600"
                  }>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedReq(req)} className="hover:bg-gray-400 dark:hover:bg-gray-950 rounded-sm cursor-pointer">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-brand-blue">Review Request {selectedReq?.id}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 text-sm border-b pb-2">
                          <span className="text-gray-500">Purpose:</span>
                          <span className="font-bold">{selectedReq?.purpose}</span>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold">Dispatcher Notes / Reason</label>
                          <Textarea placeholder="Add a comment for the user..." />
                        </div>
                      </div>
                      <DialogFooter className="flex gap-2">
                        <Button 
                          className="bg-red-600 hover:bg-red-700 flex-1 cursor-pointer"
                          onClick={() => updateStatus(selectedReq.id, "Rejected")}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-800 flex-1 cursor-pointer"
                          onClick={() => updateStatus(selectedReq.id, "Approved")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}