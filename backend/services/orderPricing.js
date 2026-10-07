/**
 * orderPricing.js — the one place order lines are validated and priced.
 *
 * Used by every order-creation path (QR guests, the guest portal and staff),
 * so the rules can never drift between them again:
 *   - menu lines are priced from THIS hotel's menu; client prices are ignored
 *   - unavailable dishes are refused
 *   - quantities are whole numbers within the path's limit
 *   - notes are text, at most NOTE_MAX characters
 *   - open-priced custom lines exist only when the caller allows them
 *     (staff supervisors); everyone else gets a 400/403
 * All menu items are fetched in a single query.
 */

import mongoose from "mongoose";
import { MenuItem } from "../models/menuItem.schema.js";
import { AppError } from "../middleware/errorHandler.js";

export const NOTE_MAX = 200;
export const DEFAULT_MAX_LINES = 50;
export const DEFAULT_MAX_QUANTITY = 50;
const CUSTOM_PRICE_MAX = 1000000;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * @param {object}  args
 * @param {string}  args.hotelId
 * @param {Array}   args.items         [{ menuItem, quantity, notes } | { name, price, quantity, notes }]
 * @param {number} [args.maxLines]
 * @param {number} [args.maxQuantity]
 * @param {"deny"|"forbid"|"allow"} [args.customLines]
 *        deny   → custom lines are malformed input (400)      — guests
 *        forbid → custom lines need a supervisor (403)         — waiters etc.
 *        allow  → custom lines accepted with a validated price — managers/owners
 * @returns {Promise<{ items: object[], totalPrice: number }>}
 * @throws  {AppError} with a client-safe message and status
 */
export const priceMenuLines = async ({
  hotelId,
  items,
  maxLines = DEFAULT_MAX_LINES,
  maxQuantity = DEFAULT_MAX_QUANTITY,
  customLines = "deny",
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Add at least one item to the order", 400);
  }
  if (items.length > maxLines) {
    throw new AppError(`An order can contain at most ${maxLines} lines`, 400);
  }

  // Shape checks first, so nothing touches the database for bad input.
  for (const item of items) {
    if (!item || typeof item !== "object") throw new AppError("Invalid order line", 400);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > maxQuantity) {
      throw new AppError(`Each item needs a whole-number quantity between 1 and ${maxQuantity}`, 400);
    }
    if (item.notes != null && (typeof item.notes !== "string" || item.notes.length > NOTE_MAX)) {
      throw new AppError(`Item notes must be text under ${NOTE_MAX} characters`, 400);
    }
    if (item.menuItem != null && item.menuItem !== "") {
      if (!mongoose.isValidObjectId(item.menuItem)) throw new AppError("Invalid menu item", 400);
    } else if (customLines === "deny") {
      throw new AppError("Each item must reference a dish on the menu", 400);
    } else if (customLines === "forbid") {
      throw new AppError("Only a manager can add an item that is not on the menu", 403);
    } else {
      const price = Number(item.price);
      if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 100 ||
          typeof item.price === "boolean" || !Number.isFinite(price) || price < 0 || price > CUSTOM_PRICE_MAX) {
        throw new AppError("Custom items need a name and a valid price", 400);
      }
    }
  }

  const ids = [...new Set(items.filter((i) => i.menuItem).map((i) => String(i.menuItem)))];
  const menu = ids.length
    ? await MenuItem.find({ _id: { $in: ids }, hotel: hotelId }).select("name price isAvailable").lean()
    : [];
  const byId = new Map(menu.map((m) => [String(m._id), m]));

  let total = 0;
  const priced = items.map((item) => {
    const notes = typeof item.notes === "string" ? item.notes.trim() : "";
    if (item.menuItem) {
      const dish = byId.get(String(item.menuItem));
      // Scoped to the hotel: another property's item (and price) is never accepted.
      if (!dish) throw new AppError("Menu item not found or not available at this restaurant", 404);
      if (!dish.isAvailable) throw new AppError(`${dish.name} is currently not available`, 400);
      total += dish.price * item.quantity;
      return { menuItem: dish._id, name: dish.name, quantity: item.quantity, price: dish.price, notes };
    }
    const price = round2(Number(item.price));
    total += price * item.quantity;
    return { name: item.name.trim(), quantity: item.quantity, price, notes };
  });

  return { items: priced, totalPrice: round2(total) };
};

/** Express helper: turn a pricing AppError into the JSON error response. */
export const sendPricingError = (res, err) =>
  res.status(err.statusCode || 400).json({ success: false, message: err.message });
