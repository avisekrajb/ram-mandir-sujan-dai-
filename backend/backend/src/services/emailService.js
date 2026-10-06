// backend/services/emailService.js
const nodemailer = require('nodemailer');

// EMAIL_DEBUG_DIR (development / tests only): messages are written as .json files in that folder
// instead of being sent, so e-mail features can be tried end to end without a mail account.
const debugDir = () => (process.env.EMAIL_DEBUG_DIR || '').trim();

// Check if email is configured
const isEmailConfigured = () => {
  if (debugDir()) return true;
  return process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your-email@gmail.com';
};

// The only extra headers a caller may add (never free-form: a header value from outside could inject more).
const ALLOWED_HEADERS = /^(List-Unsubscribe|List-Unsubscribe-Post|Precedence|X-Auto-Response-Suppress)$/i;
const cleanHeaders = (headers) => {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (ALLOWED_HEADERS.test(key) && typeof value === 'string') out[key] = value.replace(/[\r\n]+/g, ' ').slice(0, 1000);
  }
  return out;
};

// Create transporter only if configured
const createTransporter = () => {
  if (!isEmailConfigured()) {
    console.log('📧 Email not configured. Skipping email setup.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 1,
    rateLimit: true,
    // A hung connection must not hold a mailing (and its lease) for nodemailer's default 10 minutes.
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 60000,
  });
};

// Get transporter instance
let transporter = null;

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @param {Array} options.attachments - Attachments (optional)
 * @returns {Promise<Object>} Nodemailer response
 */
