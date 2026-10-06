// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const {
  sendEmail, 
  sendOtpEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail,
  sendGoogleWelcomeEmail,
  sendBookingConfirmation,
  sendDonationConfirmation,
  sendTeamWelcomeEmail,
  sendContactReply
} = require('../services/emailService');
const { createNotification } = require('./notificationController');
const bcrypt = require('bcryptjs');
const { passwordProblem } = require('../utils/passwordPolicy');
const escapeHtml = require('../utils/escapeHtml');
const validator = require('validator');
const { lockedForSeconds, recordFailure, clearFailures } = require('../utils/loginThrottle');

// Compared against when the e-mail is unknown, so "no such account" takes as long as "wrong
// password" and the response time does not reveal which addresses are registered.
const TIMING_DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

// Shown for every password-reset request, registered address or not.
const RESET_SENT_MESSAGE = 'If an account exists for that email, a message with the next step is on its way.';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Remember when and from where an account last signed in. Uses updateOne so it
// never runs the save hooks or validators, and a failure never blocks sign-in.
const recordLogin = async (user, req) => {
  try {
    const ip = String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), lastLoginIp: ip }, $inc: { loginCount: 1 } }
    );
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    user.loginCount = (user.loginCount || 0) + 1;
  } catch (e) {
    console.error('recordLogin error:', e.message);
  }
};

