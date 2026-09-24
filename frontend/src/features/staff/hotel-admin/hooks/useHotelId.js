import { useStaffAuth } from '../../../../core/context/StaffAuthContext';

/**
 * Robustly resolve the active hotel id for hotel-admin pages.
 *
 * Order of resolution:
 *  1. staffUser.activeProperty (object or id) from auth context
 *  2. staffUser.assignedProperties[0] (object or id) — many admins have
 *     assigned properties but no explicit activeProperty selected
 *  3. sessionStorage 'activeProperty' (set during login)
 *
 * Returns a string id or null. Mirrors the reception dashboard's resolver
 * so hotel-admin pages don't spuriously report "No hotel selected".
 */
const idOf = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v._id || v.id || null;
  return null;
};

export default function useHotelId() {
  const { staffUser } = useStaffAuth();

  // 1. active property
  const fromActive = idOf(staffUser?.activeProperty);
  if (fromActive) return fromActive;

  // 2. first assigned property
  const assigned = staffUser?.assignedProperties;
  if (Array.isArray(assigned) && assigned.length > 0) {
    const fromAssigned = idOf(assigned[0]);
    if (fromAssigned) return fromAssigned;
  }

  // 3. sessionStorage
  try {
    const stored = sessionStorage.getItem('activeProperty');
    if (stored) {
      const parsed = JSON.parse(stored);
      const fromStore = idOf(parsed);
      if (fromStore) return fromStore;
    }
  } catch {
    const raw = sessionStorage.getItem('activeProperty')?.replace(/"/g, '');
    if (raw) return raw;
  }

  return null;
}
