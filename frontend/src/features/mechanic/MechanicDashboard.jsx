import { useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialRecords = [
  {
    id: "MNT-001",
    date: "2026-05-01",
    vehicle: "Toyota Land Cruiser (AA-12345)",
    serviceType: "Oil Change",
    mechanic: "Mike (Maintainer)",
    cost: "1,200 ETB",
    status: "Active",
    odometer: "54,100 km",
    serviceProvider: "MESSOB Workshop",
    nextServiceDue: "2026-08-01",
  },
  {
    id: "MNT-002",
    date: "2026-04-20",
    vehicle: "Isuzu Truck (AA-11223)",
    serviceType: "Brake Replacement",
    mechanic: "Mike (Maintainer)",
    cost: "4,500 ETB",
    status: "Active",
    odometer: "89,200 km",
    serviceProvider: "City Auto Service",
    nextServiceDue: "2026-10-20",
  },
  {
    id: "MNT-003",
    date: "2026-03-15",
    vehicle: "Toyota Corolla (AA-67890)",
    serviceType: "Tire Rotation",
    mechanic: "Mike (Maintainer)",
    cost: "600 ETB",
    status: "Inactive",
    odometer: "32,400 km",
    serviceProvider: "MESSOB Workshop",
    nextServiceDue: "2026-09-15",
  },
  {
    id: "MNT-004",
    date: "2026-02-10",
    vehicle: "Nissan Patrol (AA-55678)",
    serviceType: "Engine Overhaul",
    mechanic: "Mike (Maintainer)",
    cost: "18,000 ETB",
    status: "Disposed",
    odometer: "120,000 km",
    serviceProvider: "Nissan Service Center",
    nextServiceDue: "N/A",
  },
];

const statusConfig = {
  Active:   { cls: "bg-green-100 text-green-700 border-green-200" },
  Inactive: { cls: "bg-gray-100 text-gray-500 border-gray-200" },
  Disposed: { cls: "bg-red-100 text-red-600 border-red-200" },
};

const allStatuses = ["Active", "Inactive", "Disposed"];

export default function MechanicDashboard() {
  const [records, setRecords] = useState(initialRecords);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const handleStatusChange = (id, newStatus) => {
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleDelete = (id) => setRecords((prev) => prev.filter((r) => r.id !== id));

  const openView = (record) => { setSelected(record); setViewOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Maintenance Dashboard</h1>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
          {records.length} records
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {["Date", "Vehicle", "Service Type", "Mechanic", "Cost", "Status", "Action"].map((h) => (
                <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest whitespace-nowrap ${h === "Action" ? "text-right" : ""}`}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="text-sm text-gray-600 whitespace-nowrap">{r.date}</TableCell>
                <TableCell className="font-bold text-sm whitespace-nowrap">{r.vehicle}</TableCell>
                <TableCell className="text-sm text-gray-700 whitespace-nowrap">{r.serviceType}</TableCell>
                <TableCell className="text-sm text-gray-600 whitespace-nowrap">{r.mechanic}</TableCell>
                <TableCell className="text-sm font-bold text-gray-800 whitespace-nowrap">{r.cost}</TableCell>
                <TableCell>
                  {/* Status toggle buttons */}
                  <div className="flex gap-1">
                    {allStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(r.id, s)}
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border transition-all ${
                          r.status === s
                            ? statusConfig[s].cls + " scale-105 shadow-sm"
                            : "bg-white text-gray-300 border-gray-200 hover:border-gray-400 hover:text-gray-500"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => openView(r)}
                    className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleDelete(r.id)}
                    className="rounded-lg border-red-200 text-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black">
              Record {selected?.id}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2 text-sm">
              {[
                ["Date",             selected.date],
                ["Vehicle",          selected.vehicle],
                ["Service Type",     selected.serviceType],
                ["Mechanic",         selected.mechanic],
                ["Cost",             selected.cost],
                ["Odometer",         selected.odometer],
                ["Service Provider", selected.serviceProvider],
                ["Next Service Due", selected.nextServiceDue],
                ["Status",           selected.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">{label}</span>
                  <span className="font-bold text-gray-800 text-right">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
