import { HotelTable } from "../models/hotelTable.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Order } from "../models/order.schema.js";
import { DiningSession } from "../models/diningSession.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTableQRCode } from "../utils/qrGenerator.js";
import {
  HOTEL_ADMIN_ROLES,
  assertHotelAccess,
  getAssignedHotelIds,
  isHotelAdminRole,
  isValidId,
  stripQrSecrets,
} from "./hotelAdminAccess.js";

// Who may do what with tables
const TABLE_DELETE_ROLES = ["owner", "hoteladmin", "admin"];
// Front-of-house staff may flip a table's status (seat/free a table)
const TABLE_STATUS_ROLES = [...HOTEL_ADMIN_ROLES, "waiter", "receptionist"];

const TABLE_STATUSES = HotelTable.schema.path("status").enumValues;
const TABLE_LOCATIONS = HotelTable.schema.path("location").enumValues;
const TABLE_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/;
const OPEN_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready"];

const notFound = (res) => res.status(404).json({ success: false, message: "Table not found" });

// Default hotel when the client omits hotelId: the caller's first assigned property.
const getDefaultHotelId = async (req) => {
  const [first] = getAssignedHotelIds(req);
  if (first) return first;
  const owned = await Hotel.findOne({ owner: req.user._id }).select("_id");
  return owned?._id?.toString() || null;
};

/**
 * Validates and normalises admin-writable table fields. `partial` skips
 * required checks (updates). Returns { errors, values }.
 */
const validateTableInput = (body, { partial = false } = {}) => {
  const errors = {};
  const values = {};
  const has = (key) => body[key] !== undefined;

  if (has("tableNumber") || !partial) {
    const raw = typeof body.tableNumber === "number" ? String(body.tableNumber) : body.tableNumber;
    const value = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!value) errors.tableNumber = "Table number is required";
    else if (value.length > 20) errors.tableNumber = "Table number must be 20 characters or fewer";
    else if (!TABLE_NUMBER_PATTERN.test(value)) errors.tableNumber = "Use letters, numbers and dashes only";
    else values.tableNumber = value;
  }
  if (has("tableName")) {
    if (body.tableName !== null && typeof body.tableName !== "string") errors.tableName = "Table name must be text";
    else {
      const value = (body.tableName || "").trim();
      if (value.length > 60) errors.tableName = "Table name must be 60 characters or fewer";
      else values.tableName = value;
    }
  }
  if (has("description")) {
    if (body.description !== null && typeof body.description !== "string") errors.description = "Description must be text";
    else {
      const value = (body.description || "").trim();
      if (value.length > 300) errors.description = "Description must be 300 characters or fewer";
      else values.description = value;
    }
  }
  const number = (key, label, { min, max, integer }) => {
    if (!has(key)) return;
    const raw = body[key];
    const value = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (!Number.isFinite(value)) errors[key] = `${label} must be a number`;
    else if (integer && !Number.isInteger(value)) errors[key] = `${label} must be a whole number`;
    else if (value < min || value > max) errors[key] = `${label} must be between ${min} and ${max.toLocaleString("en-US")}`;
    else if (!integer && Math.round(value * 100) !== value * 100) errors[key] = `${label} can have at most 2 decimals`;
    else values[key] = value;
  };
  number("capacity", "Capacity", { min: 1, max: 50, integer: true });
  number("minSpend", "Minimum spend", { min: 0, max: 1_000_000 });

  if (has("location")) {
    if (!TABLE_LOCATIONS.includes(body.location)) errors.location = `Location must be one of: ${TABLE_LOCATIONS.join(", ")}`;
    else values.location = body.location;
  }
  if (has("status")) {
    if (!TABLE_STATUSES.includes(body.status)) errors.status = `Status must be one of: ${TABLE_STATUSES.join(", ")}`;
    else values.status = body.status;
  }
  for (const flag of ["isActive", "isQrActive"]) {
    if (has(flag)) {
      if (typeof body[flag] !== "boolean") errors[flag] = `${flag} must be true or false`;
      else values[flag] = body[flag];
    }
  }
  return { errors, values };
};