// ============================================
// LOCAL AUTHENTICATION
// ============================================

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    // Everything arrives as text: objects/arrays in these fields are never legitimate.
    if ([name, email, password].some((v) => typeof v !== 'string') ||
        [phone, address].some((v) => v !== undefined && v !== null && typeof v !== 'string')) {
      return res.status(400).json({ success: false, message: 'Invalid sign-up details' });
    }
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    // Same limits as the User model (2-50 characters, a real e-mail address), so nothing that passes
    // here can fail later as a "Server error".
    if (cleanName.length < 2 || cleanName.length > 50) {
      return res.status(400).json({ success: false, message: 'Please enter your name (2 to 50 characters)' });
    }
    if (cleanEmail.length > 254 || !validator.isEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if ((phone || '').length > 30 || (address || '').length > 300) {
      return res.status(400).json({ success: false, message: 'Phone or address is too long' });
    }
    const passwordError = passwordProblem(password, { email: cleanEmail, name: cleanName });
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      phone: (phone || '').trim(),
      address: (address || '').trim(),
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    // Notify admins about new devotee registration
    await createNotification(
      'user',
      'New Devotee Registered',
      `${user.name} joined the temple community`,
      { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt }
    );

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Welcome email error:', emailError.message);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during signup' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // The super admin signs in like everyone else, with the password stored in the database.
    // (This route used to rewrite that password from SUPERADMIN_PASSWORD on EVERY attempt, so a
    // password changed in the app was silently undone and the .env value stayed the real key.
    // The account is now only created, once, at start-up: see server.js.)

    // Too many wrong passwords for this account (from anywhere) in the last 15 minutes: wait.
    // Checked before any password work, and the same answer for addresses that do not exist.
    const waitSeconds = lockedForSeconds(normalizedEmail);
    if (waitSeconds > 0) {
      res.set('Retry-After', String(waitSeconds));
      return res.status(429).json({
        success: false,
        message: 'Too many failed sign-in attempts for this account. Please try again in a few minutes, or sign in with Google or an e-mailed code.',
      });
    }

    // The attempt is counted BEFORE the (slow) password check and cleared again on success. Counting
    // afterwards would let a burst of parallel guesses all pass the lock check above before the first
    // one is recorded.
    recordFailure(normalizedEmail);

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      await bcrypt.compare(password, TIMING_DUMMY_HASH);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    clearFailures(normalizedEmail);

    // Block disabled admin accounts (superadmin can never be disabled)
    if (user.active === false && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Contact the super administrator.',
      });
    }

    // Generate token
    const token = generateToken(user._id);
    await recordLogin(user, req);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    // Sliding session: the web app calls this on every page load, so a token
    // that is past roughly a third of its life is swapped for a fresh one. Anyone
    // who comes back within the token lifetime (admins and visitors alike) stays
    // signed in without ever seeing the login form again.
    const RENEW_WHEN_LEFT_S = 20 * 24 * 60 * 60;
    const secondsLeft = req.tokenExp ? req.tokenExp - Math.floor(Date.now() / 1000) : 0;
    const payload = { success: true, user };
    if (secondsLeft < RENEW_WHEN_LEFT_S) {
      payload.token = generateToken(user._id);
    }
    res.json(payload);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Forgot password (send reset link - legacy)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Same answer whether or not the address has an account, so this form cannot be used to
    // find out who is registered.
    if (!user) {
      return res.json({ success: true, message: RESET_SENT_MESSAGE });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Answer now and send the e-mail afterwards: if the reply waited for the mail server, a known
    // address would take seconds longer than an unknown one and the form would give away who is
    // registered (and a mail failure would only ever show for real accounts).
    res.json({
      success: true,
      message: RESET_SENT_MESSAGE
    });

    try {
      await sendPasswordResetEmail(user, resetToken, process.env.FRONTEND_URL);
    } catch (emailError) {
      console.error('❌ Password reset email error:', emailError.message);
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Reset password (with token - legacy)
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const passwordError = passwordProblem(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.emailVerified = true; // the reset link went to this address: its owner has proven control of it
    user.revokeSessions(); // a reset ends every session signed in with the old password
    await user.save();

    // Send password change confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: '🔐 Password Changed - Shree Ramchandra Temple',
        html: `
          <h2>Password Changed Successfully</h2>
          <p>Dear ${escapeHtml(user.name)},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you did not make this change, please contact us immediately.</p>
          <p>Jai Shree Ram! 🙏</p>
        `,
      });
    } catch (emailError) {
      console.error('Password change confirmation email error:', emailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// ============================================
// OTP Password Reset (Mobile/SPA friendly)
// ============================================

// @desc    Send OTP for password reset
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 254 || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Same answer whether or not the address has an account (no registered-address lookup).
    if (!user) {
      return res.json({ success: true, message: 'OTP sent to your email' });
    }

    // Generate OTP (6 digits)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store OTP in user document (with expiry)
    const hashedOtp = crypto
      .createHash('sha256')
      .update(otp + process.env.JWT_SECRET)
      .digest('hex');
    
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.resetOtpAttempts = 0;
    await user.save();

    // Answer now, send the e-mail afterwards (see forgotPassword): the reply must take the same time
    // for a registered and an unregistered address.
    res.json({
      success: true,
      message: 'OTP sent to your email',
    });

    try {
      const emailResult = await sendOtpEmail(user, otp);
      if (emailResult && emailResult.error) throw new Error(emailResult.error);
    } catch (emailError) {
      console.error('❌ OTP email error:', emailError.message);
      // The code never reached the owner: void it (only if it is still the one we stored).
      await User.updateOne(
        { _id: user._id, resetPasswordToken: hashedOtp },
        { $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 } }
      ).catch(() => {});
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again later.' 
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== 'string' || typeof otp !== 'string' || !email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const hashedOtp = crypto
      .createHash('sha256')
      .update(otp + process.env.JWT_SECRET)
      .digest('hex');

    // Every guess is counted FIRST, in one atomic step that only matches while guesses are left, so
    // however many requests arrive at once no more than MAX_OTP_ATTEMPTS codes are ever checked.
    const MAX_OTP_ATTEMPTS = 5;
    const user = await User.findOneAndUpdate(
      {
        email: email.toLowerCase().trim(),
        resetPasswordExpire: { $gt: Date.now() },
        resetPasswordToken: { $type: 'string' },
        resetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $inc: { resetOtpAttempts: 1 } },
      { new: true }
    );

    const given = Buffer.from(hashedOtp, 'hex');
    const stored = user ? Buffer.from(user.resetPasswordToken, 'hex') : null;
    const matches = !!stored && stored.length === given.length && crypto.timingSafeEqual(stored, given);
    if (!user || !matches) {
      if (user && user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        // Out of guesses: the code is void; a new one has to be requested.
        await User.updateOne(
          { _id: user._id },
          { $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 }, $set: { resetOtpAttempts: 0 } }
        );
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // One-time use: clear the OTP once it has been accepted.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    // Generate temporary reset token (valid for 10 minutes). The purpose claim
    // keeps it from being usable as a login token and vice versa.
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      resetToken,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP. Please try again.' 
    });
  }
};

