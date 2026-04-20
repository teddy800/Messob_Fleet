import { useUserStore } from "@/store/useUserStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, Building, MapPin, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Using a high-quality logistics/office background
const BG_URL = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop";

export default function Profile() {
  const user = useUserStore((state) => state.user);

  if (!user) return <div className="p-8 text-center font-bold">Loading User...</div>;

  return (
    <div className="relative -m-4 md:-m-8 min-h-screen">
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div 
        className="absolute inset-0 z-0 opacity-20 grayscale-50"
        style={{ 
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-12">
        
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-brand-blue drop-shadow-sm">Account Settings</h1>
            <p className="text-gray-600 font-medium">Manage your MESSOB-FMS identity</p>
          </div>
          <Button className="bg-brand-blue hover:bg-blue-900 gap-2 rounded-xl">
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        </div>

        <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden rounded-3xl">
          {/* Header with Role Badge */}
          <CardHeader className="bg-brand-blue text-white p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
               <span className="bg-brand-gold text-brand-blue px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                {user.role} Verified
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-32 w-32 rounded-3xl bg-brand-gold flex items-center justify-center border-4 border-white/30 shadow-2xl rotate-3">
                <User className="h-16 w-16 text-brand-blue -rotate-3" />
              </div>
              <div className="text-center md:text-left">
                <CardTitle className="text-3xl font-black">{user.name}</CardTitle>
                <div className="flex items-center gap-2 text-blue-100 mt-2 font-medium">
                  <Mail className="h-4 w-4" /> {user.email || "s.user@messob.et"}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-10 grid gap-10 md:grid-cols-2">
            {/* Left Column: Role Details */}
            <div className="space-y-6">
              <h3 className="font-black text-brand-blue uppercase text-xs tracking-widest border-b pb-2">Professional Identity</h3>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <Shield className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">System Access</p>
                  <p className="font-bold text-gray-800">{user.role} Permissions</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <Building className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Department</p>
                  <p className="font-bold text-gray-800">Fleet Operations & Logistics</p>
                </div>
              </div>
            </div>

            {/* Right Column: Location Details */}
            <div className="space-y-6">
              <h3 className="font-black text-brand-blue uppercase text-xs tracking-widest border-b pb-2">Duty Station</h3>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <MapPin className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Assigned Hub</p>
                  <p className="font-bold text-gray-800">MESSOB Center, Addis Ababa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}