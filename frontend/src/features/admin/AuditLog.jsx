import { useState, useEffect } from "react";
import { Search, Download, Filter, Calendar, User, Shield, AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { searchRead } from "@/lib/odooApi";
import { toast } from "sonner";
import { format } from "date-fns";

const severityStyles = {
  low: { icon: Info, class: "bg-gray-100 text-gray-700 border-gray-200" },
  medium: { icon: CheckCircle, class: "bg-blue-100 text-blue-700 border-blue-200" },
  high: { icon: AlertCircle, class: "bg-orange-100 text-orange-700 border-orange-200" },
  critical: { icon: XCircle, class: "bg-red-100 text-red-700 border-red-200" },
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    actionType: "",
    severity: "",
    success: "",
    dateFrom: "",
    dateTo: "",
    userId: "",
  });
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const RECORDS_PER_PAGE = 50;

  useEffect(() => {
    fetchAuditLogs();
  }, [page, filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const domain = buildDomain();
      
      const data = await searchRead(
        "messob.fms.audit.log",
        domain,
        [
          "id",
          "timestamp",
          "user_id",
          "action",
          "action_category",
          "resource_model",
          "resource_id",
          "resource_display_name",
          "description",
          "severity",
          "success",
          "ip_address",
        ],
        RECORDS_PER_PAGE,
        (page - 1) * RECORDS_PER_PAGE
      );

      setLogs(data);
      setTotalRecords(data.length); // Note: For accurate pagination, backend should return total count
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const buildDomain = () => {
    const domain = [];

    if (filters.searchTerm) {
      domain.push("|");
      domain.push(["description", "ilike", filters.searchTerm]);
      domain.push(["resource_name", "ilike", filters.searchTerm]);
    }

    if (filters.actionType) {
      domain.push(["action", "=", filters.actionType]);
    }

    if (filters.severity) {
      domain.push(["severity", "=", filters.severity]);
    }

    if (filters.success !== "") {
      domain.push(["success", "=", filters.success === "true"]);
    }

    if (filters.dateFrom) {
      domain.push(["timestamp", ">=", filters.dateFrom + " 00:00:00"]);
    }

    if (filters.dateTo) {
      domain.push(["timestamp", "<=", filters.dateTo + " 23:59:59"]);
    }

    if (filters.userId) {
      domain.push(["user_id", "=", parseInt(filters.userId)]);
    }

    return domain;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      actionType: "",
      severity: "",
      success: "",
      dateFrom: "",
      dateTo: "",
      userId: "",
    });
    setPage(1);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Resource", "Description", "Severity", "Status", "IP Address"];
    const rows = logs.map((log) => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      Array.isArray(log.user_id) ? log.user_id[1] : "System",
      log.action,
      log.resource_display_name || `${log.resource_model} #${log.resource_id}`,
      log.description,
      log.severity,
      log.success ? "Success" : "Failed",
      log.ip_address || "N/A",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
    toast.success("Audit log exported successfully");
  };

  const SeverityBadge = ({ severity }) => {
    const { icon: Icon, class: className } = severityStyles[severity] || severityStyles.low;
    return (
      <Badge className={`text-xs font-bold uppercase tracking-wider border ${className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  const StatusBadge = ({ success }) => {
    const className = success
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-red-100 text-red-700 border-red-200";
    return (
      <Badge className={`text-xs font-bold uppercase tracking-wider border ${className}`}>
        {success ? "Success" : "Failed"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-blue">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comprehensive system activity tracking for security and compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
          <Button onClick={exportToCSV} className="bg-brand-blue hover:bg-blue-900 gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-2 border-brand-blue/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search description or resource..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Action Type</Label>
                <Select value={filters.actionType} onValueChange={(v) => handleFilterChange("actionType", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="APPROVE">Approve</SelectItem>
                    <SelectItem value="REJECT">Reject</SelectItem>
                    <SelectItem value="ASSIGN">Assign</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Severity</Label>
                <Select value={filters.severity} onValueChange={(v) => handleFilterChange("severity", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Status</Label>
                <Select value={filters.success} onValueChange={(v) => handleFilterChange("success", v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="col-span-2 flex items-end gap-2">
                <Button variant="outline" onClick={clearFilters} className="h-11">
                  Clear Filters
                </Button>
                <Button onClick={fetchAuditLogs} className="h-11 bg-brand-blue hover:bg-blue-900">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-500">Loading audit logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold">No audit logs found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {Array.isArray(log.user_id) ? log.user_id[1] : "System"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs font-bold">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.resource_display_name || `${log.resource_model || "N/A"} #${log.resource_id || ""}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SeverityBadge severity={log.severity} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge success={log.success} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {page} • Showing {logs.length} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-9"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={logs.length < RECORDS_PER_PAGE}
                  className="h-9"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-brand-blue">Audit Log Details</h2>
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">Timestamp</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(selectedLog.timestamp), "PPpp")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">User</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {Array.isArray(selectedLog.user_id) ? selectedLog.user_id[1] : "System"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">Action</Label>
                  <p className="text-sm font-semibold text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">Category</Label>
                  <p className="text-sm font-semibold text-gray-900">{selectedLog.action_category}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">Severity</Label>
                  <div className="mt-1">
                    <SeverityBadge severity={selectedLog.severity} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">Status</Label>
                  <div className="mt-1">
                    <StatusBadge success={selectedLog.success} />
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-bold uppercase text-gray-400">Resource</Label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedLog.resource_display_name || `${selectedLog.resource_model} #${selectedLog.resource_id}`}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-bold uppercase text-gray-400">Description</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedLog.description}</p>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase text-gray-400">IP Address</Label>
                  <p className="text-sm font-semibold text-gray-900">{selectedLog.ip_address || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
