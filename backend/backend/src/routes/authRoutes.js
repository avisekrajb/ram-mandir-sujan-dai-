const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword,
  sendOtp,
  verifyOtp,
  resetPasswordOtp,
  googleLogin,
  logout,
} = require('../controllers/authController');
const { requestLoginCode, verifyLoginCode } = require('../controllers/loginCodeController');
const protect = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Brute-force protection for credential and reset endpoints.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many login attempts. Please try again in 15 minutes.' });
// Password-reset codes and links are limited per ACCOUNT as well as per address: a short numeric
// code can only be brute-forced by asking for fresh codes again and again, and every request also
// e-mails the account owner.
const emailKey = (req) => (typeof req.body?.email === 'string' && req.body.email.trim() ? req.body.email.trim().toLowerCase().slice(0, 254) : null);
const resetSendAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many reset requests for this account. Please try again in an hour.',
  keyGenerator: (req) => (emailKey(req) ? `send:${emailKey(req)}` : null),
});
const resetVerifyAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: 'Too many code attempts for this account. Please try again in an hour.',
  keyGenerator: (req) => (emailKey(req) ? `verify:${emailKey(req)}` : null),
});
// Sign-up creates rows and sends a welcome e-mail: cap it per address.
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many sign-ups from this address. Please try again later.' });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many password reset attempts. Please try again in 15 minutes.' });
// Per address the controller also caps codes (1 a minute, 5 an hour) and guesses (5 a code).
const codeRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-in code requests. Please try again in 15 minutes.' });
const codeVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many attempts. Please try again in 15 minutes.' });

// ============================================
// LOCAL AUTHENTICATION
// ============================================

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signupLimiter, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginLimiter, login); // per-account failure counting lives in the controller (utils/loginThrottle.js)

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email link
 * @access  Public
 */
router.post('/forgot-password', resetLimiter, resetSendAccountLimiter, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password/:token', resetLimiter, resetPassword);

// ============================================
// OTP PASSWORD RESET (Mobile/SPA friendly)
// ============================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP for password reset
 * @access  Public
 */
router.post('/send-otp', resetLimiter, resetSendAccountLimiter, sendOtp);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/verify-otp', resetLimiter, resetVerifyAccountLimiter, verifyOtp);

/**
 * @route   POST /api/auth/reset-password-otp
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/reset-password-otp', resetLimiter, resetPasswordOtp);

// ============================================
// GOOGLE OAUTH
// ============================================

// (The old GET /google redirect flow and its /callback were removed: see authController.)

/**
 * @route   POST /api/auth/google
 * @desc    Google login for SPA/mobile apps
 * @access  Public
 */
router.post('/google', loginLimiter, googleLogin);

// ============================================
// EMAIL CODE SIGN-IN (the way in when Google fails)
// ============================================

/**
 * @route   POST /api/auth/login-code/request
 * @desc    Email a 6-digit sign-in code
 * @access  Public
 */
router.post('/login-code/request', codeRequestLimiter, requestLoginCode);

/**
 * @route   POST /api/auth/login-code/verify
 * @desc    Check the code and sign in (creates the account for a new visitor)
 * @access  Public
 */
router.post('/login-code/verify', codeVerifyLimiter, verifyLoginCode);

// ============================================
// LOGOUT
// ============================================

/**
 * @route   GET /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.get('/logout', protect, logout);

module.exports = router;