const sendEmail = async ({ to, subject, html, text, attachments = [], headers }) => {
  try {
    // One recipient per message, and only a plain address. A comma, semicolon, angle bracket or line
    // break in `to` would mail several people (or add headers) from the temple's address, and some
    // callers pass an address that a visitor typed.
    const recipients = Array.isArray(to) ? to : [to];
    const badRecipient = recipients.some((r) => typeof r !== 'string' || !r || r.length > 254 || /[,;<>"\r\n\s]/.test(r.trim()));
    if (badRecipient || recipients.length > 5) {
      console.error('❌ Email refused: invalid recipient');
      return { error: 'Invalid recipient', message: 'Email not sent' };
    }
    if (typeof subject === 'string') subject = subject.replace(/[\r\n]+/g, ' ');

    // Test / preview mode: write the message to a file instead of sending it.
    if (debugDir()) {
      const fs = require('fs');
      const path = require('path');
      fs.mkdirSync(debugDir(), { recursive: true });
      const safeTo = String(recipients[0]).replace(/[^a-z0-9@._+-]/gi, '_').slice(0, 80);
      const file = path.join(debugDir(), `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeTo}.json`);
      fs.writeFileSync(file, JSON.stringify({ to, subject, headers: cleanHeaders(headers), html, text: text || '' }, null, 2));
      return { messageId: 'debug-file', file };
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.log('📧 Email not configured. Would have sent:', { to, subject });
      console.log('📧 Email content preview:', html?.substring(0, 100) + '...');
      return { 
        messageId: 'skipped', 
        message: 'Email not configured - would have sent',
        to,
        subject,
      };
    }

    // Create transporter if not exists
    if (!transporter) {
      transporter = createTransporter();
      if (!transporter) {
        throw new Error('Failed to create email transporter');
      }
    }

    const mailOptions = {
      from: `"Shree Ramchandra Temple" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
    };
    const extraHeaders = cleanHeaders(headers);
    if (Object.keys(extraHeaders).length) mailOptions.headers = extraHeaders;

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return { 
      error: error.message,
      message: 'Email sending failed but operation continues',
    };
  }
};

/**
 * Send OTP email for password reset
 * @param {Object} user - User object
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} Nodemailer response
 */
const sendOtpEmail = async (user, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 25px 20px;
          text-align: center;
        }
        .header h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }
        .content {
          padding: 25px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #7A1F2B;
          text-align: center;
          padding: 15px;
          background: #f5f0ed;
          border-radius: 10px;
          letter-spacing: 10px;
          margin: 15px 0;
        }
        .warning {
          background: #FEF3C7;
          padding: 10px 14px;
          border-radius: 8px;
          border-left: 4px solid #F59E0B;
          font-size: 13px;
          color: #92400E;
        }
        .footer {
          text-align: center;
          padding: 15px;
          border-top: 1px solid #e8e4e0;
          font-size: 12px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 Password Reset OTP</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>You requested to reset your password. Use the following OTP to verify your identity:</p>
          <div class="otp-code">${otp}</div>
          <div class="warning">
            ⚠️ This OTP is valid for <strong>10 minutes</strong>.
          </div>
          <p style="font-size: 14px; color: #6b6b7a;">If you didn't request this, please ignore this email.</p>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🔐 Password Reset OTP - Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send password reset email (with link)
 * @param {Object} user - User object
 * @param {string} resetToken - Reset token
 * @param {string} frontendUrl - Frontend URL
 * @returns {Promise<Object>} Nodemailer response
 */
const sendPasswordResetEmail = async (user, resetToken, frontendUrl) => {
  const resetUrl = `${frontendUrl || process.env.FRONTEND_URL || 'http://localhost:4000'}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .btn {
          display: inline-block;
          padding: 12px 30px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 15px 0;
        }
        .btn:hover {
          background: #5B1420;
        }
        .warning {
          background: #FEF3C7;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 12px 0;
          border-left: 4px solid #F59E0B;
        }
        .warning p {
          margin: 0;
          font-size: 14px;
          color: #92400E;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>You requested to reset your password for your Shree Ramchandra Temple account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <div class="warning">
            <p>⚠️ <strong>This link expires in 30 minutes.</strong></p>
          </div>
          <p style="font-size: 14px; color: #6b6b7a;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🔐 Password Reset Request - Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send welcome email to new user
 * @param {Object} user - User object
 * @param {string} password - Temporary password (optional)
 * @returns {Promise<Object>} Nodemailer response
 */
const sendWelcomeEmail = async (user, password = null) => {
  const passwordSection = password ? `
    <div class="details">
      <h3>🔑 Temporary Password</h3>
      <div class="details-row">
        <span class="label">Password</span>
        <span class="value" style="font-family: monospace; font-size: 16px; background: #f0ede8; padding: 2px 10px; border-radius: 4px;">${password}</span>
      </div>
      <p style="font-size: 13px; color: #6b6b7a; margin-top: 8px;">Please change your password after logging in.</p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Shree Ramchandra Temple</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #7A1F2B;
        }
        .details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #7A1F2B;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-row .label {
          color: #6b6b7a;
          font-weight: 500;
        }
        .details-row .value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #5B1420;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🕉</span>
          <h1>Welcome to Shree Ramchandra Temple</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Gaushala, Kathmandu</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Welcome to the Shree Ramchandra Temple community!</p>
          <p>We are delighted to have you as a member of our temple family. Through your account, you can:</p>
          <ul style="color: #4a4a5a;">
            <li>📅 Book pujas online</li>
            <li>🙏 Make donations</li>
            <li>📋 View your booking history</li>
            <li>📸 Explore our gallery</li>
          </ul>
          
          ${passwordSection}

          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
          </div>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🕉 Welcome to Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send Google login welcome email
 * @param {Object} user - User object
 * @returns {Promise<Object>} Nodemailer response
 */
const sendGoogleWelcomeEmail = async (user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Shree Ramchandra Temple</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .google-badge {
          display: inline-block;
          background: #f1f3f4;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          color: #5f6368;
          margin: 6px 0 12px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #5B1420;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🕉</span>
          <h1>Welcome to Shree Ramchandra Temple</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Gaushala, Kathmandu</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <div class="google-badge">🔑 Signed in with Google</div>
          <p>Welcome to the Shree Ramchandra Temple community!</p>
          <p>You've successfully signed in using your Google account. We're delighted to have you as a member of our temple family.</p>
          <p>Through your account, you can:</p>
          <ul style="color: #4a4a5a;">
            <li>📅 Book pujas online</li>
            <li>🙏 Make donations</li>
            <li>📋 View your booking history</li>
            <li>📸 Explore our gallery</li>
          </ul>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
          </div>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🕉 Welcome to Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send booking confirmation email
 * @param {Object} booking - Booking object
 * @param {Object} user - User object
 * @returns {Promise<Object>} Nodemailer response
 */
const sendBookingConfirmation = async (booking, user) => {
  const statusMap = {
    pending: 'Pending ⏳',
    confirmed: 'Confirmed ✅',
    completed: 'Completed ✨',
    cancelled: 'Cancelled ❌',
  };

  const statusColors = {
    pending: '#F59E0B',
    confirmed: '#16A34A',
    completed: '#0EA5E9',
    cancelled: '#EF4444',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .header .om {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }
        .content {
          padding: 30px 25px;
        }
        .content p {
          margin: 8px 0;
          color: #4a4a5a;
        }
        .content .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #7A1F2B;
        }
        .details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #7A1F2B;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-row .label {
          color: #6b6b7a;
          font-weight: 500;
        }
        .details-row .value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          background: ${statusColors[booking.status] || '#6b6b7a'}20;
          color: ${statusColors[booking.status] || '#6b6b7a'};
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #5B1420;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="om">🕉</span>
          <h1>Puja Booking Confirmation</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Shree Ramchandra Temple, Gaushala</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Your puja has been successfully booked at <strong>Shree Ramchandra Temple</strong>.</p>
          <p style="font-size: 14px; color: #6b6b7a;">We are honored to have you with us. May Lord Ram bless you.</p>
          
          <div class="details">
            <h3>📋 Booking Details</h3>
            <div class="details-row">
              <span class="label">Puja Type</span>
              <span class="value">${escapeHtml(booking.type)}</span>
            </div>
            <div class="details-row">
              <span class="label">Date</span>
              <span class="value">${escapeHtml(booking.date)}</span>
            </div>
            <div class="details-row">
              <span class="label">Status</span>
              <span class="value"><span class="status-badge">${escapeHtml(statusMap[booking.status] || booking.status)}</span></span>
            </div>
            <div class="details-row">
              <span class="label">Booking ID</span>
              <span class="value" style="font-size: 12px; font-family: monospace;">${booking._id}</span>
            </div>
          </div>

          <p style="font-size: 14px;"><strong>📍 Important:</strong> Please arrive at the temple <strong>15 minutes</strong> before your scheduled time.</p>
          <p style="font-size: 14px;">For any changes or cancellations, please contact us at <strong>+977-1-4XXXXXX</strong>.</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/mybookings" class="btn">View My Bookings</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">🙏 Jai Shree Ram 🙏</p>
          <p style="margin: 6px 0 0;">
            <span class="temple-name">Shree Ramchandra Temple</span><br>
            Gaushala, Kathmandu, Nepal
          </p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🕉 Puja Booking Confirmation - Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send donation confirmation email
 * @param {Object} donation - Donation object
 * @param {Object} user - User object
 * @returns {Promise<Object>} Nodemailer response
 */
const sendDonationConfirmation = async (donation, user) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #1F4E3D 0%, #16382C 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #1F4E3D;
        }
        .details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #1F4E3D;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-row .label {
          color: #6b6b7a;
          font-weight: 500;
        }
        .details-row .value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #1F4E3D;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🙏 Donation Confirmation</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Thank you for your generosity</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Thank you for your generous donation of <strong>Rs. ${donation.amount?.toLocaleString() || 0}</strong> to <strong>Shree Ramchandra Temple</strong>.</p>
          <p>Your contribution helps preserve this sacred place for generations to come and supports the temple's community services.</p>
          
          <div class="details">
            <h3>📋 Donation Details</h3>
            <div class="details-row">
              <span class="label">Amount</span>
              <span class="value">Rs. ${donation.amount?.toLocaleString() || 0}</span>
            </div>
            <div class="details-row">
              <span class="label">Payment Method</span>
              <span class="value">${escapeHtml(donation.paymentMethod || "Cash")}</span>
            </div>
            <div class="details-row">
              <span class="label">Date</span>
              <span class="value">${new Date(donation.date).toLocaleDateString()}</span>
            </div>
            <div class="details-row">
              <span class="label">Donation ID</span>
              <span class="value" style="font-size: 12px; font-family: monospace;">${donation._id}</span>
            </div>
          </div>

          <p style="font-size: 16px; color: #1F4E3D; font-weight: 600; margin-top: 16px;">May Lord Ram bless you with peace, prosperity, and happiness.</p>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: '🙏 Donation Confirmation - Shree Ramchandra Temple',
    html,
  });
};

/**
 * Send donation confirmation email with PDF attachment
 * @param {Object} donation - Donation object
 * @param {Object} user - User object
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {Promise<Object>} Nodemailer response
 */
const sendDonationConfirmationWithPDF = async (donation, user, pdfBuffer) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #1F4E3D 0%, #16382C 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #1F4E3D;
        }
        .details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #1F4E3D;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-row .label {
          color: #6b6b7a;
          font-weight: 500;
        }
        .details-row .value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .pdf-note {
          background: #f0f7f4;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 12px 0;
          border-left: 4px solid #1F4E3D;
          font-size: 13px;
          color: #2d5a47;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #1F4E3D;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #1F4E3D;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #16382C;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🙏 Donation Confirmation</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Thank you for your generosity</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Thank you for your generous donation of <strong>Rs. ${donation.amount?.toLocaleString() || 0}</strong> to <strong>Shree Ramchandra Temple</strong>.</p>
          <p>Your contribution helps preserve this sacred place for generations to come and supports the temple's community services.</p>
          
          <div class="details">
            <h3>📋 Donation Details</h3>
            <div class="details-row">
              <span class="label">Amount</span>
              <span class="value">Rs. ${donation.amount?.toLocaleString() || 0}</span>
            </div>
            <div class="details-row">
              <span class="label">Payment Method</span>
              <span class="value">${escapeHtml(donation.paymentMethod || "Cash")}</span>
            </div>
            <div class="details-row">
              <span class="label">Date</span>
              <span class="value">${new Date(donation.date).toLocaleDateString()}</span>
            </div>
            <div class="details-row">
              <span class="label">Donation ID</span>
              <span class="value" style="font-size: 12px; font-family: monospace;">${donation._id}</span>
            </div>
          </div>

          <div class="pdf-note">
            📄 <strong>Attached:</strong> Your official donation receipt (PDF) is attached to this email. Please save it for your records.
          </div>

          <p style="font-size: 16px; color: #1F4E3D; font-weight: 600; margin-top: 16px;">May Lord Ram bless you with peace, prosperity, and happiness.</p>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create attachments array with PDF
  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `Donation_Receipt_${donation._id.slice(-6)}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: user.email,
    subject: '🙏 Donation Confirmation & Receipt - Shree Ramchandra Temple',
    html,
    attachments,
  });
};

/**
 * Send team member welcome email
 * @param {Object} teamMember - Team member object
 * @returns {Promise<Object>} Nodemailer response
 */
const sendTeamWelcomeEmail = async (teamMember) => {
  const nameText = teamMember.name?.en || 'Team Member';
  const roleText = teamMember.role?.en || 'Member';
  const bioText = teamMember.bio?.en || '';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Shree Ramchandra Temple Team</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #faf8f5;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .header .om {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }
        .content {
          padding: 30px 25px;
        }
        .content .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #7A1F2B;
        }
        .details h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #7A1F2B;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-row .label {
          color: #6b6b7a;
          font-weight: 500;
        }
        .details-row .value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .bio-section {
          background: #f0ede8;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 10px 0;
          font-size: 14px;
          color: #4a4a5a;
          font-style: italic;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #5B1420;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="om">🕉</span>
          <h1>Welcome to the Temple Team</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Shree Ramchandra Temple, Gaushala</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(nameText)}</strong>,</p>
          <p>We are delighted to welcome you to the <strong>Shree Ramchandra Temple</strong> team!</p>
          <p>Your dedication and service to the temple community are deeply appreciated. As a valued member of our team, you play an important role in preserving and promoting the spiritual heritage of our temple.</p>
          
          <div class="details">
            <h3>📋 Your Team Details</h3>
            <div class="details-row">
              <span class="label">Role</span>
              <span class="value">${roleText}</span>
            </div>
            ${teamMember.email ? `<div class="details-row">
              <span class="label">Email</span>
              <span class="value">${escapeHtml(teamMember.email)}</span>
            </div>` : ''}
            ${teamMember.phone ? `<div class="details-row">
              <span class="label">Phone</span>
              <span class="value">${escapeHtml(teamMember.phone)}</span>
            </div>` : ''}
          </div>

          ${bioText ? `<div class="bio-section">📝 ${bioText}</div>` : ''}

          <p style="font-size: 14px;">We look forward to working together in service of Lord Ram. Your contributions will help us continue to serve the community and preserve our sacred traditions.</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/templeteams" class="btn">View Team</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">🙏 Jai Shree Ram 🙏</p>
          <p style="margin: 6px 0 0;">
            <span class="temple-name">Shree Ramchandra Temple</span><br>
            Gaushala, Kathmandu, Nepal
          </p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: teamMember.email,
    subject: '🕉 Welcome to the Shree Ramchandra Temple Team',
    html,
  });
};

