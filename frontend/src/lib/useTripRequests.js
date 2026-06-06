// lib/useTripRequests.js
// React hook for fetching trip requests from Odoo

import { useState, useEffect, useCallback } from "react";
import { searchRead, callMethod, writeRecord, createRecord } from "./odooApi";

/** Map frontend select values → Odoo selection keys on messob.fms.trip */
const VEHICLE_CATEGORY_TO_ODOO = {
  sedan: "sedan",
  suv: "suv",
  bus: "bus",
  minibus: "minibus",
  pickup: "pickup",
  "mini-bus": "minibus",
  "pick-up": "pickup",
};

function toOdooDatetime(date, hour, minute = 0) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:00`;
}

const TRIP_FIELDS = [
  "name", "state", "purpose", "vehicle_category",
  "start_dt", "end_dt", "pickup", "destination",
  "requester_id", "assigned_vehicle_id", "assigned_driver_id",
  "create_date",
];

/**
 * Fetch trip requests. Staff sees only their own; Dispatcher/Admin sees all pending.
 */
export function useTripRequests(filterState = null) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Serialize filterState to avoid infinite re-renders from array reference changes
  const filterKey = Array.isArray(filterState) ? filterState.join(",") : (filterState || "");

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const domain = [];
      if (filterState) {
        if (Array.isArray(filterState)) {
          domain.push(["state", "in", filterState]);
        } else {
          domain.push(["state", "=", filterState]);
        }
      }
      const data = await searchRead("messob.fms.trip", domain, TRIP_FIELDS, 100);
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips };
}

/**
 * Create a trip request in Odoo (staff new-request wizard).
 * Matches messob.fms.trip fields and the backend wizard submit flow (state: pending).
 */
export async function createTripRequest(formData) {
  const vehicle_category =
    VEHICLE_CATEGORY_TO_ODOO[formData.vehicleCategory] || formData.vehicleCategory;

  // Parse time strings (format: "HH:MM")
  const [startHour, startMinute] = formData.departureTime.split(':').map(Number);
  const [endHour, endMinute] = formData.arrivalTime.split(':').map(Number);

  // Use user-selected times
  const start_dt = toOdooDatetime(formData.departureDate, startHour, startMinute);
  const end_dt = toOdooDatetime(formData.arrivalDate, endHour, endMinute);

  return createRecord("messob.fms.trip", {
    purpose: formData.purpose.trim(),
    vehicle_category,
    start_dt,
    end_dt,
    pickup: formData.startPoint.trim(),
    destination: formData.destination.trim(),
    state: "pending",
  });
}

/**
 * Fetch available fleet vehicles from Odoo
 */
export async function fetchVehicles() {
  return searchRead("fleet.vehicle", [["active", "=", true]], ["id", "name", "license_plate"], 100);
}

/**
 * Fetch drivers from the FMS driver model
 */
export async function fetchDrivers() {
  return searchRead(
    "messob.fms.driver",
    [["is_active", "=", true]],
    ["id", "name", "phone", "partner_id"],
    100
  );
}

/**
 * Approve a trip: assign vehicle + driver then call action_approve
 */
export async function approveTrip(tripId, vehicleId, driverPartnerId) {
  console.log("🚀 approveTrip called:", { tripId, vehicleId, driverPartnerId });
  
  // Step 1: Assign vehicle and driver
  console.log("📝 Step 1: Writing vehicle and driver assignments...");
  const writeResult = await writeRecord("messob.fms.trip", [tripId], {
    assigned_vehicle_id: vehicleId,
    assigned_driver_id: driverPartnerId,
  });
  console.log("✅ Step 1 complete:", writeResult);
  
  // Step 2: Call action_approve
  console.log("🎯 Step 2: Calling action_approve...");
  const approveResult = await callMethod("messob.fms.trip", "action_approve", [tripId]);
  console.log("✅ Step 2 complete:", approveResult);
  
  return approveResult;
}

/**
 * Reject a trip
 */
export async function rejectTrip(tripId) {
  return callMethod("messob.fms.trip", "action_reject", [tripId]);
}
