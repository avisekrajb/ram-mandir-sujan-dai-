const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const securityHeaders = require('./middleware/securityHeaders');
const sanitizeInput = require('./middleware/sanitizeInput');
const rejectUnsafeUrls = require('./middleware/rejectUnsafeUrls');
const rateLimit = require('./middleware/rateLimit');

// Load environment variables
dotenv.config();

// Tokens are signed with JWT_SECRET; refuse to start with a missing or
// guessable secret rather than silently using a default.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  throw new Error('JWT_SECRET must be set (at least 16 characters) before starting the server');
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();

// Do not advertise the framework.
app.disable('x-powered-by');

// Behind a reverse proxy (Render, nginx, Cloudflare) the socket address is the proxy's, so every
// visitor would share one rate-limit bucket and logs/audit trails would record the proxy.
// TRUST_PROXY = number of proxy hops to trust ("1" on Render), "true"/"false", or a subnet list.
// Default: one hop in production, none in development. Do NOT trust more hops than really exist,
// or visitors can spoof their address with an X-Forwarded-For header.
const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return IS_PRODUCTION ? 1 : false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

app.use(securityHeaders({ production: IS_PRODUCTION }));

// ============================================
// CORS CONFIGURATION
// ============================================
// The site's own address(es): FRONTEND_URL plus anything listed in CORS_ORIGINS (comma separated).
// Local development origins are only trusted outside production.
const splitList = (value) => String(value || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
const TEMPLE_ORIGINS = [
  'https://ramchandratemple.org.np',
  'https://www.ramchandratemple.org.np',
  'https://shree-ramchandra-temple.onrender.com',
];
const allowedOrigins = [
  ...splitList(process.env.FRONTEND_URL),
  ...splitList(process.env.CORS_ORIGINS),
  ...TEMPLE_ORIGINS,
  ...(IS_PRODUCTION ? [] : ['http://localhost:4000', 'http://localhost:3000']),
];

// Private/LAN addresses, e.g. http://192.168.1.107:4000 when testing on a phone
// on the same network. Only trusted in development.
const isPrivateOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '[::1]' ||
      hostname === '::1' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

const corsOptionsFor = (origin) => ({
  origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, corsOptionsFor(true));
  if (allowedOrigins.indexOf(origin) !== -1) return callback(null, corsOptionsFor(true));
  // The API's own pages (e.g. the "stop this reminder" page, which posts back to the API) send
  // their own address as Origin: that is the same site, not a cross-site call.
  try {
    if (new URL(origin).host === req.headers.host) return callback(null, corsOptionsFor(true));
  } catch { /* not a URL: falls through to refusal */ }
  // LAN/localhost origins are for local testing only; arbitrary origins are
  // never trusted with credentials, even if NODE_ENV was left unset.
  if (!IS_PRODUCTION && isPrivateOrigin(origin)) return callback(null, corsOptionsFor(true));
  console.warn(`⚠️ CORS blocked origin: ${String(origin).slice(0, 200)}`);
  const blocked = new Error('Origin not allowed');
  blocked.statusCode = 403;
  return callback(blocked);
}));

// A generous ceiling for the whole API per address (an ordinary visitor makes a few dozen
// requests a minute); the sensitive routes add their own, much stricter limits. It runs BEFORE the
// body is read and scanned, so a client that is over its allowance costs the server almost nothing.
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 600, message: 'Too many requests. Please slow down and try again shortly.' }));

// ============================================
// BODY PARSER
// ============================================
// Files go through multer (multipart, own 50MB limit), so JSON bodies only
// carry text: the largest real payload is the settings document (~100 KB).
// 50MB let any client make the server buffer and parse huge bodies.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Drop MongoDB operator keys ({"$ne": ...}) and prototype-pollution keys from every request body
// and query string before any controller sees them.
app.use(sanitizeInput);
// ...and refuse `javascript:` style addresses in anything an admin or visitor saves.
app.use('/api', rejectUnsafeUrls);

// ============================================
// STATIC FILES (for uploaded files)
// ============================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { index: false, dotfiles: 'deny' }));

