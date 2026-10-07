// Single role → dashboard map. Mirrored verbatim in backend/utils/staffRoleRoutes.js
// (the login redirectPath); frontend/tests/staffRoleRoutes.test.mjs fails if they drift.
export const STAFF_HOME_ROUTES = Object.freeze({
  owner: '/hoteladmin-dashboard',
  hoteladmin: '/hoteladmin-dashboard',
  admin: '/hoteladmin-dashboard',
  manager: '/hoteladmin-dashboard',
  receptionist: '/reception-dashboard',
  waiter: '/waiter-dashboard',
  chief: '/kitchen-dashboard',
  superadmin: '/superadmindashboard',
});

// Who may open each dashboard route (used by App.jsx route guards).
export const DASHBOARD_ROLES = Object.freeze({
  waiter: ['waiter'],
  kitchen: ['chief'],
  reception: ['receptionist', 'manager', 'admin', 'owner'],
  hotelAdmin: ['owner', 'hoteladmin', 'admin', 'manager'],
  superadmin: ['superadmin'],
});

export const staffHomeRoute = (role) => STAFF_HOME_ROUTES[String(role || '').toLowerCase()] || null;
