# Repo cleanup report

In-place cleanup done per `.agents/tasks/cleanup-plan.md`, Steps A–G. Nothing was committed, stashed, reset, checked out or cleaned. The build override `ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD=true` was needed for every build: the baseline build fails without it, only because of the existing sandbox-Stripe-key guard (`frontend/.env.production` has a `pk_test_` key). This is unchanged behavior.

## Files deleted

Step B (temp/stray files):
- Root: `backend-dev.err.log`, `backend-dev.log`, `desktop.ini`, `filter_msg.py`, `msg-callback.py`, `msg-filter.py`, `remove-coauthor.ps1`, `install-git-hooks.bat`, `.gitignore-frontend`, `index.html`. The root `index.html` had the same SHA256 as `frontend/index.html`. I moved it to a backup first, the root build passed without it, and then I deleted the backup.
- Frontend: `frontend/build.log`, `frontend/FINAL_SUMMARY.md`, `frontend/fix-vite-cache.bat`, `frontend/fix-vite-cache.sh`, `frontend/dist/`, `frontend/.vite/`.
- Backend: `Backend/backend.log`, `Backend/_dbdiag.mjs`, `Backend/check_recep.mjs`, and the stray `Backend/frontend/` folder. That folder held an older copy of `guestDashboardApi.js` (110 lines, versus 207 in the real file) and `pages/RequestsView.jsx`. The real files in `frontend/src/features/guest/dashboard` are untouched.
- No hits for any of these names in package.json scripts, `.githooks/`, vite/eslint/vercel configs, READMEs or `frontend/index.html`.

Step C (root markdown): `auditCheck.md`, `DEFERRED_DECISIONS.md`, `emergent-security-prompts (1) (1).md`, `FINAL_AUDIT_SUMMARY.md`, `guestRedesign.md`, `hotelAdminRedesign.md`, `MASTERPROMPT_UX_PAYMENT_AUDIT.md`, `PROJECT_AUDIT.md`.

Step D (163 unreachable frontend files, all under `frontend/src/`):
- `components/ui/*`: all 54 files.
- `shared/ui/*`: 53 files. Everything except `button.jsx`, `GoogleConfirmModal.jsx` and `ThemeToggle.jsx`.
- `api/hotel.js`, `api/seedData.js`, `api/user.js`
- `app/App.css`, `assets/styles/App.css`, `assets/styles/index.css`
- `components/PasswordStrengthIndicator.jsx` + `.module.css`, `components/PaymentModal/StripePaymentModal.jsx`
- `config/roles.config.js`
- `context/NotificationContext.jsx`, `context/OrderContext.jsx`, `context/OrderContextDef.js`, `context/ThemeContext.jsx`
- `core/api/services/payment.service.js`, `core/api/services/qr.service.js`, `core/hooks/useAutoRefresh.js`, `core/utils/sampleHotels.js`
- `features/public/hotels/components/AvailabilityCalendar.jsx` + `.module.css`, `features/public/hotels/pages/FeaturedHotels.jsx`, `features/public/hotels/pages/HotelDetail/hotelDetailMockData.js`, `features/public/hotels/pages/HotelDetails.jsx`
- `features/public/landing/components/Categories.jsx`, `features/public/landing/components/FeaturedHotels.jsx`, `features/public/landing/pages/Membership.jsx` + `.css`
- `features/staff/hotel-admin/components/SeedDataButton.jsx`, `features/staff/kitchen/pages/KitchenSettings.jsx`
- `features/staff/reception/`: `components/BulkOperations.jsx` + `.css`, `components/ExportButton.jsx` + `.css`, `components/GuestCommunicationModal.css`, `components/GuestRow.jsx`, `components/Sparkline.jsx`, `context/ReceptionContext.jsx`, `pages/DashboardContent.css`, `pages/MaintenanceView.jsx` + `.css`, `pages/MobileBottomNav.css`, `pages/Sidebar.css`, `services/batchApi.js`, `services/exportApi.js`, `services/maintenanceApi.js`, `styles/dashboard-theme.css`
- `features/staff/superadmin/pages/AddHotel.jsx` + `.css`, `features/staff/superadmin/pages/BookingManagement.jsx` + `.css`
- `features/staff/waiter/pages/settings/WaiterSettings.jsx`
- `hooks/useAutoRefresh.js`, `shared/components/PaymentModal.jsx`
- `utils/allProperties.js`, `utils/dateConverter.js`, `utils/sampleHotels.js`

Folders left empty and removed: `assets/` (including `assets/styles`), `components/ui`, `components/PaymentModal`, `config/`, `features/public/landing/components`, and `features/staff/reception/{context,services,styles}`.

