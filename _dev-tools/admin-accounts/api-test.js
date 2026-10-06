// End-to-end checks of the account-management API against the ISOLATED test backend (port 5600).
const B = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(B + '/node_modules/mongoose');
const jwt = require(B + '/node_modules/jsonwebtoken');
const User = require(B + '/src/models/User');
const BASE = 'http://localhost:5600/api';
const SECRET = 'isolated-test-secret-5600';

let pass = 0, failN = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { failN++; console.log('  FAIL ' + label + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 300) : '')); }
};
const tok = (id, opts = {}) => jwt.sign({ id: String(id) }, SECRET, { expiresIn: '1h', ...opts });
const call = async (token, method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await r.json(); } catch { /* none */ }
  return { status: r.status, json };
};

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27600/temple_admin_test');
  const sup = await User.findOne({ email: 'super@test.local' });
  const sita = await User.findOne({ email: 'sita@test.local' });      // admin, unrestricted
  const ram = await User.findOne({ email: 'ram@test.local' });        // admin, disabled
  const anita = await User.findOne({ email: 'anita.gurung@test.local' }); // user
  const T = { sup: tok(sup._id), sita: tok(sita._id) };

  console.log('summary + list');
  let r = await call(T.sup, 'GET', '/admin/accounts/summary');
  ok(r.status === 200 && r.json.data.total >= 17 && r.json.data.signupsByDay.length === 30, 'summary shape', r.json);
  r = await call(T.sup, 'GET', '/admin/accounts?limit=5&page=2&sort=name');
  ok(r.status === 200 && r.json.data.length === 5 && r.json.page === 2 && r.json.pages >= 4, 'paged list', { s: r.status, n: r.json?.data?.length, p: r.json?.pages });
  ok(r.json.data.every((u) => !('password' in u) && !('resetPasswordToken' in u) && !('tokensValidAfter' in u)), 'no secrets in list');
  r = await call(T.sup, 'GET', '/admin/accounts?q=bikash');
  ok(r.json.total === 1 && r.json.data[0].name === 'Bikash Rai', 'search by name', r.json?.total);
  r = await call(T.sup, 'GET', '/admin/accounts?role=staff');
  ok(r.json.total === 3, 'role=staff filter (3)', r.json?.total);
  r = await call(T.sup, 'GET', '/admin/accounts?status=suspended');
  ok(r.json.total === 2, 'suspended filter (2: Ram + Gita)', r.json?.total);
  r = await call(T.sup, 'GET', '/admin/accounts?q=' + encodeURIComponent('(*['));
  ok(r.status === 200, 'regex-hostile search does not 500', r.status);
  r = await call(T.sita, 'GET', '/admin/accounts?role=admin');
  ok(r.status === 200 && r.json.data.every((u) => !('lastLoginIp' in u)), 'IP hidden from non-super admin');
  r = await call(T.sup, 'GET', '/admin/accounts?role=admin');
  ok(r.json.data.every((u) => 'lastLoginIp' in u), 'IP visible to super admin');
  r = await call(null, 'GET', '/admin/accounts');
  ok(r.status === 401, 'anonymous rejected', r.status);

  r = await call(T.sita, 'GET', '/auth/me');
  ok(r.status === 200 && r.json.user.permissions === null && !('tokensValidAfter' in r.json.user) && !('resetPasswordToken' in r.json.user), 'auth/me: admin has permissions:null, no secrets', r.json?.user);
  r = await call(T.sup, 'GET', '/auth/me');
  ok(r.status === 200 && !('permissions' in r.json.user), 'auth/me: super admin has no permissions field');
  r = await call(T.sup, 'POST', '/superadmin/admins', { name: 'Via Super Page', email: 'viasuper'+Date.now()+'@test.local', password: 'secret-pass-1' });
  ok(r.status === 201 && r.json.data.mustChangePassword === true, 'superadmin page createAdmin sets mustChangePassword', r.json?.data);
  console.log('detail');
  r = await call(T.sup, 'GET', '/admin/accounts/' + anita._id);
  ok(r.status === 200 && Array.isArray(r.json.data.recentBookings) && 'donationTotal' in r.json.data, 'detail has bookings/donations/activity', Object.keys(r.json?.data || {}));
  r = await call(T.sup, 'GET', '/admin/accounts/not-an-id');
  ok(r.status === 404, 'bad id => 404', r.status);

  console.log('create');
  const stamp = Date.now();
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'Test Devotee', email: `devotee${stamp}@test.local`, generatePassword: true });
  ok(r.status === 201 && /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(r.json.temporaryPassword || ''), 'create user w/ generated password', r.json);
  const newUser = r.json?.data;
  const newUserPw = r.json?.temporaryPassword;
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'Test Devotee', email: `devotee${stamp}@test.local`, password: 'abcdef' });
  ok(r.status === 400, 'duplicate email rejected', r.json);
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'X', email: 'bad', password: 'abcdef' });
  ok(r.status === 400, 'invalid name/email rejected');
  r = await call(T.sita, 'POST', '/admin/accounts', { name: 'Sneaky Admin', email: `sneaky${stamp}@test.local`, password: 'abcdefgh1', role: 'admin' });
  ok(r.status === 403, 'plain admin cannot create an admin', r.json);
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'Content Editor', email: `editor${stamp}@test.local`, role: 'admin', password: 'editor-pass-1', permissions: ['content', 'contact', 'bogus'] });
  ok(r.status === 201 && JSON.stringify(r.json.data.permissions) === JSON.stringify(['content', 'contact']) && r.json.data.mustChangePassword === true, 'create restricted admin (bogus area dropped, must change pw)', r.json?.data);
  const editor = r.json?.data;
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'Weak', email: `weak${stamp}@test.local`, role: 'admin', password: 'short' });
  ok(r.status === 400, 'admin password needs >= 8 chars');

  console.log('login of generated accounts + flags');
  r = await call(null, 'POST', '/auth/login', { email: newUser.email, password: newUserPw });
  ok(r.status === 200 && r.json.token, 'new user signs in with temp password', r.json);
  const newUserTok = r.json?.token;
  r = await call(null, 'POST', '/auth/login', { email: editor.email, password: 'editor-pass-1' });
  ok(r.status === 200 && r.json.user.mustChangePassword === true && !('password' in r.json.user) && !('tokensValidAfter' in r.json.user), 'editor signs in; flag present; no secrets in login payload', r.json?.user);
  const editorTok = r.json?.token;
  r = await call(T.sup, 'GET', '/admin/accounts/' + newUser._id);
  ok(r.json.data.loginCount === 1 && r.json.data.lastLoginAt, 'sign-in recorded (count 1)', r.json?.data);

  console.log('suspend / reactivate');
  r = await call(T.sita, 'PUT', `/admin/accounts/${newUser._id}/status`, { active: false, reason: 'Spam signups' });
  ok(r.status === 200 && r.json.data.active === false && r.json.data.suspendedReason === 'Spam signups', 'admin suspends a user', r.json);
  r = await call(newUserTok, 'GET', '/auth/me');
  ok(r.status === 401 && r.json.code === 'ACCOUNT_SUSPENDED', 'suspended user token rejected (401 ACCOUNT_SUSPENDED)', r.json);
  r = await call(null, 'POST', '/auth/login', { email: newUser.email, password: newUserPw });
  ok(r.status === 403, 'suspended user cannot sign in', r.status);
  r = await call(T.sita, 'PUT', `/admin/accounts/${newUser._id}/status`, { active: true });
  ok(r.status === 200 && r.json.data.active === true && r.json.data.suspendedReason === '', 'reactivate clears reason');
  r = await call(null, 'POST', '/auth/login', { email: newUser.email, password: newUserPw });
  ok(r.status === 200, 'user can sign in again');

  console.log('guard rails');
  r = await call(T.sita, 'PUT', `/admin/accounts/${sup._id}/status`, { active: false });
  ok(r.status === 403, 'cannot suspend a super admin', r.json);
  r = await call(T.sita, 'PUT', `/admin/accounts/${ram._id}/status`, { active: true });
  ok(r.status === 403 && r.json.code === 'ADMIN_TARGET', 'plain admin cannot touch another admin', r.json);
  r = await call(T.sita, 'PUT', `/admin/accounts/${sita._id}/status`, { active: false });
  ok(r.status === 400 && r.json.code === 'SELF', 'cannot suspend yourself', r.json);
  r = await call(T.sup, 'DELETE', `/admin/accounts/${sup._id}`);
  ok(r.status === 400 || r.status === 403, 'cannot delete yourself / a super admin', r.status);
  r = await call(T.sup, 'PUT', `/admin/accounts/${ram._id}/status`, { active: true });
  ok(r.status === 200, 'super admin can reactivate an admin');
  r = await call(T.sup, 'PUT', `/admin/accounts/${ram._id}/status`, { active: false, reason: 'seed state' });
  ok(r.status === 200, 'restore Ram to disabled');

  console.log('legacy /users routes are no longer a bypass');
  r = await call(T.sita, 'PUT', `/users/${anita._id}/role`, { role: 'admin' });
  ok(r.status === 403, 'plain admin cannot grant admin via /users/:id/role', r.json);
  r = await call(T.sita, 'PUT', `/users/${sup._id}/role`, { role: 'user' });
  ok(r.status === 403, 'plain admin cannot demote the super admin via /users/:id/role', r.json);
  r = await call(T.sita, 'DELETE', `/users/${sup._id}`);
  ok(r.status === 403, 'plain admin cannot delete the super admin via /users/:id', r.json);
  const after = await User.findById(sup._id);
  ok(after.role === 'superadmin', 'super admin still super admin');

  console.log('reset password + sessions');
  r = await call(T.sup, 'POST', `/admin/accounts/${editor._id}/reset-password`);
  ok(r.status === 200 && r.json.temporaryPassword && r.json.data.mustChangePassword === true, 'super admin resets admin password (forced change)', r.json);
  const editorTemp = r.json?.temporaryPassword;
  r = await call(editorTok, 'GET', '/auth/me');
  ok(r.status === 401 && r.json.code === 'SESSION_REVOKED', 'old editor session revoked by reset', r.json);
  await new Promise((res) => setTimeout(res, 1100)); // a login in the same second as a strict revoke would be revoked too
  r = await call(null, 'POST', '/auth/login', { email: editor.email, password: editorTemp });
  ok(r.status === 200, 'editor signs in with the new temp password', r.status);
  let editorTok2 = r.json?.token;
  // The admin API is closed while a temporary password is in use; only the password change is open.
  r = await call(editorTok2, 'GET', '/admin/accounts');
  ok(r.status === 403 && r.json.code === 'PASSWORD_CHANGE_REQUIRED', 'temporary password: admin API refused until it is changed', r.json);
  r = await call(editorTok2, 'GET', '/admin/profile');
  ok(r.status === 403 && r.json.code === 'PASSWORD_CHANGE_REQUIRED', 'temporary password: even the profile read is refused', r.status);
  r = await call(editorTok2, 'PUT', '/admin/profile/password', { currentPassword: editorTemp, newPassword: 'editor-real-pass-1' });
  ok(r.status === 200 && r.json.token, 'changing the temporary password is allowed', r.json);
  editorTok2 = r.json.token;
  const editorPass1 = 'editor-real-pass-1';
  r = await call(T.sita, 'POST', `/admin/accounts/${editor._id}/reset-password`);
  ok(r.status === 403, 'plain admin cannot reset an admin password');
  r = await call(T.sita, 'POST', `/admin/accounts/${anita._id}/reset-password`);
  ok(r.status === 200 && r.json.data.mustChangePassword === false, 'plain admin resets a user password (no forced flag)', r.json?.data);
  r = await call(T.sita, 'POST', `/admin/accounts/${anita._id}/revoke-sessions`);
  ok(r.status === 200, 'revoke sessions of a user');

  console.log('restricted admin (content + contact only)');
  r = await call(editorTok2, 'GET', '/admin/accounts');
  ok(r.status === 403 && r.json.code === 'NO_AREA_ACCESS', 'no access to accounts', r.json);
  r = await call(editorTok2, 'GET', '/admin/bookings');
  ok(r.status === 403, 'no access to bookings', r.status);
  r = await call(editorTok2, 'GET', '/admin/donations');
  ok(r.status === 403, 'no access to donations', r.status);
  r = await call(editorTok2, 'GET', '/admin/users');
  ok(r.status === 403, 'no access to /admin/users', r.status);
  r = await call(editorTok2, 'GET', '/admin/cloud/stats');
  ok(r.status === 403, 'no access to cloud (system)', r.status);
  r = await call(editorTok2, 'GET', '/visitors/stats');
  ok(r.status === 403, 'no access to visitor analytics', r.status);
  r = await call(editorTok2, 'GET', '/admin/backup');
  ok(r.status === 403, 'no access to backups', r.status);
  r = await call(editorTok2, 'GET', '/bookings');
  ok(r.status === 403, 'no access to GET /bookings', r.status);
  r = await call(editorTok2, 'GET', '/contact');
  ok(r.status === 200, 'contact allowed', r.status);
  r = await call(editorTok2, 'PUT', '/admin/settings', {});
  ok(r.status !== 403, 'content area allowed (settings PUT not 403)', r.status);
  r = await call(editorTok2, 'GET', '/admin/notifications');
  ok(r.status === 200, 'notifications open to any admin', r.status);
  r = await call(editorTok2, 'GET', '/admin/profile');
  ok(r.status === 200 && r.json.security && r.json.security.permissions.length === 2, 'profile exposes own access areas', r.json?.security);
  r = await call(T.sup, 'PUT', `/admin/accounts/${editor._id}/permissions`, { permissions: null });
  ok(r.status === 200 && r.json.data.permissions === null, 'super admin lifts the restriction', r.json?.data);
  r = await call(editorTok2, 'GET', '/admin/bookings');
  ok(r.status === 200, 'bookings now allowed without re-login', r.status);
  r = await call(T.sita, 'PUT', `/admin/accounts/${editor._id}/permissions`, { permissions: ['content'] });
  ok(r.status === 403, 'plain admin cannot change access areas');

  console.log('settings keys follow the owning area');
  r = await call(T.sup, 'POST', '/admin/accounts', { name: 'Bookings Only', email: 'bk' + stamp + '@test.local', role: 'admin', password: 'bookings-pass-1', mustChangePassword: false, permissions: ['bookings'] });
  const bk = r.json.data;
  r = await call(null, 'POST', '/auth/login', { email: bk.email, password: 'bookings-pass-1' });
  const bkTok = r.json.token;
  r = await call(bkTok, 'PUT', '/admin/settings', { availabilityMessage: 'Back soon' });
  ok(r.status === 200, 'bookings-only admin can save a booking key (availabilityMessage)', r.status);
  r = await call(bkTok, 'PUT', '/admin/settings', { heroPoster: 'x' });
  ok(r.status === 403 && r.json.area === 'content', 'bookings-only admin cannot save a content key', r.json);
  r = await call(bkTok, 'PUT', '/admin/settings', { availabilityMessage: 'ok', donatePageTitle: { en: 'x' } });
  ok(r.status === 200, 'mixed payload: allowed key saved, key outside the admin areas dropped (not an error)', r.status);
  r = await call(bkTok, 'PUT', '/admin/settings', { donatePageTitle: { en: 'x' } });
  ok(r.status === 403 && r.json.area === 'donations', 'payload with only keys outside the admin areas is refused', r.json);
  r = await call(bkTok, 'POST', '/admin/upload/booking-bg', null);
  ok(r.status !== 403, 'bookings-only admin reaches the booking background upload (not 403)', r.status);
  r = await call(bkTok, 'POST', '/admin/upload/qr', null);
  ok(r.status === 403, 'bookings-only admin cannot use the donation QR upload', r.status);
  r = await call(bkTok, 'POST', '/admin/upload/hero', null);
  ok(r.status === 403, 'bookings-only admin cannot use content uploads', r.status);
  r = await call(T.sup, 'DELETE', '/admin/accounts/' + bk._id);

  console.log('role changes (super admin only)');
  r = await call(T.sup, 'PUT', `/admin/accounts/${newUser._id}/role`, { role: 'admin', permissions: ['bookings'] });
  ok(r.status === 200 && r.json.data.role === 'admin' && r.json.data.permissions[0] === 'bookings', 'promote user to restricted admin', r.json?.data);
  r = await call(T.sup, 'PUT', `/admin/accounts/${newUser._id}/role`, { role: 'user' });
  ok(r.status === 200 && r.json.data.role === 'user' && !('permissions' in r.json.data), 'demote back to user', r.json?.data);
  r = await call(T.sita, 'PUT', `/admin/accounts/${newUser._id}/role`, { role: 'admin' });
  ok(r.status === 403, 'plain admin cannot promote');

  console.log('profile: password change + sign out others');
  const meTok = tok(editor._id);
  r = await call(editorTok2, 'PUT', '/admin/profile/password', { currentPassword: editorPass1, newPassword: 'short' });
  ok(r.status === 400, 'weak new password rejected');
  r = await call(editorTok2, 'PUT', '/admin/profile/password', { currentPassword: 'wrong-password', newPassword: 'a-much-better-pass1' });
  ok(r.status === 401, 'wrong current password rejected');
  r = await call(editorTok2, 'PUT', '/admin/profile/password', { currentPassword: editorPass1, newPassword: 'a-much-better-pass1' });
  ok(r.status === 200 && r.json.token, 'password changed, fresh token returned', r.json);
  const editorTok3 = r.json?.token;
  r = await call(editorTok2, 'GET', '/auth/me');
  ok(r.status === 401, 'previous session is dead after password change', r.status);
  r = await call(editorTok3, 'GET', '/auth/me');
  ok(r.status === 200 && r.json.user.mustChangePassword === false, 'fresh token works; must-change flag cleared', r.json?.user);
  await new Promise((res) => setTimeout(res, 1100)); // JWT iat has 1s resolution
  r = await call(editorTok3, 'POST', '/admin/profile/revoke-sessions');
  ok(r.status === 200 && r.json.token, 'sign out everywhere returns a fresh token');
  r = await call(editorTok3, 'GET', '/auth/me');
  ok(r.status === 401, 'the old token is dead');

  console.log('bulk + delete');
  const made = [];
  for (let i = 0; i < 3; i++) {
    const c = await call(T.sup, 'POST', '/admin/accounts', { name: 'Bulk ' + i, email: `bulk${i}-${stamp}@test.local`, password: 'secret123' });
    made.push(c.json.data._id);
  }
  r = await call(T.sita, 'POST', '/admin/accounts/bulk', { ids: [...made, String(sup._id), String(ram._id), String(sita._id)], action: 'suspend', reason: 'bulk test' });
  ok(r.status === 200 && r.json.affected === 3 && r.json.skipped === 3, 'bulk suspend 3, skips admins/super/self', r.json);
  r = await call(T.sita, 'POST', '/admin/accounts/bulk', { ids: made, action: 'activate' });
  ok(r.json.affected === 3, 'bulk activate');
  r = await call(T.sita, 'POST', '/admin/accounts/bulk', { ids: made, action: 'delete' });
  ok(r.json.affected === 3, 'bulk delete');
  r = await call(T.sup, 'DELETE', `/admin/accounts/${editor._id}`);
  ok(r.status === 200, 'super admin deletes an admin');
  r = await call(T.sita, 'DELETE', `/admin/accounts/${newUser._id}`);
  ok(r.status === 200, 'admin deletes a user');

  console.log('audit trail');
  await new Promise((res) => setTimeout(res, 600));
  r = await call(T.sup, 'GET', '/admin/activity?limit=200&search=Account');
  const acts = new Set((r.json || []).map((l) => l.action));
  ok(['Account Created', 'Account Suspended', 'Account Reactivated', 'Account Deleted'].every((a) => acts.has(a)), 'audit log has account actions', [...acts]);
  r = await call(T.sup, 'GET', '/admin/activity?limit=200&search=' + encodeURIComponent('Test Devotee'));
  ok(Array.isArray(r.json) && r.json.length > 0, 'audit search matches target name', r.json?.length);

  console.log(`\n${pass} passed, ${failN} failed`);
  await mongoose.disconnect();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
