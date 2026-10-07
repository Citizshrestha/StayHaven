import { MenuItem } from "../models/menuItem.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";

// Valid menu categories — mirrors the enum on menuItem.schema.js
const MENU_CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Drinks",
  "Dessert",
  "Appetizers",
];

// Fields a hotel admin is allowed to set/change on a menu item.
// Anything else in the request body is ignored.
const MENU_WRITABLE_FIELDS = [
  "name",
  "description",
  "category",
  "price",
  "image",
  "isAvailable",
  "orderType",
  "preparationTime",
  "spiceLevel",
  "isVeg",
  "displayOrder",
  "dietary",
  "allergens",
];

// ─── Multi-tenancy helpers (mirrors hotelTableController) ───
const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (typeof p === "object" ? p?._id?.toString() : p?.toString()))
    .filter(Boolean);
};

// Verifies the requesting staff member may manage the given hotel's menu.
// Throws a status-tagged error the global error handler turns into 403/404.
const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);

  if (role === "admin" || role === "superadmin") {
    const hotel = await Hotel.findById(hotelId).select("company owner");
    if (!hotel) throw Object.assign(new Error("Hotel not found"), { status: 404 });
    return hotel;
  }

  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany =
    req.user?.company?._id?.toString?.() ||
    req.user?.company?.toString?.() ||
    req.user?.company;

  const hotel = await Hotel.findById(hotelId).select("company owner");
  if (!hotel) throw Object.assign(new Error("Hotel not found"), { status: 404 });

  if (
    role === "receptionist" &&
    assignedHotelIds.length > 0 &&
    !assignedHotelIds.includes(hotelId.toString())
  ) {
    throw Object.assign(new Error("Not authorized for this hotel"), { status: 403 });
  }

  if (role !== "owner" && userCompany && hotel.company?.toString() !== userCompany.toString()) {
    throw Object.assign(new Error("Not authorized for this hotel company"), { status: 403 });
  }

  return hotel;
};

// Builds a whitelisted update/create payload from the request body.
const pickMenuFields = (body) => {
  const payload = {};
  for (const key of MENU_WRITABLE_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  if (payload.price !== undefined) payload.price = Number(payload.price);
  if (payload.preparationTime !== undefined && payload.preparationTime !== "") {
    payload.preparationTime = Number(payload.preparationTime);
  } else {
    delete payload.preparationTime;
  }
  // Multipart form-data sends booleans as strings
  if (typeof payload.isAvailable === "string") payload.isAvailable = payload.isAvailable === "true";
  if (typeof payload.isVeg === "string") payload.isVeg = payload.isVeg === "true";
  return payload;
};

// Uploads a menu item image buffer (from multer memory storage) to Cloudinary.
// Menu-appropriate transformation (4:3 crop) — deliberately not the shared
// profile-pic helper, which force-crops to a 300x300 face thumbnail.
const uploadMenuImage = async (fileBuffer, hotelId) => {
  const dataUri = `data:image/png;base64,${fileBuffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `StayHaven/menu/${hotelId}`,
    timeout: 120000,
    transformation: [
      { width: 800, height: 600, crop: "fill", gravity: "auto" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
  return result.secure_url;
};

// GET MENU ITEMS
export const getMenuItems = asyncHandler(async (req, res) => {
  const { hotelId, category, available } = req.query;

  // Hotel ID is required
  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const filter = {
    hotel: hotelId,
  };

  if (category) {
    filter.category = category;
  }

  if (available === "all") {
    // Show all items
  } else {
    filter.isAvailable = true; // Default: only available
  }

  const menuItems = await MenuItem.find(filter).sort({ category: 1, name: 1 });

  const groupedByCategory = {};
  menuItems.forEach((item) => {
    if (!groupedByCategory[item.category]) {
      groupedByCategory[item.category] = [];
    }
    groupedByCategory[item.category].push(item);
  });

  return res.status(200).json({
    success: true,
    count: menuItems.length,
    menuItems,
    groupedByCategory,
  });
});

// GET MENU CATEGORIES
export const getMenuCategories = asyncHandler(async (req, res) => {
  // Get unique categories from MenuItem schema enum
  const categories = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Drinks",
    "Dessert",
    "Appetizers",
  ];

  return res.status(200).json({
    success: true,
    categories,
  });
});

// CREATE MENU ITEM
// POST /api/v1/staff/menu-items
export const createMenuItem = asyncHandler(async (req, res) => {
  const { hotelId } = req.body;

  if (!hotelId) {
    return res.status(400).json({ success: false, message: "Hotel ID is required" });
  }

  const payload = pickMenuFields(req.body);

  if (!payload.name || !payload.name.trim()) {
    return res.status(400).json({ success: false, message: "Item name is required" });
  }
  if (!payload.category || !MENU_CATEGORIES.includes(payload.category)) {
    return res.status(400).json({
      success: false,
      message: `Category is required and must be one of: ${MENU_CATEGORIES.join(", ")}`,
    });
  }
  if (payload.price === undefined || Number.isNaN(payload.price) || payload.price < 0) {
    return res.status(400).json({ success: false, message: "A valid price is required" });
  }

  // Verify the staff member may manage this hotel's menu
  await assertHotelAccess(req, hotelId);

  // Optional image upload (multipart form-data with an "image" file field)
  if (req.file) {
    payload.image = await uploadMenuImage(req.file.buffer, hotelId);
  }

  const menuItem = await MenuItem.create({ ...payload, hotel: hotelId });

  return res.status(201).json({
    success: true,
    message: "Menu item created",
    menuItem,
  });
});

// UPDATE MENU ITEM
// PUT /api/v1/staff/menu-items/:itemId
export const updateMenuItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }

  // Ownership: staff can only touch items belonging to a hotel they manage
  await assertHotelAccess(req, menuItem.hotel);

  const payload = pickMenuFields(req.body);

  if (payload.category !== undefined && !MENU_CATEGORIES.includes(payload.category)) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${MENU_CATEGORIES.join(", ")}`,
    });
  }
  if (payload.price !== undefined && (Number.isNaN(payload.price) || payload.price < 0)) {
    return res.status(400).json({ success: false, message: "Price must be a valid number" });
  }

  // Optional image replacement (multipart form-data with an "image" file field)
  if (req.file) {
    payload.image = await uploadMenuImage(req.file.buffer, menuItem.hotel.toString());
  }

  // hotel is intentionally not writable — items never move between hotels
  Object.assign(menuItem, payload);
  await menuItem.save();

  return res.status(200).json({
    success: true,
    message: "Menu item updated",
    menuItem,
  });
});

