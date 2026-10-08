import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatElapsed, overdueLevel, OVERDUE_MINUTES } from '../src/features/staff/kitchen/pages/kitchenClock.js';

// QA session 05 (kitchen): ticket timers and overdue thresholds.
test('formatElapsed renders mm:ss under an hour and "Xh MMm" after', () => {
  assert.equal(formatElapsed(0), '00:00');
  assert.equal(formatElapsed(59_999), '00:59');
  assert.equal(formatElapsed(61_000), '01:01');
  assert.equal(formatElapsed(3_599_000), '59:59');
  assert.equal(formatElapsed(3_600_000 + 5 * 60_000), '1h 05m');
  assert.equal(formatElapsed(-5_000), '00:00', 'a device clock slightly ahead must not show negative time');
});

test('overdueLevel flags tickets by status thresholds', () => {
  const min = (m) => m * 60_000;
  assert.equal(overdueLevel('pending', min(4)), 'ok');
  assert.equal(overdueLevel('pending', OVERDUE_MINUTES.new.warn * 60_000), 'warn');
  assert.equal(overdueLevel('new', min(10)), 'late');
  assert.equal(overdueLevel('preparing', min(14)), 'ok');
  assert.equal(overdueLevel('preparing', min(15)), 'warn');
  assert.equal(overdueLevel('preparing', min(25)), 'late');
  assert.equal(overdueLevel('ready', min(10)), 'late');
  assert.equal(overdueLevel('delivered', min(999)), 'ok');
  assert.equal(overdueLevel('cancelled', min(999)), 'ok');
});
