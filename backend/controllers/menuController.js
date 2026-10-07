import { MenuItem } from "../models/menuItem.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { HOTEL_ADMIN_ROLES, assertHotelAccess, isValidId } from "./hotelAdminAccess.js";

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

// Builds a whitelisted update/create payload from the request body.
// preparationTime "" / null clears the field (returned as `null`).
const pickMenuFields = (body) => {
  const payload = {};
  for (const key of MENU_WRITABLE_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  if (typeof payload.name === "string") payload.name = payload.name.trim();
  if (typeof payload.description === "string") payload.description = payload.description.trim();
  if (payload.price !== undefined) payload.price = payload.price === "" ? NaN : Number(payload.price);
  if (payload.preparationTime === "" || payload.preparationTime === null || payload.preparationTime === "null") {
    payload.preparationTime = null;
  } else if (payload.preparationTime !== undefined) {
    payload.preparationTime = Number(payload.preparationTime);
  }
  // Multipart form-data sends booleans as strings
  if (typeof payload.isAvailable === "string") payload.isAvailable = payload.isAvailable === "true";
  if (typeof payload.isVeg === "string") payload.isVeg = payload.isVeg === "true";
  return payload;
};

// Field-level validation shared by create and update. Returns an error message or null.
const validateMenuPayload = (payload) => {
  if (payload.name !== undefined && (typeof payload.name !== "string" || payload.name.length > 100)) {
    return "Item name must be 100 characters or fewer";
  }
  if (payload.description !== undefined && (typeof payload.description !== "string" || payload.description.length > 500)) {
    return "Description must be 500 characters or fewer";
  }
  if (payload.price !== undefined) {
    if (Number.isNaN(payload.price) || payload.price < 0 || payload.price > 1_000_000) {
      return "Price must be between 0 and 1,000,000";
    }
    if (Math.round(payload.price * 100) !== payload.price * 100) return "Price can have at most 2 decimals";
  }
  if (payload.preparationTime !== undefined && payload.preparationTime !== null) {
    const t = payload.preparationTime;
    if (!Number.isInteger(t) || t < 5 || t > 120) return "Preparation time must be a whole number between 5 and 120 minutes";
  }
  if (payload.image !== undefined && payload.image !== null && typeof payload.image !== "string") {
    return "Image must be a URL";
  }
  return null;
};

// Applies the payload, turning a cleared preparationTime into an unset field.
const applyMenuPayload = (doc, payload) => {
  const { preparationTime, ...rest } = payload;
  Object.assign(doc, rest);
  if (preparationTime === null) doc.preparationTime = undefined;
  else if (preparationTime !== undefined) doc.preparationTime = preparationTime;
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

  // Staff may only read menus of hotels they are assigned to
  await assertHotelAccess(req, hotelId);

  const filter = {
    hotel: hotelId,
  };

  if (typeof category === "string" && category) {
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
  const invalid = validateMenuPayload(payload);
  if (invalid) return res.status(400).json({ success: false, message: invalid });

  // Verify the staff member may manage this hotel's menu
  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  // Optional image upload (multipart form-data with an "image" file field)
  if (req.file) {
    payload.image = await uploadMenuImage(req.file.buffer, hotel._id.toString());
  }

  const menuItem = new MenuItem({ hotel: hotel._id });
  applyMenuPayload(menuItem, payload);
  await menuItem.save();

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

  if (!isValidId(itemId)) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }
  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }

  // Ownership: staff can only touch items belonging to a hotel they manage
  await assertHotelAccess(req, menuItem.hotel, { roles: HOTEL_ADMIN_ROLES });

  const payload = pickMenuFields(req.body);

  if (payload.name !== undefined && !payload.name) {
    return res.status(400).json({ success: false, message: "Item name is required" });
  }
  if (payload.category !== undefined && !MENU_CATEGORIES.includes(payload.category)) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${MENU_CATEGORIES.join(", ")}`,
    });
  }
  const invalid = validateMenuPayload(payload);
  if (invalid) return res.status(400).json({ success: false, message: invalid });

  // Optional image replacement (multipart form-data with an "image" file field)
  if (req.file) {
    payload.image = await uploadMenuImage(req.file.buffer, menuItem.hotel.toString());
  }

  // hotel is intentionally not writable — items never move between hotels
  applyMenuPayload(menuItem, payload);
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

  if (!isValidId(itemId)) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }
  const menuItem = await MenuItem.findById(itemId);
  if (!menuItem) {
    return res.status(404).json({ success: false, message: "Menu item not found" });
  }

  await assertHotelAccess(req, menuItem.hotel, { roles: HOTEL_ADMIN_ROLES });

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
    if (!entry?.id || !isValidId(entry.id) || typeof entry.displayOrder !== "number" || !Number.isFinite(entry.displayOrder)) {
      return res.status(400).json({
        success: false,
        message: "Each entry must have an id and a numeric displayOrder",
      });
    }
  }

  await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

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

  await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

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