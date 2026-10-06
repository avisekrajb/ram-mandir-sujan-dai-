// Prints loud warnings at start-up when the configuration is unsafe. It never stops the server (a
// warning you can fix beats an outage), but in production none of these should ever appear.
const IS_PRODUCTION = () => process.env.NODE_ENV === 'production';

const PLACEHOLDER_RE = /your-|changeme|change-me|example\.com|placeholder|xxxx|<[a-z-]+>/i;

const runStartupChecks = () => {
  const warnings = [];
  const env = process.env;

  if (!env.NODE_ENV) {
    warnings.push('NODE_ENV is not set. Set NODE_ENV=production on the live server (it hardens CORS, logging and error output).');
  }

  const secret = env.JWT_SECRET || '';
  if (IS_PRODUCTION()) {
    if (secret.length < 32) {
      warnings.push('JWT_SECRET is shorter than 32 characters. Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64url\'))"');
    } else if (/^[a-z-]+$/i.test(secret) || new Set(secret).size < 20) {
      warnings.push('JWT_SECRET looks like a readable phrase, not random bytes, so it can be guessed. Replace it (this signs every login).');
    }
    if (env.SUPERADMIN_PASSWORD) {
      warnings.push('SUPERADMIN_PASSWORD is still set in the environment. After the super admin exists, remove it: the password lives in the database now.');
    }
    if (!/^https:\/\//i.test(env.FRONTEND_URL || '')) {
      warnings.push('FRONTEND_URL is not an https:// address: password-reset and payment links will be wrong or insecure.');
    }
    if (!/^mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(env.MONGODB_URI || '')) {
      warnings.push('MONGODB_URI has no database name, so the app uses the default "test" database. Put a dedicated database name in the URI.');
    }
    for (const key of ['FRONTEND_URL', 'ESEWA_SUCCESS_URL', 'ESEWA_FAILURE_URL', 'KHALTI_RETURN_URL', 'KHALTI_WEBSITE_URL', 'EMAIL_USER', 'EMAIL_PASS', 'ESEWA_SECRET_KEY', 'KHALTI_SECRET_KEY']) {
      if (env[key] && PLACEHOLDER_RE.test(env[key])) warnings.push(`${key} still holds a placeholder value.`);
    }
    for (const [mode, label] of [['ESEWA_MODE', 'eSewa'], ['KHALTI_MODE', 'Khalti'], ['IPS_MODE', 'ConnectIPS']]) {
      if (env[mode] && env[mode] !== 'live') warnings.push(`${mode} is "${env[mode]}": ${label} payments run against the sandbox, not real money.`);
    }
    if (!env.BACKEND_URL) {
      warnings.push('BACKEND_URL is not set: the confirm / unsubscribe links in newsletter and reminder e-mails will point at FRONTEND_URL, which must then forward /api to this server. Set BACKEND_URL to this API\'s public https address.');
    }
    if (env.EMAIL_DEBUG_DIR) {
      warnings.push('EMAIL_DEBUG_DIR is set: e-mails are written to files instead of being sent. Remove it on the live server.');
    }
  }

  /*
   * Reported in every environment, not just production: without these, every e-mail
   * feature (sign-in code, password reset, booking / donation receipts, contact
   * replies, newsletter, reminders) quietly reports success while nothing is sent,
   * which reads as a broken site rather than a missing setting.
   */
  const mailReady = !!(env.EMAIL_DEBUG_DIR || (env.EMAIL_USER && env.EMAIL_PASS));
  if (!mailReady) {
    warnings.push(
      IS_PRODUCTION()
        ? 'EMAIL_USER / EMAIL_PASS are not set: no e-mail leaves this server, so sign-in codes, password resets, receipts, contact replies, the newsletter and reminders all fail silently. Set a Gmail address and App Password.'
        : 'EMAIL_USER / EMAIL_PASS are not set: e-mail features are disabled. Set both, or set EMAIL_DEBUG_DIR to a folder to write the messages to files while testing.'
    );
  } else if (env.EMAIL_USER && /^(your-|changeme|change-me|placeholder)/i.test(String(env.EMAIL_USER))) {
    warnings.push('EMAIL_USER still holds a placeholder value, so nothing can be sent.');
  }

  if (warnings.length) {
    console.warn('\n⚠️  SECURITY CONFIGURATION WARNINGS');
    warnings.forEach((w) => console.warn('   - ' + w));
    console.warn('');
  }
  return warnings;
};

module.exports = runStartupChecks;