// ============================================
// CONTACT REPLY EMAIL
// ============================================

/**
 * Send contact reply email
 * @param {Object} contact - Contact message object
 * @param {string} reply - Reply message
 * @returns {Promise<Object>} Nodemailer response
 */
const sendContactReply = async (contact, reply) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reply from Shree Ramchandra Temple</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #7A1F2B 0%, #5B1420 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 12px;
        }
        .message-box {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #7A1F2B;
        }
        .message-box p {
          margin: 0;
          color: #4a4a5a;
        }
        .reply-box {
          background: #f0f7f4;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid #1F4E3D;
        }
        .reply-box p {
          margin: 0;
          color: #2d5a47;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name {
          font-weight: 600;
          color: #7A1F2B;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: #7A1F2B;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .btn:hover {
          background: #5B1420;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🙏 Reply from Shree Ramchandra Temple</h1>
          <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Thank you for reaching out to us</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <strong>${escapeHtml(contact.name)}</strong>,</p>
          <p>Thank you for your message. We have reviewed your inquiry and here is our response:</p>
          
          <div class="reply-box">
            <p><strong>📝 Our Reply:</strong></p>
            <p style="margin-top: 8px;">${escapeHtml(reply).replace(/\r?\n/g, '<br>')}</p>
          </div>
          
          <div class="message-box">
            <p><strong>📋 Your Original Message:</strong></p>
            <p style="margin-top: 8px; color: #6b6b7a;">${escapeHtml(contact.message)}</p>
          </div>
          
          <p style="font-size: 14px; color: #6b6b7a; margin-top: 16px;">
            If you have any further questions, please don't hesitate to contact us again.
          </p>
          <p style="margin-top: 16px;">Jai Shree Ram! 🙏</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
          <p style="margin: 4px 0 0;">Gaushala, Kathmandu, Nepal</p>
          <p style="margin: 10px 0 0; font-size: 11px; color: #aaa;">This is an automated email. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: contact.email,
    subject: '🙏 Reply from Shree Ramchandra Temple',
    html,
  });
};