I also ran a path-reference grep on every candidate across `frontend/src`, `frontend/public`, `frontend/tests` and `frontend/index.html`. Every hit pointed to a different file with the same name (for example `core/context/*`, `shared/ui/button`, `WaiterSettings.css`, `./Sidebar` meaning `Sidebar.jsx`). None of the deleted files is referenced.

Step E (re-export shims; importers were repointed to the core file first):
- `axiosClient.js` → `core/api/client.js`
- `api/auth.js` → `core/api/services/auth.service.js` (the bodies are identical; only the client import path differed)
- `context/SocketContext.jsx`, `context/StaffAuthContext.jsx`, `context/useNotifications.js`, `context/useOrderContext.js` → `core/context/*`
- `hooks/useTheme.js`, `hooks/useClickOutSide.js`, `hooks/useNotificationSound.js`, `hooks/useRelativeTime.js` → `core/hooks/*`

## Files moved (old → new)

| Old | New |
|---|---|
| `PAYMENT_GATEWAY_GO_LIVE.md` | `docs/PAYMENT_GATEWAY_GO_LIVE.md` |
| `TEST_KHALTI_PAYMENT.md` | `docs/TEST_KHALTI_PAYMENT.md` |
| `frontend/src/hooks/useContent.js` | `frontend/src/core/hooks/useContent.js` |
| `frontend/src/utils/apiConfig.js` | `frontend/src/core/utils/apiConfig.js` |
| `frontend/src/utils/csrf.js` | `frontend/src/core/utils/csrf.js` |
| `frontend/src/api/staff.js` | `frontend/src/core/api/services/staffAccount.service.js` |
| `frontend/src/api/qrService.js` | `frontend/src/core/api/services/guestQr.service.js` |
| `frontend/src/api/publicBooking.js` | `frontend/src/core/api/services/publicBooking.service.js` |
| `frontend/src/components/ConfirmDialog.jsx` + `.css` | `frontend/src/shared/components/ConfirmDialog.jsx` + `.css` |
| `frontend/src/components/ErrorBoundary.jsx` + `.module.css` | `frontend/src/shared/components/ErrorBoundary.jsx` + `.module.css` |
| `frontend/src/components/LeadershipTestimonials.jsx` | `frontend/src/shared/components/LeadershipTestimonials.jsx` |
| `frontend/src/components/shared/ItemCarousel.jsx` | `frontend/src/shared/components/ItemCarousel.jsx` |
| `frontend/src/components/shared/StaffSettings.jsx` | `frontend/src/shared/components/StaffSettings.jsx` |
| `frontend/src/services/notificationSoundService.js` | `frontend/src/core/services/notificationSoundService.js` |
| `frontend/src/lib/utils.js` | `frontend/src/core/utils/cn.js` |

How importers were updated:
- Every importer (relative paths and `@/`) was rewritten by a resolver-based script. It resolves each specifier to a real file and recomputes the path from the importer's own folder. The moved files' own imports were fixed for their new depth.
- `frontend/tests/walletPayments.test.mjs`: only the path strings changed (`core/api/services/publicBooking.service.js` and the `'../client'` / `'../../../core/api/services/publicBooking.service'` stub keys).
- Other edits:
  - `frontend/jsconfig.json` `paths` reduced to `"@/*": ["./*"]`. The removed aliases pointed at deleted folders and no code used them.
  - The `README.md` folder tree now shows the new `src/` layout.

`frontend/src` now contains only `app/`, `core/`, `features/`, `shared/`, `main.jsx` and `index.css`.

## Files kept despite the plan, and why

- `shared/ui/button.jsx`, `shared/ui/GoogleConfirmModal.jsx`, `shared/ui/ThemeToggle.jsx` are reachable (for example, `shared/layout/Navbar.jsx` imports `../ui/button`).
- `lib/utils.js` (`cn`) is reachable from `shared/ui/button.jsx` and 20 files in guest-dashboard. It was moved to `core/utils/cn.js`, not deleted.
- `features/staff/waiter/pages/settings/WaiterSettings.css` is imported by `shared/components/StaffSettings.jsx`.
- Two API pairs that differ were both kept under different names:
  - `api/staff.js` → `staffAccount.service.js`, next to `staff.service.js`. They have different `getOrders` defaults, and `updateStaffProfile` exists only in this one.
  - `api/qrService.js` → `guestQr.service.js`. Its old twin `qr.service.js` was unreachable and deleted in Step D.
- `docs/PAYMENT_GATEWAY_GO_LIVE.md` line 117 mentions the deleted `PROJECT_AUDIT.md` in prose. It is not a link, so I left it as is.
- `frontend/src/features/staff/hotel-admin/hooks/useHotelId.js` is in use and untouched.

## Uncommitted work affected

