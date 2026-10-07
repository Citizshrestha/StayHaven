# Findings from the aborted first run (wf_8770935211264850, base a9c7843)

These came from code reading only (nothing was verified in the browser). The next run's sessions should re-check them against the new base.

## Reception (session 03)
- Stored XSS through activity-log descriptions: `frontend/src/features/staff/reception/pages/DashboardContent.jsx:1091`, `ReportsView.jsx:407`.
- Cross-tenant reads through `?companyId=` in `getCtx`: `receptionController.js:19-26`.
- Aggregates are company-wide instead of the active hotel.
- Most `findById` writes have no hotel/company ownership check.
- Unescaped regex in search.
- Fabricated staff ratings and report trend values.

## Waiter (session 04)
- At commit a9c7843 the build fails because `frontend/src/features/public/hotels/pages/SavedHotels.jsx` was untracked (REQ-waiter-1). Make sure the new base commit includes all untracked source files.
- At a9c7843 the backend had no test scripts (REQ-waiter-2).
- Baseline lint at a9c7843: 512 problems (485 errors), 11 of them in waiter files.
- There's no local `mongod` on this machine, so sessions must start `mongodb-memory-server` themselves.

## Hotel admin (session 02)
- At a9c7843 the hotel-admin frontend calls menu create/update/delete and staff-manage endpoints that only exist in the uncommitted work.
