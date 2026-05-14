// lib/useTripRequests.js
// React hook for fetching trip requests from Odoo

import { useState, useEffect, useCallback } from "react";
import { searchRead, callMethod, writeRecord } from "./odooApi";

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
 * Fetch available fleet vehicles from Odoo
 */
export async function fetchVehicles() {
  return searchRead("fleet.vehicle", [["active", "=", true]], ["id", "name", "license_plate"], 100);
}

/**
 * Fetch drivers from the FMS driver model
 */
export async function fetchDrivers() {
  return searchRead("messob.fms.driver", [["is_active", "=", true]], ["id", "name", "phone"], 100);
}

/**
 * Approve a trip: assign vehicle + driver then call action_approve
 */
export async function approveTrip(tripId, vehicleId, driverPartnerId) {
  await writeRecord("messob.fms.trip", [tripId], {
    assigned_vehicle_id: vehicleId,
    assigned_driver_id: driverPartnerId,
  });
  return callMethod("messob.fms.trip", "action_approve", [tripId]);
}

/**
 * Reject a trip
 */
export async function rejectTrip(tripId) {
  return callMethod("messob.fms.trip", "action_reject", [tripId]);
}
