import { MenuItem } from "../models/menuItem.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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