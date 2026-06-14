import { useEffect, useState } from "react";
import { 
  FileText, Car, CheckCircle, Clock, XCircle, BadgeCheck, 
  TrendingUp, BarChart3, PieChart, Download,
  Users, Activity, FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { searchRead } from "@/lib/odooApi";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load trips
      const tripData = await searchRead(
        "messob.fms.trip",
        [],
        ["name", "state", "purpose", "pickup", "destination", "start_dt", "end_dt", "requester_id", "assigned_vehicle_id", "assigned_driver_id"],
        200
      );
      setTrips(tripData);

      // Calculate analytics
      calculateAnalytics(tripData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (tripData) => {
    const now = new Date();
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - parseInt(dateRange));

    // Filter trips by date range
    const recentTrips = tripData.filter(t => {
      if (!t.start_dt) return false;
      const tripDate = new Date(t.start_dt);
      return tripDate >= rangeStart && tripDate <= now;
    });

    // Calculate statistics
    const stats = {
      total: recentTrips.length,
      pending: recentTrips.filter(t => t.state === "pending").length,
      approved: recentTrips.filter(t => ["approved","in_progress"].includes(t.state)).length,
      completed: recentTrips.filter(t => t.state === "completed").length,
      rejected: recentTrips.filter(t => t.state === "rejected").length,
      inProgress: recentTrips.filter(t => t.state === "in_progress").length,
    };

    // Calculate approval rate
    const totalProcessed = stats.approved + stats.rejected + stats.completed;
    const approvalRate = totalProcessed > 0 ? ((stats.approved + stats.completed) / totalProcessed * 100).toFixed(1) : 0;

    // Calculate completion rate
    const completionRate = stats.approved > 0 ? (stats.completed / (stats.approved + stats.completed) * 100).toFixed(1) : 0;

    // Vehicle utilization
    const vehicleUsage = {};
    recentTrips.forEach(trip => {
      if (trip.assigned_vehicle_id && Array.isArray(trip.assigned_vehicle_id)) {
        const vehicleId = trip.assigned_vehicle_id[0];
        const vehicleName = trip.assigned_vehicle_id[1];
        if (!vehicleUsage[vehicleId]) {
          vehicleUsage[vehicleId] = { name: vehicleName, count: 0 };
        }
        vehicleUsage[vehicleId].count++;
      }
    });

    // Driver performance
    const driverPerformance = {};
    recentTrips.forEach(trip => {
      if (trip.assigned_driver_id && Array.isArray(trip.assigned_driver_id)) {
        const driverId = trip.assigned_driver_id[0];
        const driverName = trip.assigned_driver_id[1];
        if (!driverPerformance[driverId]) {
          driverPerformance[driverId] = { name: driverName, trips: 0, completed: 0 };
        }
        driverPerformance[driverId].trips++;
        if (trip.state === 'completed') {
          driverPerformance[driverId].completed++;
        }
      }
    });

    // Top requesters
    const requesterStats = {};
    recentTrips.forEach(trip => {
      if (trip.requester_id && Array.isArray(trip.requester_id)) {
        const requesterId = trip.requester_id[0];
        const requesterName = trip.requester_id[1];
        if (!requesterStats[requesterId]) {
          requesterStats[requesterId] = { name: requesterName, count: 0 };
        }
        requesterStats[requesterId].count++;
      }
    });

    // Daily trip distribution
    const dailyDistribution = {};
    recentTrips.forEach(trip => {
      if (trip.start_dt) {
        const date = new Date(trip.start_dt).toISOString().split('T')[0];
        dailyDistribution[date] = (dailyDistribution[date] || 0) + 1;
      }
    });

    setAnalytics({
      stats,
      approvalRate,
      completionRate,
      vehicleUsage: Object.entries(vehicleUsage).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
      driverPerformance: Object.entries(driverPerformance).sort((a, b) => b[1].trips - a[1].trips).slice(0, 10),
      topRequesters: Object.entries(requesterStats).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
      dailyDistribution: Object.entries(dailyDistribution).sort((a, b) => a[0].localeCompare(b[0])),
    });
  };

  const exportToCSV = () => {
    const headers = ['Request ID', 'Requester', 'Route', 'Start Date', 'End Date', 'Status', 'Vehicle', 'Driver'];
    const rows = trips.map(t => [
      t.name,
      Array.isArray(t.requester_id) ? t.requester_id[1] : '—',
      `${t.pickup} → ${t.destination}`,
      t.start_dt ? new Date(t.start_dt).toLocaleString() : '—',
      t.end_dt ? new Date(t.end_dt).toLocaleString() : '—',
      t.state,
      Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[1] : '—',
      Array.isArray(t.assigned_driver_id) ? t.assigned_driver_id[1] : '—',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleet-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    // Prepare data for Excel export
    const excelData = trips.map(t => ({
      'Request ID': t.name,
      'Requester': Array.isArray(t.requester_id) ? t.requester_id[1] : '—',
      'Purpose': t.purpose || '—',
      'Pickup': t.pickup || '—',
      'Destination': t.destination || '—',
      'Start Date': t.start_dt ? new Date(t.start_dt).toLocaleString() : '—',
      'End Date': t.end_dt ? new Date(t.end_dt).toLocaleString() : '—',
      'Status': t.state,
      'Vehicle': Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[1] : '—',
      'Driver': Array.isArray(t.assigned_driver_id) ? t.assigned_driver_id[1] : '—',
    }));

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Trip Details
    const ws1 = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Trip Details');

    // Sheet 2: Summary Statistics
    const summaryData = [
      { Metric: 'Total Trips', Value: analytics?.stats.total || 0 },
      { Metric: 'Pending', Value: analytics?.stats.pending || 0 },
      { Metric: 'Approved', Value: analytics?.stats.approved || 0 },
      { Metric: 'In Progress', Value: analytics?.stats.inProgress || 0 },
      { Metric: 'Completed', Value: analytics?.stats.completed || 0 },
      { Metric: 'Rejected', Value: analytics?.stats.rejected || 0 },
      { Metric: 'Approval Rate', Value: `${analytics?.approvalRate || 0}%` },
      { Metric: 'Completion Rate', Value: `${analytics?.completionRate || 0}%` },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Sheet 3: Vehicle Utilization
    if (analytics?.vehicleUsage && analytics.vehicleUsage.length > 0) {
      const vehicleData = analytics.vehicleUsage.map(([id, data]) => ({
        'Vehicle': data.name,
        'Trip Count': data.count,
      }));
      const ws3 = XLSX.utils.json_to_sheet(vehicleData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Vehicle Utilization');
    }

    // Sheet 4: Driver Performance
    if (analytics?.driverPerformance && analytics.driverPerformance.length > 0) {
      const driverData = analytics.driverPerformance.map(([id, data]) => ({
        'Driver': data.name,
        'Total Trips': data.trips,
        'Completed': data.completed,
        'Completion Rate': data.trips > 0 ? `${((data.completed / data.trips) * 100).toFixed(1)}%` : '0%',
      }));
      const ws4 = XLSX.utils.json_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Driver Performance');
    }

    // Generate and download Excel file
    XLSX.writeFile(wb, `MESSOB-Fleet-Report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175); // Brand blue
    doc.text('MESSOB Fleet Management', 14, 22);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Trip Request Report', 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
    doc.text(`Period: Last ${dateRange} Days`, 14, 43);

    // Add summary statistics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary Statistics', 14, 53);
    
    const summaryData = [
      ['Total Trips', analytics?.stats.total || 0],
      ['Pending', analytics?.stats.pending || 0],
      ['Approved', analytics?.stats.approved || 0],
      ['In Progress', analytics?.stats.inProgress || 0],
      ['Completed', analytics?.stats.completed || 0],
      ['Rejected', analytics?.stats.rejected || 0],
      ['Approval Rate', `${analytics?.approvalRate || 0}%`],
      ['Completion Rate', `${analytics?.completionRate || 0}%`],
    ];

    doc.autoTable({
      startY: 58,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 14 },
    });

    // Add trip details table
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Trip Details', 14, 20);

    const tripTableData = trips.slice(0, 50).map(t => [
      t.name,
      Array.isArray(t.requester_id) ? t.requester_id[1] : '—',
      `${t.pickup || '—'} → ${t.destination || '—'}`,
      t.start_dt ? new Date(t.start_dt).toLocaleDateString() : '—',
      t.state.toUpperCase(),
      Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[1] : '—',
    ]);

    doc.autoTable({
      startY: 25,
      head: [['Request ID', 'Requester', 'Route', 'Date', 'Status', 'Vehicle']],
      body: tripTableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
      },
    });

    // Add vehicle utilization if there's data
    if (analytics?.vehicleUsage && analytics.vehicleUsage.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Vehicle Utilization', 14, 20);

      const vehicleTableData = analytics.vehicleUsage.map(([id, data]) => [
        data.name,
        data.count,
      ]);

      doc.autoTable({
        startY: 25,
        head: [['Vehicle', 'Trip Count']],
        body: vehicleTableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
    }

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | MESSOB Fleet Management System | Confidential`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    doc.save(`MESSOB-Fleet-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const stateBadge = {
    draft:       "bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 text-white shadow-md",
    pending:     "bg-gradient-to-r from-amber-400 to-yellow-500 dark:from-amber-600 dark:to-yellow-700 text-white shadow-md",
    approved:    "bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white shadow-md",
    rejected:    "bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 text-white shadow-md",
    in_progress: "bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white shadow-md",
    completed:   "bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 text-white shadow-md",
    closed:      "bg-gradient-to-r from-gray-500 to-slate-600 dark:from-gray-700 dark:to-slate-800 text-white shadow-md",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-blue">Reports & Analytics</h1>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm" className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Loading analytics...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="details">Trip Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Trips",  value: analytics?.stats.total || 0,     icon: Car,         color: "text-blue-950 dark:text-blue-50", bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900", iconBg: "bg-blue-500 dark:bg-blue-600", border: "border-blue-300 dark:border-blue-700", labelColor: "text-blue-800 dark:text-blue-200" },
                { label: "Pending",      value: analytics?.stats.pending || 0,   icon: Clock,       color: "text-amber-950 dark:text-amber-50", bg: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900", iconBg: "bg-amber-500 dark:bg-amber-600", border: "border-amber-300 dark:border-amber-700", labelColor: "text-amber-800 dark:text-amber-200" },
                { label: "Approved",     value: analytics?.stats.approved || 0,  icon: CheckCircle, color: "text-emerald-900/80 dark:text-emerald-50", bg: "bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 dark:from-emerald-950 dark:to-emerald-900", iconBg: "bg-emerald-400/70 dark:bg-emerald-500/70", border: "border-emerald-200/50 dark:border-emerald-700", labelColor: "text-emerald-700/80 dark:text-emerald-200" },
                { label: "In Progress",  value: analytics?.stats.inProgress || 0, icon: Activity,   color: "text-emerald-900/80 dark:text-emerald-50", bg: "bg-gradient-to-br from-emerald-50/40 to-emerald-100/40 dark:from-emerald-950 dark:to-emerald-900", iconBg: "bg-emerald-400/70 dark:bg-emerald-500/70", border: "border-emerald-200/50 dark:border-emerald-700", labelColor: "text-emerald-700/80 dark:text-emerald-200" },
                { label: "Completed",    value: analytics?.stats.completed || 0, icon: BadgeCheck,  color: "text-purple-950 dark:text-purple-50", bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900", iconBg: "bg-purple-500 dark:bg-purple-600", border: "border-purple-300 dark:border-purple-700", labelColor: "text-purple-800 dark:text-purple-200" },
                { label: "Rejected",     value: analytics?.stats.rejected || 0,  icon: XCircle,     color: "text-rose-900/80 dark:text-rose-50", bg: "bg-gradient-to-br from-rose-50/40 to-rose-100/40 dark:from-rose-950 dark:to-rose-900", iconBg: "bg-rose-400/70 dark:bg-rose-500/70", border: "border-rose-200/50 dark:border-rose-700", labelColor: "text-rose-700/80 dark:text-rose-200" },
              ].map((s) => (
                <Card key={s.label} className={`${s.bg} border-2 ${s.border} shadow-lg hover:shadow-xl transition-all duration-300`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`${s.iconBg} p-2.5 rounded-xl shadow-md`}>
                      <s.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-xs font-extrabold uppercase tracking-widest ${s.labelColor}`}>{s.label}</p>
                      <p className={`text-2xl font-black ${s.color} drop-shadow-sm`}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Approval Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-green-600">{analytics?.approvalRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Of processed requests</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="h-4 w-4 text-purple-600" />
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-purple-600">{analytics?.completionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Of approved trips</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Active Trips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-emerald-600">{analytics?.stats.inProgress || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-gold" />
                  Daily Trip Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics?.dailyDistribution.slice(-14).map(([date, count]) => (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24">{new Date(date).toLocaleDateString()}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-blue rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.min((count / Math.max(...analytics.dailyDistribution.map(d => d[1]))) * 100, 100)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Driver Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-gold" />
                    Top Drivers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.driverPerformance.map(([id, data], idx) => (
                      <div key={id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-gray-400">#{idx + 1}</span>
                          <div>
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-xs text-gray-500">{data.trips} trips • {data.completed} completed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-blue">
                            {data.trips > 0 ? ((data.completed / data.trips) * 100).toFixed(0) : 0}%
                          </p>
                          <p className="text-xs text-gray-500">completion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Requesters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-gold" />
                    Top Requesters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topRequesters.map(([id, data], idx) => (
                      <div key={id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-gray-400">#{idx + 1}</span>
                          <p className="font-semibold text-sm">{data.name}</p>
                        </div>
                        <p className="text-xl font-black text-brand-blue">{data.count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Utilization Tab */}
          <TabsContent value="utilization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-brand-gold" />
                  Vehicle Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.vehicleUsage.map(([id, data], idx) => (
                    <div key={id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-gray-400">#{idx + 1}</span>
                          <p className="font-semibold text-sm">{data.name}</p>
                        </div>
                        <p className="text-xl font-black text-brand-blue">{data.count} trips</p>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-blue rounded-full"
                          style={{ width: `${(data.count / Math.max(...analytics.vehicleUsage.map(v => v[1].count))) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <h2 className="font-bold text-brand-blue mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-gold" /> All Trip Requests
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Request ID", "Requester", "Route", "Start Date", "Status", "Vehicle", "Driver"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-bold uppercase tracking-widest text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((t) => (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                          <td className="py-3 px-3 font-bold text-brand-blue">{t.name}</td>
                          <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{Array.isArray(t.requester_id) ? t.requester_id[1] : "—"}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-300 text-xs">{t.pickup} → {t.destination}</td>
                          <td className="py-3 px-3 text-gray-500 text-xs dark:text-gray-400">{t.start_dt ? new Date(t.start_dt).toLocaleDateString() : "—"}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 ${stateBadge[t.state] || "bg-gray-100 text-gray-500"}`}>
                              {t.state}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-400">{Array.isArray(t.assigned_vehicle_id) ? t.assigned_vehicle_id[1] : "—"}</td>
                          <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-400">{Array.isArray(t.assigned_driver_id) ? t.assigned_driver_id[1] : "—"}</td>
                        </tr>
                      ))}
                      {trips.length === 0 && (
                        <tr><td colSpan={7} className="text-center text-gray-400 py-8">No trip records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
