/**
 * Reception property scope.
 *
 * Every reception endpoint reads and writes data for exactly the hotels the
 * signed-in staff member may work on:
 *   - owner / admin: every hotel of their own company
 *   - manager / receptionist / housekeeping / maintenance: their assigned
 *     properties, intersected with their company's hotels
 * A requested hotel (?hotelId, :hotelId or body.hotelId) must be in that set,
 * otherwise the request is rejected with 403. Without a requested hotel the
 * scope covers every allowed hotel (owners) or the first assignment
 * (receptionists, via enforcePropertyScope).
 *
 * Aggregates filter on `hotel`, never on `company` alone, so a receptionist
 * of one hotel never sees a sibling hotel's bookings, guests or revenue.
 */
import mongoose from "mongoose";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";

const COMPANY_WIDE_ROLES = new Set(["owner", "admin"]);
export const DEFAULT_TIMEZONE = "Asia/Kathmandu";

const roleOf = (user) => user?.companyRole || user?.role?.name;
const idOf = (value) => (value?._id || value)?.toString?.() || null;
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

export class ScopeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const requestedHotelOf = (req) =>
  req._scopedHotelId || req.params?.hotelId || req.query?.hotelId || req.body?.hotelId || null;

const buildScope = ({ user, allowed, requested, timezone }) => {
  const company = idOf(user?.company);
  let hotel = null;
  if (requested) {
    const wanted = String(requested);
    if (!allowed.includes(wanted)) {
      throw new ScopeError(403, "You are not authorised to access this property.");
    }
    hotel = wanted;
  } else if (allowed.length === 1) {
    hotel = allowed[0];
  }
  const hotelIds = hotel ? [hotel] : allowed;
  return {
    company,
    hotel,
    hotelIds,
    timezone: timezone || DEFAULT_TIMEZONE,
    filter: hotel ? { hotel: toObjectId(hotel) } : { hotel: { $in: hotelIds.map(toObjectId) } },
    userId: user?._id,
    userName: user?.fullname,
  };
};

/** Router middleware: resolves req.receptionScope once per request. */
export const attachReceptionScope = async (req, res, next) => {
  try {
    const user = req.user;
    const company = idOf(user?.company);
    if (!company || !mongoose.isValidObjectId(company)) {
      return res.status(403).json({ success: false, message: "Company context is required" });
    }
    const [companyHotels, companyDoc] = await Promise.all([
      Hotel.find({ company }).select("_id").lean(),
      Company.findById(company).select("settings.timezone").lean(),
    ]);
    const companyHotelIds = companyHotels.map((h) => String(h._id));
    let allowed;
    if (COMPANY_WIDE_ROLES.has(roleOf(user))) {
      allowed = companyHotelIds;
    } else {
      const assigned = new Set((user.assignedProperties || []).filter(Boolean).map(idOf));
      allowed = companyHotelIds.filter((id) => assigned.has(id));
    }
    if (allowed.length === 0) {
      return res.status(403).json({ success: false, message: "No properties assigned to your account. Contact management." });
    }
    req.receptionScope = buildScope({
      user,
      allowed,
      requested: requestedHotelOf(req),
      timezone: companyDoc?.settings?.timezone,
    });
    next();
  } catch (err) {
    if (err instanceof ScopeError) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * Scope for the current request. Falls back to a synchronous, assignment-only
 * scope when a handler is invoked without the router middleware (unit tests).
 */
export const getReceptionScope = (req) => {
  if (req.receptionScope) return req.receptionScope;
  const user = req.user;
  const allowed = (user?.assignedProperties || []).filter(Boolean).map(idOf);
  req.receptionScope = buildScope({ user, allowed, requested: requestedHotelOf(req) });
  return req.receptionScope;
};

/** A fresh copy of the hotel filter, safe to extend per query. */
export const scopeFilter = (req) => {
  const { filter } = getReceptionScope(req);
  return filter.hotel?.$in ? { hotel: { $in: [...filter.hotel.$in] } } : { hotel: filter.hotel };
};

/** True when a document's hotel id is inside the caller's scope. */
export const inScope = (req, hotelId) => {
  const id = idOf(hotelId);
  return !!id && getReceptionScope(req).hotelIds.includes(id);
};

/** Escape user input before using it inside a RegExp / $regex. */
export const escapeRegex = (value) => String(value ?? "").slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive "contains" matcher for a search string, or null. */
export const searchRegex = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  return { $regex: escapeRegex(value.trim()), $options: "i" };
};

/** Escape text before embedding it in stored HTML (activity descriptions). */
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Integer query param clamped to [min, max]. */
export const clampInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

// ── Hotel-local day boundaries ──
const offsetMs = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
};

const safeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

/** Start/end of a calendar day in the hotel's timezone (offsetDays from today). */
export const dayRange = (timeZone = DEFAULT_TIMEZONE, offsetDays = 0, now = new Date()) => {
  const zone = safeZone(timeZone);
  const local = new Date(now.getTime() + offsetMs(now, zone));
  const midnightWall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offsetDays);
  const start = new Date(midnightWall - offsetMs(new Date(midnightWall), zone));
  const nextWall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offsetDays + 1);
  const end = new Date(nextWall - offsetMs(new Date(nextWall), zone) - 1);
  return { start, end };
};

/** First instant of the month (monthOffset from the current one) in the hotel's timezone. */
export const monthStart = (timeZone = DEFAULT_TIMEZONE, monthOffset = 0, now = new Date()) => {
  const zone = safeZone(timeZone);
  const local = new Date(now.getTime() + offsetMs(now, zone));
  const wall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + monthOffset, 1);
  return new Date(wall - offsetMs(new Date(wall), zone));
};

/** Weekday index (0 = Sunday) of an instant in the hotel's timezone. */
export const localWeekday = (date, timeZone = DEFAULT_TIMEZONE) =>
  new Date(date.getTime() + offsetMs(date, safeZone(timeZone))).getUTCDay();