const sendValidation = (res, errors) =>
  res.status(400).json({ success: false, message: Object.values(errors)[0], errors });

const duplicateResponse = (res, tableNumber) =>
  res.status(400).json({
    success: false,
    message: `Table ${tableNumber} already exists in this hotel`,
    errors: { tableNumber: `Table ${tableNumber} already exists` },
  });

const findDuplicateTable = (hotelId, tableNumber, excludeId) =>
  HotelTable.findOne({ hotel: hotelId, tableNumber, ...(excludeId && { _id: { $ne: excludeId } }) })
    .collation({ locale: "en", strength: 2 })
    .select("_id");

// @desc    Create a new table
// @route   POST /api/tables
// @access  Private (hotel-admin roles)
export const createTable = asyncHandler(async (req, res) => {
  const hotelId = req.body.hotelId || (await getDefaultHotelId(req));

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and table number are required",
    });
  }

  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  const { errors, values } = validateTableInput(req.body);
  if (Object.keys(errors).length) return sendValidation(res, errors);

  if (await findDuplicateTable(hotel._id, values.tableNumber)) {
    return duplicateResponse(res, values.tableNumber);
  }

  let table;
  try {
    table = await HotelTable.create({
      capacity: 4,
      location: "indoor",
      minSpend: 0,
      ...values,
      tableName: values.tableName || `Table ${values.tableNumber}`,
      hotel: hotel._id,
      company: hotel.company,
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error?.code === 11000) return duplicateResponse(res, values.tableNumber);
    throw error;
  }

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, hotel._id.toString());
  table.qrCodeData = qrCodeData;
  table.qrCodeImage = qrCodeImage;
  await table.save();

  res.status(201).json({
    success: true,
    message: "Table created successfully with QR code",
    table,
  });
});

// @desc    Get all tables for a hotel
// @route   GET /api/tables?hotelId=xxx
// @access  Private (staff assigned to the hotel)
export const getTables = asyncHandler(async (req, res) => {
  const { status, location, isActive } = req.query;
  const hotelId = req.query.hotelId || (await getDefaultHotelId(req));

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required. Please ensure you have an assigned property.",
    });
  }

  // CRITICAL: tables carry the guest ordering token; scope reads to the hotel's staff
  await assertHotelAccess(req, hotelId);

  // Build query
  const query = { hotel: hotelId };

  if (typeof status === "string" && status) {
    query.status = status;
  }

  if (typeof location === "string" && location) {
    query.location = location;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const tables = await HotelTable.find(query)
    .collation({ locale: "en", numericOrdering: true })
    .sort({ tableNumber: 1 })
    .populate('hotel', 'name location')
    .populate('createdBy', 'fullname');

  res.status(200).json({
    success: true,
    count: tables.length,
    data: isHotelAdminRole(req) ? tables : tables.map(stripQrSecrets),
  });
});

// @desc    Get single table by ID
// @route   GET /api/tables/:id
// @access  Private (staff assigned to the hotel)
export const getTableById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id)
    .populate('hotel', 'name location')
    .populate('createdBy', 'fullname');

  if (!table) return notFound(res);

  // CRITICAL: Validate hotel access - prevents cross-hotel table access
  await assertHotelAccess(req, table.hotel._id || table.hotel);

  res.status(200).json({
    success: true,
    table: isHotelAdminRole(req) ? table : stripQrSecrets(table),
  });
});

// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Private (hotel-admin roles)
export const updateTable = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id);

  if (!table) return notFound(res);

  const hotel = await assertHotelAccess(req, table.hotel, { roles: HOTEL_ADMIN_ROLES });

  const { errors, values } = validateTableInput(req.body, { partial: true });
  if (Object.keys(errors).length) return sendValidation(res, errors);

  // Check if new table number conflicts with existing
  if (values.tableNumber && values.tableNumber !== table.tableNumber &&
      await findDuplicateTable(table.hotel, values.tableNumber, table._id)) {
    return duplicateResponse(res, values.tableNumber);
  }

  // A cleared name falls back to the default label instead of staying stale
  if (values.tableName === "") values.tableName = `Table ${values.tableNumber || table.tableNumber}`;
  if (!table.company && hotel?.company) table.company = hotel.company;
  Object.assign(table, values);

  try {
    await table.save();
  } catch (error) {
    if (error?.code === 11000) return duplicateResponse(res, values.tableNumber);
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Table updated successfully",
    table,
  });
});

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private (owner, hoteladmin, admin)
export const deleteTable = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id);

  if (!table) return notFound(res);

  await assertHotelAccess(req, table.hotel, { roles: TABLE_DELETE_ROLES });

  const [openSessions, openOrders] = await Promise.all([
    DiningSession.countDocuments({ table: table._id, status: "open" }),
    Order.countDocuments({ table: table._id, status: { $in: OPEN_ORDER_STATUSES } }),
  ]);
  if (openSessions > 0 || openOrders > 0) {
    return res.status(400).json({
      success: false,
      message: "This table has an open tab or active orders. Settle them before deleting the table.",
    });
  }

  await table.deleteOne();

  res.status(200).json({
    success: true,
    message: "Table deleted successfully",
  });
});

// @desc    Generate/Regenerate QR code for a table
// @route   POST /api/tables/:id/generate-qr
// @access  Private (hotel-admin roles)
export const generateTableQR = asyncHandler(async (req, res) => {
  const regenerate = req.body?.regenerate === true; // If true, generate new token

  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id);

  if (!table) return notFound(res);

  const hotel = await assertHotelAccess(req, table.hotel, { roles: HOTEL_ADMIN_ROLES });

  // Regenerate token if requested (invalidates old QR codes)
  if (regenerate) {
    table.regenerateToken();
  }

  // Backfill company for legacy tables so save() validation doesn't fail on
  // an unrelated required field during a QR-only update.
  if (!table.company && hotel?.company) {
    table.company = hotel.company;
  }

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, table.hotel.toString());
  table.qrCodeData = qrCodeData;
  table.qrCodeImage = qrCodeImage;
  table.isQrActive = true;

  await table.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: regenerate ? "QR code regenerated successfully (old QR is now invalid)" : "QR code generated successfully",
    table: {
      _id: table._id,
      tableNumber: table.tableNumber,
      uniqueToken: table.uniqueToken,
      qrCodeData: table.qrCodeData,
      qrCodeImage: table.qrCodeImage,
      isQrActive: table.isQrActive,
    },
  });
});

