// lib/odooApi.js
// Handles all communication with the Odoo 18 backend at http://localhost:8018
// NFR-1: Performance optimizations with caching and request deduplication

const BASE_URL = "/odoo"; // proxied via vite to avoid CORS

let sessionId = null;

// NFR-1: Performance - Simple in-memory cache for read-only data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// NFR-1: Performance - Request deduplication to prevent duplicate API calls
const pendingRequests = new Map();

/**
 * Generate cache key from request parameters
 */
function getCacheKey(url, params) {
  return `${url}:${JSON.stringify(params)}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheEntry) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp < CACHE_TTL);
}

/**
 * Low-level JSON-RPC call to Odoo
 * NFR-1: Enhanced with request deduplication
 */
async function rpc(url, params = {}, options = {}) {
  const { skipCache = false, skipDedup = false } = options;
  
  console.log("📡 RPC Call:", url, params);
  
  // NFR-1: Check cache for read operations
  if (!skipCache && (url.includes('search_read') || url.includes('read'))) {
    const cacheKey = getCacheKey(url, params);
    const cached = cache.get(cacheKey);
    
    if (isCacheValid(cached)) {
      console.log("⚡ Cache hit:", cacheKey);
      return cached.data;
    }
  }
  
  // NFR-1: Request deduplication - prevent duplicate simultaneous requests
  if (!skipDedup) {
    const requestKey = getCacheKey(url, params);
    const pending = pendingRequests.get(requestKey);
    
    if (pending) {
      console.log("🔄 Deduplicating request:", requestKey);
      return pending;
    }
  }
  
  // Make the actual request
  const requestPromise = (async () => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params,
      }),
    });

    const json = await res.json();
    console.log("📥 RPC Response:", json);

    if (json.error) {
      // Check if this is an access rights error for internal models
      const isAccessRightsError = json.error.data?.name === "odoo.exceptions.AccessError";
      const isInternalModel = params?.model && (
        params.model.startsWith("ir.") || 
        params.model === "base"
      );
      
      // Suppress console errors for non-critical access rights issues on internal models
      if (isAccessRightsError && isInternalModel) {
        console.warn("⚠️ Access denied to internal model (non-critical):", params?.model);
      } else {
        console.error("❌ RPC Error Details:", {
          message: json.error.message,
          data: json.error.data,
          code: json.error.code,
          fullError: json.error
        });
      }
      
      // Extract meaningful error message
      const errorMessage = json.error.data?.message 
        || json.error.data?.arguments?.[0] 
        || json.error.message 
        || "Odoo RPC error";
      
      throw new Error(errorMessage);
    }

    // NFR-1: Cache successful read operations
    if (!skipCache && (url.includes('search_read') || url.includes('read'))) {
      const cacheKey = getCacheKey(url, params);
      cache.set(cacheKey, {
        data: json.result,
        timestamp: Date.now()
      });
    }

    return json.result;
  })();
  
  // NFR-1: Store pending request
  if (!skipDedup) {
    const requestKey = getCacheKey(url, params);
    pendingRequests.set(requestKey, requestPromise);
    
    // Clean up after request completes
    requestPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }
  
  return requestPromise;
}

/**
 * Clear cache (useful after write operations)
 * NFR-1: Performance - Cache invalidation
 */
export function clearCache(pattern = null) {
  if (pattern) {
    // Clear specific cache entries matching pattern
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
  console.log("🗑️ Cache cleared:", pattern || 'all');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Authenticate a user against Odoo.
 * Returns { uid, name, username, session_id, user_context } on success.
 */
export async function odooLogin(email, password) {
  try {
    // Direct fetch to authenticate endpoint with correct parameter structure
    // Backend expects: db, login, password as top-level params
    const res = await fetch(`${BASE_URL}/web/session/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          db: "fleet_management",
          login: email,
          password: password,
        },
        id: Math.floor(Math.random() * 1000000),
      }),
    });

    const json = await res.json();
    console.log("🔑 Authentication response:", json);

    if (json.error) {
      console.error("❌ Authentication error:", json.error);
      const errorMessage = json.error.data?.message 
        || json.error.data?.arguments?.[0] 
        || json.error.message 
        || "Authentication failed";
      throw new Error(errorMessage);
    }

    const result = json.result;

    if (!result || !result.uid) {
      throw new Error("Invalid email or password");
    }

    sessionId = result.session_id;
    console.log("✅ Login successful:", { uid: result.uid, username: result.username });
    return result;
  } catch (error) {
    console.error("🚫 Login failed:", error);
    
    // Provide more helpful error messages
    if (error.message.includes("Access Denied")) {
      throw new Error("Access Denied: This user may not exist or doesn't have permission to access the system.");
    }
    
    throw error;
  }
}

/**
 * Destroy the current Odoo session (logout).
 */
export async function odooLogout() {
  await rpc("/web/session/destroy", {});
  sessionId = null;
}

/**
 * Get the current session info (useful to restore auth on page reload).
 */
export async function getSessionInfo() {
  return rpc("/web/session/get_session_info", {});
}

// ---------------------------------------------------------------------------
// Generic model helpers
// ---------------------------------------------------------------------------

/**
 * Search & read records from any Odoo model.
 * @param {string} model  e.g. "fms.trip.request"
 * @param {Array}  domain e.g. [["state", "=", "pending"]]
 * @param {Array}  fields e.g. ["name", "state", "driver_id"]
 */
export async function searchRead(model, domain = [], fields = [], limit = 80) {
  return rpc("/web/dataset/call_kw", {
    model,
    method: "search_read",
    args: [domain],
    kwargs: { fields, limit },
  });
}

/**
 * Create a record.
 * NFR-1: Clears cache after write operation
 */
export async function createRecord(model, values = {}) {
  const result = await rpc("/web/dataset/call_kw", {
    model,
    method: "create",
    args: [values],
    kwargs: {},
  }, { skipCache: true });
  
  // Clear cache for this model
  clearCache(model);
  
  return result;
}

/**
 * Write (update) a record.
 * NFR-1: Clears cache after write operation
 */
export async function writeRecord(model, ids = [], values = {}) {
  const result = await rpc("/web/dataset/call_kw", {
    model,
    method: "write",
    args: [ids, values],
    kwargs: {},
  }, { skipCache: true });
  
  // Clear cache for this model
  clearCache(model);
  
  return result;
}

/**
 * Call any model method (button actions, wizards, etc.)
 * @param {string} model - Model name
 * @param {string} method - Method name
 * @param {Array} args - Arguments array (will be spread as positional args)
 * @param {Object} kwargs - Keyword arguments
 * NFR-1: Clears cache for write operations
 */
export async function callMethod(model, method, args = [], kwargs = {}) {
  const isWriteOperation = ['create', 'write', 'unlink', 'action_'].some(op => method.includes(op));
  
  const result = await rpc("/web/dataset/call_kw", {
    model,
    method,
    args: Array.isArray(args) ? args : [args],
    kwargs,
  }, { skipCache: isWriteOperation });
  
  // Clear cache for write operations
  if (isWriteOperation) {
    clearCache(model);
  }
  
  return result;
}

/**
 * Alias for callMethod to maintain backward compatibility
 * @deprecated Use callMethod instead
 */
export const callOdooMethod = callMethod;