/**
 * Escape a value for safe interpolation into the HTML email templates below.
 * Donation names, messages and rejection reasons are free text typed by donors
 * and admins, so they must never be able to inject markup.
 */
const escapeHtml = (value) =>
  String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Send the donor a modern, watermarked receipt when an admin accepts or rejects
 * their donation.
 *
 * House style for donation emails is the green family (#1F4E3D), so an accepted
 * donation keeps it. A rejection is tinted red so it reads as a refusal at a
 * glance, and both carry a large diagonal watermark.
 *
 * Gmail strips some absolutely-positioned markup, so the watermark sits inside
 * `.container` (position:relative + overflow:hidden, the latter already in use
 * by the other templates) and a tinted band backs it up if the rotated text is
 * dropped.
 *
 * @param {Object} donation
 * @param {Object} user      recipient — falls back to the donation's own contact
 * @param {Object} options   { status, rejectionReason, pdfBuffer }
 */
const sendDonationStatusEmail = async (donation, user, options = {}) => {
  const { status = 'pending', rejectionReason = '', pdfBuffer = null } = options;

  const accepted = status === 'completed';
  const rejected = status === 'rejected';

  const accent = accepted ? '#1F4E3D' : rejected ? '#B42318' : '#8A6410';
  const accentDark = accepted ? '#16382C' : rejected ? '#8A1C13' : '#6B4E0B';
  const watermark = accepted ? 'ACCEPTED' : rejected ? 'REJECTED' : 'PENDING';
  const emoji = accepted ? '✅' : rejected ? '❌' : '⏳';

  const headline = accepted
    ? 'Donation Accepted'
    : rejected
      ? 'Donation Not Accepted'
      : 'Donation Received';
  const intro = accepted
    ? 'Thank you for your generous donation. Our committee has verified your payment and accepted it.'
    : rejected
      ? 'Thank you for reaching out. After reviewing your submission, the temple committee was unable to accept this donation as submitted.'
      : 'We have received your donation details and they are awaiting review by the temple committee.';

  const recipientName = escapeHtml(user?.name || donation.name || 'Devotee');
  const to = user?.email || donation.email;
  const amount = Number(donation.amount) || 0;
  const donationId = String(donation._id || '');
  const receiptNo = `RCT-${donationId.slice(-8).toUpperCase()}`;
  const paidOn = donation.date ? new Date(donation.date).toLocaleDateString('en-GB') : '—';

  const paymentLabel =
    { esewa: 'eSewa', khalti: 'Khalti', ips: 'IPS (ConnectIPS)', bank: 'Bank Transfer', cash: 'Cash' }[
      donation.paymentMethod
    ] || donation.paymentMethod || '—';

  // Detail rows are built as a list so the optional fields can be dropped
  // without leaving empty labels behind.
  const rows = [
    ['Receipt No.', receiptNo, true],
    ['Amount', `Rs. ${amount.toLocaleString()}`, true],
    ['Payment Method', escapeHtml(paymentLabel), false],
    ['Transaction ID', escapeHtml(donation.transactionId || '—'), true],
    ['Screenshot', donation.screenshot ? 'Attached by donor' : 'Not provided', false],
    ['Donation Date', paidOn, false],
    ['Donation ID', donationId, true],
  ]
    .filter(([, value]) => value !== '' && value !== null)
    .map(
      ([label, value, mono]) => `
            <div class="details-row">
              <span class="label">${label}</span>
              <span class="value"${mono ? ' style="font-family: monospace; font-size: 13px;"' : ''}>${value}</span>
            </div>`
    )
    .join('');

  const rejectionBlock = rejected
    ? `
          <div class="alert">
            <strong>Reason:</strong>
            <div style="margin-top: 4px;">${escapeHtml(rejectionReason || 'No reason was recorded. Please contact the temple office for details.')}</div>
          </div>`
    : '';

  const proofBlock =
    donation.screenshot || donation.transactionId
      ? `
          <div class="proof">
            <strong>Your submitted proof</strong>
            ${donation.transactionId ? `<div style="margin-top:4px;">Transaction ID: <span style="font-family:monospace;">${escapeHtml(donation.transactionId)}</span></div>` : ''}
            ${donation.screenshot ? '<div style="margin-top:4px;">Payment screenshot: received</div>' : ''}
          </div>`
      : '';

  const pdfNote = pdfBuffer
    ? `<div class="proof">📄 <strong>Attached:</strong> your official donation receipt as a PDF. Please keep it for your records.</div>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${headline}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1a1a2e;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fafafa;
        }
        .container {
          position: relative;
          overflow: hidden;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        /* Repeating watermark band. Sits behind the content (z-index:0) and the
           content sits above it (z-index:1), so nothing is ever obscured. */
        .watermark {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-32deg);
          font-size: 74px;
          font-weight: 900;
          letter-spacing: 6px;
          color: ${accent};
          opacity: 0.07;
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
        }
        .content { position: relative; z-index: 1; }
        .header {
          background: linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .status-pill {
          display: inline-block;
          margin-top: 12px;
          padding: 5px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.45);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }
        .inner { padding: 30px 25px; }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0 0 12px;
        }
        .amount-hero {
          background: linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%);
          color: #fff;
          border-radius: 14px;
          padding: 18px;
          text-align: center;
          margin: 20px 0;
        }
        .amount-hero .label {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          opacity: 0.85;
        }
        .amount-hero .value {
          font-size: 30px;
          font-weight: 800;
          margin-top: 4px;
        }
        .details {
          background: #f8f5f3;
          padding: 18px 20px;
          border-radius: 12px;
          margin: 18px 0;
          border-left: 4px solid ${accent};
        }
        .details h3 {
          margin: 0 0 10px;
          font-size: 16px;
          color: ${accent};
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 0;
          border-bottom: 1px solid #e8e4e0;
          font-size: 14px;
        }
        .details-row:last-child { border-bottom: none; }
        .details-row .label { color: #6b6b7a; font-weight: 500; flex-shrink: 0; }
        .details-row .value { font-weight: 600; color: #1a1a2e; text-align: right; word-break: break-word; }
        .alert {
          background: #fef3f2;
          border: 1px solid #fda29b;
          border-left: 4px solid ${accent};
          border-radius: 10px;
          padding: 14px 16px;
          margin: 18px 0;
          font-size: 14px;
          color: #7a271a;
        }
        .proof {
          background: #f0f7f4;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 12px 0;
          border-left: 4px solid ${accent};
          font-size: 13px;
          color: #2d5a47;
        }
        .btn {
          display: inline-block;
          padding: 10px 24px;
          background: ${accent};
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e8e4e0;
          font-size: 13px;
          color: #8a8a9a;
          background: #fafafa;
        }
        .footer .temple-name { font-weight: 600; color: ${accent}; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="watermark">${watermark}</div>
        <div class="content">
          <div class="header">
            <h1>${emoji} ${headline}</h1>
            <div class="status-pill">${watermark}</div>
          </div>
          <div class="inner">
            <p class="greeting">Dear ${recipientName},</p>
            <p style="margin:0 0 12px;">${intro}</p>

            <div class="amount-hero">
              <div class="label">Donation Amount</div>
              <div class="value">Rs. ${amount.toLocaleString()}</div>
            </div>

            <div class="details">
              <h3>📋 Donation Details</h3>${rows}
            </div>

            ${rejectionBlock}
            ${proofBlock}
            ${pdfNote}

            ${
              accepted
                ? `<p style="font-size:16px;color:${accent};font-weight:600;margin-top:16px;">May Lord Ram bless you with peace, prosperity, and happiness.</p>
                   <p style="margin-top:16px;">Jai Shree Ram! 🙏</p>`
                : rejected
                  ? `<p style="margin-top:16px;">If you believe this was a mistake, or you have a corrected transaction reference or screenshot, please contact the temple office and we will review it again.</p>`
                  : `<p style="margin-top:16px;">We will email you again as soon as the committee finishes reviewing your donation.</p>`
            }

            <div style="text-align:center;margin-top:20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}" class="btn">Visit Temple Website</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin:0;"><span class="temple-name">Shree Ramchandra Temple</span></p>
            <p style="margin:4px 0 0;">Gaushala, Kathmandu, Nepal</p>
            <p style="margin:10px 0 0;font-size:11px;color:#aaa;">This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `Donation_Receipt_${donationId.slice(-6)}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to,
    subject: `${emoji} ${headline} - Rs. ${amount.toLocaleString()} - Shree Ramchandra Temple`,
    html,
    attachments,
  });
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendGoogleWelcomeEmail,
  sendBookingConfirmation,
  sendDonationConfirmation,
  sendDonationConfirmationWithPDF,
  sendDonationStatusEmail,
  sendTeamWelcomeEmail,
  sendContactReply,
  isEmailConfigured,
};