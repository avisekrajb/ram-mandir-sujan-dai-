// Starts the temple backend against the ISOLATED local mongod on :27700 (db sec_audit_test).
// Every real secret / gateway / mail / cloud setting is overridden BEFORE dotenv runs, so the
// real .env can never take effect (dotenv does not override variables that are already set).
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const mode = process.env.SEC_MODE || 'production';
Object.assign(process.env, {
  PORT: process.env.SEC_PORT || '5700',
  NODE_ENV: mode,
  MONGODB_URI: 'mongodb://127.0.0.1:27700/sec_audit_test',
  JWT_SECRET: 'sec-audit-test-secret-not-real-0123456789',
  JWT_EXPIRE: '30d',
  FRONTEND_URL: 'https://temple.example.test',
  CORS_ORIGINS: process.env.SEC_CORS || 'http://localhost:4200',
  SUPERADMIN_EMAIL: 'super@test.local',
  SUPERADMIN_PASSWORD: 'SuperTest#12345',
  EMAIL_USER: '', EMAIL_PASS: '',
  CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
  ESEWA_MERCHANT_ID: '', ESEWA_SECRET_KEY: '', ESEWA_MPIN: '', ESEWA_MODE: 'test',
  KHALTI_SECRET_KEY: '', KHALTI_MODE: 'test',
  IPS_MERCHANT_ID: '', IPS_APP_ID: '', IPS_APP_NAME: '', IPS_PASSWORD: '', IPS_PRIVATE_KEY: '', IPS_MODE: 'test',
  GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_CALLBACK_URL: '',
  FB_PAGE_TOKEN: '',
});
process.chdir(BACKEND);
require(BACKEND + '/server.js');
