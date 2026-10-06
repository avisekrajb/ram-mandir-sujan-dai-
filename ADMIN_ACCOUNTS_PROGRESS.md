# Admin panel + account management: progress and process

Last updated: 2026-10-05, ~17:45 (Kathmandu). Written so any session (or you) can pick the work up.

## State: finished, reviewed, fixed, re-tested

**Built and tested** (isolated copy only; the real Atlas data was never touched):

| Area | What | Where |
|---|---|---|
| Shell | collapsible sidebar, account menu, Ctrl+K search, access-gated routes, forced password change | `frontend/src/pages/AdminPage.jsx`, `components/admin/AdminSidebar.jsx`, `adminNav.js`, `AdminCommandPalette.jsx`, `AdminAccountMenu.jsx`, `ForcePasswordChange.jsx`, `NoAccess.jsx` |
| Users | search/filter/sort/page, drawer, suspend/reactivate, reset password, sign out everywhere, make/remove admin, delete, bulk, CSV | `components/admin/AdminAccounts.jsx`, `kit/AccountDialogs.jsx` |
| Admins & access | per-admin access areas (super admin only) | `components/admin/AdminAccess.jsx`, `kit/AccessEditor.jsx`, `utils/permissions.js` |
| Audit log | filter/export, clear = super admin only, retention 500, translated action names | `components/admin/AdminAudit.jsx`, `kit/auditActions.js`, `adminController.js` |
| My account | profile, password (strength meter), sign out other devices | `components/admin/AdminProfile.jsx`, `kit/PasswordChangeForm.jsx` |
| Overview | "needs attention", area-aware tiles, recent-activity fix | `components/admin/AdminOverview.jsx` |
| UI kit | shared pieces; `kit/overlayStack.js` = who is on top (Escape, scroll lock) | `components/admin/kit/` |
| Backend | accounts API, areas, session revocation, sign-in tracking | `accountController.js`, `accountRoutes.js`, `middleware/permissions.js`, `middleware/auth.js`, `middleware/admin.js`, `models/User.js`, `adminProfileController.js` |
| Strings | `t.k7_* \|\| 'English'`; Nepali in `utils/i18n/admin7.js`; hi/zh/ta fall back to English | |

Fixed on the way: any admin could grant admin / demote the super admin via `/api/users/:id/role`; old Settings "Create New Admin" only made a normal user; superadmin-page `createAdmin` now sets `mustChangePassword`.

**Test results (2026-10-05, after all review fixes):**
- `api-test.js` 87/87, `api-test2.js` 65/65 (one section per backend review finding), `regress.js` 14/14
- frontend jest 70/70 (`CI=true npx react-scripts test --watchAll=false`)
- `check-i18n.js`: 253 keys used, all in Nepali, no duplicates, no placeholder mismatches
- UI scenarios `s1`-`s14` run headless on desktop/phone/Nepali: no page errors (see "Re-running the checks")

**Real backend on :5000**: I restarted it at ~17:44 with all fixes, but the Bash-tool background task it ran in was reaped when the turn ended and the backend died with it. Another session restarted it at 17:45 (PID 33644, after every backend edit, so it runs the fixed code); `/api/admin/settings` 200, :4000 proxy 200, `/api/users` and `/api/admin/USERS` 401 without a login. It was slow (4-8 s for the 144 KB settings doc) while several sessions were loading the machine; that endpoint is untouched by this work.
To start it yourself: from `backend\backend`, `node --require "C:\Users\Acer\Desktop\New folder\_dev-tools\dnsfix.js" server.js` (the DNS preload is needed for the Atlas SRV lookup). A tool background task does not outlive the session; `Start-Process` needs the preload path quoted inside `-ArgumentList` because the folder name has a space (an unquoted path gave `MODULE_NOT_FOUND`).

## Backend review result (independent agent): all fixed and verified

