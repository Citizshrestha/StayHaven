/* ============================================================================
 * stockApi — inventory service
 * ----------------------------------------------------------------------------
 * ⚠️  [NEEDS BACKEND]: There is no inventory endpoint yet. This module mirrors
 * the shape of roomApi.js/staffApi.js (promise-returning functions with the
 * same call signatures) so that swapping in the real REST endpoints later is a
 * one-file change — the StockManagement page never touches raw data directly.
 *
 * Until the backend exists, these functions operate on an in-memory seed and
 * resolve with a { data } envelope matching what the real axios layer returns.
 * NOTHING here persists across a page refresh; the page surfaces this clearly.
 * When the API lands, replace the bodies below with axios calls and delete the
 * MOCK section — the exported signatures stay identical.
 * ========================================================================== */

const MOCK_ITEMS = [
  { _id: '1', name: 'Chicken Breast', category: 'Meat & Poultry', quantity: 25, unit: 'kg', lowStockLevel: 10, criticalLevel: 5, unitCost: 350, supplier: 'Fresh Farms', notes: '' },
  { _id: '2', name: 'Basmati Rice', category: 'Grains & Cereals', quantity: 80, unit: 'kg', lowStockLevel: 20, criticalLevel: 10, unitCost: 120, supplier: 'Grain House', notes: '' },
  { _id: '3', name: 'Mineral Water 1L', category: 'Beverages', quantity: 8, unit: 'boxes', lowStockLevel: 15, criticalLevel: 5, unitCost: 600, supplier: 'AquaFresh', notes: '' },
  { _id: '4', name: 'Whole Milk', category: 'Dairy', quantity: 0, unit: 'L', lowStockLevel: 20, criticalLevel: 8, unitCost: 90, supplier: 'Dairy Direct', notes: '' },
  { _id: '5', name: 'Tomatoes', category: 'Vegetables & Fruits', quantity: 15, unit: 'kg', lowStockLevel: 10, criticalLevel: 4, unitCost: 80, supplier: 'Farm Fresh', notes: '' },
  { _id: '6', name: 'Dish Soap 5L', category: 'Cleaning Supplies', quantity: 12, unit: 'bottles', lowStockLevel: 6, criticalLevel: 2, unitCost: 450, supplier: 'CleanCo', notes: '' },
  { _id: '7', name: 'Bed Sheets (King)', category: 'Linen & Towels', quantity: 40, unit: 'pcs', lowStockLevel: 15, criticalLevel: 8, unitCost: 1200, supplier: 'Linen Works', notes: '' },
  { _id: '8', name: 'Cooking Oil 5L', category: 'Spices & Condiments', quantity: 4, unit: 'cans', lowStockLevel: 8, criticalLevel: 3, unitCost: 900, supplier: 'Golden Oil', notes: '' },
];

// Module-level store simulates a backend for the session only.
let store = MOCK_ITEMS.map((i) => ({ ...i }));
const clone = (arr) => arr.map((i) => ({ ...i }));
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

/** GET inventory items. Signature matches getRooms(params). */
export const getStockItems = async (/* params = {} */) => {
  await delay();
  return { data: { items: clone(store), isMock: true } };
};

/** POST create item. */
export const createStockItem = async (data) => {
  await delay();
  const item = { ...data, _id: Date.now().toString() };
  store = [...store, item];
  return { data: { item: { ...item }, isMock: true } };
};

/** PUT update item. */
export const updateStockItem = async (itemId, data) => {
  await delay();
  store = store.map((i) => (i._id === itemId ? { ...i, ...data } : i));
  return { data: { item: store.find((i) => i._id === itemId), isMock: true } };
};

/** DELETE item. */
export const deleteStockItem = async (itemId) => {
  await delay();
  store = store.filter((i) => i._id !== itemId);
  return { data: { success: true, isMock: true } };
};

/** PATCH adjust quantity — mode: 'add' | 'remove' | 'set'. */
export const adjustStockQuantity = async (itemId, mode, amount) => {
  await delay();
  const qty = Number(amount) || 0;
  store = store.map((i) => {
    if (i._id !== itemId) return i;
    let next = i.quantity;
    if (mode === 'add') next = i.quantity + qty;
    else if (mode === 'remove') next = Math.max(0, i.quantity - qty);
    else next = qty;
    return { ...i, quantity: next };
  });
  return { data: { item: store.find((i) => i._id === itemId), isMock: true } };
};
