// Uploads by ordinary signed-in visitors (profile photo, payment screenshot): pictures only, and
// small. The admin uploader (middleware/upload.js) also takes videos up to 50 MB; leaving that open
// to every free account would let anyone fill the temple's Cloudinary plan with video.
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const rateLimit = require('./rateLimit');
const guardMultipart = require('./guardMultipart');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const makeUserImageUpload = (maxMegabytes) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'temple/user',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      resource_type: 'image',
      timeout: 60000,
    },
  });
  const instance = multer({
    storage,
    limits: { fileSize: maxMegabytes * 1024 * 1024, files: 1, fields: 5 },
    fileFilter: (req, file, cb) => {
      if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
      const err = new Error('Please upload a JPG, PNG or WEBP picture.');
      err.isUploadError = true;
      return cb(err, false);
    },
  });
  // Only `.single()` is used by the routes: its text fields get the usual clean-up too.
  const single = instance.single.bind(instance);
  instance.single = (field) => guardMultipart(single(field));
  return instance;
};

// A few uploads an hour per account is plenty for a profile photo or a payment receipt.
const userUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many uploads. Please try again later.',
  keyGenerator: (req) => (req.user ? `upload:${req.user._id}` : null),
});

module.exports = {
  profilePhotoUpload: makeUserImageUpload(5),
  paymentScreenshotUpload: makeUserImageUpload(10),
  // The donor's own photograph, taken live in the browser. Its own instance so
  // the limit can be tighter than a payment receipt's: this picture is of a
  // person, it is kept with the donation record, and 5 MB is far more than a
  // camera frame needs.
  donationPhotoUpload: makeUserImageUpload(5),
  userUploadLimiter,
};
