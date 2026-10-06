# Security audit tools (2026-10-05)

Report: `..\..\SECURITY_AUDIT_REPORT.html`. Pre-change copies of the sources: `..\..\_backups\security-audit-pre\`.

## Re-running the automatic checks (never touches the live site or database)

1. Local throw-away MongoDB (binary cached by an earlier session):
   `C:\Users\Acer\.cache\mongodb-binaries\mongod-x64-win32-8.2.6.exe --dbpath <empty folder> --port 27700 --bind_ip 127.0.0.1`
2. Backend against it, in production mode with every real secret / mail / payment / cloud setting overridden:
   `node tests\start-backend.js` (env `SEC_PORT=5700`, `SEC_MODE=production`, `SEC_CORS=http://localhost:4200` for browser runs).
   `tests\resetdb.js` drops the throw-away database, `tests\restart.sh` stops the backend on :5700.
3. `node tests\verify-fixes.js` (44 checks) then `node tests\verify-fixes2.js` (53 checks), on a freshly reset database.
   `node tests\routes-table.js` then `node tests\probe-authz.js` call every route as a visitor and as an ordinary user.
4. Browser checks (headless Chrome over CDP, needs the dev server on :4000): `node tests\proxy4200.js` (front door to the test backend),
   then `node tests\test-ui.js`. `node tests\proxy4300.js` + `node tests\test-csp.js` try the content policy in `csp-under-test.txt`
   in report-only mode on 15 pages.

Notes: write regexes with the Write/Edit tools, not shell heredocs (they drop backslashes). The login/reset limiters are in memory:
restart the test backend between suites. The test scripts contain only throw-away test secrets.

## For the owner (run only on purpose, from `backend\backend`)

- `check-weak-staff-passwords.js`: read-only, lists admin / super admin accounts that use a guessable password.
- `purge-visitor-reset-tokens.js`: dry run by default; `--apply` masks reset-link secrets stored in old visitor rows.
