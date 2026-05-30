// lib/jwtAuth.js
// JWT Authentication utilities for MESSOB Fleet Management System
// NFR-3.1: JWT token-based authentication

const BASE_URL = "/odoo";

// Token storage keys
const ACCESS_TOKEN_KEY = 'fms_access_token';
const REFRESH_TOKEN_KEY = 'fms_refresh_token';
const USER_DATA_KEY = 'fms_user_data';

/**
 * JWT Authentication Manager
 * Handles JWT token lifecycle and API authentication
 */
class JWTAuthManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userData = null;
    this.refreshTimer = null;
    
    // Load tokens from storage on initialization
    this.loadFromStorage();
  }

  /**
   * Login with JWT authentication
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data and tokens
   */
  async login(email, password) {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/jwt/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            db: 'fleet_management',
            login: email,
            password: password,
          },
        }),
      });

      const json = await response.json();
      console.log('🔑 JWT Login response:', json);

      if (json.error) {
        throw new Error(json.error.data?.message || json.error.message || 'Login failed');
      }

      const result = json.result;

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // Store tokens and user data
      this.accessToken = result.access_token;
      this.refreshToken = result.refresh_token;
      this.userData = result.user;

      this.saveToStorage();

      // Setup automatic token refresh
      this.setupTokenRefresh(result.expires_in);

      console.log('✅ JWT Login successful:', this.userData);
      return result;

    } catch (error) {
      console.error('🚫 JWT Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout() {
    try {
      if (this.accessToken) {
        await fetch(`${BASE_URL}/api/auth/jwt/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {},
          }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/jwt/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            refresh_token: this.refreshToken,
          },
        }),
      });

      const json = await response.json();

      if (json.error || !json.result.success) {
        throw new Error(json.result?.error || 'Token refresh failed');
      }

      this.accessToken = json.result.access_token;
      this.saveToStorage();

      // Setup next refresh
      this.setupTokenRefresh(json.result.expires_in);

      console.log('🔄 Access token refreshed');
      return json.result.access_token;

    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken() {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/auth/jwt/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            access_token: this.accessToken,
          },
        }),
      });

      const json = await response.json();
      return json.result?.valid || false;

    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Make authenticated API request with JWT
   * @param {string} url - API endpoint
   * @param {Object} params - Request parameters
   * @param {Object} options - Additional options
   */
  async authenticatedRequest(url, params = {}, options = {}) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params,
        }),
      });

      const json = await response.json();

      // Check for token expiration
      if (json.error && json.error.message?.includes('expired')) {
        console.log('Token expired, refreshing...');
        await this.refreshAccessToken();
        
        // Retry request with new token
        return this.authenticatedRequest(url, params, options);
      }

      if (json.error) {
        throw new Error(json.error.data?.message || json.error.message);
      }

      return json.result;

    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  /**
   * Setup automatic token refresh before expiration
   * @param {number} expiresIn - Token expiration time in seconds
   */
  setupTokenRefresh(expiresIn) {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh token 5 minutes before expiration
    const refreshTime = (expiresIn - 300) * 1000; // Convert to milliseconds

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken().catch(error => {
          console.error('Auto-refresh failed:', error);
          this.clearTokens();
        });
      }, refreshTime);
    }
  }

  /**
   * Save tokens to localStorage
   */
  saveToStorage() {
    if (this.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, this.accessToken);
    }
    if (this.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken);
    }
    if (this.userData) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(this.userData));
    }
  }

  /**
   * Load tokens from localStorage
   */
  loadFromStorage() {
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    if (userDataStr) {
      try {
        this.userData = JSON.parse(userDataStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }

  /**
   * Clear all tokens and user data
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userData = null;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Get current user data
   */
  getUserData() {
    return this.userData;
  }

  /**
   * Get access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role name to check
   */
  hasRole(role) {
    return this.userData?.roles?.includes(role) || false;
  }
}

// Export singleton instance
export const jwtAuth = new JWTAuthManager();

// Export individual functions for convenience
export const jwtLogin = (email, password) => jwtAuth.login(email, password);
export const jwtLogout = () => jwtAuth.logout();
export const jwtRefresh = () => jwtAuth.refreshAccessToken();
export const jwtVerify = () => jwtAuth.verifyToken();
export const jwtRequest = (url, params, options) => jwtAuth.authenticatedRequest(url, params, options);
export const isJWTAuthenticated = () => jwtAuth.isAuthenticated();
export const getJWTUserData = () => jwtAuth.getUserData();
export const hasJWTRole = (role) => jwtAuth.hasRole(role);
