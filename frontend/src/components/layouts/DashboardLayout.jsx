import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {useUserStore} from "@/store/useUserStore"
import { Bell, Menu, Moon, Sun } from "lucide-react";
import Sidebar from "../shared/Sidebar";
import UserAvatar from "../shared/UserAvatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner"; // For the "Check" notifications

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const user = useUserStore((s) => s.user);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) return storedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      {/* 'hidden lg:flex' ensures the sidebar is permanent on desktop (1024px+) */}
      <aside className="hidden lg:flex h-full shrink-0">
        <Sidebar />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* --- PAGE HEADER --- */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="p-0 w-64 bg-brand-blue border-none">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <Sidebar setOpen={setOpen} />
              </SheetContent>
            </Sheet>

            <span className="font-bold text-base md:text-lg tracking-tight text-gray-900 dark:text-gray-100">
              MESSOB-FMS
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode((prev) => !prev)}
              className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </Button>
              <UserAvatar size={10} textSize="text-sm" />            
          </div>
        </header>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative text-gray-900 dark:text-gray-100">
          <div className="max-w-7xl mx-auto">
            {/* This is where your Dashboard, Request Wizard, etc. will render */}
            <Outlet />
          </div>
        </main>
      </div>

      {/* --- GLOBAL NOTIFICATIONS --- */}
      {/* This allows toast.success() to work throughout the app */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}