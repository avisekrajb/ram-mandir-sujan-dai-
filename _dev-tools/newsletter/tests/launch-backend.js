// Newsletter test backend: ISOLATED db (nl_test on the throw-away mongod :27700), every real secret overridden,
// and e-mails WRITTEN TO FILES (EMAIL_DEBUG_DIR) instead of being sent, so every message can be read.
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const path = require('path');
Object.assign(process.env, {
  PORT: process.env.SEC_PORT || '5700',
  NODE_ENV: process.env.SEC_MODE || 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:27700/nl_test',
  JWT_SECRET: 'nl-test-secret-not-real-0123456789abcdef',
  JWT_EXPIRE: '30d',
  FRONTEND_URL: process.env.SEC_FRONTEND || 'https://temple.example.test',
  BACKEND_URL: process.env.SEC_BACKEND || 'http://127.0.0.1:5700',
  CORS_ORIGINS: process.env.SEC_CORS || 'http://localhost:4200',
  SUPERADMIN_EMAIL: 'super@test.local',
  SUPERADMIN_PASSWORD: 'SuperTest#12345',
  EMAIL_USER: '', EMAIL_PASS: '',
  EMAIL_DEBUG_DIR: path.join(__dirname, 'mail'),
  NEWSLETTER_DELAY_MS: '0',
  CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
  ESEWA_MERCHANT_ID: '', ESEWA_SECRET_KEY: '', ESEWA_MPIN: '', ESEWA_MODE: 'test',
  KHALTI_SECRET_KEY: '', KHALTI_MODE: 'test',
  IPS_MERCHANT_ID: '', IPS_APP_ID: '', IPS_APP_NAME: '', IPS_PASSWORD: '', IPS_PRIVATE_KEY: '', IPS_MODE: 'test',
  GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_CALLBACK_URL: '', FB_PAGE_TOKEN: '',
});
process.chdir(BACKEND);
require(BACKEND + '/server.js');
