# Repo Cleanup Implementation Plan

Repo: `d:\hotel-booking-order-management-system` (Windows, PowerShell). All commands run from repo root unless a `cwd` is stated. `$env:TEMP` = `C:\Users\user\AppData\Local\Temp`.

## Ground rules (apply to every step)

- NEVER commit, stash, reset, checkout, `git clean`, or `git restore`. ~216 uncommitted changes (real feature work) must survive. Only plain `Remove-Item` / `Move-Item` and in-file import edits.
- Exclude `.claude/worktrees/**`, `.kilo/worktrees/**`, `node_modules` from every search. Scope greps to `frontend/src`, `frontend/index.html`, `frontend/public`, `frontend/tests`, `Backend` (excluding `Backend/node_modules`), root config files.
- Do NOT touch: root `package.json`, root `vite.config.js`, root `eslint.config.js`, `vercel.json`, `frontend/vite.config.js`, `frontend/package.json`, `.githooks/`, root `dist/`, any `.env*`, `credentials.md`, `PAYMENT_TEST_CREDENTIALS.md`, `Backend/scripts/*`, `frontend/tests/walletPayments.test.mjs` (except the path update in E4), Backend source layout.
- Idempotency: every delete uses `Remove-Item -LiteralPath <p> -Force -ErrorAction SilentlyContinue` (folders add `-Recurse`); every move first checks `Test-Path` of source and destination. Re-running a step must be a no-op.
- After every step: build must pass. If it fails, undo that step's moves with `Move-Item` back (deleted files are recoverable only via `git show HEAD:<path>` for tracked files — so for Step D/E delete only after the grep checks pass).
- Use `-LiteralPath` for any path with spaces/parentheses.

## Facts discovered during planning (rely on these, don't re-derive)

- Build: root `npm run build` = `vite build --mode production`, root `./frontend`, out `../dist`. The build has a guard that throws if `frontend/.env.production` gives a `pk_test_` Stripe key. If baseline fails ONLY for that reason, use `$env:ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD='true'` for baseline and every later build, and record it in the report.
- ESLint baseline (`cd frontend; npx eslint src`): 78 problems (55 errors, 23 warnings). Exit code 1 is expected.
- Test: `frontend/tests/walletPayments.test.mjs` reads `src/api/publicBooking.js`, `src/features/guest/dashboard/guestDashboardApi.js`, `src/features/public/payment/PaymentCallback.jsx` by path and stubs import specifiers by string (`'../core/api/client'`, `'../../../api/publicBooking'`). Run with `node --test frontend/tests/walletPayments.test.mjs`.
- `frontend/src` has NO `@/` imports outside `components/ui/*` and `shared/ui/*`, except `shared/ui/button.jsx` (`@/lib/utils`).
- Reachability (current): 266 reachable / 429 total / 163 unreachable / 0 broken.
- CORRECTION to the spec list: `shared/ui/button.jsx` IS reachable (`shared/layout/Navbar.jsx` imports `../ui/button`). Also `shared/ui/GoogleConfirmModal.jsx` and `shared/ui/ThemeToggle.jsx` are reachable. KEEP all three. Consequently `lib/utils.js` IS used (by `shared/ui/button.jsx` and ~20 files in `features/guest/dashboard/**`) — keep it (moved in E7).
- Root `index.html` is byte-identical to `frontend/index.html` (SHA256 `44D576CB…4188`) and unused by the build (root is `./frontend`). `vercel.json`'s `/index.html` is the dist rewrite, not this file.
- Tracked files among deletions: `.gitignore-frontend`, `desktop.ini`, `index.html`, `install-git-hooks.bat`, `Backend/frontend/**`, `frontend/.vite/deps/*` (2 files). Deleting them shows as `D` in git status — expected.
- `.gitignore-frontend` is identical in content to `frontend/.gitignore` (redundant).
- Worktrees: `.claude/worktrees/agent-a56cf19fed05696f1` (3 dirty entries), `.claude/worktrees/agent-a92554d65cf970652` (2 dirty) → leave. `.kilo/worktrees/congruous-shop` clean → remove. Three Cursor worktrees + one Copilot worktree are `prunable`.
- `frontend/jsconfig.json` has editor-only path aliases (`components/*`, `context/*`, `api/*`, `utils/*`, `shared/*`) that no code uses.
- Backend is ESM (`"type": "module"`).

