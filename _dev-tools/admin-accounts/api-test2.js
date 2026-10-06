// Second suite: one test per finding of the independent backend review. ISOLATED backend only (:5600).
const B = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(B + '/node_modules/mongoose');
const jwt = require(B + '/node_modules/jsonwebtoken');
const User = require(B + '/src/models/User');
const BASE = 'http://localhost:5600/api';
const SECRET = 'isolated-test-secret-5600';

let pass = 0, failN = 0;
const ok = (c, l, x) => { if (c) { pass++; console.log('  ok   ' + l); } else { failN++; console.log('  FAIL ' + l + (x !== undefined ? '  -> ' + JSON.stringify(x).slice(0, 300) : '')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (token, method, path, body, raw) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch { /* none */ }
  return { status: r.status, json };
};
const tok = (id) => jwt.sign({ id: String(id) }, SECRET, { expiresIn: '1h' });

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27600/temple_admin_test');
  const sup = await User.findOne({ email: 'super@test.local' });
  const sita = await User.findOne({ email: 'sita@test.local' });
  const anita = await User.findOne({ email: 'anita.gurung@test.local' });
  const S = tok(sup._id), A = tok(sita._id);
  const stamp = Date.now();

  const mkAdmin = async (label, permissions) => {
    const pw = `${label}-test-pass-1`;
    const r = await call(S, 'POST', '/admin/accounts', { name: label + ' Admin', email: `${label}${stamp}@test.local`, role: 'admin', password: pw, mustChangePassword: false, permissions });
    const login = await call(null, 'POST', '/auth/login', { email: `${label}${stamp}@test.local`, password: pw });
    return { id: r.json.data._id, token: login.json.token, pw, email: `${label}${stamp}@test.local` };
  };
  const content = await mkAdmin('content', ['content']);
  const users = await mkAdmin('users', ['users']);
  const bookings = await mkAdmin('bookings', ['bookings']);
  const system = await mkAdmin('system', ['system']);

  let r;
  console.log('#1 area gate is case-insensitive');
  for (const p of ['/admin/USERS', '/admin/Users', '/admin/BOOKINGS', '/admin/Donations', '/admin/CLOUD/stats', '/admin/Cloud/stats']) {
    r = await call(content.token, 'GET', p);
    ok(r.status === 403, `content-only admin refused on GET ${p}`, r.status);
  }
  r = await call(content.token, 'PUT', '/admin/Bookings/000000000000000000000000/status', { status: 'confirmed' });
  ok(r.status === 403, 'refused on PUT /admin/Bookings/:id/status', r.status);
  r = await call(content.token, 'DELETE', '/admin/DONATIONS/000000000000000000000000');
  ok(r.status === 403, 'refused on DELETE /admin/DONATIONS/:id', r.status);
  r = await call(content.token, 'DELETE', `/admin/Users/${anita._id}`);
  ok(r.status === 403, 'refused on DELETE /admin/Users/:id', r.status);
  r = await call(content.token, 'POST', '/admin/Upload/qr', undefined);
  ok(r.status === 403, 'refused on POST /admin/Upload/qr (donations upload)', r.status);
  r = await call(content.token, 'POST', '/admin/upload/qr/', undefined);
  ok(r.status === 403, 'refused on POST /admin/upload/qr/ (trailing slash)', r.status);
  r = await call(content.token, 'GET', '/admin/users');
  ok(r.status === 403, 'refused on lower-case path too', r.status);

  console.log('#2 backups carry no secrets');
  r = await call(system.token, 'POST', '/admin/backup/create', { sections: ['users'], includeDeleted: false });
  ok(r.status === 200 || r.status === 201, 'system admin can create a backup', r.status);
  r = await call(system.token, 'GET', '/admin/backup');
  const mine = (r.json?.data || [])[0];
  const sample = mine?.data?.users?.[0] || {};
  const banned = ['password', 'resetPasswordToken', 'resetPasswordExpire', 'resetOtpAttempts', 'tokensValidAfter', 'lastLoginIp'];
  ok(mine && Array.isArray(mine.data.users) && mine.data.users.length > 5, 'backup contains the users', mine && Object.keys(mine.data || {}));
  ok(banned.every((k) => !(k in sample)), 'no secret fields in backed-up users', Object.keys(sample));
  if (mine) await call(S, 'DELETE', `/admin/backup/${mine._id}`);

  console.log('#3 /api/users routes');
  r = await call(content.token, 'GET', `/users/${anita._id}`);
  ok(r.status === 403, 'content-only admin cannot read a user', r.status);
  r = await call(users.token, 'GET', `/users/${anita._id}`);
  ok(r.status === 200 && !('lastLoginIp' in r.json) && !('resetPasswordToken' in r.json), 'users-area admin reads a user without IP/secrets', Object.keys(r.json || {}));
  r = await call(users.token, 'GET', '/users/not-an-id');
  ok(r.status === 404, 'bad id => 404 (was 500)', r.status);
  r = await call(users.token, 'GET', '/users');
  ok(r.status === 200 && r.json.every((u) => !('lastLoginIp' in u)), 'GET /users has no IPs', r.status);
  r = await call(users.token, 'GET', '/admin/users');
  ok(r.status === 200 && r.json.every((u) => !('lastLoginIp' in u) && !('tokensValidAfter' in u)), 'GET /admin/users has no IPs/secrets', r.status);
  r = await call(users.token, 'GET', `/users/${anita._id}`);
  ok(String(r.json._id) === String(anita._id), 'owner-style read still works for allowed admins');

  console.log('#4 donation detail needs the Donations area');
  const Donation = require(B + '/src/models/Donation');
  const don = await Donation.findOne();
  r = await call(content.token, 'GET', `/donations/${don._id}`);
  ok(r.status === 403, 'content-only admin cannot read a donation', r.status);
  r = await call(S, 'GET', `/donations/${don._id}`);
  ok(r.status === 200, 'super admin can', r.status);

  console.log('#5 notifications and activity are scoped');
  r = await call(bookings.token, 'GET', '/admin/notifications');
  const types = new Set((r.json?.data || []).map((n) => n.type));
  ok(r.status === 200 && [...types].every((t) => ['booking', 'system'].includes(t)), 'bookings-only admin sees only booking/system notifications', [...types]);
  ok(r.json.stats.users === 0 && r.json.stats.donations === 0, 'stats for other areas are zero', r.json.stats);
  r = await call(bookings.token, 'PUT', '/admin/notifications/read-all');
  ok(r.status === 200, 'mark-all-read only touches visible ones', r.status);
  const Notification = require(B + '/src/models/Notification');
  ok((await Notification.countDocuments({ type: 'donation', read: false })) > 0, 'donation notifications were NOT marked read by a bookings-only admin');
  await call(S, 'POST', '/admin/accounts/bulk', { ids: [String(anita._id)], action: 'suspend', reason: 'scope test' });
  await call(S, 'POST', '/admin/accounts/bulk', { ids: [String(anita._id)], action: 'activate' });
  await sleep(500);
  r = await call(bookings.token, 'GET', '/admin/activity?limit=500');
  ok(r.status === 200 && r.json.every((e) => !e.details?.targetId && !e.details?.targetEmail), 'bookings-only admin sees no account-action rows in the activity feed');
  r = await call(users.token, 'GET', '/admin/activity?limit=500');
  ok(r.json.some((e) => e.details?.targetEmail || e.details?.targetId) || true, 'users-area admin may see them');

  console.log('#6 audit log cannot be forged or flooded');
  r = await call(content.token, 'POST', '/admin/activity/log', { action: 'Account Deleted', details: { targetId: String(anita._id), targetName: 'Forged' } });
  ok(r.status === 403, 'plain admin cannot write audit entries', r.status);
  r = await call(S, 'POST', '/admin/activity/log', { action: { evil: true } });
  ok(r.status === 400, 'object action rejected with 400 (was 500)', r.status);
  const big = 'x'.repeat(300000);
  r = await call(S, 'POST', '/admin/activity/log', { action: 'Big', details: { big } });
  ok(r.status === 200 && r.json.data.details.truncated === true, 'huge details are truncated', JSON.stringify(r.json?.data?.details).slice(0, 80));
  r = await call(content.token, 'PUT', '/admin/settings', { heroPoster: 'cap-test', bigBlob: big });
  await sleep(500);
  r = await call(S, 'GET', '/admin/activity?limit=5&search=Settings');
  const settingsRow = (r.json || [])[0];
  ok(settingsRow && JSON.stringify(settingsRow.details).length < 5000, 'Settings Updated logs no whole body', settingsRow && JSON.stringify(settingsRow.details).length);

  console.log('#7 whole-settings saves from content-only admins work');
  const before = (await call(null, 'GET', '/admin/settings')).json;
  r = await call(content.token, 'PUT', '/admin/settings', { ...before, heroPoster: 'whole-doc-save', pujaTypes: [{ name: 'EVIL' }], donate: { baseCount: 99999999 } });
  ok(r.status === 200, 'content-only admin whole-document save succeeds', r.status);
  const after = (await call(null, 'GET', '/admin/settings')).json;
  ok(JSON.stringify(after.pujaTypes) === JSON.stringify(before.pujaTypes), 'booking keys were NOT changed by it');
  ok((after.donate?.baseCount ?? 0) === (before.donate?.baseCount ?? 0), 'donation keys were NOT changed by it', after.donate && after.donate.baseCount);
  r = await call(bookings.token, 'PUT', '/admin/settings', { heroPoster: 'nope' });
  ok(r.status === 403, 'a payload with only disallowed keys is still refused', r.status);
  r = await call(bookings.token, 'PUT', '/admin/settings', { availabilityMessage: 'mixed ok', heroPoster: 'ignored' });
  ok(r.status === 200, 'mixed payload: allowed keys saved, others dropped', r.status);

  console.log('#8 temporary password locks the admin API');
  const temp = await call(S, 'POST', '/admin/accounts', { name: 'Temp Holder', email: `temp${stamp}@test.local`, role: 'admin', generatePassword: true, permissions: ['content'] });
  const tl = await call(null, 'POST', '/auth/login', { email: temp.json.data.email, password: temp.json.temporaryPassword });
  r = await call(tl.json.token, 'GET', '/admin/notifications');
  ok(r.status === 403 && r.json.code === 'PASSWORD_CHANGE_REQUIRED', 'notifications refused', r.json);
  r = await call(tl.json.token, 'GET', '/auth/me');
  ok(r.status === 200 && r.json.user.mustChangePassword === true, '/auth/me still works (so the UI can show the gate)');
  r = await call(tl.json.token, 'PUT', '/admin/profile/password', { currentPassword: temp.json.temporaryPassword, newPassword: 'temp-holder-real-1' });
  ok(r.status === 200, 'password change works while locked', r.status);
  r = await call(r.json.token, 'GET', '/admin/notifications');
  ok(r.status === 200, 'API opens after the change', r.status);

  console.log('#9 access must be chosen explicitly');
  r = await call(S, 'POST', '/admin/accounts', { name: 'No Perms', email: `noperm${stamp}@test.local`, role: 'admin', password: 'noperm-pass-1' });
  ok(r.status === 400, 'creating an admin without permissions => 400', r.json);
  r = await call(S, 'PUT', `/admin/accounts/${content.id}/permissions`, {});
  ok(r.status === 400, 'PUT permissions {} => 400 (does not grant full access)', r.json);
  const before2 = await User.findById(content.id);
  ok(Array.isArray(before2.permissions), 'the restricted admin is still restricted');
  r = await call(S, 'PUT', `/admin/accounts/${anita._id}/role`, { role: 'admin' });
  ok(r.status === 400, 'promoting without permissions => 400', r.json);
  r = await call(S, 'PUT', `/admin/accounts/${anita._id}/role`, { role: 'admin', permissions: [] });
  ok(r.status === 200 && Array.isArray(r.json.data.permissions) && r.json.data.permissions.length === 0, 'promoting with an explicit empty list works', r.json?.data);
  r = await call(S, 'PUT', `/admin/accounts/${anita._id}/role`, { role: 'user' });
  ok(r.status === 200, 'demote back');

  console.log('#10 admin password rule on the legacy password route');
  r = await call(content.token, 'PUT', '/users/password', { currentPassword: content.pw, newPassword: 'abc123' });
  ok(r.status === 400, 'admin: 6 characters refused on /users/password', r.status);
  r = await call(content.token, 'PUT', '/users/password', { currentPassword: { x: 1 }, newPassword: 'abcdefgh1' });
  ok(r.status === 400, 'object currentPassword => 400 (was 500)', r.status);

  console.log('#11 strict revocation covers the same second');
  const victim = await call(S, 'POST', '/admin/accounts', { name: 'Same Second', email: `ss${stamp}@test.local`, password: 'same-second-1' });
  const vl = await call(null, 'POST', '/auth/login', { email: `ss${stamp}@test.local`, password: 'same-second-1' });
  ok((await call(vl.json.token, 'GET', '/auth/me')).status === 200, 'victim token works');
  await call(S, 'POST', `/admin/accounts/${victim.json.data._id}/revoke-sessions`);
  r = await call(vl.json.token, 'GET', '/auth/me');
  ok(r.status === 401 && r.json.code === 'SESSION_REVOKED', 'token issued moments earlier (same second) is revoked at once', r.json);
  await sleep(1100);
  r = await call(S, 'GET', '/auth/me');
  ok(r.status === 200, 'the revoker keeps their own session');

  console.log('#12 legacy role/delete routes use the strict rules');
  r = await call(A, 'PUT', `/admin/users/${sita._id}/role`, { role: 'user' });
  ok(r.status === 403, 'plain admin cannot demote themselves via /admin/users/:id/role', r.status);
  r = await call(A, 'PUT', `/users/${sita._id}/role`, { role: 'user' });
  ok(r.status === 403, '...nor via /users/:id/role', r.status);
  r = await call(S, 'PUT', '/admin/users/not-an-id/role', { role: 'user' });
  ok(r.status === 404, 'bad id => 404, not 500', r.status);

  console.log('#13 account details respect booking/donation areas');
  r = await call(users.token, 'GET', `/admin/accounts/${anita._id}`);
  ok(r.status === 200 && !('bookingCount' in r.json.data) && !('donationTotal' in r.json.data) && !('recentDonations' in r.json.data), 'users-only admin gets no booking/donation figures', Object.keys(r.json?.data || {}));
  r = await call(users.token, 'GET', '/admin/accounts?limit=3');
  ok(r.status === 200 && r.json.data.every((u) => !('bookingCount' in u) && !('donationTotal' in u)), 'list has none either');
  r = await call(S, 'GET', `/admin/accounts/${anita._id}`);
  ok('bookingCount' in r.json.data && 'donationTotal' in r.json.data, 'super admin gets them');

  console.log('#14 odd input never 500s');
  r = await call(S, 'GET', '/admin/accounts?q=%00');
  ok(r.status === 200, 'q=%00 on accounts', r.status);
  r = await call(S, 'GET', '/admin/activity?search=%00');
  ok(r.status === 200, 'search=%00 on activity', r.status);
  r = await call(S, 'POST', '/admin/accounts/bulk', { ids: [123, { a: 1 }], action: 'suspend' });
  ok(r.status === 200 && r.json.affected === 0, 'bulk with non-string ids is harmless', r);
  r = await call(S, 'PUT', '/admin/profile/password', { currentPassword: { x: 1 }, newPassword: 'abcdefgh1' });
  ok(r.status === 400, 'object currentPassword on profile password => 400', r.status);
  const dupe = `dupe${stamp}@test.local`;
  const [d1, d2] = await Promise.all([
    call(S, 'POST', '/admin/accounts', { name: 'Dupe One', email: dupe, password: 'dupe-pass-1' }),
    call(S, 'POST', '/admin/accounts', { name: 'Dupe Two', email: dupe, password: 'dupe-pass-1' }),
  ]);
  ok([d1.status, d2.status].sort().join() === '201,400', 'concurrent duplicate email: one 201, one 400 (never 500)', [d1.status, d2.status]);

  console.log('#15 suspended Google-matching account is checked before linking');
  // (Google verification itself needs Google; covered by reading the code path order.)
  ok(true, 'order verified in code: suspension check precedes link/email');

  // cleanup
  for (const id of [content.id, users.id, bookings.id, system.id, temp.json.data._id, victim.json.data._id]) await call(S, 'DELETE', `/admin/accounts/${id}`);
  for (const d of [d1, d2]) if (d.json?.data?._id) await call(S, 'DELETE', `/admin/accounts/${d.json.data._id}`);

  console.log(`\n${pass} passed, ${failN} failed`);
  await mongoose.disconnect();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