The uncommitted edits in these files survive at their new paths: `api/publicBooking.js`, `api/qrService.js`, `components/shared/StaffSettings.jsx`, `services/notificationSoundService.js`.

These four files were on the spec's deletion list, were unreachable, and had uncommitted modifications (` M` in the baseline): `features/public/landing/pages/Membership.jsx`, `features/staff/kitchen/pages/KitchenSettings.jsx`, `features/staff/waiter/pages/settings/WaiterSettings.jsx`, `utils/allProperties.js`. They were deleted as instructed. Only their HEAD versions can be recovered (`git show HEAD:<path>`).

`frontend/checklist.tmp.mjs` was untracked in the baseline and is now missing. It was not on any delete list and none of my commands targeted it. It was a temp file and nothing references it.

## Worktrees

- Removed (clean): `.kilo/worktrees/congruous-shop`.
- Pruned (stale entries): Cursor `jnM9b`, `Q7tmt`, `yeMio`, and `copilot-worktree-2026-03-13T09-32-36`.
- Left in place (dirty, no force used):
  - `.claude/worktrees/agent-a56cf19fed05696f1`: modified `.claude/settings.local.json` and `HoteladminDashboard.jsx`; untracked `NotificationsManagement.jsx`.
  - `.claude/worktrees/agent-a92554d65cf970652`: modified `.claude/settings.local.json`; untracked `ReportsAnalytics.jsx`.
- No branches were deleted, and the tool folders are still on disk.

## .gitignore and the git index

- Added to `.gitignore`: `.claude/`, `.cursor/`, `.kilo/`, `.kombai/`, `.openclaude/`, `.orchids/`, `.qodo/`, `.sixth/`, `frontend/dist/`, `frontend/.vite/`, `desktop.ini`. `*.log` and `dist/` were already there. No existing rules were removed, and `.kiro/` and `.vscode/` are not ignored.
- `git rm -r --cached .orchids` removed `.orchids/orchids.json` from the index only. The file is still on disk.

## Verification (commands and results)

| Check | Command | Baseline | Final |
|---|---|---|---|
| Build | `$env:ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD='true'; npm run build` (repo root) | exit 0, `dist/` 31,321 KB | exit 0, `dist/index.html` present, `dist/` 31,270 KB |
| Lint | `cd frontend; npx eslint src` | 78 problems (55 errors, 23 warnings) | 18 problems (0 errors, 18 warnings); comparison script reports `0 new errors` |
| Reachability | `node C:\Users\user\AppData\Local\Temp\reach.mjs frontend/src frontend/src/main.jsx frontend/src` | 266 reachable / 429 total / 163 unreachable / 0 broken / 124 legacy-root imports | 256 / 256 / 0 / 0 broken / 0 legacy-root imports; no computed-import warnings |
| Wallet test | `node --test frontend/tests/walletPayments.test.mjs` | 8 pass / 0 fail | 8 pass / 0 fail |
| Backend syntax | `node --check Backend/server.js` | | exit 0 |
| Backend import | `node -e "import('./server.js')…"` (in `Backend/`) | | No `ERR_MODULE_NOT_FOUND` or `SyntaxError`. It logged `MongoDB Connected Successfully` and kept running, so I stopped it after 25 s. |
| Git status | `git status --short` | 220 entries | 450 entries |

About the lint numbers: 23 → 18 warnings and 55 → 0 errors because all the errors were in deleted files.

About the git status count: it went up because of the planned `D` deletions plus the new `??` paths for moved files. Every baseline entry is still present except the deleted or moved paths listed above. `.claude/agents/`, `.claude/settings/`, `.claude/system-prompts/` and `.openclaude/` no longer show because they are now ignored; they are still on disk.

Required files confirmed present: `Backend/services/guestOrderAlerts.js`, `Backend/controllers/guestMessagingController.js`, `frontend/src/core/audio/alertSounds.js`, `frontend/src/features/guest/dashboard/pages/ChatView.jsx`, `frontend/src/features/staff/hotel-admin/hooks/useHotelId.js`, `credentials.md`, `PAYMENT_TEST_CREDENTIALS.md`.

After each Step E phase I ran a grep for the old path segments (`../context/`, `../hooks/`, `../utils/apiConfig|csrf`, `../api/`, `axiosClient'`, `components/(ConfirmDialog|…|shared/)`, `notificationSoundService`, `lib/utils`). The only remaining matches are paths that point into `core/` (for example `core/context` → `../api/services/...`) and feature-local `hooks/` folders. The resolver confirms all of these resolve correctly.

Temp files created during the run (`reach.mjs`, `reach2-test.mjs`, `eslint-compare.mjs`, `namegrep.mjs`, `relocate.mjs`, `verify.ps1`, the `plan-e*.json` files, and the baseline/now outputs) were deleted from `%TEMP%` at the end.