// @desc    Reset password with OTP and auto-login
// @route   POST /api/auth/reset-password-otp
// @access  Public
exports.resetPasswordOtp = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password || typeof resetToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reset token and password are required'
      });
    }

    const passwordError = passwordProblem(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset token' 
      });
    }

    // A reset token works once: it is dead as soon as the password (and with it every session)
    // has been changed after the token was issued.
    // (<= : a token issued in the very second of the last password change is dead too.)
    if (user.tokensValidAfter && decoded.iat * 1000 <= user.tokensValidAfter.getTime()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please request a new OTP.' });
    }

    // Update password (the policy also refuses a password that contains the account's e-mail name)
    const policyError = passwordProblem(password, { email: user.email, name: user.name });
    if (policyError) {
      return res.status(400).json({ success: false, message: policyError });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.emailVerified = true; // the code was e-mailed to this address: its owner has proven control of it
    user.revokeSessions(); // the fresh token issued below is the only one that survives
    await user.save();

    // Send password change confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: '🔐 Password Changed Successfully - Shree Ramchandra Temple',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa; }
              .container { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%); color: white; padding: 30px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
              .content { padding: 30px 25px; }
              .greeting { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-bottom: 12px; }
              .success-box { background: #f0f7f4; padding: 18px 20px; border-radius: 12px; margin: 18px 0; border-left: 4px solid #16A34A; }
              .success-box p { margin: 0; color: #2d5a47; }
              .footer { text-align: center; padding: 20px; border-top: 1px solid #e8e4e0; font-size: 13px; color: #8a8a9a; background: #fafafa; }
              .footer .temple-name { font-weight: 600; color: #7A1F2B; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔐</span>
                <h1>Password Changed Successfully</h1>
              </div>
              <div class="content">
                <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
                <div class="success-box">
                  <p><strong>✅ Your password has been successfully changed.</strong></p>
                </div>
                <p>You are now logged in to your account with your new password.</p>
                <p>If you did not make this change, please contact us immediately.</p>
                <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
              </div>
              <div class="footer">
                <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
                <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error('Password change confirmation email error:', emailError.message);
      // Don't fail the request if email fails
    }

    // Generate JWT token for auto-login
    const token = generateToken(user._id);
    user.password = undefined;

    res.json({
      success: true,
      message: 'Password reset successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Reset password OTP error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token. Please request a new OTP.' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    });
  }
};

// ============================================
// Google OAuth
// ============================================

// The old redirect flow (GET /api/auth/google and its /callback) was removed on purpose: nothing
// in the web app used it, it put the login token in the address bar (browser history, referrer
// headers, server logs) and linked accounts by e-mail address alone. Sign-in with Google is the
// POST below, which verifies the token with Google.

// @desc    Google login (for mobile/SPA)
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 50) : '';
    // The photo address is stored and shown in the admin panel, so only Google's own picture host is
    // accepted: any other address would let a visitor make admins' browsers load their server.
    let profilePhoto = null;
    if (typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.length <= 512) {
      try {
        const photo = new URL(req.body.profilePhoto);
        if (photo.protocol === 'https:' && /(^|\.)googleusercontent\.com$/i.test(photo.hostname)) profilePhoto = photo.href;
      } catch { /* not a URL: ignored */ }
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Google access token is required'
      });
    }

    // Never trust client-supplied identity: ask Google who this token belongs
    // to and make sure it was issued to this app's OAuth client.
    let tokenInfo;
    try {
      const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { access_token: accessToken },
        timeout: 10000,
      });
      tokenInfo = data;
    } catch (verifyError) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    const tokenClient = tokenInfo.aud || tokenInfo.azp;
    const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true';
    if (!expectedClientId || tokenClient !== expectedClientId || !tokenInfo.email || !tokenInfo.sub || !emailVerified) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const email = String(tokenInfo.email).toLowerCase();
    const googleId = String(tokenInfo.sub);

    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    // A suspended account cannot sign in with Google either; checked before anything
    // is linked or emailed to it.
    if (user && user.active === false && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Contact the temple office.',
      });
    }

    if (!user) {
      // Create new Google user
      user = new User({
        name: name || email.split('@')[0] || 'Google User',
        email: email,
        googleId: googleId,
        profilePhoto: profilePhoto || null,
        phone: '',
        address: '',
        password: crypto.randomBytes(24).toString('hex'),
        role: 'user',
        isGoogleUser: true,
        emailVerified: true,
      });
      await user.save();

      // Notify admins about new Google signup
      await createNotification(
        'user',
        'New Devotee Registered (Google)',
        `${user.name} joined the temple community via Google`,
        { id: user._id, name: user.name, email: user.email, phone: '', role: user.role, createdAt: user.createdAt }
      );

      // Send welcome email for Google user
      try {
        await sendGoogleWelcomeEmail(user);
        console.log(`✅ Welcome email sent to Google user ${user.email}`);
      } catch (emailError) {
        console.error('❌ Google welcome email error:', emailError.message);
      }
    } else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = googleId;
      user.isGoogleUser = true;
      if (!user.profilePhoto && profilePhoto) {
        user.profilePhoto = profilePhoto;
      }
      // Sign-up never proves that the address belongs to the person typing it, so someone could have
      // registered THIS e-mail first with a password of their own. Google has just proven who really
      // owns it: for an ordinary account the old password is replaced by an unknown one and every
      // session started with it ends. (They can use Google, or "Forgot password", from here on.)
      // Staff accounts are made by the super admin, so those are not touched.
      const passwordReplaced = user.role === 'user' && !user.emailVerified;
      if (passwordReplaced) {
        user.password = crypto.randomBytes(24).toString('hex');
        user.revokeSessions(); // not "strict": the token issued below, in this same request, must survive
      }
      user.emailVerified = true;
      await user.save();

      // Send notification that Google account was linked
      try {
        await sendEmail({
          to: user.email,
          subject: '🔗 Google Account Linked - Shree Ramchandra Temple',
          html: `
            <h2>Google Account Linked</h2>
            <p>Dear ${escapeHtml(user.name)},</p>
            <p>Your Google account has been successfully linked to your Shree Ramchandra Temple account.</p>
            <p>You can now sign in using Google.</p>
            ${passwordReplaced ? '<p>For your security the old password of this account was removed. If you want to sign in with a password again, use "Forgot password" to choose a new one.</p>' : ''}
            <p>Jai Shree Ram! 🙏</p>
          `,
        });
      } catch (emailError) {
        console.error('Link notification email error:', emailError.message);
      }
    }

    const token = generateToken(user._id);
    await recordLogin(user, req);
    user.password = undefined;

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google login'
    });
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  // Tokens are stateless: the browser forgets its copy. (Ending every session of an account,
  // including stolen tokens, is "sign out everywhere": POST /api/admin/profile/revoke-sessions.)
  res.json({ success: true, message: 'Logged out successfully' });
};

// Shared with controllers/loginCodeController.js (sign in with an email code), so a
// session started that way is issued and recorded exactly like a password one.
exports.generateToken = generateToken;
exports.recordLogin = recordLogin;

// ============================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================

// @desc    Check if email exists
// @route   POST /api/auth/check-email
// @access  Public
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    res.json({
      success: true,
      exists: !!user,
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Send welcome email again
    try {
      await sendWelcomeEmail(user);
      console.log(`✅ Verification email resent to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Resend verification email error:', emailError.message);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email' 
      });
    }

    res.json({ 
      success: true,
      message: 'Verification email sent' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};