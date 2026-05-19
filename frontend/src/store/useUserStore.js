import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  isAuthenticated: false,

  // Initialize from localStorage on app start
  initializeAuth: () => {
    const token = localStorage.getItem("messob_token");
    const storedUser = localStorage.getItem("user-data");

    if (!token) return;

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        set({ user, isAuthenticated: true });
        return;
      } catch {
        localStorage.removeItem("user-data");
      }
    }

    // Legacy sessions (role only) — clear so user re-authenticates with correct role
    const legacyRole = localStorage.getItem("user-role");
    if (legacyRole) {
      localStorage.removeItem("messob_token");
      localStorage.removeItem("user-role");
    }
  },

  // --- ACTIONS ---

  /**
   * Standard Login: Used by the real form
   * @param {Object} userData - { name, role, email }
   * @param {string} token - Mock or real JWT token
   */
  login: (userData, token) => {
    set({ 
      user: userData, 
      isAuthenticated: true 
    });
    // Store the token and role for persistence
    localStorage.setItem("messob_token", token);
    localStorage.setItem("user-role", userData.role);
    localStorage.setItem("user-data", JSON.stringify(userData));
  },

  /**
   * Developer Helper: Used for the "Quick Login" buttons
   * @param {string} role - "Staff", "Dispatcher", or "Admin"
   */
  loginAsRole: (role) => {
    const mockUsers = {
      Staff: { name: "Sumeya (Staff)", role: "Staff", email: "staff@mesobcenter.et" },
      Dispatcher: { name: "Abebe (Dispatcher)", role: "Dispatcher", email: "dispatcher@mesobcenter.et" },
      Admin: { name: "Admin User", role: "Admin", email: "admin@mesobcenter.et" },
      Maintainer: { name: "Mike (Maintainer)", role: "Maintainer", email: "maintainer@mesobcenter.et" },
      Driver: { name: "Dawit (Driver)", role: "Driver", email: "driver@mesobcenter.et" },
    };

    const selectedUser = mockUsers[role] || mockUsers.Staff;

    set({ 
      user: selectedUser, 
      isAuthenticated: true 
    });
    
    localStorage.setItem("user-role", role);
    localStorage.setItem("user-data", JSON.stringify(selectedUser));
    localStorage.setItem("messob_token", "dev-mock-token");
  },

  /**
   * Logout: Clears everything
   */
  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem("messob_token");
    localStorage.removeItem("user-role");
    localStorage.removeItem("user-data");
  },
}));