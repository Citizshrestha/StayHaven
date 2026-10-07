/**
 * Status → tone mapping — single source of truth for §2.4 status badges.
 * Kept in its own module (not the Badge component file) so fast-refresh
 * only-export-components stays happy.
 */
// Cross-dashboard contract: pending = amber, confirmed = blue,
// preparing = indigo, ready = green, delivered/served/completed = neutral,
// cancelled/failed = red, paid = green, unpaid = amber.
export const STATUS_TONE = {
  // success family (green)
  available: 'success', paid: 'success', active: 'success', ready: 'success',
  fulfilled: 'success', resolved: 'success', open: 'success',
  'in stock': 'success', instock: 'success', approved: 'success', clean: 'success',
  // warning family (amber)
  'low stock': 'warning', lowstock: 'warning', pending: 'warning', unpaid: 'warning',
  maintenance: 'warning', processing: 'warning', partial: 'warning', invited: 'warning',
  cleaning: 'warning',
  // accent (indigo)
  preparing: 'accent',
  // danger family (red)
  critical: 'danger', 'out of stock': 'danger', outofstock: 'danger',
  cancelled: 'danger', canceled: 'danger', overdue: 'danger', inactive: 'danger',
  blacklisted: 'danger', failed: 'danger', deactivated: 'danger', refunded: 'danger',
  // info family (blue)
  confirmed: 'info', occupied: 'info', reserved: 'info',
  // neutral family
  delivered: 'neutral', served: 'neutral', completed: 'neutral',
  draft: 'neutral', ignored: 'neutral', closed: 'neutral',
};

export function toneForStatus(status) {
  if (!status) return 'neutral';
  return STATUS_TONE[String(status).toLowerCase().trim()] || 'neutral';
}
