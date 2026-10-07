# In-place repo cleanup: temp/markdown removal, dead frontend code deletion, legacy folder consolidation

The cleanup removed root, frontend and Backend stray files, eight obsolete root markdown files, and 163 unreachable `frontend/src` files. It folded the legacy `api/`, `context/`, `hooks/`, `utils/`, `components/`, `services/`, `lib/` folders and `axiosClient.js` into `core/` and `shared/`, then extended `.gitignore` and pruned clean or stale worktrees. I re-ran the three gate checks independently. The root production build passes. ESLint reports 0 errors and 18 warnings, down from a 55-error, 23-warning baseline. A resolver pass over all 635 relative and `@/` imports in `frontend/src` finds none broken. All must-keep files are present. No commit, reset or new stash was made. Git status shows the uncommitted feature work at its original or moved paths.

Watch for: four unreachable files carrying uncommitted edits were deleted as the spec instructed (`Membership.jsx`, `KitchenSettings.jsx`, `WaiterSettings.jsx`, `utils/allProperties.js`). Only their HEAD versions can be recovered (confirmed, non-blocking). The untracked `frontend/checklist.tmp.mjs` also disappeared, and nothing references it (confirmed, non-blocking).

**Verdict**: APPROVED

## High-level view

The frontend now has one home for each concern. `frontend/src` contains only `app/`, `core/`, `features/` and `shared/`. Shim re-exports were dropped and their importers now point at the `core/` originals. Files with real logic moved instead: `useContent`, `apiConfig`, `csrf`, `publicBooking`, `notificationSoundService` and `cn`. Two API modules differ from their `core` counterparts, so both versions were kept under new names: `staffAccount.service.js` and `guestQr.service.js`. My resolver check confirms every specifier still points at a real file. The 39 remaining `../hooks/` matches all resolve into feature-local `hooks/` folders, such as guest dashboard and hotel-admin.

The build and lint gates hold. The build was run with `ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD=true`, as in the baseline. That override only bypasses the existing `pk_test_` Stripe-key guard, and the cleanup did not cause it. The wallet payments test, which loads files by path, passes 8/8 after its path strings were updated.

The feature work from earlier in the session is intact: guest chat, order alerts with sound, and messaging controllers. Every deletion appears as `D` and every moved file as `??`. Index changes are limited to the planned `git rm --cached .orchids/orchids.json`. The only stash entry is 11 months old and sits on a different branch, so it predates this run.

<details>
<summary>Issues (2)</summary>

1. **Uncommitted edits lost in four deleted dead files**: `features/public/landing/pages/Membership.jsx`, `features/staff/kitchen/pages/KitchenSettings.jsx`, `features/staff/waiter/pages/settings/WaiterSettings.jsx` and `utils/allProperties.js` had ` M` edits and were unreachable. The spec said to delete them. If the edits mattered, they cannot be recovered; `git show HEAD:<path>` returns only the committed version. Non-blocking. Tell the user.
2. **Untracked `frontend/checklist.tmp.mjs` missing**: it was not on any delete list and nothing references it. Non-blocking. Mention it in the final summary.

</details>

<details>
<summary>Details</summary>

### Gate re-runs

I ran the root `npm run build` with the same override the baseline needed. It exited 0 and built in about 60 s, with only the usual chunk-size warning. `npx eslint src` from `frontend/` reported `18 problems (0 errors, 18 warnings)` and exited 0. The baseline errors were all in deleted files, so there are no new errors by definition.

The stale-import grep covered `frontend/src`, `frontend/tests` and `frontend/index.html`. It looked for old-root specifiers and every deleted or moved name in the report. Those names were `../context/`, `@/context|hooks|utils|api|lib|components/`, `axiosClient`, `lib/utils`, `../api/`, `../utils/(apiConfig|csrf)`, `services/notificationSoundService`, `components/shared/`, `ConfirmDialog`/`ErrorBoundary`/`LeadershipTestimonials` under `components/`, `api/publicBooking|qrService|staff|auth`, and the Step D deletions (`useAutoRefresh`, `sampleHotels`, `allProperties`, `qr.service`, `StripePaymentModal`, `KitchenSettings`, `MaintenanceView`, `ReceptionContext`, and others). It returned zero matches. A control grep for `core/api/client` returned 11 matches, which confirms the grep works.

A plain-text grep can't tell a feature-local `../hooks/` from the deleted root `hooks/`. To close that gap I ran a resolver script over every relative and `@/` import, including dynamic `import()` and CSS `@import`. It checked 635 specifiers and found 0 broken.

### Uncommitted-work preservation

`git log -1` still shows the commit from 7 days ago, `a9c7843`. Git status breaks down into 178 ` M`, 204 ` D`, 1 `D ` and 67 `??` entries. The single staged change is `.orchids/orchids.json`, removed from the index as planned. `Backend/controllers/messagingController.js`, `core/context/NotificationContext.jsx` and `core/context/SocketContext.jsx` remain ` M`. `guestMessagingController.js`, `guestOrderAlerts.js`, `ChatView.jsx` and `core/audio/` remain `??`. The moved `publicBooking.service.js` and `staffAccount.service.js` appear as new `??` paths and still carry their uncommitted content.

Four unreachable files with local edits were deleted, as listed in the Issues. The spec explicitly listed them for deletion, so this is a disclosure item rather than a defect.

</details>

<details>
<summary>File map</summary>

- Root: strays, `index.html`, `.gitignore-frontend` and 8 audit/redesign markdown files deleted. `PAYMENT_GATEWAY_GO_LIVE.md` and `TEST_KHALTI_PAYMENT.md` moved to `docs/`. `.gitignore` gained ignore rules for tool folders and caches. `README.md` folder tree updated.
- `Backend/`: `backend.log`, `_dbdiag.mjs`, `check_recep.mjs` and the stray `Backend/frontend/` copy deleted. No source changes.
- `frontend/`: `build.log`, `FINAL_SUMMARY.md`, `fix-vite-cache.*`, `dist/` and `.vite/` deleted. `jsconfig.json` aliases reduced to `@/*`. `tests/walletPayments.test.mjs` path strings updated.
- `frontend/src/components/ui/*`, `shared/ui/*` (except `button`, `GoogleConfirmModal` and `ThemeToggle`) and the other unreachable modules: deleted.
- `frontend/src/{api,context,hooks,utils,components,services,lib}` and `axiosClient.js`: shims removed, real files moved into `core/` and `shared/components/`, importers rewritten.
- Full diff: `git status --short` and `git diff` in the repo root.

</details>
