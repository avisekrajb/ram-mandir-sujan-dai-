const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const guardMultipart = require('./guardMultipart');

// Configure Cloudinary storage with extended timeout
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'temple',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'],
    resource_type: 'auto',
    timeout: 300000, // 5 minutes timeout for Cloudinary
  },
});

// Custom file filter with better error messages
const fileFilter = (req, file, cb) => {
  // SVG is excluded: it can carry script and would be served from our CDN.
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Invalid file type: ${file.mimetype}. Only images (JPG, PNG, GIF, WEBP) and videos (MP4, MOV, AVI) are allowed.`);
    err.isUploadError = true;
    cb(err, false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for images and videos
    files: 1, // Only one file per upload
  },
  fileFilter: fileFilter,
});

// The text fields that come with an upload get the same clean-up as JSON bodies (see guardMultipart).
for (const method of ['single', 'array', 'fields']) {
  const original = upload[method].bind(upload);
  upload[method] = (...args) => guardMultipart(original(...args));
}

/**
 * Several photos in one request, for Admin -> Gallery. The shared `upload` instance
 * allows a single file, so this is its own multer with the same Cloudinary folder and
 * the same image-only check, but with room for a batch. The route also caps the count
 * itself, so a hand-made request cannot exceed what the form offers.
 */
const GALLERY_BATCH_MAX = 6;

const galleryBatchUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // photos only: the gallery page resizes them anyway
    files: GALLERY_BATCH_MAX,
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedImageTypes.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`Invalid file type: ${file.mimetype}. Only photos (JPG, PNG, GIF, WEBP) can be uploaded in a batch.`);
    err.isUploadError = true;
    return cb(err, false);
  },
});

const galleryBatchArray = galleryBatchUpload.array.bind(galleryBatchUpload);
galleryBatchUpload.array = (...args) => guardMultipart(galleryBatchArray(...args));

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Pictures from visitors are limited to 5 MB (payment screenshots 10 MB); admin videos to 50 MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded at a time.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Please check the file field name.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err && err.isUploadError) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed'
    });
  }

  // Not an upload problem: let the app's normal error handler deal with it.
  next(err);
};

// Notification-bell sound. Deliberately separate from `upload`: the image and
// video endpoints keep rejecting audio, the file lands in its own folder so it
// is easy to find and remove, and only MP3 is accepted. Cloudinary files audio
// under the `video` resource type, which is what the returned URL and any later
// delete have to use.
const bellStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'temple/bell',
    allowed_formats: ['mp3'],
    resource_type: 'video',
    timeout: 300000,
  },
});

const bellFileFilter = (req, file, cb) => {
  if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
    cb(null, true);
    return;
  }
  const err = new Error(
    `Invalid file type: ${file.mimetype}. The bell sound must be an MP3 file.`
  );
  err.isUploadError = true;
  cb(err, false);
};

const uploadBellSound = multer({
  storage: bellStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ~5 MB: far more than a one-minute MP3 needs
    files: 1,
  },
  fileFilter: bellFileFilter,
});

// Export both upload and error handler
module.exports = {
  upload,
  uploadBellSound,
  uploadGalleryBatch: galleryBatchUpload,
  GALLERY_BATCH_MAX,
  handleMulterError,
  // For backward compatibility
  single: upload.single.bind(upload),
  array: upload.array.bind(upload),
  fields: upload.fields.bind(upload),
};