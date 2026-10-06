const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Check if Cloudinary is configured
const isConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  return !!(cloudName && apiKey && apiSecret);
};

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });
  console.log('✅ Cloudinary configured successfully');
  console.log(`📁 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  
  // Test the connection
  (async () => {
    try {
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection test successful');
      console.log('📊 Status:', result.status);
    } catch (error) {
      console.error('❌ Cloudinary connection test failed:', error.message);
      console.error('Please check your Cloudinary credentials in .env file');
    }
  })();
} else {
  console.warn('⚠️ Cloudinary is not configured. Please check your environment variables.');
  console.warn('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

module.exports = cloudinary;