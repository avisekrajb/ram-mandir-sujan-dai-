const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const requireSuperAdmin = require('../middleware/superadmin');
const { requireArea, areaForAdminPath, requireSettingsAccess } = require('../middleware/permissions');
// `bellUpload` is the multer middleware; the controller handler below shares its
// name with the middleware export, so the middleware is aliased here.
const { upload, uploadBellSound: bellUpload } = require('../middleware/upload');
const donationAccounts = require('../controllers/donationAccountController');
const rateLimit = require('../middleware/rateLimit');
const accountCtrl = require('../controllers/accountController');

// The Facebook link resolver is public and makes an outbound request per call.
const facebookResolveLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: 'Too many requests. Please slow down.' });
const {
  // Settings
  getSettings,
  updateSettings,
  resolveFacebookUrl,
  
  // Uploads
  uploadHeroVideo,
  uploadHeroImage,
  uploadBellSound,
  deleteBellSound,
  uploadLogo,
  uploadAboutPhoto,
  uploadQRPhoto,
  uploadNoticePhoto,
  uploadTeamPhoto,
  uploadHistoryPhoto,
  uploadHistoryBanner,
  uploadEventPhoto,
  uploadGalleryPhoto,
  uploadFooterImage,
  uploadFooterVideo,
  
  // Users
  getAllUsers,

  // Bookings
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
  deleteBookingsBulk,
  
  // Donations
  getAllDonations,
  updateDonationStatus,
  deleteDonation,
  
  // History
  getHistory,
  addHistory,
  updateHistory,
  deleteHistory,
  
  // Team
  getTeam,
  getTeamById,
  addTeam,
  updateTeam,
  deleteTeam,
  followTeamMember,
  unfollowTeamMember,
  getTeamFollowers,
  incrementTeamViews,
  getTeamRoles,
  
  // Gallery
  getGallery,
  addGalleryPhoto,
  deleteGalleryPhoto,
  getGalleryVideos,
  addGalleryVideo,
  deleteGalleryVideo,
  getAllGalleryItems,
  getGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  bulkDeleteGalleryItems,
  
  // Admin Activity
  getAdminActivity,
  
  // Daily Quotes
  getDailyQuotes,
  updateDailyQuotes,
  getQuoteByDate,
  updateQuoteByDate,
  deleteQuoteByDate,
  generateDailyQuotes,
  getTodayQuote,
  getPublicQuoteByDate,
  
  // Social Links - NEW
  getSocialLinks,
  updateSocialLinks,
} = require('../controllers/adminController');

// Blog Controllers
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogPublish,
} = require('../controllers/blogController');

// Cloud Controllers
const {
  getCloudResources,
  getCloudResource,
  deleteCloudResource,
  deleteMultipleCloudResources,
  getCloudStats,
  searchCloudResources,
} = require('../controllers/cloudController');

// About Controllers
const {
  getAbout,
  updateAbout,
} = require('../controllers/aboutController');