| # | Sev | Finding | Status |
|---|---|---|---|
| 1 | HIGH | Area gate regexes case-sensitive, Express routing is not (`/api/admin/USERS`) | fixed, tested (api-test2 #1) |
| 2 | MED | Backups stored reset-token hash, tokensValidAfter, lastLoginIp | fixed (#2) |
| 3 | MED | `/api/users`, `/admin/users`, `GET /users/:id` lacked the `users` area check, showed IPs, bad id = 500 | fixed (#3) |
| 4 | MED | `GET /api/donations/:id` had no `donations` area check | fixed (#4) |
| 5 | MED | Notifications + activity feed exposed other areas' data | fixed (#5) |
| 6 | MED | `POST /admin/activity/log` let any admin forge/flood the audit log | fixed: super admin only, capped (#6) |
| 7 | MED | Content-only admins could not save Social / Facebook video (whole-doc PUT) | fixed: disallowed keys dropped, 403 only if no key allowed (#7) |
| 8 | LOW | `mustChangePassword` only enforced in the UI | fixed: admin API refuses everything except `PUT /api/admin/profile/password` (`PASSWORD_CHANGE_REQUIRED`) (#8) |
| 9 | LOW | Missing `permissions` meant full access on create/promote/PUT permissions | fixed: must be explicit (#9) |
| 10 | LOW | `PUT /api/users/password` skipped the 8-char rule for admins | fixed (#10) |
| 11 | LOW | Token issued in the same second as `revokeSessions()` not revoked | fixed: strict revoke rounds up (#11) |
| 12 | LOW | Legacy role handler allowed self-demotion | fixed: legacy routes call accountController (#12) |
| 13 | LOW | Account details showed bookings/donations without those areas | fixed (#13); the UI now hides the tiles/CSV columns when the figure is absent |
| 14 | LOW | 500s on `q=%00`, `ids:[123]`, object passwords, duplicate-email race | fixed (#14) |
| 15 | LOW | Suspended Google user got Google ID linked + email first | fixed (#15) |
| 16 | LOW | `lastLoginIp` is the proxy address behind a proxy | NOT changed: add `app.set('trust proxy', 1)` when deployed behind Render |

## Frontend review result (independent agent): all fixed and verified in the browser

| # | Sev | Finding | Fix | Checked by |
|---|---|---|---|---|
| 1 | HIGH | Two overlays closing at once left `body{overflow:hidden}` | `kit/overlayStack.js`, scroll lock is counted | s10: drawer + confirm unmounted together, overflow empty |
| 2 | MED | Toasts under modals | toast layer `z-[10200]` | s11b: computed z-index 10200 |
| 3 | MED | Escape closed every overlay | only the top overlay claims Escape (dialogs, palette, row menu) | s10: confirm over drawer, palette over drawer |
| 4 | MED | Bulk selection kept rows that left the list | pruned after each list load | s11b: 2 selected -> 1 after a row was deleted behind the page |
| 5 | MED | Row menu not keyboard-operable | focus first item, arrows/Home/End, Tab closes, focus returns to button | s10 |
| 6 | MED | Newly granted areas: stale data on first load | first fetch waits for `refreshUser()`; skipped while `mustChangePassword`, runs once it clears | s12: stale full-access copy, restricted server side: no `/admin/users\|donations\|bookings` calls, no error toast |
| 7 | MED | Escape during a save lost the form | latest `onClose` kept in a ref | by construction (`useOverlay`); not driven end to end |
| 8 | LOW | New admins defaulted to Full access | default = no areas; Create / Make admin disabled until areas chosen or Full access on | s11 |
| 9-17 | LOW | audit "Who" filter, doubled i18n keys (`k7_noMatch`, `k7_loadFailed` split into 4 new keys), CSV header key, "bulk" regex, double fetch on filter change, bookings nav `end`, Avatar `broken` reset, ConfirmDialog accessible name, `api.js` clears storage only if the failed request used the stored token, Overview "All caught up" false positive | various | s13 (Nepali action names), s14 (one request per filter change), s10 (dialog name), code review |

Also changed: `context/AdminLogsContext.jsx` (other session's file) now skips its fetch while a temporary password is pending and mirrors the 500-entry retention.

## Not done / optional

1. `app.set('trust proxy', 1)` when deployed behind Render (review #16).
2. Hindi / Chinese / Tamil strings for `admin7.js` (they fall back to English).
3. #7 (Escape during a save) has no end-to-end test; needs a slowed network request.
4. A production `npm run build` was not run (dev server compiles clean; the warnings it prints are in `AboutPage.jsx` / `RamPage.jsx`, other sessions' files). `CI=true` builds treat warnings as errors.
5. Stop the throwaway test processes when you are done with them (see the end of this file).

## Process (how this was done; reuse it)

1. **Read before changing**: map existing admin (it already had ~25 pages), find real gaps (no search/paging/suspend, fragmented account pages, security holes) before designing.
2. **Back up first** (no git in this folder): `_backups/admin-panel-pre/` (full `src` copies) and `_backups/AdminOverview.jsx.pre-areas`.
3. **Backend first, tested by API**: `_dev-tools/admin-accounts/api-test.js` + `api-test2.js` cover every rule (who may touch whom, areas, sessions, bulk, audit, each review finding).
4. **Isolated environment** (never Atlas): local `mongod` (cached binary `C:\Users\Acer\.cache\mongodb-binaries\mongod-x64-win32-8.2.6.exe`), test backend `:5600`, second CRA dev server `:4600` with `REACT_APP_PROXY_TARGET`. Sessions are minted tokens, no typed passwords.
5. **UI verified with a headless-Chrome driver** (`drive.js` + `scenarios/*.json`) because the Browser pane can't render when hidden. Steps: `nav`, `login`, `click`, `type`, `eval`, `log`, `shot`, `wait`, `resize`, and `key` (real key presses via CDP, optional `modifiers`: 1 alt, 2 ctrl, 4 meta, 8 shift).
6. **Parallel sessions edit this project**: re-read a file right before editing it; edit with small targeted changes; don't revert others' changes (a missing icon in another session's `AdminReviews.jsx` broke the whole build once).
7. **Independent review** by separate agents before calling it done; verify findings, don't apply blindly. Both reviews found real bugs the tests had missed.
8. **Long-running things**: start background commands with `timeout: 7200000` (default 30 min kills them); a dev server whose task was killed keeps listening but hangs; background tasks do not survive a session restart (restart mongod / backend / dev server).

### Gotchas hit while testing

- **Login rate limit: 20 per 15 minutes per address.** A run of test suites plus UI scenarios can hit it; a scenario that logs in and then fails with "Cannot read properties of undefined (reading 'permissions')" is this. Wait or re-run.
- Re-seeding (`node seed.js`) invalidates minted tokens: re-run `node mint.js super@test.local > super.json` (and `sita@test.local > admin.json`).
- The driver's `text=Foo` click matches the first visible button/link with that text in DOM order (a bulk-bar "Reactivate" beat the row-menu item). Click menu items with an `eval` on `[role=menuitem]` instead.
- Bash heredocs / inline `node -e` strip or double backslashes (regexes in JSON scenario steps break). Write scenario files with the Write tool and avoid regexes (`includes()` instead).
- Dev server: after editing a source file the next page load can show only the loading spinner for several seconds while it recompiles; wait longer before asserting.
- Scenarios that need data from earlier ones (a renamed user, say) go stale after a re-seed; s9 now uses seed names.

## Re-running the checks

```bash
cd "C:\Users\Acer\Desktop\New folder\_dev-tools\admin-accounts"
# 1. database (leave running)
"C:\Users\Acer\.cache\mongodb-binaries\mongod-x64-win32-8.2.6.exe" --dbpath <some-empty-folder> --port 27600 --bind_ip 127.0.0.1
# 2. test backend on :5600 (reads creds.json written by seed.js)
node seed.js && bash start-backend.sh
# 3. API + regression suites (re-seed between them; each leaves data behind)
node api-test.js        # expect: 87 passed, 0 failed
node api-test2.js       # expect: 65 passed, 0 failed
node regress.js         # expect: 14 passed, 0 failed
# 4. UI (needs the :4600 dev server: PORT=4600 REACT_APP_PROXY_TARGET=http://localhost:5600 BROWSER=none npx react-scripts start, in frontend\frontend)
node mint.js super@test.local > super.json ; node mint.js sita@test.local > admin.json
node drive.js scenarios/s10-overlays.json     # screenshots land in .\shots
node check-i18n.js                            # k7_ keys used vs Nepali dictionary (expect none missing/extra)
```

Scenario files use `http://localhost:4600`; `seed.js` drops and recreates the throwaway DB `temple_admin_test` (and only that). Working copies also live in the session scratchpad `testenv\` (that is where `creds.json` is written).

## Stopping the test processes

Kill by listening port only, never `:5000` / `:4000`: mongod `:27600`, test backend `:5600`, second dev server `:4600`.
