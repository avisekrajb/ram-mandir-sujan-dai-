// READ-ONLY check for the OWNER to run against the live database: do any admin / super admin accounts
// still use a guessable password? (The audit found a 6-digit super admin password in the environment file and
// a seed script that created an admin with a trivial password.)
//
//   cd backend\backend
//   node ..\..\_dev-tools\security-audit\check-weak-staff-passwords.js
//
// What it does: connects with MONGODB_URI (from backend\backend\.env), reads ONLY accounts whose role is
// admin or superadmin, compares each stored password hash with a short list of very weak passwords (and
// with the SUPERADMIN_PASSWORD value from .env), and prints which accounts match. It never prints a hash or
// a password, and it changes nothing. Note: the database is shared with other applications; if one of them also
// has a `users` collection with admin accounts, those would be listed too. Ignore accounts that are not yours.
const path = require('path');
const BACKEND = path.resolve(process.cwd());
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require(path.join(BACKEND, 'node_modules', 'dotenv')).config({ path: path.join(BACKEND, '.env') });
const mongoose = require(path.join(BACKEND, 'node_modules', 'mongoose'));
const bcrypt = require(path.join(BACKEND, 'node_modules', 'bcryptjs'));

const WEAK = ['123456', '1234567', '12345678', '123456789', '111111', '000000', 'password', 'admin', 'admin123', 'admin1234', 'qwerty', 'letmein', 'changeme', 'welcome', 'ramchandra', 'nepal123'];
if (process.env.SUPERADMIN_PASSWORD) WEAK.push(process.env.SUPERADMIN_PASSWORD);

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found: run this from backend\\backend');
  await mongoose.connect(process.env.MONGODB_URI);
  const staff = await mongoose.connection.db.collection('users')
    .find({ role: { $in: ['admin', 'superadmin'] } }, { projection: { email: 1, role: 1, password: 1, lastLoginAt: 1, mustChangePassword: 1 } }).toArray();
  console.log(`Staff accounts found: ${staff.length}\n`);
  let weakCount = 0;
  for (const u of staff) {
    let hit = null;
    if (typeof u.password === 'string' && u.password.startsWith('$2')) {
      for (const guess of WEAK) {
        if (await bcrypt.compare(guess, u.password)) { hit = guess === process.env.SUPERADMIN_PASSWORD ? 'the SUPERADMIN_PASSWORD value in .env' : 'a very common password'; break; }
      }
    }
    if (hit) weakCount += 1;
    console.log(`${hit ? 'WEAK ' : 'ok   '} ${u.email}  (${u.role})  last login: ${u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 10) : 'never'}${hit ? '  -> password is ' + hit : ''}`);
  }
  console.log(weakCount ? `\n${weakCount} account(s) use a guessable password: change them now (Admin panel -> My account, or node scripts/resetAdminPassword.js).` : '\nNo staff account matched the weak-password list.');
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
