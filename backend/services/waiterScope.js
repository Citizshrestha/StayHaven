import mongoose from "mongoose";
import { Hotel } from "../models/hotel.schema.js";

// Hotel scoping for the waiter-facing controllers (waiter calls, table
// assignments). The client may name a hotel, but it only counts when the
// signed-in user actually works there. `req.user` comes from protect() and has
// no `activeProperty` field; that only exists on the login response.

export const STAFF_ROLES = ["waiter", "chief", "receptionist", "manager", "owner", "admin", "hoteladmin"];
const COMPANY_WIDE_ROLES = ["owner", "manager", "admin", "hoteladmin"];

export const roleOf = (req) => req.user?.role?.name || req.user?.companyRole;

export const assignedHotelIds = (req) =>
  (req.user?.assignedProperties || [])
    .map((p) => (p && typeof p === "object" && p._id ? p._id : p))
    .filter(Boolean)
    .map(String);

const scopeError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Returns the hotel id (string) this request may act on.
 * - No hotel named: the user's first assigned property.
 * - A hotel named: it must be one of the user's assigned properties, or (for
 *   owner/manager/admin roles) a hotel of the user's own company.
 * Throws an error with `.status` (400/403/404) otherwise.
 */
export async function resolveHotelId(req, requested) {
  const role = roleOf(req);
  if (!STAFF_ROLES.includes(role)) throw scopeError(403, `User role '${role || "unknown"}' is not authorized`);

  const assigned = assignedHotelIds(req);
  if (requested === undefined || requested === null || requested === "") {
    if (!assigned.length) throw scopeError(400, "Hotel ID is required");
    return assigned[0];
  }
  if (typeof requested !== "string" || !mongoose.isValidObjectId(requested)) {
    throw scopeError(400, "Invalid hotel ID");
  }
  if (assigned.includes(requested)) return requested;

  if (COMPANY_WIDE_ROLES.includes(role)) {
    const company = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.();
    const hotel = company ? await Hotel.findById(requested).select("company").lean() : null;
    if (hotel && hotel.company?.toString() === company) return requested;
  }
  throw scopeError(403, "Not authorized for this hotel");
}
