require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('./src/config/database');

(async () => {
  await connect();
  const col = mongoose.connection.collection('adminsettings');
  const doc = await col.findOne({});
  const json = JSON.stringify(doc);
  console.log('document contains "probe":', json.includes('probe'));
  const footer = doc.footer || {};
  console.log('footer sub-keys present:', Object.keys(footer).length);
  console.log('footerText keys:', Object.keys(footer.footerText || {}));
  console.log('madeBy.logo:', (footer.madeBy || {}).logo);
  console.log('hero keys:', Object.keys(doc.hero || {}).length);
  console.log('header.topBar:', JSON.stringify((doc.header || {}).topBar));
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('failed:', e.message); process.exit(1); });