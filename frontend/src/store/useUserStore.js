import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
  // --- STATE ---
  user: null,
  isAuthenticated: false,

  // Initialize from localStorage on app start
  initializeAuth: () => {
    const token = localStorage.getItem("messob_token");
    const role = localStorage.getItem("user-role");
    
    if (token && role) {
      // Mock user data based on role - in real app, you'd decode JWT
      const mockUsers = {
        Staff: { name: "Sumeya (Staff)", role: "Staff", email: "staff@mesobcenter.et" },
        Dispatcher: { name: "Abebe (Dispatcher)", role: "Dispatcher", email: "dispatcher@mesobcenter.et" },
        Admin: { name: "Admin User", role: "Admin", email: "admin@mesobcenter.et" },
        Maintainer: { name: "Mike (Maintainer)", role: "Maintainer", email: "maintainer@mesobcenter.et" },
        Driver: { name: "Dawit (Driver)", role: "Driver", email: "driver@mesobcenter.et" },
      };
      
      set({ 
        user: mockUsers[role] || null, 
        isAuthenticated: true 
      });
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
    localStorage.setItem("messob_token", "dev-mock-token");
  },

  /**
   * Logout: Clears everything
   */
  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem("messob_token");
    localStorage.removeItem("user-role");
  },
}));