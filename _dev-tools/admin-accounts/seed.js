// Seeds the ISOLATED test database (mongodb://127.0.0.1:27600/temple_admin_test) only.
const B = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mongoose = require(B + '/node_modules/mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const URI = 'mongodb://127.0.0.1:27600/temple_admin_test';
const User = require(B + '/src/models/User');
const Booking = require(B + '/src/models/Booking');
const Donation = require(B + '/src/models/Donation');
const AdminLog = require(B + '/src/models/AdminLog');
const Notification = require(B + '/src/models/Notification');

const day = 86400000;
const ago = (d, h = 0) => new Date(Date.now() - d * day - h * 3600000);
const pw = () => crypto.randomBytes(9).toString('base64url');

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();

  const creds = {};
  const mk = async (data, key) => {
    const password = pw();
    const u = new User({ ...data, password });
    await u.save();
    if (key) creds[key] = { email: data.email, password };
    return u;
  };

  const sup = await mk({ name: 'Super Admin', email: 'super@test.local', role: 'superadmin', createdAt: ago(120) }, 'superadmin');
  const adm = await mk({ name: 'Sita Sharma', email: 'sita@test.local', role: 'admin', phone: '9801111111', address: 'Kathmandu', createdAt: ago(60) }, 'admin');
  await mk({ name: 'Ram Thapa', email: 'ram@test.local', role: 'admin', phone: '9802222222', address: 'Lalitpur', active: false, createdAt: ago(45) }, 'disabledAdmin');

  const names = ['Anita Gurung', 'Bikash Rai', 'Chandra Magar', 'Deepa Karki', 'Eshan Adhikari', 'Gita Poudel', 'Hari Basnet', 'Indira Shrestha', 'Jiwan Tamang', 'Kabita Khadka', 'Laxman Ghimire', 'Manju Joshi', 'Nabin Lama', 'Pooja Bhandari'];
  const users = [];
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    users.push(await mk({
      name: n,
      email: n.toLowerCase().replace(/ /g, '.') + '@test.local',
      phone: i % 3 === 0 ? '' : '98' + String(30000000 + i * 111111).slice(0, 8),
      address: i % 2 ? 'Bhaktapur' : 'Pokhara',
      active: i !== 5,
      isGoogleUser: i === 3,
      createdAt: ago(i < 4 ? i * 0.5 : i * 6, i),
    }));
  }

  const types = ['Puja', 'Abhishek', 'Bhandara', 'Wedding', 'Naming ceremony'];
  const st = ['pending', 'confirmed', 'completed', 'cancelled'];
  for (let i = 0; i < 18; i++) {
    const u = users[i % users.length];
    await Booking.create({ userId: u._id, name: u.name, phone: '9800000' + String(100 + i), email: u.email, date: new Date(Date.now() + (i - 6) * day).toISOString().slice(0, 10), type: types[i % types.length], description: 'Seed booking ' + i, status: st[i % st.length], createdAt: ago(i) });
  }
  const methods = ['esewa', 'khalti', 'ips', 'bank', 'cash'];
  const dst = ['completed', 'pending', 'completed', 'rejected', 'completed'];
  for (let i = 0; i < 22; i++) {
    const u = users[(i * 3) % users.length];
    await Donation.create({ userId: u._id, name: u.name, email: u.email, amount: 500 + (i % 7) * 750, paymentMethod: methods[i % methods.length], transactionId: 'TX' + (100000 + i), status: dst[i % dst.length], date: ago(i * 1.3) });
  }

  const actions = ['Settings Updated', 'Event Created', 'Gallery Photo Added', 'User Role Updated', 'Booking Status Updated', 'Donation Status Updated', 'Admin Created', 'Backup Created'];
  for (let i = 0; i < 25; i++) {
    const who = i % 4 === 0 ? sup : adm;
    await AdminLog.create({ action: actions[i % actions.length], details: { n: i }, user: { id: who._id, name: who.name, email: who.email }, adminId: who._id, createdAt: ago(i * 0.4) });
  }
  await Notification.create({ type: 'booking', title: 'New booking', message: 'Anita Gurung booked a Puja', read: false });
  await Notification.create({ type: 'donation', title: 'New donation', message: 'NPR 1,250 via eSewa', read: false });
  await Notification.create({ type: 'user', title: 'New user', message: 'Pooja Bhandari joined', read: true });

  fs.writeFileSync(path.join(__dirname, 'creds.json'), JSON.stringify(creds, null, 2));
  console.log('seeded users:', await User.countDocuments(), 'bookings:', await Booking.countDocuments(), 'donations:', await Donation.countDocuments());
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
