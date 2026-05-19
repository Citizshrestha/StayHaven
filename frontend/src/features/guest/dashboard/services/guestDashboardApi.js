/**
 * @deprecated This module is a thin compatibility shim.
 *
 * The original implementation here duplicated the guest-portal API client and
 * used a `guestToken` localStorage key that is never actually set anywhere in
 * the codebase, which caused requests made through it to silently fall back to
 * unauthenticated mode.
 *
 * All exports now forward to the canonical client at
 *   `features/guest/dashboard/guestDashboardApi.js`
 * which uses the shared `axiosClient` (correct `accessToken` auth, CSRF,
 * token-refresh interceptors, and the proper `/api/v1/guest/portal` base path).
 *
 * 👉 New code should import directly from `../guestDashboardApi`.
 *    This file can be deleted once any external/legacy importers are gone.
 */

// Re-export everything from the canonical client. The named aliases below are
// kept so the historical surface (`getBookings`, `getMenu`, `getOrders`, etc.)
// stays compatible with anything that may still import from this path.
export * from '../guestDashboardApi';

import {
  getGuestBookings,
  getGuestMenu,
  getGuestOrders,
  getGuestInvoices,
  getGuestRequests,
  getUserProfile,
  updateUserProfile,
  getDashboardOverview,
} from '../guestDashboardApi';

// ──────────────────────────────────────────────────────────────────────
// Legacy aliases — kept for backwards compatibility only.
// `export *` above already forwards every canonical name; the lines below
// add the original non-prefixed names this shim used to expose.
// ──────────────────────────────────────────────────────────────────────
export const getGuestDashboard = getDashboardOverview;
export const getBookings       = getGuestBookings;
export const getMenu           = getGuestMenu;
export const getOrders         = getGuestOrders;
export const getInvoices       = getGuestInvoices;
export const getRequests       = getGuestRequests;
export const getProfile        = getUserProfile;
export const updateProfile     = updateUserProfile;
// `payForOrder` was the historical name for `payOrder`; re-export under both.
export { payOrder as payForOrder } from '../guestDashboardApi';
