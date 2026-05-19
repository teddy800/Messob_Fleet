import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield, Building, MapPin, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { searchRead, writeRecord } from "@/lib/odooApi";

// Simple avatar cache so profile + nav stay in sync
let cachedAvatar = null;
export function clearAvatarCache() { cachedAvatar = null; }

export default function Profile() {
  const user      = useUserStore((state) => state.user);
  const loginUser = useUserStore((state) => state.login);

  const [avatar, setAvatar]           = useState(null);
  const [newAvatarB64, setNewAvatarB64] = useState(null);
  const [editOpen, setEditOpen]       = useState(false);
  const [form, setForm]               = useState({ name: "", email: "" });
  const [password, setPassword]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    searchRead("res.users", [["id", "=", user.uid]], ["id", "image_128"], 1)
      .then((data) => {
        if (data[0]?.image_128) setAvatar(`data:image/png;base64,${data[0].image_128}`);
      })
      .catch(() => {});
  }, [user?.uid]);

  if (!user) return <div className="p-8 text-center font-bold">Loading User...</div>;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const openEdit = () => {
    setForm({ name: user.name || "", email: user.email || "" });
    setPassword("");
    setNewAvatarB64(null);
    setError(null);
    setSuccess(false);
    setEditOpen(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Resize image to max 256x256 before uploading to avoid session timeout
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const canvas = document.createElement("canvas");
      const ratio = Math.min(MAX / img.width, MAX / img.height);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      setNewAvatarB64(b64);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const vals = { name: form.name };
      if (password) vals.password = password;
      if (newAvatarB64) vals.image_1920 = newAvatarB64;
      await writeRecord("res.users", [user.uid], vals);
      if (newAvatarB64) setAvatar(`data:image/png;base64,${newAvatarB64}`);
      loginUser({ ...user, name: form.name }, localStorage.getItem("messob_token"));
      setSuccess(true);
      setTimeout(() => { setEditOpen(false); setSuccess(false); }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = newAvatarB64
    ? `data:image/png;base64,${newAvatarB64}`
    : avatar;

  return (
    <div className="relative -m-4 md:-m-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="relative z-10 p-4 md:p-8 max-w-4xl mx-auto space-y-6 pt-12">

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-brand-blue">Account Settings</h1>
            <p className="text-gray-600 font-medium dark:text-gray-300">Manage your MESSOB-FMS identity</p>
          </div>
          <Button onClick={openEdit} className="bg-brand-blue hover:bg-blue-900 gap-2 rounded-xl">
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        </div>

        <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl dark:bg-gray-800">
          <CardHeader className="bg-brand-blue text-white p-10 relative overflow-hidden border-b-4 border-brand-gold">
            <div className="absolute top-0 right-0 p-6">
              <span className="bg-brand-gold text-brand-blue px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                {user.role} Verified
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-32 w-32 rounded-3xl border-4 border-white/30 shadow-2xl overflow-hidden shrink-0">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" onError={() => setAvatar(null)} />
                ) : (
                  <div className="h-full w-full bg-brand-gold flex items-center justify-center">
                    <span className="text-4xl font-black text-brand-blue">{initials}</span>
                  </div>
                )}
              </div>

              <div className="text-center md:text-left">
                <CardTitle className="text-3xl font-black">{user.name}</CardTitle>
                <div className="flex items-center gap-2 text-blue-100 mt-2 font-medium">
                  <Mail className="h-4 w-4" /> {user.email || "—"}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-10 grid gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <h3 className="font-black text-brand-blue uppercase text-xs tracking-widest border-b pb-2">Professional Identity</h3>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <Shield className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">System Access</p>
                  <p className="font-bold text-gray-800 dark:text-gray-300">{user.role} Permissions</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <Building className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Department</p>
                  <p className="font-bold text-gray-800 dark:text-gray-300">Fleet Operations & Logistics</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-black text-brand-blue uppercase text-xs tracking-widest border-b pb-2">Duty Station</h3>
              <div className="flex items-center gap-4 group">
                <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-brand-gold/20 transition-colors">
                  <MapPin className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Assigned Hub</p>
                  <p className="font-bold text-gray-800 dark:text-gray-300">MESSOB Center, Addis Ababa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md p-6 dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-brand-blue font-black dark:text-gray-300">Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Photo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">Profile Photo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-gray-200 shrink-0 dark:border-gray-700">
                  {previewSrc ? (
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-brand-gold flex items-center justify-center">
                      <span className="text-xl font-black text-brand-blue">{initials}</span>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="text-sm font-bold text-brand-blue border-2 border-brand-blue/30 rounded-xl px-4 py-2 hover:bg-brand-blue hover:text-white transition-colors dark:border-gray-300 dark:text-gray-300 dark:hover:bg-gray-300 dark:hover:text-gray-800">
                    Choose Photo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">Full Name</Label>
              <Input className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" placeholder="Your full name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">Email</Label>
              <Input className="h-11 border-2 rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" value={form.email} disabled />
              <p className="text-xs text-gray-400 dark:text-gray-400">Email cannot be changed here. Contact your admin.</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">New Password</Label>
              <Input className="h-11 border-2 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" type="password"
                placeholder="Leave blank to keep current"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error   && <p className="text-sm text-red-500 font-semibold">{error}</p>}
            {success && <p className="text-sm text-green-600 font-semibold">Profile updated successfully!</p>}
          </div>

          <DialogFooter className="gap-2 dark:bg-gray-600">
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}
              className="bg-brand-blue hover:bg-blue-900 text-white font-bold">
              <Check className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
