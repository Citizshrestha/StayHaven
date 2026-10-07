import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as frontend from '../src/core/routes/staffRoleRoutes.js';
import * as backend from '../../backend/utils/staffRoleRoutes.js';

test('backend login redirect map and frontend route map are identical', () => {
  assert.deepEqual({ ...frontend.STAFF_HOME_ROUTES }, { ...backend.STAFF_HOME_ROUTES });
});

test('every staff role lands on a dashboard that admits it (no redirect loops, no 404 routes)', () => {
  const routeKey = {
    '/waiter-dashboard': 'waiter', '/kitchen-dashboard': 'kitchen', '/reception-dashboard': 'reception',
    '/hoteladmin-dashboard': 'hotelAdmin', '/superadmindashboard': 'superadmin',
  };
  for (const [role, route] of Object.entries(frontend.STAFF_HOME_ROUTES)) {
    assert.ok(routeKey[route], `${role} → ${route} is not a dashboard route`);
    assert.ok(frontend.DASHBOARD_ROLES[routeKey[route]].includes(role), `${route} must admit ${role}`);
  }
  assert.equal(frontend.staffHomeRoute('guest'), null);
  assert.equal(frontend.staffHomeRoute('Manager'), '/hoteladmin-dashboard');
});
