// Reset an admin's password directly in the database.
// Usage (from backend\backend):  node scripts/resetAdminPassword.js
// Lists admin accounts, asks which one, then asks for the new password
// (typed hidden; never printed or logged). Hashing is done by the User model.
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { passwordProblem } = require('../src/utils/passwordPolicy');

const ask = (q, hidden = false) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('email name role');
  if (!admins.length) { console.log('No admin accounts found.'); process.exit(1); }
  console.log('\nAdmin accounts:');
  admins.forEach((u, i) => console.log(`  ${i + 1}. ${u.email}  (${u.role}${u.name ? ', ' + u.name : ''})`));

  const pick = Number(await ask('\nNumber of the account to reset: '));
  const user = admins[pick - 1];
  if (!user) { console.log('Invalid choice.'); process.exit(1); }

  const pw = await ask('New password (min 8 chars, nothing common, hidden): ', true);
  const pw2 = await ask('Repeat new password: ', true);
  const problem = passwordProblem(pw, { email: user.email, name: user.name });
  if (problem) { console.log(`${problem}. Nothing changed.`); process.exit(1); }
  if (pw !== pw2) { console.log('Passwords do not match. Nothing changed.'); process.exit(1); }

  const doc = await User.findById(user._id).select('+password');
  doc.password = pw; // pre-save hook hashes it
  doc.revokeSessions(); // every login token issued before this moment stops working
  doc.emailVerified = true;
  await doc.save();
  console.log(`\nPassword updated for ${user.email}. You can sign in now.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
