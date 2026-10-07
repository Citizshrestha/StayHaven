# Requests from session 04 (waiter)

## REQ-waiter-1 | P1 | frontend/src/app/App.jsx:77 (+ frontend/src/features/public/hotels/pages/SavedHotels.jsx) | `npm run build` fails on a clean checkout of main (a9c7843): App.jsx imports `../features/public/hotels/pages/SavedHotels`, but that file is untracked in the main checkout (`?? SavedHotels.jsx`), so it is not in any worktree | Commit SavedHotels.jsx on qa/platform (or on 08 public), or remove the import and route | `git worktree add` from main, `npm run build` succeeds | status: open
(Workaround in qa/waiter: the file is copied into the worktree UNCOMMITTED so the build can run; it is not part of any waiter commit.)

## REQ-waiter-2 | P3 | Backend/package.json | Base commit has no `test`, `test:pricing`, `test:frontend` scripts, no `Backend/tests/*.integration.test.js`, and no `mongodb-memory-server` dependency. Rules D refer to them. | Decide whether 01 adds `"test": "node --test tests/"` and `mongodb-memory-server` (pinned) so sessions can add regression tests | `cd Backend; npm test` | status: open