// ============================================
// LOGGING MIDDLEWARE
// ============================================
const STATIC_ASSET_RE = /\.(?:jpg|jpeg|png|gif|webp|svg|avif|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|mp3|pdf|txt|xml)$/i;

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Skip static assets: browsers retry missing images constantly and it drowns
    // out the API traffic. Those requests are served by the frontend, not the API.
    // Path only: the query string can carry a phone number or a booking reference.
    if (!STATIC_ASSET_RE.test(req.path)) {
      console.log(`📝 ${req.method} ${req.path}`);
    }
    next();
  });
} else {
  // Production logging (only errors). The path, never the query string: addresses such as
  // /temple-bookings/lookup?ref=...&phone=... would put personal data into the logs.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.error(`❌ ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Auth Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// User Routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Account management (users, admins, access areas, sessions)
const accountRoutes = require('./routes/accountRoutes');
app.use('/api/admin/accounts', accountRoutes);

// Admin Routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Admin Profile Routes
const adminProfileRoutes = require('./routes/adminProfileRoutes');
app.use('/api/admin/profile', adminProfileRoutes);

// Admin Activity Log Routes
const adminLogRoutes = require('./routes/adminLogRoutes');
app.use('/api/admin/activity', adminLogRoutes);

// Backup Routes
const backupRoutes = require('./routes/backupRoutes');
app.use('/api/admin/backup', backupRoutes);

// Super Admin Routes
const superAdminRoutes = require('./routes/superAdminRoutes');
app.use('/api/superadmin', superAdminRoutes);

// About Routes
const aboutRoutes = require('./routes/aboutRoutes');
app.use('/api/about', aboutRoutes);

// Event Routes
const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);

// Booking Routes
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// Public bookings from the Events page (no login) + their admin management
const templeBookingRoutes = require('./routes/templeBookingRoutes');
app.use('/api/temple-bookings', templeBookingRoutes);

// Donation Routes
const donationRoutes = require('./routes/donationRoutes');
app.use('/api/donations', donationRoutes);

// Gallery Routes
const galleryRoutes = require('./routes/galleryRoutes');
app.use('/api/gallery', galleryRoutes);

// Contact Routes
const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);

// Review Routes - visitor reviews shown on the Contact page (admin-approved)
const reviewRoutes = require('./routes/reviewRoutes');
app.use('/api/reviews', reviewRoutes);

// Visitor Routes - For tracking website visitors
const visitorRoutes = require('./routes/visitorRoutes');
app.use('/api/visitors', visitorRoutes);

// Subscribe Routes - "Stay updated" on every page (public, double opt-in) + confirm / unsubscribe pages
const subscribeRoutes = require('./routes/subscribeRoutes');
app.use('/api/subscribe', subscribeRoutes);

// Newsletter admin (Admin -> Subscribers & mail): subscribers, mailings, festival wishes
const newsletterAdminRoutes = require('./routes/newsletterAdminRoutes');
app.use('/api/newsletter', newsletterAdminRoutes);

// Reminder Routes - festival / calendar email reminders (signed-in; public unsubscribe page)
const reminderRoutes = require('./routes/reminderRoutes');
app.use('/api/reminders', reminderRoutes);

// Payment Routes
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);

// Team Routes - For team member management
const teamRoutes = require('./routes/teamRoutes');
app.use('/api/team', teamRoutes);

// Notification Routes - For admin notifications
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/admin/notifications', notificationRoutes);

// Chatbot Routes - For persisting chatbot messages
const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', chatbotRoutes);

// Live: is the Facebook page live now, and its recent past lives (public)
const liveRoutes = require('./routes/liveRoutes');
app.use('/api/live', liveRoutes);

// Maintenance Mode (public status - no auth required)
const superAdminController = require('./controllers/superAdminController');
app.get('/api/maintenance', superAdminController.getPublicMaintenanceMode);

// ============================================
// HEALTH & ROOT ENDPOINTS
// ============================================

// Health check for Render. Deliberately tiny: memory use, uptime, environment name and version are
// useful to an attacker (timing a restart, picking exploits) and not needed by a load balancer.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Shree Ramchandra Temple API', status: 'running' });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    // The path is not echoed back: it is attacker-controlled text inside a response.
    message: 'Route not found',
  });
});

// ============================================
// ERROR HANDLER
// ============================================
const errorHandler = require('./middleware/errorHandler');
const { handleMulterError } = require('./middleware/upload');
// Turn upload failures (too large, wrong type) into 400s with a clear message
// instead of the generic 500.
app.use(handleMulterError);
app.use(errorHandler);

module.exports = app;
