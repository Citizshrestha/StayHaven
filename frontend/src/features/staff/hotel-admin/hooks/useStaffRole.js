import { useStaffAuth } from '../../../../core/context/StaffAuthContext';

// Mirrors backend/controllers/hotelAdminAccess.js — UI gates only; the API
// enforces the same rules.
export const HOTEL_ADMIN_ROLES = ['owner', 'hoteladmin', 'admin', 'manager'];
export const TABLE_DELETE_ROLES = ['owner', 'hoteladmin', 'admin'];

/** Current staff role name (lower-case) or ''. */
export default function useStaffRole() {
  const { staffUser } = useStaffAuth();
  const role = staffUser?.role?.name || staffUser?.role || staffUser?.companyRole || '';
  return String(role).toLowerCase();
}
