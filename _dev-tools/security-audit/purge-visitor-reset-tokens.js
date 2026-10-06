// For the OWNER: removes password-reset secrets that older versions of the site wrote into the visitor
// analytics table (the page address /reset-password/<secret> was stored as-is). New visits no longer store it.
//
//   cd backend\backend
//   node ..\..\_dev-tools\security-audit\purge-visitor-reset-tokens.js            (dry run: only counts)
//   node ..\..\_dev-tools\security-audit\purge-visitor-reset-tokens.js --apply    (masks them)
//
// Only the `visitors` collection is touched, and only the `page`, `entryPage`, `exitPage` and `referrer` fields of rows that
// contain "/reset-password/<something>"; the secret part is replaced by ":token". Old reset links expire after 30 minutes
// anyway, so this is housekeeping, not an emergency.
const path = require('path');
const BACKEND = path.resolve(process.cwd());
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require(path.join(BACKEND, 'node_modules', 'dotenv')).config({ path: path.join(BACKEND, '.env') });
const mongoose = require(path.join(BACKEND, 'node_modules', 'mongoose'));

const apply = process.argv.includes('--apply');
const FIELDS = ['page', 'entryPage', 'exitPage', 'referrer'];
const secretRe = /(\/reset-password\/)(?!:token)[^?#\s]+/gi;

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not found: run this from backend\\backend');
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('visitors');
  const filter = { $or: FIELDS.map((f) => ({ [f]: { $regex: '/reset-password/(?!:token)', $options: 'i' } })) };
  const rows = await col.find(filter, { projection: Object.fromEntries(FIELDS.map((f) => [f, 1])) }).toArray();
  console.log(`${rows.length} visitor row(s) contain a reset link secret.`);
  if (apply) {
    for (const r of rows) {
      const set = {};
      for (const f of FIELDS) if (typeof r[f] === 'string' && secretRe.test(r[f])) set[f] = r[f].replace(secretRe, '$1:token');
      secretRe.lastIndex = 0;
      if (Object.keys(set).length) await col.updateOne({ _id: r._id }, { $set: set });
    }
    console.log('Masked.');
  } else if (rows.length) {
    console.log('Dry run: nothing changed. Run again with --apply to mask them.');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
