// lib/odooApi.js
// Handles all communication with the Odoo 18 backend at http://localhost:8018

const BASE_URL = "/odoo"; // proxied via vite to avoid CORS

let sessionId = null;

/**
 * Low-level JSON-RPC call to Odoo
 */
async function rpc(url, params = {}) {
  console.log("📡 RPC Call:", url, params);
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
    console.error("❌ RPC Error Details:", {
      message: json.error.message,
      data: json.error.data,
      code: json.error.code,
      fullError: json.error
    });
    
    // Extract meaningful error message
    const errorMessage = json.error.data?.message 
      || json.error.data?.arguments?.[0] 
      || json.error.message 
      || "Odoo RPC error";
    
    throw new Error(errorMessage);
  }

  return json.result;
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
    const result = await rpc("/web/session/authenticate", {
      db: "fleet_management",       // your database name
      login: email,
      password,
    });

    console.log("🔑 Authentication result:", result);

    if (!result || !result.uid) {
      throw new Error("Invalid email or password");
    }

    sessionId = result.session_id;
    return result;
  } catch (error) {
    console.error("🚫 Login failed:", error);
    
    // Provide more helpful error messages
    if (error.message.includes("Access Denied")) {
      throw new Error("Access Denied: This user may not exist or doesn't have permission to access the system. Please check your credentials in Odoo.");
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
 */
export async function createRecord(model, values = {}) {
  return rpc("/web/dataset/call_kw", {
    model,
    method: "create",
    args: [values],
    kwargs: {},
  });
}

/**
 * Write (update) a record.
 */
export async function writeRecord(model, ids = [], values = {}) {
  return rpc("/web/dataset/call_kw", {
    model,
    method: "write",
    args: [ids, values],
    kwargs: {},
  });
}

/**
 * Call any model method (button actions, wizards, etc.)
 */
export async function callMethod(model, method, ids = [], kwargs = {}) {
  return rpc("/web/dataset/call_kw", {
    model,
    method,
    args: [ids],
    kwargs,
  });
}