// DELETE MENU ITEM
// DELETE /api/v1/staff/menu-items/:itemId
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }

  await assertHotelAccess(req, menuItem.hotel);

  // Hard delete is safe: orders denormalize item name+price, so historical
  // orders are unaffected by removing the menu definition.
  await menuItem.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Menu item deleted",
  });
});

// REORDER MENU ITEMS
// PUT /api/v1/staff/menu-items/reorder
// Body: { hotelId, items: [{ id, displayOrder }] }
export const reorderMenuItems = asyncHandler(async (req, res) => {
  const { hotelId, items } = req.body;

  if (!hotelId) {
    return res.status(400).json({ success: false, message: "Hotel ID is required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "items must be a non-empty array of { id, displayOrder }",
    });
  }
  for (const entry of items) {
    if (!entry?.id || typeof entry.displayOrder !== "number") {
      return res.status(400).json({
        success: false,
        message: "Each entry must have an id and a numeric displayOrder",
      });
    }
  }

  await assertHotelAccess(req, hotelId);

  // Scoped by hotel so IDs belonging to another hotel are silently ignored
  const result = await MenuItem.bulkWrite(
    items.map((entry) => ({
      updateOne: {
        filter: { _id: entry.id, hotel: hotelId },
        update: { $set: { displayOrder: entry.displayOrder } },
      },
    }))
  );

  return res.status(200).json({
    success: true,
    message: `${result.modifiedCount} item(s) reordered`,
    modifiedCount: result.modifiedCount,
  });
});

// BULK TOGGLE AVAILABILITY ("kitchen closed" / morning reset)
// PUT /api/v1/staff/menu-items/bulk-toggle
export const bulkToggleAvailability = asyncHandler(async (req, res) => {
  const { hotelId, isAvailable, category } = req.body;

  if (!hotelId) {
    return res.status(400).json({ success: false, message: "Hotel ID is required" });
  }
  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({ success: false, message: "isAvailable (boolean) is required" });
  }

  await assertHotelAccess(req, hotelId);

  const filter = { hotel: hotelId };
  if (category) {
    if (!MENU_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${MENU_CATEGORIES.join(", ")}`,
      });
    }
    filter.category = category;
  }

  const result = await MenuItem.updateMany(filter, { $set: { isAvailable } });

  return res.status(200).json({
    success: true,
    message: `${result.modifiedCount} item(s) marked ${isAvailable ? "available" : "unavailable"}`,
    modifiedCount: result.modifiedCount,
  });
});