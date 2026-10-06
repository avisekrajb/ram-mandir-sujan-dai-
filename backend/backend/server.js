const app = require('./src/app');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');
const { startReminderScheduler } = require('./src/services/reminderService');
const { backfillSubscribers, startNewsletterScheduler } = require('./src/services/newsletterService');
const { passwordProblem } = require('./src/utils/passwordPolicy');
const runStartupChecks = require('./src/utils/startupChecks');

const PORT = process.env.PORT || 5000;

// Create the first super admin from the environment, ONCE. If an account with that e-mail already
// exists nothing is touched: the password in the database is the real one (changed in the app),
// and this must never reset a password or promote an existing person to super admin.
const seedSuperAdmin = async () => {
  try {
    const email = String(process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
    const password = process.env.SUPERADMIN_PASSWORD || '';
    if (!email || !password) {
      console.warn('⚠️  SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set - skipping super admin seed');
      return;
    }
    const existing = await User.findOne({ email }).select('_id role');
    if (existing) {
      console.log(existing.role === 'superadmin' ? '🛡️ Super admin account present' : '⚠️  SUPERADMIN_EMAIL belongs to a non-super-admin account: left unchanged');
      return;
    }
    // A fresh live database must not start with a guessable super admin.
    if (process.env.NODE_ENV === 'production' && passwordProblem(password)) {
      console.error('❌ SUPERADMIN_PASSWORD is too weak for production (8+ characters, nothing common): super admin NOT created');
      return;
    }
    await User.create({
      name: 'Super Admin',
      email,
      password,
      role: 'superadmin',
    });
    console.log('🛡️ Super admin account created');
  } catch (error) {
    console.error('❌ Super admin seed error:', error.message);
  }
};

// Accounts that signed in with Google have already proven they own their address; the flag was added
// later, so mark the existing ones once (harmless to repeat) instead of treating them as unverified.
const backfillVerifiedGoogleAccounts = async () => {
  try {
    const result = await User.updateMany(
      { googleId: { $type: 'string' }, emailVerified: { $ne: true } },
      { $set: { emailVerified: true } }
    );
    if (result.modifiedCount) console.log(`✔ Marked ${result.modifiedCount} Google account(s) as e-mail verified`);
  } catch (error) {
    console.error('Google account backfill error:', error.message);
  }
};

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();
  await seedSuperAdmin();
  await backfillVerifiedGoogleAccounts();
  // People who subscribed before the "Stay updated" feature get a status, topics and an unsubscribe link.
  try {
    const upgraded = await backfillSubscribers();
    if (upgraded) console.log(`✔ Upgraded ${upgraded} existing subscriber(s) for the new newsletter`);
  } catch (error) {
    console.error('Subscriber backfill error:', error.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api/health`);
    runStartupChecks();
    // Email the festival / calendar reminders people asked for.
    startReminderScheduler();
    // Send the subscribers' mailings (events, blog posts, festival wishes) in the background.
    startNewsletterScheduler();
  });

  // A rejected promise inside one request handler must not take the whole site down (Express 4 does
  // not catch errors thrown in async handlers): log it and keep serving. Genuinely fatal errors
  // still end the process through the uncaughtException handler below.
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
};

startServer();