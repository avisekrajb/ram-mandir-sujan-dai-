// Runs before `npm run build`. A production build bakes REACT_APP_* values into the JavaScript the
// whole world downloads; if the API address is still a template placeholder, every login, booking
// and donation would be sent to a host the temple does not control. Refuse to build in that case.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const parse = (file) => {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m) out[m[1]] = m[2];
    }
  } catch { /* file not present */ }
  return out;
};

// Same precedence Create React App uses for `build`: real environment, then .env.production.local,
// .env.local, .env.production, .env.
const values = { ...parse('.env'), ...parse('.env.production'), ...parse('.env.local'), ...parse('.env.production.local'), ...process.env };

const PLACEHOLDER = /your-|changeme|example\.com|placeholder|<[a-z-]+>/i;
const problems = [];
for (const key of ['REACT_APP_API_URL', 'REACT_APP_FRONTEND_URL', 'REACT_APP_SITE_URL']) {
  const value = values[key];
  if (!value) continue;
  if (PLACEHOLDER.test(value)) problems.push(`${key} is still a placeholder (${value})`);
}
if (values.REACT_APP_API_URL && !/^https:\/\//i.test(values.REACT_APP_API_URL) && !/^\//.test(values.REACT_APP_API_URL)) {
  problems.push(`REACT_APP_API_URL must be an https:// address (got ${values.REACT_APP_API_URL})`);
}
if (/^http:\/\//i.test(values.REACT_APP_API_URL || '') && !/localhost|127\.0\.0\.1/.test(values.REACT_APP_API_URL)) {
  problems.push('REACT_APP_API_URL uses plain http:// to a public host: logins would travel unencrypted');
}

if (problems.length && process.env.ALLOW_PLACEHOLDER_ENV !== '1') {
  console.error('\n✖ Build stopped: the production settings are not ready.\n');
  problems.forEach((p) => console.error('   - ' + p));
  console.error('\nSet the real values in .env.production (or in the host\'s environment) and build again.');
  console.error('(To build anyway for a local test: set ALLOW_PLACEHOLDER_ENV=1)\n');
  process.exit(1);
}
console.log('✓ Build settings checked' + (problems.length ? ' (placeholders allowed by ALLOW_PLACEHOLDER_ENV=1)' : ''));
