const cloudinary = require('../config/cloudinary');

// Helper to check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_API_KEY && 
            process.env.CLOUDINARY_API_SECRET);
};

// @desc    Get all cloud resources (photos and videos)
// @route   GET /api/admin/cloud/resources
// @access  Private/Admin
exports.getCloudResources = async (req, res) => {
  try {
    const { type = 'all', maxResults = 50, nextCursor } = req.query;
    
    if (!isCloudinaryConfigured()) {
      return res.json({
        success: true,
        resources: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        message: 'Cloudinary is not configured.',
      });
    }

    let allResources = [];

    try {
      const imageOptions = {
        resource_type: 'image',
        max_results: parseInt(maxResults) || 50,
        // Add prefix to get resources from specific folders if needed
        // prefix: 'temple/'
      };
      
      if (nextCursor) {
        imageOptions.next_cursor = nextCursor;
      }

      const imageResult = await cloudinary.api.resources(imageOptions);
      
      const images = (imageResult.resources || []).map(r => ({
        id: r.public_id,
        url: r.secure_url || r.url,
        type: 'image',
        format: r.format || 'unknown',
        size: r.bytes || 0,
        width: r.width || 0,
        height: r.height || 0,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
        folder: r.folder || '',
        filename: r.public_id ? r.public_id.split('/').pop() : 'unknown',
      }));

      allResources = [...images];

      if (type === 'all' || type === 'video') {
        const videoOptions = {
          resource_type: 'video',
          max_results: parseInt(maxResults) || 50,
        };
        
        if (nextCursor) {
          videoOptions.next_cursor = nextCursor;
        }

        const videoResult = await cloudinary.api.resources(videoOptions);
        
        const videos = (videoResult.resources || []).map(r => ({
          id: r.public_id,
          url: r.secure_url || r.url,
          type: 'video',
          format: r.format || 'unknown',
          size: r.bytes || 0,
          width: r.width || 0,
          height: r.height || 0,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
          folder: r.folder || '',
          filename: r.public_id ? r.public_id.split('/').pop() : 'unknown',
        }));

        allResources = [...allResources, ...videos];
      }

      if (type === 'image') {
        allResources = allResources.filter(r => r.type === 'image');
      } else if (type === 'video') {
        allResources = allResources.filter(r => r.type === 'video');
      }

      allResources.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        success: true,
        resources: allResources,
        total: allResources.length,
        nextCursor: null,
        hasMore: false,
      });

    } catch (error) {
      console.error('❌ Error fetching from Cloudinary:', error.message);
      
      res.json({
        success: true,
        resources: [],
        total: 0,
        nextCursor: null,
        hasMore: false,
        message: error.message || 'Failed to fetch resources from Cloudinary',
      });
    }

  } catch (error) {
    console.error('❌ Get cloud resources error:', error.message);
    res.json({
      success: true,
      resources: [],
      total: 0,
      nextCursor: null,
      hasMore: false,
      message: error.message || 'Failed to fetch resources',
    });
  }
};

// @desc    Delete cloud resource
// @route   DELETE /api/admin/cloud/resource/:publicId
// @access  Private/Admin
exports.deleteCloudResource = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;
    
    console.log(`📝 Delete request received:`);
    console.log(`  - Public ID: ${publicId}`);
    console.log(`  - Resource Type: ${resourceType}`);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }
    
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured.',
      });
    }
    
    // Decode the publicId in case it was URL encoded
    const decodedPublicId = decodeURIComponent(publicId);
    console.log(`  - Decoded Public ID: ${decodedPublicId}`);
    
    // Determine the correct resource type
    let type = resourceType;
    if (type === 'all' || !type) {
      // Auto-detect based on public_id or URL
      if (decodedPublicId.includes('/video/') || 
          decodedPublicId.endsWith('.mp4') || 
          decodedPublicId.endsWith('.mov') ||
          decodedPublicId.endsWith('.avi')) {
        type = 'video';
      } else {
        type = 'image';
      }
    }
    
    console.log(`  - Using resource type: ${type}`);
    
    // Try to delete from Cloudinary with invalidation
    try {
      const result = await cloudinary.uploader.destroy(decodedPublicId, {
        resource_type: type,
        invalidate: true, // Force CDN cache invalidation
      });
      
      console.log(`  - Delete result:`, result);
      
      if (result.result === 'ok') {
        return res.json({
          success: true,
          message: 'Resource deleted successfully from Cloudinary',
          publicId: decodedPublicId,
        });
      } else if (result.result === 'not found') {
        // Resource doesn't exist in Cloudinary
        console.log(`  - Resource not found in Cloudinary`);
        return res.status(404).json({
          success: false,
          message: 'Resource not found in Cloudinary',
          publicId: decodedPublicId,
          notFound: true,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.result || 'Failed to delete resource',
          result,
        });
      }
    } catch (cloudinaryError) {
      console.error('  - Cloudinary delete error:', cloudinaryError);
      
      // Check for specific Cloudinary errors
      if (cloudinaryError.http_code === 404 || 
          cloudinaryError.message?.includes('not found') ||
          cloudinaryError.message?.includes('Resource not found')) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found in Cloudinary',
          publicId: decodedPublicId,
          notFound: true,
        });
      }
      
      // If it's a 400 error, it might be an invalid public_id
      if (cloudinaryError.http_code === 400) {
        // Try with 'image' type as fallback
        try {
          console.log(`  - Retrying with 'image' resource type...`);
          const retryResult = await cloudinary.uploader.destroy(decodedPublicId, {
            resource_type: 'image',
            invalidate: true,
          });
          
          if (retryResult.result === 'ok') {
            return res.json({
              success: true,
              message: 'Resource deleted successfully from Cloudinary (as image)',
              publicId: decodedPublicId,
            });
          }
        } catch (retryError) {
          console.error('  - Retry also failed:', retryError);
        }
      }
      
      // Re-throw other errors
      throw cloudinaryError;
    }
  } catch (error) {
    console.error('❌ Delete cloud resource error:', error.message);
    console.error('  - Error details:', error);
    
    // Check if it's a 404 from the request
    if (error.http_code === 404 || 
        error.message?.includes('not found') ||
        error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found in Cloudinary',
        publicId: req.params.publicId,
        notFound: true,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete resource',
      error: error.message,
    });
  }
};

