// usage: node mint.js <email>  -> prints JSON {token,user} for the ISOLATED test instance
const B = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(B + '/node_modules/mongoose');
const jwt = require(B + '/node_modules/jsonwebtoken');
const User = require(B + '/src/models/User');
(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27600/temple_admin_test');
  const u = await User.findOne({ email: process.argv[2] });
  if (!u) { console.error('no user'); process.exit(1); }
  const token = jwt.sign({ id: u._id }, 'isolated-test-secret-5600', { expiresIn: '1d' });
  const user = { id: u._id, _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, profilePhoto: u.profilePhoto };
  console.log(JSON.stringify({ token, user }));
  await mongoose.disconnect();
})();
