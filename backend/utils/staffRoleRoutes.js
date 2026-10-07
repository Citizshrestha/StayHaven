// Single role → dashboard map. Mirrored verbatim in
// frontend/src/core/routes/staffRoleRoutes.js; frontend/tests/staffRoleRoutes.test.mjs
// fails if the two copies drift apart.
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

// Roles that may sign in through /api/v1/staff/login and use staff-only APIs.
export const STAFF_ROLES = Object.freeze(Object.keys(STAFF_HOME_ROUTES));

export const staffHomeRoute = (role) => STAFF_HOME_ROUTES[String(role || '').toLowerCase()] || null;
