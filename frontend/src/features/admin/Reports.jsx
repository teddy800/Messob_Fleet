import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const logins = [
  { user: "Admin User",         role: "Admin",      time: "2026-05-08 08:02", ip: "192.168.1.10" },
  { user: "Abebe (Dispatcher)", role: "Dispatcher", time: "2026-05-08 08:15", ip: "192.168.1.12" },
  { user: "Sumeya (Staff)",     role: "Staff",      time: "2026-05-08 08:30", ip: "192.168.1.14" },
  { user: "Dawit (Driver)",     role: "Driver",     time: "2026-05-08 09:00", ip: "192.168.1.16" },
  { user: "Mike (Maintainer)",  role: "Maintainer", time: "2026-05-07 17:45", ip: "192.168.1.18" },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-brand-blue">Reports</h1>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <h2 className="font-bold text-brand-blue mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-gold" /> Recent Login Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["User", "Role", "Login Time", "IP Address"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-bold uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logins.map((l, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-800">{l.user}</td>
                    <td className="py-3 px-3 text-gray-500">{l.role}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-xs">{l.time}</td>
                    <td className="py-3 px-3 text-gray-400 font-mono text-xs">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
