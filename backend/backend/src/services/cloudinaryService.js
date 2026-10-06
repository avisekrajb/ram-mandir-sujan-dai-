const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload a file to Cloudinary
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadFile = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'temple',
      resource_type: options.resource_type || 'auto',
      allowed_formats: options.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'],
      public_id: options.public_id,
      transformation: options.transformation || [],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    if (typeof file === 'string') {
      // Base64 string
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      streamifier.createReadStream(buffer).pipe(uploadStream);
    } else {
      // Buffer
      streamifier.createReadStream(file).pipe(uploadStream);
    }
  });
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file buffers or base64 strings
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Array>} Array of Cloudinary upload results
 */
const uploadMultipleFiles = async (files, options = {}) => {
  const uploadPromises = files.map(file => uploadFile(file, options));
  return Promise.all(uploadPromises);
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Cloudinary delete options
 * @returns {Promise<Object>} Cloudinary delete result
 */
const deleteFile = (publicId, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

/**
 * Get the public ID from a Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} Public ID or null
 */
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const publicId = filename.split('.')[0];
  return publicId;
};

/**
 * Optimize image URL
 * @param {string} url - Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} Optimized URL
 */
const optimizeImage = (url, options = {}) => {
  if (!url) return null;
  const { width, height, quality = 'auto', format = 'auto' } = options;
  
  let transformation = `q_${quality},f_${format}`;
  if (width) transformation += `,w_${width}`;
  if (height) transformation += `,h_${height}`;
  if (width && height) transformation += `,c_fill`;
  
  // Insert transformation into Cloudinary URL
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
  }
  return url;
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  getPublicIdFromUrl,
  optimizeImage,
};