/**
 * Status → tone mapping — single source of truth for §2.4 status badges.
 * Kept in its own module (not the Badge component file) so fast-refresh
 * only-export-components stays happy.
 */
export const STATUS_TONE = {
  // success family
  available: 'success', delivered: 'success', paid: 'success', active: 'success',
  completed: 'success', fulfilled: 'success', resolved: 'success', open: 'success',
  'in stock': 'success', instock: 'success', approved: 'success',
  // warning family
  'low stock': 'warning', lowstock: 'warning', pending: 'warning', preparing: 'warning',
  maintenance: 'warning', processing: 'warning', ready: 'warning',
  // danger family
  critical: 'danger', 'out of stock': 'danger', outofstock: 'danger',
  cancelled: 'danger', canceled: 'danger', overdue: 'danger', inactive: 'danger',
  blacklisted: 'danger', failed: 'danger', unpaid: 'danger',
  // info family
  confirmed: 'info', occupied: 'info',
  // neutral family
  draft: 'neutral', ignored: 'neutral',
};

export function toneForStatus(status) {
  if (!status) return 'neutral';
  return STATUS_TONE[String(status).toLowerCase().trim()] || 'neutral';
}
