require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('./src/config/database');
const User = require('./src/models/User');

(async () => {
  await connect();
  const email = process.argv[2];
  const res = await User.updateOne(
    { email },
    { $set: { mustChangePassword: false }, $setOnInsert: {} }
  );
  console.log(`cleared mustChangePassword for ${email}: matched ${res.matchedCount}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('failed:', e.message);
  process.exit(1);
});