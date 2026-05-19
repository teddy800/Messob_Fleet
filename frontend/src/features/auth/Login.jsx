import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { odooLogin, searchRead } from "@/lib/odooApi";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

// Utilities
import { cn } from "@/lib/utils";
import { getRedirectPathByRole } from "@/lib/authRedirect";
import { isFmsGroup, resolveUserRole } from "@/lib/resolveUserRole";
import logo from "@/assets/logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid MESSOB email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

async function fetchFmsGroupsForUser(uid) {
  const groupFields = ["name", "full_name", "category_id"];

  let userGroups = await searchRead(
    "res.groups",
    [
      ["users", "in", [uid]],
      ["category_id.name", "=", "MESSOB Fleet Management"],
    ],
    groupFields
  );

  if (userGroups.length === 0) {
    const allUserGroups = await searchRead(
      "res.groups",
      [["users", "in", [uid]]],
      groupFields
    );
    userGroups = allUserGroups.filter(isFmsGroup);
  }

  return userGroups;
}

export default function Login() {
  const [loginError, setLoginError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [resolvedRole, setResolvedRole] = useState(null);
  const navigate = useNavigate();
  
  // Get functions from your Zustand store
  const loginUser = useUserStore((state) => state.login);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);
  const currentUserRole = user?.role;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data) => {
    setLoginError(null);
    try {
      const session = await odooLogin(data.email, data.password);

      const userGroups = await fetchFmsGroupsForUser(session.uid);
      const role = resolveUserRole(userGroups);

      const userData = {
        name: session.name,
        email: data.email,
        role,
        uid: session.uid,
      };

      loginUser(userData, session.session_id);
      navigate(getRedirectPathByRole(role));
    } catch (err) {
      setLoginError(err.message || "Login failed. Check your credentials.");
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setSessionChecked(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const userGroups = await fetchFmsGroupsForUser(user.uid);
        const role = resolveUserRole(userGroups);
        const token = localStorage.getItem("messob_token");

        if (!cancelled) {
          if (role !== user.role) {
            loginUser({ ...user, role }, token);
          }
          setResolvedRole(role);
        }
      } catch {
        if (!cancelled) setResolvedRole(user.role);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.uid, loginUser]);

  if (isAuthenticated) {
    if (!sessionChecked) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm font-medium text-gray-500">Loading your workspace…</p>
        </div>
      );
    }
    const redirectRole = resolvedRole ?? currentUserRole;
    return <Navigate to={getRedirectPathByRole(redirectRole)} replace />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-8 border-brand-blue bg-white rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 flex flex-col items-center pb-8">
          <div className="bg-white p-3 rounded-full shadow-md border-2 border-gray-100 mb-2">
            <img src={logo} alt="MESSOB Logo" className="h-16 w-16 object-contain rounded-full" />
          </div>
          <CardTitle className="text-2xl font-black text-brand-blue tracking-tight">MESSOB-FMS</CardTitle>
          <CardDescription className="text-center font-medium text-gray-500">
            Fleet Management & Logistics Portal
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid gap-6 pb-2">
            
            {/* Email Input */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">
                Official Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@mesobcenter.et" 
                  {...register("email")}
                  className={cn(
                    "pl-10 h-12 border-2 transition-all duration-200 outline-none rounded-xl",
                    "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-0",
                    errors.email 
                      ? "border-red-500" 
                      : "border-gray-200 focus:border-brand-blue"
                  )}
                />
              </div>
              {errors.email && <p className="text-xs font-semibold text-red-500 ml-1">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-sm font-bold text-gray-700">Password</Label>
                <a href="#" className="text-xs text-brand-blue hover:underline font-bold">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  {...register("password")}
                  className={cn(
                    "pl-10 pr-10 h-12 border-2 transition-all duration-200 outline-none rounded-xl",
                    "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-0",
                    errors.password 
                      ? "border-red-500" 
                      : "border-gray-200 focus:border-brand-blue"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-brand-blue"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-semibold text-red-500 ml-1">{errors.password.message}</p>}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-4">
            {loginError && (
              <p className="text-sm font-semibold text-red-500 text-center w-full">{loginError}</p>
            )}
            <Button 
              type="submit" 
              className="w-full bg-brand-blue hover:bg-blue-800 text-white h-14 text-lg font-bold shadow-lg transition-transform active:scale-95 rounded-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Authenticating..." : "Login"}
            </Button>
            
            <p className="text-xs text-gray-400 font-medium text-center mt-2">
              &copy; {new Date().getFullYear()} MESSOB Center Logistics.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}