// Event Controllers
const {
  getAllEvents,
  getUpcomingEvents,
  getPastEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Settings - public for frontend
router.get('/settings', getSettings);

// Resolve Facebook share/short links to canonical embeddable URLs (public)
router.post('/facebook/resolve', facebookResolveLimiter, resolveFacebookUrl);

// Social Links - public for frontend
router.get('/social', getSocialLinks);

// About - public for frontend
router.get('/about', getAbout);

// History - public for frontend (GET only)
router.get('/history', getHistory);

// Team - public for frontend (GET all)
router.get('/team', getTeam);

// Get team roles - PUBLIC (no auth required)
router.get('/team/roles', getTeamRoles);

// Get single team member - PUBLIC (no auth required)
router.get('/team/:id', getTeamById);

// Increment team member views - PUBLIC
router.post('/team/:id/view', incrementTeamViews);

// Get team member followers - PUBLIC
router.get('/team/:id/followers', getTeamFollowers);

// Blogs - public for frontend
router.get('/blogs', getAllBlogs);
router.get('/blogs/:id', getBlogById);

// Events - public for frontend
router.get('/events', getAllEvents);
router.get('/events/upcoming', getUpcomingEvents);
router.get('/events/past', getPastEvents);
router.get('/events/:id', getEventById);

// ============================================
// DAILY QUOTES - PUBLIC ROUTES
// ============================================

// Get today's quote - PUBLIC
router.get('/quotes/today', getTodayQuote);

// Get quote by date - PUBLIC
router.get('/quotes/public/:date', getPublicQuoteByDate);

// ============================================
// GALLERY - PUBLIC ROUTES (No authentication required)
// ============================================

// Get all gallery items - PUBLIC (no auth)
router.get('/gallery/all', getAllGalleryItems);

// Get gallery photos - PUBLIC (no auth)
router.get('/gallery', getGallery);

// Get gallery videos - PUBLIC (no auth)
router.get('/gallery/videos', getGalleryVideos);

// Get single gallery item - PUBLIC (no auth)
router.get('/gallery/:id', getGalleryItem);

// ============================================
// PROTECTED ROUTES (Authentication + Admin required)
// ============================================

// ---------- Team Follow/Unfollow Routes (any signed-in user) ----------
// Registered before the admin-only router.use() so normal users aren't 403'd.
router.post('/team/:id/follow', protect, followTeamMember);
router.post('/team/:id/unfollow', protect, unfollowTeamMember);

// All routes below require admin authentication
router.use(protect, admin);

// ...and, for admins a super administrator restricted to certain areas, access
// to the area the route belongs to (content, bookings, donations, users, system).
router.use((req, res, next) => {
  const area = areaForAdminPath(req.path);
  return area ? requireArea(area)(req, res, next) : next();
});

// ---------- Admin Activity ----------
router.get('/activity', getAdminActivity);

// ---------- Settings ----------
// Several admin pages save their own keys into this one document, so access
// is checked per key (see requireSettingsAccess), not per URL.
router.put('/settings', requireSettingsAccess, updateSettings);

// ---------- Social Links Management ----------
router.put('/social', updateSocialLinks);

// ---------- About Management ----------
router.put('/about', updateAbout);

// ---------- Blog Management ----------
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.put('/blogs/:id/toggle', toggleBlogPublish);

// ---------- Event Management ----------
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// ---------- Cloud Management ----------
router.get('/cloud/resources', getCloudResources);
router.get('/cloud/resource/:publicId', getCloudResource);
router.delete('/cloud/resource/:publicId', deleteCloudResource);
router.post('/cloud/resources/delete', deleteMultipleCloudResources);
router.get('/cloud/stats', getCloudStats);
router.get('/cloud/search', searchCloudResources);

// ---------- About Image Upload Routes ----------
// Upload hero image for about page
router.post('/upload/about/hero', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload about hero error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload section image for about page
router.post('/upload/about/section', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload about section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- History Upload Routes ----------
// Upload history banner
router.post('/upload/history-banner', upload.single('image'), uploadHistoryBanner);

// Upload history entry photo
router.post('/upload/history', upload.single('image'), uploadHistoryPhoto);

// ---------- Other Upload Routes ----------
router.post('/upload/hero', upload.single('video'), uploadHeroVideo);
// The banner photo is the alternative to the video: uploading one clears the other.
router.post('/upload/hero-photo', upload.single('image'), uploadHeroImage);

// ---------- Notification bell sound (MP3, played when a notification arrives) ----------
// Super admin only: this is the sound the whole office hears, and it is uploaded
// rather than typed, so it is not something a content admin should reach.
router.post('/bell/sound', requireSuperAdmin, bellUpload.single('audio'), uploadBellSound);
router.delete('/bell/sound', requireSuperAdmin, deleteBellSound);
router.post('/upload/logo', upload.single('image'), uploadLogo);
router.post('/upload/about', upload.single('image'), uploadAboutPhoto);
router.post('/upload/qr', upload.single('image'), uploadQRPhoto);
router.post('/upload/notice', upload.single('image'), uploadNoticePhoto);
router.post('/upload/team', upload.single('image'), uploadTeamPhoto);
router.post('/upload/event', upload.single('image'), uploadEventPhoto);
router.post('/upload/gallery', upload.single('image'), uploadGalleryPhoto);
router.post('/upload/footer', upload.single('image'), uploadFooterImage);
router.post('/upload/footer/video', upload.single('video'), uploadFooterVideo);

// ---------- Booking Background Photo Upload ----------
router.post('/upload/booking-bg', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    res.json({ url: req.file.path });
  } catch (error) {
    console.error('Upload booking bg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Daily Quotes Management (Admin Only) ----------
router.get('/quotes', getDailyQuotes);
router.put('/quotes', updateDailyQuotes);
router.get('/quotes/:date', getQuoteByDate);
router.put('/quotes/:date', updateQuoteByDate);
router.delete('/quotes/:date', deleteQuoteByDate);
router.post('/quotes/generate', generateDailyQuotes);

// ---------- Donation bank accounts (Bank Transfer Details) ----------
// These are the records the donate page actually shows. They used to be editable
// only through the super-admin routes, which left the Bank Transfer Details
// fields on Admin → Donations writing to a legacy settings trio that the public
// config ignores as soon as a real account exists. Mounted under /donations so the
// donations-area guard above applies, and sharing the super-admin handlers so
// both places behave identically.
router.get('/donations/accounts', donationAccounts.getAccounts);
router.post('/donations/accounts', donationAccounts.createAccount);
router.put('/donations/accounts/:id', donationAccounts.updateAccount);
router.delete('/donations/accounts/:id', donationAccounts.deleteAccount);
router.get('/donations/config', donationAccounts.getDonationConfigAdmin);

// ---------- User Management ----------
router.get('/users', getAllUsers);
router.put('/users/:id/role', accountCtrl.setRole);
router.delete('/users/:id', accountCtrl.deleteAccount);

// ---------- Booking Management ----------
router.get('/bookings', getAllBookings);
router.put('/bookings/:id/status', updateBookingStatus);
// Bulk first: a DELETE to /bookings/:id would otherwise never be reached for
// this path, and the single-id route must not be able to swallow it.
router.delete('/bookings', deleteBookingsBulk);
router.delete('/bookings/:id', deleteBooking);

// ---------- Donation Management ----------
router.get('/donations', getAllDonations);
router.put('/donations/:id/status', updateDonationStatus);
router.delete('/donations/:id', deleteDonation);

// ---------- History Management (Protected Admin Routes) ----------
// GET is public (defined above), but POST, PUT, DELETE are admin only
router.post('/history', addHistory);
router.put('/history/:id', updateHistory);
router.delete('/history/:id', deleteHistory);

// ---------- Team Management (Protected Admin Routes) ----------
// GET all and GET by ID are public (defined above)
// POST, PUT, DELETE are admin only
router.post('/team', addTeam);
router.put('/team/:id', updateTeam);
router.delete('/team/:id', deleteTeam);

// ---------- Gallery Management (Protected Admin Routes) ----------
router.post('/gallery', upload.single('photo'), addGalleryPhoto);
router.post('/gallery/videos', addGalleryVideo);
router.post('/gallery/video', upload.single('video'), addGalleryVideo);
router.put('/gallery/:id', updateGalleryItem);
// Literal paths must be registered before /gallery/:id, or "bulk" is cast as an id.
router.delete('/gallery/bulk', bulkDeleteGalleryItems);
router.delete('/gallery/videos/:id', deleteGalleryVideo);
router.delete('/gallery/:id', deleteGalleryItem);

module.exports = router;