import mongoose from "mongoose";
import { Hotel } from "../models/hotel.schema.js";

// Hotel-admin console roles. `admin` is a company-scoped hotel admin here;
// superadmin is a platform role and is deliberately excluded from hotel
// operational data.
export const HOTEL_ADMIN_ROLES = ["owner", "hoteladmin", "admin", "manager"];

export const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

export const isHotelAdminRole = (req) => HOTEL_ADMIN_ROLES.includes(getUserRole(req));

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id.toString();
  return value.toString();
};

export const getAssignedHotelIds = (req) =>
  (req.user?.assignedProperties || []).map(idOf).filter(Boolean);

export const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Verifies the caller may act on the given hotel and returns the hotel.
 *  - owner: the hotel belongs to the caller's company, or the caller is hotel.owner
 *  - every other staff role: same company AND the hotel is in assignedProperties
 *  - superadmin / guest / no role: 403
 * Pass `roles` to additionally restrict which roles may perform the action.
 */
export const assertHotelAccess = async (req, hotelId, { roles } = {}) => {
  const role = getUserRole(req);

  if (!role || role === "superadmin" || role === "guest") {
    throw httpError(403, "Not authorized for hotel operational data");
  }
  if (roles && !roles.includes(role)) {
    throw httpError(403, `Role '${role}' is not allowed to perform this action`);
  }

  const id = idOf(hotelId);
  if (!id || !mongoose.isValidObjectId(id)) {
    throw httpError(404, "Hotel not found");
  }

  const hotel = await Hotel.findById(id).select("name company owner");
  if (!hotel) throw httpError(404, "Hotel not found");

  const userCompany = idOf(req.user?.company);
  const sameCompany = Boolean(userCompany && hotel.company && userCompany === idOf(hotel.company));

  if (role === "owner") {
    const isHotelOwner = Boolean(hotel.owner && idOf(hotel.owner) === idOf(req.user?._id));
    if (!sameCompany && !isHotelOwner) throw httpError(403, "Not authorized for this hotel");
    return hotel;
  }

  if (!sameCompany || !getAssignedHotelIds(req).includes(id)) {
    throw httpError(403, "Not authorized for this hotel");
  }
  return hotel;
};

// Returns a 404 JSON response when the id isn't a valid ObjectId, so a
// malformed id never reaches findById (CastError) or leaks a stack trace.
export const isValidId = (id) => mongoose.isValidObjectId(id);

// Fields that let a guest open a room/table ordering session. Only the
// hotel-admin roles that manage QR codes get them in list responses.
export const QR_SECRET_FIELDS = ["uniqueToken", "qrCodeData", "qrCodeImage", "QR"];

export const stripQrSecrets = (doc) => {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : { ...doc };
  for (const field of QR_SECRET_FIELDS) delete plain[field];
  return plain;
};
