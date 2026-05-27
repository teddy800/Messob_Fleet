import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { odooLogin, searchRead } from "@/lib/odooApi";

// UI Components
import { Eye, EyeOff, Lock, User } from "lucide-react";

// Utilities
import { cn } from "@/lib/utils";
import { getRedirectPathByRole } from "@/lib/authRedirect";
import { isFmsGroup, resolveUserRole } from "@/lib/resolveUserRole";
import AnimatedWaveBackground from "@/components/shared/AnimatedWaveBackground";
import logo from "@/assets/logo.png";

// Styles
import "./login.css";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Key for localStorage
const CACHED_CREDENTIALS_KEY = 'messob_fms_cached_credentials';

// Default test credentials
const DEFAULT_CREDENTIALS = {
  "staff@mesobcenter.et": "staff123",
  "dispatcher@mesobcenter.et": "dispatcher123",
  "driver@mesobcenter.et": "driver123",
  "maintainer@mesobcenter.et": "maintainer123",
  "admin@mesobcenter.et": "admin123",
};

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
  const [cachedCredentials, setCachedCredentials] = useState({});
  const navigate = useNavigate();
  
  // Get functions from your Zustand store
  const loginUser = useUserStore((state) => state.login);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);
  const currentUserRole = user?.role;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const emailValue = watch("email");

  // Load cached credentials on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHED_CREDENTIALS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCachedCredentials({ ...DEFAULT_CREDENTIALS, ...parsed });
      } else {
        setCachedCredentials(DEFAULT_CREDENTIALS);
      }
    } catch (error) {
      console.error('Error loading cached credentials:', error);
      setCachedCredentials(DEFAULT_CREDENTIALS);
    }
  }, []);

  // Auto-fill password when email matches cached credentials
  useEffect(() => {
    if (emailValue) {
      const emailLower = emailValue.trim().toLowerCase();
      const cachedPassword = cachedCredentials[emailLower];
      if (cachedPassword) {
        setValue("password", cachedPassword);
      }
    }
  }, [emailValue, cachedCredentials, setValue]);

  // Save credentials to cache
  const cacheCredentials = (email, password) => {
    try {
      const cached = localStorage.getItem(CACHED_CREDENTIALS_KEY);
      const existing = cached ? JSON.parse(cached) : {};
      const updated = { ...existing, [email.toLowerCase()]: password };
      localStorage.setItem(CACHED_CREDENTIALS_KEY, JSON.stringify(updated));
      setCachedCredentials({ ...DEFAULT_CREDENTIALS, ...updated });
    } catch (error) {
      console.error('Error caching credentials:', error);
    }
  };

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

      // Cache credentials on successful login
      cacheCredentials(data.email, data.password);

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
    <div className="messob-fms-auth-wrapper">
      <AnimatedWaveBackground className="absolute inset-0 z-20" />
      
      <div className="messob-fms-auth-container">
        <div className="messob-fms-auth-card">
          
          {/* Header Logo */}
          <div className="messob-fms-header-image">
            <img src={logo} alt="MESSOB Fleet Management" />
          </div>

          {/* Welcome Section */}
          <div className="messob-fms-welcome-section">
            <div className="messob-fms-welcome">Welcome</div>
            <div className="messob-fms-subtitle">MESSOB Fleet Management System</div>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="messob-fms-alert messob-fms-alert-error" role="alert">
              {loginError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="messob-fms-form" noValidate>
            
            {/* Email Input */}
            <div className="messob-fms-form-group">
              <div className="messob-fms-input-wrapper">
                <User className="messob-fms-input-icon" style={{ width: '20px', height: '20px' }} />
                <input
                  type="email"
                  {...register("email")}
                  placeholder="Username"
                  disabled={isSubmitting}
                  autoComplete="username email"
                  list="messob-fms-email-suggestions"
                  className={cn(
                    "messob-fms-form-input messob-fms-form-input--with-icon",
                    errors.email && "error",
                    isSubmitting && "opacity-60"
                  )}
                />
              </div>
              <datalist id="messob-fms-email-suggestions">
                {Object.keys(cachedCredentials).map((email) => (
                  <option key={email} value={email} />
                ))}
              </datalist>
              {errors.email && (
                <span className="messob-fms-form-error">{errors.email.message}</span>
              )}
            </div>

            {/* Password Input */}
            <div className="messob-fms-form-group">
              <div className="messob-fms-input-wrapper messob-fms-password-wrapper">
                <Lock className="messob-fms-input-icon" style={{ width: '20px', height: '20px' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Password"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className={cn(
                    "messob-fms-form-input messob-fms-form-input--with-icon",
                    errors.password && "error",
                    isSubmitting && "opacity-60"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="messob-fms-password-toggle"
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '20px', height: '20px' }} />
                  ) : (
                    <Eye style={{ width: '20px', height: '20px' }} />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="messob-fms-form-error">{errors.password.message}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="messob-fms-btn messob-fms-btn-primary"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          {/* Footer */}
          <div className="messob-fms-footer">
            <div className="messob-fms-footer-brand">Fleet Management</div>
          </div>
        </div>
      </div>
    </div>
  );
}