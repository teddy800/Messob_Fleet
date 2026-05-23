import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { searchRead, writeRecord } from "@/lib/odooApi";
import MaintenanceNotifications from "@/components/shared/MaintenanceNotifications";

const statusConfig = {
  active:   { cls: "bg-green-100 text-green-700 border-green-200",  label: "Active" },
  inactive: { cls: "bg-gray-100 text-gray-500 border-gray-200",    label: "Inactive" },
  disposed: { cls: "bg-red-100 text-red-600 border-red-200",       label: "Disposed" },
};

export default function MechanicDashboard() {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await searchRead(
        "messob.fms.maintenance.log",
        [],
        ["id", "date", "vehicle_id", "service_type", "mechanic_id", "cost", "vehicle_state", "odometer", "service_provider", "next_service_date", "description"],
        200
      );
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try { await writeRecord("messob.fms.maintenance.log", [id], { vehicle_state: newStatus }); fetchRecords(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Maintenance Dashboard</h1>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{records.length} records</span>
      </div>

      {/* Maintenance Alerts Notification */}
      <MaintenanceNotifications className="mb-6" />

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto dark:bg-gray-800 dark:border-gray-700">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                {["Date", "Vehicle", "Service Type", "Mechanic", "Cost", "Status", "Action"].map((h) => (
                  <TableHead key={h} className={`font-bold text-xs uppercase tracking-widest whitespace-nowrap ${h === "Action" ? "text-right" : ""} dark:text-gray-300`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap dark:text-gray-300">{r.date}</TableCell>
                  <TableCell className="font-bold text-sm whitespace-nowrap dark:text-gray-300">{Array.isArray(r.vehicle_id) ? r.vehicle_id[1] : "—"}</TableCell>
                  <TableCell className="text-sm text-gray-700 whitespace-nowrap dark:text-gray-300">{r.service_type}</TableCell>
                  <TableCell className="text-sm text-gray-600 whitespace-nowrap dark:text-gray-300">{Array.isArray(r.mechanic_id) ? r.mechanic_id[1] : "—"}</TableCell>
                  <TableCell className="text-sm font-bold text-gray-800 whitespace-nowrap dark:text-gray-300">{r.cost} ETB</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <button key={key} onClick={() => handleStatusChange(r.id, key)}
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border transition-all ${
                            r.vehicle_state === key ? cfg.cls + " scale-105 shadow-sm" : "bg-white text-gray-300 border-gray-200 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-400 dark:hover:text-gray-500 dark:hover:bg-gray-600"
                          }`}>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => { setSelected(r); setViewOpen(true); }}
                      className="rounded-lg border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8 dark:text-gray-500">No maintenance records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black dark:text-gray-300">Maintenance Record #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2 text-sm">
              {[
                ["Date",             selected.date],
                ["Vehicle",          Array.isArray(selected.vehicle_id) ? selected.vehicle_id[1] : "—"],
                ["Service Type",     selected.service_type],
                ["Mechanic",         Array.isArray(selected.mechanic_id) ? selected.mechanic_id[1] : "—"],
                ["Cost",             `${selected.cost} ETB`],
                ["Odometer",         `${selected.odometer} km`],
                ["Service Provider", selected.service_provider || "—"],
                ["Next Service Due", selected.next_service_date || "—"],
                ["Status",           selected.vehicle_state],
                ["Notes",            selected.description || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2 dark:border-gray-700">
                  <span className="text-gray-400 font-bold text-xs uppercase tracking-widest dark:text-gray-500">{label}</span>
                  <span className="font-bold text-gray-800 text-right max-w-[60%] dark:text-gray-300 dark:bg-gray-700/30">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