// @desc    Delete multiple cloud resources
// @route   POST /api/admin/cloud/resources/delete
// @access  Private/Admin
exports.deleteMultipleCloudResources = async (req, res) => {
  try {
    const { publicIds, resourceType = 'image' } = req.body;
    
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of public IDs',
      });
    }
    
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured.',
      });
    }
    
    console.log(`🗑️ Deleting ${publicIds.length} resources`);
    console.log('  - Public IDs:', publicIds);
    
    const results = [];
    let successCount = 0;
    let notFoundCount = 0;
    let failedCount = 0;
    
    for (const publicId of publicIds) {
      try {
        // Decode the publicId in case it was URL encoded
        const decodedPublicId = decodeURIComponent(publicId);
        
        // Determine resource type from ID or use provided type
        let type = resourceType;
        if (type === 'all' || !type) {
          if (decodedPublicId.includes('/video/') || 
              decodedPublicId.endsWith('.mp4') || 
              decodedPublicId.endsWith('.mov') ||
              decodedPublicId.endsWith('.avi')) {
            type = 'video';
          } else {
            type = 'image';
          }
        }
        
        console.log(`  - Deleting ${decodedPublicId} (${type})`);
        
        try {
          const result = await cloudinary.uploader.destroy(decodedPublicId, {
            resource_type: type,
            invalidate: true,
          });
          
          const isSuccess = result.result === 'ok';
          if (isSuccess) {
            successCount++;
            results.push({
              publicId: decodedPublicId,
              success: true,
              message: 'Deleted successfully',
            });
          } else if (result.result === 'not found') {
            notFoundCount++;
            results.push({
              publicId: decodedPublicId,
              success: false,
              message: 'Resource not found in Cloudinary',
              notFound: true,
            });
          } else {
            failedCount++;
            results.push({
              publicId: decodedPublicId,
              success: false,
              message: result.result || 'Failed to delete',
            });
          }
        } catch (cloudinaryError) {
          console.error(`  - Error deleting ${decodedPublicId}:`, cloudinaryError.message);
          
          // If resource not found
          if (cloudinaryError.http_code === 404 || 
              cloudinaryError.message?.includes('not found')) {
            notFoundCount++;
            results.push({
              publicId: decodedPublicId,
              success: false,
              message: 'Resource not found in Cloudinary',
              notFound: true,
            });
          } else {
            // Try with 'image' type as fallback
            try {
              console.log(`  - Retrying ${decodedPublicId} as image...`);
              const retryResult = await cloudinary.uploader.destroy(decodedPublicId, {
                resource_type: 'image',
                invalidate: true,
              });
              
              if (retryResult.result === 'ok') {
                successCount++;
                results.push({
                  publicId: decodedPublicId,
                  success: true,
                  message: 'Deleted successfully (as image)',
                });
              } else {
                failedCount++;
                results.push({
                  publicId: decodedPublicId,
                  success: false,
                  message: retryResult.result || 'Failed to delete',
                });
              }
            } catch (retryError) {
              failedCount++;
              results.push({
                publicId: decodedPublicId,
                success: false,
                message: cloudinaryError.message,
              });
            }
          }
        }
      } catch (error) {
        console.error(`  - Error processing ${publicId}:`, error.message);
        failedCount++;
        results.push({
          publicId,
          success: false,
          message: error.message,
        });
      }
    }
    
    res.json({
      success: true,
      results,
      total: results.length,
      successCount,
      notFoundCount,
      failedCount,
      message: `Deleted ${successCount} resources successfully${notFoundCount > 0 ? `, ${notFoundCount} not found` : ''}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
    });
  } catch (error) {
    console.error('Delete multiple resources error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete resources',
    });
  }
};

// @desc    Get cloud storage stats
// @route   GET /api/admin/cloud/stats
// @access  Private/Admin
exports.getCloudStats = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.json({
        success: true,
        stats: {
          totalResources: 0,
          totalImages: 0,
          totalVideos: 0,
          totalSize: 0,
          totalSizeMB: 0,
          totalSizeGB: 0,
        },
        message: 'Cloudinary not configured.',
      });
    }
    
    let images = { resources: [] };
    let videos = { resources: [] };
    
    try {
      images = await cloudinary.api.resources({
        resource_type: 'image',
        max_results: 500,
      });
      console.log(`📸 Found ${images.resources?.length || 0} images`);
    } catch (error) {
      console.log('Error fetching images:', error.message);
    }
    
    try {
      videos = await cloudinary.api.resources({
        resource_type: 'video',
        max_results: 500,
      });
      console.log(`🎬 Found ${videos.resources?.length || 0} videos`);
    } catch (error) {
      console.log('Error fetching videos:', error.message);
    }
    
    const allResources = [...(images.resources || []), ...(videos.resources || [])];
    const totalImages = (images.resources || []).length;
    const totalVideos = (videos.resources || []).length;
    const totalResources = allResources.length;
    
    const totalSize = allResources.reduce((acc, r) => acc + (r.bytes || 0), 0);
    const totalSizeMB = totalSize > 0 ? parseFloat((totalSize / (1024 * 1024)).toFixed(2)) : 0;
    const totalSizeGB = totalSize > 0 ? parseFloat((totalSize / (1024 * 1024 * 1024)).toFixed(2)) : 0;
    
    res.json({
      success: true,
      stats: {
        totalResources,
        totalImages,
        totalVideos,
        totalSize,
        totalSizeMB,
        totalSizeGB,
      }
    });
  } catch (error) {
    console.error('Get cloud stats error:', error.message);
    res.json({
      success: true,
      stats: {
        totalResources: 0,
        totalImages: 0,
        totalVideos: 0,
        totalSize: 0,
        totalSizeMB: 0,
        totalSizeGB: 0,
      },
      message: error.message || 'Failed to fetch stats',
    });
  }
};

// @desc    Search cloud resources
// @route   GET /api/admin/cloud/search
// @access  Private/Admin
exports.searchCloudResources = async (req, res) => {
  try {
    const { q, type = 'all', maxResults = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured.',
        resources: [],
        total: 0,
      });
    }
    
    let allResources = [];

    try {
      const imageResult = await cloudinary.api.resources({
        resource_type: 'image',
        max_results: parseInt(maxResults) || 50,
      });

      const images = (imageResult.resources || []).map(r => ({
        id: r.public_id,
        url: r.secure_url || r.url,
        type: 'image',
        format: r.format || 'unknown',
        size: r.bytes || 0,
        width: r.width || 0,
        height: r.height || 0,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
        folder: r.folder || '',
        filename: r.public_id ? r.public_id.split('/').pop() : 'unknown',
      }));

      allResources = [...images];

      if (type === 'all' || type === 'video') {
        const videoResult = await cloudinary.api.resources({
          resource_type: 'video',
          max_results: parseInt(maxResults) || 50,
        });

        const videos = (videoResult.resources || []).map(r => ({
          id: r.public_id,
          url: r.secure_url || r.url,
          type: 'video',
          format: r.format || 'unknown',
          size: r.bytes || 0,
          width: r.width || 0,
          height: r.height || 0,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
          folder: r.folder || '',
          filename: r.public_id ? r.public_id.split('/').pop() : 'unknown',
        }));

        allResources = [...allResources, ...videos];
      }

      const filtered = allResources.filter(r => {
        const filename = r.filename || '';
        return filename.toLowerCase().includes(q.toLowerCase()) ||
               (r.format && r.format.toLowerCase().includes(q.toLowerCase()));
      });

      res.json({
        success: true,
        resources: filtered,
        total: filtered.length,
      });

    } catch (error) {
      console.error('Search error:', error.message);
      res.json({
        success: true,
        resources: [],
        total: 0,
        message: error.message || 'Search failed',
      });
    }
  } catch (error) {
    console.error('Search cloud resources error:', error.message);
    res.json({
      success: true,
      resources: [],
      total: 0,
      message: error.message || 'Search failed',
    });
  }
};

// @desc    Get cloud resource by ID
// @route   GET /api/admin/cloud/resource/:publicId
// @access  Private/Admin
exports.getCloudResource = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
    }
    
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured.',
      });
    }
    
    const decodedPublicId = decodeURIComponent(publicId);
    const result = await cloudinary.api.resource(decodedPublicId);
    
    res.json({
      success: true,
      resource: {
        id: result.public_id,
        url: result.secure_url || result.url,
        type: result.resource_type || 'image',
        format: result.format || 'unknown',
        size: result.bytes || 0,
        width: result.width || 0,
        height: result.height || 0,
        createdAt: result.created_at || new Date().toISOString(),
        updatedAt: result.updated_at || new Date().toISOString(),
        folder: result.folder || '',
        filename: result.public_id ? result.public_id.split('/').pop() : 'unknown',
      }
    });
  } catch (error) {
    console.error('Get cloud resource error:', error.message);
    res.status(404).json({
      success: false,
      message: error.message || 'Resource not found',
    });
  }
};