## Legacy-root importer map (pre-cleanup, used by Step E)

| Legacy file | Kind | Live importers (after Step D) |
|---|---|---|
| `axiosClient.js` | re-export of `core/api/client` | api/auth.js, api/qrService.js, components/shared/StaffSettings.jsx, features/staff/reception/components/BulkCheckInModal.jsx, …/reception/components/GuestCommunicationModal.jsx, …/reception/pages/ActionModals.jsx, features/staff/waiter/pages/AssignedAreas.jsx, …/waiter/pages/WaiterCallsPanel.jsx |
| `context/StaffAuthContext.jsx`, `SocketContext.jsx`, `useNotifications.js`, `useOrderContext.js` | re-exports of `core/context/*` | StaffAuthContext: 13 files (StaffSettings, AuthPage, KitchenDashboard, kitchen Sidebar, reception DashboardContent/ReceptionDashboard/ReceptionOrdersView/ReceptionSettings/Sidebar, SuperAdminLayout, waiter order/OrderCard, waiter Sidebar); SocketContext: WaiterCallsPanel; useNotifications: waiter RightPanel; useOrderContext: waiter OrderFormModal |
| `hooks/useTheme.js`, `useClickOutSide.js`, `useNotificationSound.js`, `useRelativeTime.js` | re-exports of `core/hooks/*` | useTheme: 18 files (components/ConfirmDialog, StaffSettings, reception BulkCheckInModal/GuestCommunicationModal + 11 reception pages, waiter OrderFormModal/RightPanel, shared/components/MessagingPanel); useClickOutSide: waiter order/OrderCard; useNotificationSound: WaiterCallsPanel; useRelativeTime: kitchen OrderCard, waiter NotificationPanel, waiter order/OrderCard |
| `hooks/useContent.js` | real (no core twin) | landing AboutPage, Destination, HomePage, MembershipPage, OffersPage; shared/layout/Footer |
| `utils/apiConfig.js`, `utils/csrf.js` | real (no core twin) | apiConfig: core/api/client, core/context/SocketContext, core/context/StaffAuthContext, core/socket/contentSocket, hotel-admin services menuApi/orderApi/roomApi/staffApi/tableApi, reception pages/BookingsView, utils/csrf; csrf: app/App.jsx, core/api/client, hotel-admin services ×5 |
| `api/auth.js` | identical to `core/api/services/auth.service.js` except import lines + unused logger | StaffSettings (`changePassword`) |
| `api/staff.js` | DIFFERS from `staff.service.js` (getOrders defaults, `updateStaffProfile` only here, logger) | core/context/NotificationContext, core/context/SocketContext, StaffForgotPassword, StaffResetPassword, kitchen Sidebar, reception ReceptionSettings, waiter order/OrderCard, waiter Sidebar, WaiterCallsPanel |
| `api/qrService.js` | DIFFERS from `qr.service.js` (has createRoomRequest/getRoomRequests/getTableTab) | guest/qr-access GuestRoomView, GuestTableView |
| `api/publicBooking.js` | real (no core twin) | guest/dashboard/guestDashboardApi.js (re-export), guest/dashboard/pages/BillingView, public/hotels/components/BookingPaymentModal, public/payment/PaymentCallback, tests/walletPayments.test.mjs |
| `components/ConfirmDialog.jsx(+.css)`, `ErrorBoundary.jsx(+.module.css)`, `LeadershipTestimonials.jsx`, `components/shared/ItemCarousel.jsx`, `components/shared/StaffSettings.jsx` | real | ConfirmDialog: 7 hotel-admin pages; ErrorBoundary: app/App.jsx; LeadershipTestimonials: landing AboutPage; ItemCarousel: kitchen OrderCard, waiter order/OrderCard; StaffSettings: KitchenDashboard, kitchen Sidebar, waiter Sidebar |
| `services/notificationSoundService.js` | real | guest/dashboard/pages/DashboardView |
| `lib/utils.js` (`cn`) | real | shared/ui/button.jsx (`@/lib/utils`), features/guest/dashboard/** (~19 files incl. components/ui/*) |
| `config/roles.config.js` | unreachable | none → deleted in Step D |

Always regenerate the live list with the reach script's `LEGACY ROOT IMPORTS` section before each Step E phase; the table is a guide.

---

# Implementation Plan

## Step A: Baseline

- [ ] A1. Install the improved reachability script.
      The current `reach.mjs` lacks `lazy(() => import())`-specific handling, `new URL()`, CSS `url()` checks, skips dot-dirs, and has no legacy-import report. A tested improved version already exists at `$env:TEMP\reach2-test.mjs` (covers relative, `@/`, static/side-effect imports, `export … from`, `import()`/`lazy()`, `require`, `new URL`, CSS `@import`, CSS `url()` local refs, computed-import warnings, and prints `--- LEGACY ROOT IMPORTS`). If `reach2-test.mjs` is missing, rewrite `reach.mjs` with the same coverage.
      Command: `Copy-Item $env:TEMP\reach2-test.mjs C:\Users\user\AppData\Local\Temp\reach.mjs -Force`
      Verify: `node C:\Users\user\AppData\Local\Temp\reach.mjs frontend/src frontend/src/main.jsx frontend/src > $env:TEMP\reach-baseline.txt; Get-Content $env:TEMP\reach-baseline.txt -TotalCount 1` → `reachable: 266  total: 429  unreachable: 163  broken: 0 …`.

- [ ] A2. Record build, lint and test baselines (no file changes).
      Commands:
      - `npm run build *> $env:TEMP\build-baseline.txt; $LASTEXITCODE` → record pass/fail; `"{0:N0} KB" -f ((Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum/1KB)` → record size. If it fails only on the pk_test guard, re-run with `$env:ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD='true'` and keep that env var set for the whole session.
      - `cd frontend; npx eslint src -f json -o $env:TEMP\eslint-baseline.json; npx eslint src 2>&1 | Select-Object -Last 3; cd ..` → expect 78 problems (55 errors, 23 warnings).
      - `node --test frontend/tests/walletPayments.test.mjs` → record pass count.
      - `git status --short > $env:TEMP\git-status-baseline.txt` → ~216 lines.
      Verify: all four outputs saved in `$env:TEMP`.

- [ ] A3. Create the ESLint comparison helper `$env:TEMP\eslint-compare.mjs`.
      Reads two eslint JSON files, builds fingerprints `basename(filePath)|ruleId|message` for severity-2 messages, prints fingerprints present in the new file but not the baseline. Exit 1 if any new error.
      Usage after each phase: `cd frontend; npx eslint src -f json -o $env:TEMP\eslint-now.json; node $env:TEMP\eslint-compare.mjs $env:TEMP\eslint-baseline.json $env:TEMP\eslint-now.json; cd ..`
      Verify: running it against baseline vs itself prints `0 new errors`.

## Step B: Tier 1 temp/stray deletions

- [ ] B1. Reference check for every Step B name.
      Command: `Select-String -Path package.json,frontend\package.json,Backend\package.json,vercel.json,vite.config.js,frontend\vite.config.js,eslint.config.js,frontend\eslint.config.js,.githooks\pre-commit,README.md,Backend\README.md,frontend\README.md,frontend\index.html -Pattern 'filter_msg|msg-callback|msg-filter|remove-coauthor|install-git-hooks|gitignore-frontend|fix-vite-cache|_dbdiag|check_recep|desktop\.ini|backend-dev|build\.log|FINAL_SUMMARY|backend\.log|Backend/frontend'`
      Expected (verified during planning): no hits. Any hit → keep that file and report.

- [ ] B2. Delete root strays: `backend-dev.err.log`, `backend-dev.log`, `desktop.ini`, `filter_msg.py`, `msg-callback.py`, `msg-filter.py`, `remove-coauthor.ps1`, `install-git-hooks.bat`, `.gitignore-frontend`.
      Then root `index.html`: confirm `(Get-FileHash index.html).Hash -eq (Get-FileHash frontend\index.html).Hash` is True, move it to `$env:TEMP\root-index.html.bak` (not delete), run `npm run build`; if it passes, delete the backup; if not, move it back and report.
      Files: repo root.
      Verify: `npm run build` passes; `dist/index.html` exists.

- [ ] B3. Delete frontend strays: `frontend/build.log`, `frontend/FINAL_SUMMARY.md`, `frontend/fix-vite-cache.bat`, `frontend/fix-vite-cache.sh`, folders `frontend/dist/`, `frontend/.vite/`.
      Verify: `npm run build` passes (root build writes to root `dist/`, so `frontend/dist` is not needed).

- [ ] B4. Delete Backend strays: `Backend/backend.log`, `Backend/_dbdiag.mjs`, `Backend/check_recep.mjs`, folder `Backend/frontend/`.
      Before deleting `Backend/frontend/`, compare its two files with `frontend/src/features/guest/dashboard/guestDashboardApi.js` and `.../pages/RequestsView.jsx` (`Compare-Object`); note in the report whether they differ (real ones win regardless). Also `Select-String -Path Backend\*.js,Backend\*\*.js -Pattern '_dbdiag|check_recep|frontend/src'` (excluding node_modules) → expect none.
      Verify: `node --check Backend/server.js` exits 0.

## Step C: Tier 2 root markdown

- [ ] C1. Delete root markdown: `auditCheck.md`, `DEFERRED_DECISIONS.md`, `emergent-security-prompts (1) (1).md` (use `-LiteralPath`), `FINAL_AUDIT_SUMMARY.md`, `guestRedesign.md`, `hotelAdminRedesign.md`, `MASTERPROMPT_UX_PAYMENT_AUDIT.md`, `PROJECT_AUDIT.md`.
      Planning grep found no references to these names in README.md, docs/, Backend, frontend/src.
      Verify: `Get-ChildItem *.md | % Name` → only README.md, credentials.md, PAYMENT_TEST_CREDENTIALS.md, PAYMENT_GATEWAY_GO_LIVE.md, TEST_KHALTI_PAYMENT.md.

- [ ] C2. Move `PAYMENT_GATEWAY_GO_LIVE.md` and `TEST_KHALTI_PAYMENT.md` into `docs/` (`docs/` exists; check no same-name file there first).
      Then `Select-String -Path README.md,docs\*.md,docs\*\*.md,Backend\README.md,frontend\README.md,PAYMENT_TEST_CREDENTIALS.md,credentials.md -Pattern 'PAYMENT_GATEWAY_GO_LIVE|TEST_KHALTI_PAYMENT'` and fix every link to `docs/<name>` (from root) or `./<name>` (from docs/README.md). Planning found none, so this is likely a no-op. Also grep inside the two moved files for relative links (`\]\(\.\.?/`) and fix them for the new depth.
      Verify: `Test-Path docs\PAYMENT_GATEWAY_GO_LIVE.md, docs\TEST_KHALTI_PAYMENT.md` → True True; credentials.md and PAYMENT_TEST_CREDENTIALS.md still in root.

## Step D: Tier 3 unused frontend source

- [ ] D1. Build the deletion list from the reach script, not by hand.
      Run reach → take the `--- UNREACHABLE` section. Intersect with the spec list. The expected set is exactly the 163 entries in `$env:TEMP\reach-baseline.txt`, which equals the spec list with these clarifications:
      - `components/ui/*`: all 54 files (incl. `button.jsx`, `button-group.variants.js`) → delete.
      - `shared/ui/*`: the 53 unreachable files → delete. KEEP `shared/ui/button.jsx`, `shared/ui/ThemeToggle.jsx`, `shared/ui/GoogleConfirmModal.jsx` (reachable).
      - `lib/utils.js` stays (reachable; see facts).
      - `context/NotificationContext.jsx`, `OrderContext.jsx`, `OrderContextDef.js`, `ThemeContext.jsx` (legacy re-exports, unreachable) → delete. `context/SocketContext.jsx`, `StaffAuthContext.jsx`, `useNotifications.js`, `useOrderContext.js` are reachable → handled in E1.
      - Both `hooks/useAutoRefresh.js` and `core/hooks/useAutoRefresh.js` → delete (`useSettingsAutoRefresh.js` is separate and reachable).
      - Note `features/staff/reception/pages/DashboardContent.jsx` defines its own inline `Sparkline`/`GuestRow`; the unreachable standalone component files are safe to delete.
      Any spec-listed file that is NOT in the UNREACHABLE output → KEEP and report.

- [ ] D2. Secondary reference check for each candidate (catches string/lazy/CSS-url references).
      For each candidate basename-without-extension `$n`: `Get-ChildItem frontend\src,frontend\public -Recurse -File -Include *.js,*.jsx,*.css,*.html,*.json | Select-String -SimpleMatch $n` plus `Select-String -Path frontend\index.html,frontend\tests\*.mjs -SimpleMatch $n`. Ignore hits that are (a) inside another file on the deletion list, (b) the file itself, (c) a different identifier/string that merely contains the word (e.g. `categories`, `featuredHotels` key, `membership-page` CSS class, `kitchenSettings` localStorage key). Planning reviewed these and found only such false positives; the ONE real cross-reference is `components/shared/StaffSettings.jsx` importing `../../features/staff/waiter/pages/settings/WaiterSettings.css` — that CSS file is NOT on the list and stays (only `WaiterSettings.jsx` is deleted).
      Verify: written list of kept-with-reason files (expected: none beyond the three shared/ui files).

- [ ] D3. Delete the confirmed files, then remove empty folders.
      Delete with `Remove-Item -LiteralPath (Join-Path frontend\src $rel) -Force -ErrorAction SilentlyContinue` for each entry. Then remove empty dirs bottom-up: `Get-ChildItem frontend\src -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | Where-Object { -not (Get-ChildItem $_.FullName -Force) } | Remove-Item`. Expected newly empty: `components/ui`, `components/PaymentModal`, `config`, `assets/styles` (and `assets` if empty — check for other assets first), `features/staff/reception/context`, `features/staff/reception/styles`, `features/staff/waiter/pages/settings` must NOT be empty (WaiterSettings.css stays).
      Verify (all must pass):
      - reach → `broken: 0`, `unreachable: 0` (or only files explicitly kept in D2).
      - eslint compare → `0 new errors`.
      - `npm run build` passes.
      - `node --test frontend/tests/walletPayments.test.mjs` passes as baseline.

## Step E: Tier 4 consolidate parallel folders (one folder per phase)

Per-phase procedure (apply to every phase below):
1. Run reach and copy the `LEGACY ROOT IMPORTS` lines for the phase's folder — that is the authoritative importer list.
2. Move with `Move-Item` (or smart_relocate if available, then verify). Check destination doesn't exist first.
3. Fix the moved file's own relative imports for its new depth.
4. Rewrite every importer's specifier (compute new relative path from the importer's directory; keep the importer's existing quote style and extension-less form).
5. Stale-path grep (must return nothing):
   `Get-ChildItem frontend\src -Recurse -File -Include *.js,*.jsx,*.css | Select-String -Pattern "<phase pattern>"`
6. reach → `broken: 0`, phase folder absent from `LEGACY ROOT IMPORTS`; eslint compare → `0 new errors`; `npm run build` passes.
7. If anything gets circular/risky: move files back, revert the import edits, record in report, continue with the next phase.

- [ ] E1. `context/` → `core/context/`.
      All four remaining files are pure re-exports of `core/context/*` → do not move; repoint importers to the core file and delete the shim.
      Rewrites: `…/context/StaffAuthContext` → `…/core/context/StaffAuthContext` (13 importers), `…/context/SocketContext` → `…/core/context/SocketContext` (WaiterCallsPanel), `…/context/useNotifications` → `…/core/context/useNotifications` (waiter RightPanel), `…/context/useOrderContext` → `…/core/context/useOrderContext` (waiter OrderFormModal). Imported names are identical (shims export the same names + default). Then delete `frontend/src/context/` folder.
      Stale grep pattern: `"(\.\./)+context/|'\./context/|@/context/"`. Note: must not match `core/context/` — use `Select-String -Pattern "['""](\.\./)+context/|['""]\./context/|@/context/"`.
      Verify: per-phase step 6.

- [ ] E2. `hooks/` → `core/hooks/`.
      Shims (`useTheme`, `useClickOutSide`, `useNotificationSound`, `useRelativeTime`): repoint importers to `core/hooks/<name>` and delete. Real file `hooks/useContent.js`: move to `core/hooks/useContent.js` and change its import `'../core/socket/contentSocket'` → `'../socket/contentSocket'`; update 6 importers (landing AboutPage/Destination/HomePage/MembershipPage/OffersPage: `../../../../hooks/useContent` → `../../../../core/hooks/useContent`; `shared/layout/Footer.jsx`: `../../hooks/useContent` → `../../core/hooks/useContent`). Delete `frontend/src/hooks/`.
      Stale grep: `"['""](\.\./)+hooks/|['""]\./hooks/|@/hooks/"` — expected matches only inside `features/guest/dashboard/**` that resolve to `features/guest/dashboard/hooks/` (feature-local, leave them). Confirm via reach `LEGACY ROOT IMPORTS` showing no `hooks\` entries.
      Verify: per-phase step 6.

- [ ] E3. `utils/` → `core/utils/`.
      Move `utils/apiConfig.js` → `core/utils/apiConfig.js` and `utils/csrf.js` → `core/utils/csrf.js` (no name clash; csrf's `./apiConfig` import stays valid). Rewrites: `core/api/client.js` `../../utils/csrf`→`../utils/csrf`, `../../utils/apiConfig`→`../utils/apiConfig`; `core/context/SocketContext.jsx` & `StaffAuthContext.jsx` `../../utils/apiConfig`→`../utils/apiConfig`; `core/socket/contentSocket.js` `../../utils/apiConfig`→`../utils/apiConfig`; `app/App.jsx` `../utils/csrf`→`../core/utils/csrf`; hotel-admin `services/{menu,order,room,staff,table}Api.js` `../../../../utils/X`→`../../../../core/utils/X`; reception `pages/BookingsView.jsx` `../../../../utils/apiConfig`→`../../../../core/utils/apiConfig`. Delete empty `frontend/src/utils/`.
      Stale grep: `"['""](\.\./)+utils/(apiConfig|csrf)|@/utils/"` → only `core/utils` resolutions remain (check reach legacy section has no `utils\`). Feature-local `../utils/format` in guest dashboard is fine.
      Verify: per-phase step 6.

- [ ] E4. `api/` + `axiosClient.js` → `core/api/`.
      Decisions (from file comparison):
      - `axiosClient.js` is a shim of `core/api/client.js` → repoint its importers to `core/api/client` and delete it. (`api/auth.js`, `api/qrService.js` are handled below; remaining: StaffSettings `../../axiosClient`→`../../core/api/client` (E5 moves it later; same depth), reception BulkCheckInModal/GuestCommunicationModal/ActionModals and waiter AssignedAreas/WaiterCallsPanel `../../../../axiosClient`→`../../../../core/api/client`.)
      - `api/auth.js` ≡ `core/api/services/auth.service.js` apart from import lines and an unused logger → re-confirm with `Compare-Object` (only import/logger lines may differ); repoint StaffSettings `../../api/auth` → `../../core/api/services/auth.service`; delete `api/auth.js`. If the bodies differ, instead move it to `core/api/services/authLegacy.service.js` and report.
      - `api/staff.js` genuinely differs from `staff.service.js` → move to `core/api/services/staffAccount.service.js`; inside it change `../core/api/client` → `../client` and `../core/utils/logger.js` → `../../utils/logger.js`. Update 9 importers (core/context/NotificationContext & SocketContext `../../api/staff`→`../api/services/staffAccount.service`; StaffForgotPassword/StaffResetPassword/kitchen Sidebar/ReceptionSettings/waiter Sidebar/WaiterCallsPanel `../../../../api/staff`→`../../../../core/api/services/staffAccount.service`; waiter order/OrderCard `../../../../../api/staff`→`../../../../../core/api/services/staffAccount.service`). Report as kept-both.
      - `api/qrService.js` differs from `qr.service.js` → move to `core/api/services/guestQr.service.js`; change `../axiosClient` → `../client`; update GuestRoomView/GuestTableView `../../../api/qrService` → `../../../core/api/services/guestQr.service`. Report as kept-both.
      - `api/publicBooking.js` (no twin) → move to `core/api/services/publicBooking.service.js`; change `../core/api/client` → `../client`. Update: guestDashboardApi.js `../../../api/publicBooking`→`../../../core/api/services/publicBooking.service`; guest BillingView `../../../../api/publicBooking`→`../../../../core/api/services/publicBooking.service`; BookingPaymentModal same; PaymentCallback `../../../api/publicBooking`→`../../../core/api/services/publicBooking.service`.
      - Update `frontend/tests/walletPayments.test.mjs` (path strings only): `load('api/publicBooking.js', { '../core/api/client': … })` → `load('core/api/services/publicBooking.service.js', { '../client': … })` (3 places); guestDashboardApi map key `'../../../api/publicBooking'` → `'../../../core/api/services/publicBooking.service'`; PaymentCallback map key `'../../../api/publicBooking'` → `'../../../core/api/services/publicBooking.service'`.
      Delete empty `frontend/src/api/`.
      Stale grep: `"axiosClient['""]|['""](\.\./)+api/|@/api/"` → none (note `core/api/...` paths contain `/api/` preceded by `core` — use `Select-String -Pattern "['""](\.\./)+api/|axiosClient['""]|@/api/"`).
      Verify: per-phase step 6 AND `node --test frontend/tests/walletPayments.test.mjs` passes with the same count as baseline.

- [ ] E5. `components/` → `shared/components/`.
      No name clashes in `shared/components`. Moves: `components/ConfirmDialog.jsx`+`.css`, `components/ErrorBoundary.jsx`+`.module.css`, `components/LeadershipTestimonials.jsx` → `shared/components/`; `components/shared/ItemCarousel.jsx`, `components/shared/StaffSettings.jsx` → `shared/components/` (flattened).
      Moved-file fixes: ConfirmDialog `../hooks/useTheme` (already `../core/hooks/useTheme` after E2) → `../../core/hooks/useTheme`. StaffSettings stays at depth 2, so its `../../core/...` imports and `../../features/staff/waiter/pages/settings/WaiterSettings.css` stay valid — confirm.
      Importer rewrites: 7 hotel-admin pages `../../../../components/ConfirmDialog`→`../../../../shared/components/ConfirmDialog`; App.jsx `../components/ErrorBoundary`→`../shared/components/ErrorBoundary`; AboutPage `../../../../components/LeadershipTestimonials`→`../../../../shared/components/LeadershipTestimonials`; kitchen OrderCard `../../../../components/shared/ItemCarousel`→`../../../../shared/components/ItemCarousel`; waiter order/OrderCard `../../../../../components/shared/ItemCarousel`→`../../../../../shared/components/ItemCarousel`; KitchenDashboard/kitchen Sidebar/waiter Sidebar `../../../../components/shared/StaffSettings`→`../../../../shared/components/StaffSettings`. Delete empty `frontend/src/components/`.
      Stale grep: `"['""](\.\./)+components/(ConfirmDialog|ErrorBoundary|LeadershipTestimonials|shared/)|@/components/"` → none. Feature-local `../components/...` in features/** are fine (reach legacy section is the arbiter).
      Verify: per-phase step 6.

- [ ] E6. `services/` → `core/services/`.
      Move `services/notificationSoundService.js` → `core/services/notificationSoundService.js`; change `../core/audio/alertSounds` → `../audio/alertSounds`. Update guest DashboardView `../../../../services/notificationSoundService` → `../../../../core/services/notificationSoundService`. Delete empty `frontend/src/services/`.
      Stale grep: `"notificationSoundService['""]"` → only the new path.
      Verify: per-phase step 6.

- [ ] E7. `lib/` → `core/utils/cn.js`.
      Move `lib/utils.js` → `core/utils/cn.js` (no clash). Update: `shared/ui/button.jsx` `@/lib/utils` → `@/core/utils/cn`; every `features/guest/dashboard/**` file importing `…/lib/utils` (≈19: components/GuestBottomNav, components/NotificationBell, components/ui/{Avatar,Button,FilterTabs,Money,PullIndicator,Sheet,Skeleton,StatCard,StatusBadge}, layout/GuestDashboardLayout, pages/{Billing,Bookings,Chat,Dashboard,Profile,Requests,RoomService,Settings}View) → same `../` count + `core/utils/cn`. Get the exact list with `Get-ChildItem frontend\src -Recurse -File -Include *.js,*.jsx | Select-String -SimpleMatch 'lib/utils'`. Delete empty `frontend/src/lib/`.
      Stale grep: `Select-String -SimpleMatch 'lib/utils'` → none.
      Verify: per-phase step 6.

- [ ] E8. `config/` cleanup + jsconfig.
      `config/` should already be gone after D3 (roles.config.js was its only file); if present and empty, remove it. Update `frontend/jsconfig.json` `paths` to only `"@/*": ["./*"]` (the removed aliases point at deleted folders; editor-only, no code uses them — confirm with `Select-String -Pattern "from ['""](components|context|api|utils|shared)/"` → none).
      Verify: `Get-ChildItem frontend\src -Directory | % Name` → `app, assets(if non-empty), core, features, shared` only; `axiosClient.js` absent; full per-phase step 6 + wallet test.

## Step F: Tier 5 .gitignore, tool folders, worktrees

- [ ] F1. Append to root `.gitignore` (do not remove/reorder existing rules; skip entries already present — `*.log` and `dist/` already exist):
      ```
      # AI/editor tool folders (local only)
      .claude/
      .cursor/
      .kilo/
      .kombai/
      .openclaude/
      .orchids/
      .qodo/
      .sixth/
      # Build caches / OS files
      frontend/dist/
      frontend/.vite/
      desktop.ini
      ```
      Do NOT add `.kiro/` or `.vscode/`.
      Verify: `git check-ignore -v .claude/x .orchids/orchids.json frontend/.vite/x desktop.ini` → each matched; `git check-ignore .kiro/x .vscode/x` → no output.

- [ ] F2. `git rm -r --cached .orchids` (index only).
      Verify: `Test-Path .orchids\orchids.json` → True; `git ls-files .orchids` → empty.

- [ ] F3. Worktrees.
      `git worktree list`. For each path under `.claude/worktrees` and `.kilo/worktrees`: `git -C <path> status --porcelain`; empty → `git worktree remove <path>`; non-empty → leave, record in report (expected: both `.claude` ones dirty, `.kilo/worktrees/congruous-shop` clean → removed). Then `git worktree prune -v` (drops the 3 Cursor + 1 Copilot prunable entries). No `--force`, no branch deletion.
      Verify: `git worktree list` → main + the two dirty `.claude` worktrees only. Tool folders themselves still exist (`Test-Path .claude,.kilo`).

## Step G: Final verification and report

- [ ] G1. `npm run build` passes; record output size vs baseline.
- [ ] G2. eslint compare → `0 new errors` (record new totals; expected to drop because deleted files carried errors).
- [ ] G3. reach → `broken: 0`, `unreachable: 0` (or only reported keeps), `legacyRootImports: 0`, no unexpected warnings.
- [ ] G4. `node --test frontend/tests/walletPayments.test.mjs` passes.
- [ ] G5. Backend: `node --check Backend/server.js` exits 0; `cd Backend; node -e "import('./server.js').catch(e=>{console.error(e.code||e.message);process.exit(1)})"` — acceptable failure is DB-only (`querySrv ECONNREFUSED` / Mongo connection); `ERR_MODULE_NOT_FOUND` or `SyntaxError` = failure to fix. Kill the process after ~20 s if it hangs (`timeout`).
- [ ] G6. `git status --short > $env:TEMP\git-status-final.txt`; compare with baseline: every baseline `M`/`??` path must still be present unless it was deliberately deleted/moved by this plan. Confirm these exist: `Backend/services/guestOrderAlerts.js`, `Backend/controllers/guestMessagingController.js`, `frontend/src/core/audio/alertSounds.js`, `frontend/src/features/guest/dashboard/pages/ChatView.jsx`, `useHotelId.js` (locate with `Get-ChildItem frontend\src -Recurse -Filter useHotelId.js`), `credentials.md`, `PAYMENT_TEST_CREDENTIALS.md`.
- [ ] G7. Delete temp files: `C:\Users\user\AppData\Local\Temp\reach.mjs`, `$env:TEMP\reach2-test.mjs`, `$env:TEMP\eslint-compare.mjs`, `$env:TEMP\eslint-baseline.json`, `$env:TEMP\eslint-now.json`, `$env:TEMP\reach-baseline.txt`, `$env:TEMP\build-baseline.txt`, `$env:TEMP\git-status-*.txt`, `$env:TEMP\root-index.html.bak` (if any).
- [ ] G8. Write `.agents/tasks/repo-cleanup-report.md`: files deleted (grouped by step); files moved (old → new table, incl. `api/staff.js → core/api/services/staffAccount.service.js`, `api/qrService.js → core/api/services/guestQr.service.js`, `api/publicBooking.js → core/api/services/publicBooking.service.js`, `hooks/useContent.js → core/hooks/useContent.js`, `utils/{apiConfig,csrf}.js → core/utils/`, `components/* → shared/components/*`, `services/notificationSoundService.js → core/services/`, `lib/utils.js → core/utils/cn.js`, docs moves); files kept despite the plan and why (`shared/ui/button.jsx`, `shared/ui/GoogleConfirmModal.jsx`, `lib/utils` (moved not deleted), `WaiterSettings.css`, both kept-differing API services); dirty worktrees left; whether the pk_test override was used; verification results (build pass + size, eslint before/after counts, reach counts, wallet test, backend check, git status check).
