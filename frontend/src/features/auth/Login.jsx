import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

// Utilities
import { cn } from "@/lib/utils";
import { getRedirectPathByRole } from "@/lib/authRedirect";
import logo from "@/assets/logo.png";

const users = {
  "admin@mesobcenter.et": { name: "Admin User", role: "Admin", password: "admin123", email: "admin@mesobcenter.et" },
  "dispatcher@mesobcenter.et": { name: "Abebe (Dispatcher)", role: "Dispatcher", password: "dispatch123", email: "dispatcher@mesobcenter.et" },
  "staff@mesobcenter.et": { name: "Sumeya (Staff)", role: "Staff", password: "password123", email: "staff@mesobcenter.et" },
  "maintainer@mesobcenter.et": { name: "Mike (Maintainer)", role: "Maintainer", password: "maintain123", email: "maintainer@mesobcenter.et" },
  "driver@mesobcenter.et": { name: "Dawit (Driver)", role: "Driver", password: "driver123", email: "driver@mesobcenter.et" },
};

const loginSchema = z.object({
  email: z.string().email("Please enter a valid MESSOB email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  // Get functions from your Zustand store
  const loginUser = useUserStore((state) => state.login);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const currentUserRole = useUserStore((state) => state.user?.role);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "staff@mesobcenter.et", // Pre-filled for easier testing
      password: "password123"
    }
  });

  const onSubmit = async (data) => {
    // Simulate authentication with role-based access
    const { email, password } = data;
    const user = users[email];
    
    if (!user || user.password !== password) {
      alert("Invalid email or password");
      return;
    }

    // Login with the correct role and persist the user details
    loginUser(user, "mock-jwt-token");
    navigate(getRedirectPathByRole(user.role));
  };

  if (isAuthenticated) {
    return <Navigate to={getRedirectPathByRole(currentUserRole)} replace />;
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