// @desc    Batch create multiple tables
// @route   POST /api/tables/batch
// @access  Private (hotel-admin roles)
export const batchCreateTables = asyncHandler(async (req, res) => {
  const { prefix = "", capacity, location } = req.body;
  const hotelId = req.body.hotelId || (await getDefaultHotelId(req));
  const toInt = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);

  const startNumber = toInt(req.body.startNumber);
  let endNumber = toInt(req.body.endNumber);
  const count = req.body.count !== undefined ? toInt(req.body.count) : undefined;

  if (!hotelId) {
    return res.status(400).json({ success: false, message: "Hotel ID is required" });
  }
  if (!Number.isInteger(startNumber) || startNumber < 1 || startNumber > 9999) {
    return res.status(400).json({ success: false, message: "Start number must be a whole number of 1 or more", errors: { startNumber: "Start number must be a whole number of 1 or more" } });
  }
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return res.status(400).json({ success: false, message: "Count must be a whole number between 1 and 50", errors: { count: "Count must be a whole number between 1 and 50" } });
    }
    endNumber = startNumber + count - 1;
  }
  if (!Number.isInteger(endNumber) || endNumber < startNumber) {
    return res.status(400).json({ success: false, message: "End number must be greater than or equal to start number" });
  }
  if (endNumber - startNumber + 1 > 50) {
    return res.status(400).json({ success: false, message: "Cannot create more than 50 tables at once" });
  }
  if (typeof prefix !== "string" || prefix.length > 10 || (prefix && !TABLE_NUMBER_PATTERN.test(prefix))) {
    return res.status(400).json({ success: false, message: "Prefix must be up to 10 letters, numbers or dashes" });
  }
  const { errors, values } = validateTableInput({ capacity, location }, { partial: true });
  if (Object.keys(errors).length) return sendValidation(res, errors);

  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  const createdTables = [];
  const skipped = [];
  const errorsList = [];

  for (let i = startNumber; i <= endNumber; i++) {
    const tableNumber = `${prefix}${i}`.toUpperCase();

    try {
      if (await findDuplicateTable(hotel._id, tableNumber)) {
        skipped.push(tableNumber);
        continue;
      }

      const table = await HotelTable.create({
        hotel: hotel._id,
        company: hotel.company,
        tableNumber,
        tableName: `Table ${tableNumber}`,
        capacity: values.capacity || 4,
        location: values.location || 'indoor',
        createdBy: req.user._id,
      });

      const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken, hotel._id.toString());
      table.qrCodeData = qrCodeData;
      table.qrCodeImage = qrCodeImage;
      await table.save();

      createdTables.push(table);
    } catch (error) {
      if (error?.code === 11000) skipped.push(tableNumber);
      else errorsList.push(`Failed to create table ${tableNumber}: ${error.message}`);
    }
  }

  const parts = [`${createdTables.length} created`];
  if (skipped.length) parts.push(`${skipped.length} skipped (already exist)`);
  if (errorsList.length) parts.push(`${errorsList.length} failed`);

  res.status(createdTables.length ? 201 : 200).json({
    success: createdTables.length > 0 || errorsList.length === 0,
    message: parts.join(", "),
    createdCount: createdTables.length,
    skippedCount: skipped.length,
    skipped,
    tables: createdTables,
    errors: errorsList.length > 0 ? errorsList : undefined,
  });
});

// @desc    Update table status (quick update)
// @route   PATCH /api/tables/:id/status
// @access  Private (hotel-admin roles, waiter, receptionist)
export const updateTableStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !TABLE_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Valid status is required (available, occupied, reserved, maintenance)",
    });
  }

  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id);

  if (!table) return notFound(res);

  // CRITICAL: Validate hotel access - prevents cross-hotel table modification
  const hotel = await assertHotelAccess(req, table.hotel, { roles: TABLE_STATUS_ROLES });

  if (!table.company && hotel?.company) table.company = hotel.company;
  table.status = status;
  await table.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: `Table status updated to ${status}`,
    table: isHotelAdminRole(req) ? table : stripQrSecrets(table),
  });
});

// @desc    Get QR code download data for a table
// @route   GET /api/tables/:id/qr-download
// @access  Private (hotel-admin roles)
export const getTableQRDownload = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const table = await HotelTable.findById(req.params.id)
    .populate('hotel', 'name');

  if (!table) return notFound(res);

  // CRITICAL: Validate hotel access - prevents cross-hotel QR code access
  await assertHotelAccess(req, table.hotel._id || table.hotel, { roles: HOTEL_ADMIN_ROLES });

  if (!table.qrCodeImage) {
    return res.status(400).json({
      success: false,
      message: "QR code not generated yet. Please generate first.",
    });
  }

  res.status(200).json({
    success: true,
    qrData: {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      hotelName: table.hotel?.name,
      qrCodeImage: table.qrCodeImage,
      qrCodeUrl: table.qrCodeData,
      uniqueToken: table.uniqueToken,
    },
  });
});
