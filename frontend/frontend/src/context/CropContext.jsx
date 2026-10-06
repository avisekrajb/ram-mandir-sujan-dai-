import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CropContext = createContext(null);

export const useCrop = () => {
  const context = useContext(CropContext);
  if (!context) {
    throw new Error('useCrop must be used within CropProvider');
  }
  return context;
};

export const CropProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    x: 0,
    y: 0,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [aspectRatio, setAspectRatio] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [resolvePromise, setResolvePromise] = useState(null);

  // Preset aspect ratios
  const aspectRatios = [
    { label: 'Free', value: 0 },
    { label: 'Square (1:1)', value: 1 },
    { label: 'Portrait (3:4)', value: 3/4 },
    { label: 'Landscape (4:3)', value: 4/3 },
    { label: 'Wide (16:9)', value: 16/9 },
    { label: 'Phone (9:16)', value: 9/16 },
    { label: 'Logo (1:2)', value: 1/2 },
    { label: 'Banner (3:1)', value: 3/1 },
  ];

  // Open crop dialog
  const openCrop = useCallback((imageUrl, options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        setError(null);
        setImage(imageUrl);
        setOriginalImage(imageUrl);
        setPreviewUrl(null);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setRotation(0);
        setCrop({
          unit: '%',
          x: 0,
          y: 0,
          width: 80,
          height: 80,
        });
        setCompletedCrop(null);
        setAspectRatio(options.aspect || 0);
        setResolvePromise(() => resolve);
        setIsOpen(true);
      } catch (err) {
        console.error('Open crop error:', err);
        setError('Failed to open crop editor');
        reject(err);
      }
    });
  }, []);

  // Close crop dialog
  const closeCrop = useCallback(() => {
    setIsOpen(false);
    setImage(null);
    setOriginalImage(null);
    setPreviewUrl(null);
    setResolvePromise(null);
    setError(null);
  }, []);

  // Apply filters and crop
  const applyFilters = useCallback(async (imageSrc, cropData, rotationDeg, brightnessVal, contrastVal, saturationVal) => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            let imgWidth = img.width;
            let imgHeight = img.height;

            // Calculate crop dimensions
            let cropX = 0;
            let cropY = 0;
            let cropWidth = imgWidth;
            let cropHeight = imgHeight;

            if (cropData && cropData.width && cropData.height) {
              if (cropData.unit === '%') {
                cropWidth = (cropData.width / 100) * imgWidth;
                cropHeight = (cropData.height / 100) * imgHeight;
                cropX = (cropData.x / 100) * imgWidth;
                cropY = (cropData.y / 100) * imgHeight;
              } else {
                cropWidth = cropData.width;
                cropHeight = cropData.height;
                cropX = cropData.x || 0;
                cropY = cropData.y || 0;
              }

              // Ensure crop is within bounds
              cropX = Math.max(0, Math.min(cropX, imgWidth - 10));
              cropY = Math.max(0, Math.min(cropY, imgHeight - 10));
              cropWidth = Math.min(cropWidth, imgWidth - cropX);
              cropHeight = Math.min(cropHeight, imgHeight - cropY);
            }

            // Set canvas size
            const maxSize = 1200;
            let outputWidth = cropWidth;
            let outputHeight = cropHeight;
            
            if (outputWidth > maxSize || outputHeight > maxSize) {
              const ratio = Math.min(maxSize / outputWidth, maxSize / outputHeight);
              outputWidth = Math.round(outputWidth * ratio);
              outputHeight = Math.round(outputHeight * ratio);
            }

            canvas.width = outputWidth;
            canvas.height = outputHeight;

            // Apply filters
            ctx.filter = `
              brightness(${brightnessVal / 100})
              contrast(${contrastVal / 100})
              saturate(${saturationVal / 100})
            `;

            // Apply rotation
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotationDeg * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Draw image
            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropWidth,
              cropHeight,
              0,
              0,
              outputWidth,
              outputHeight
            );

            // Get result
            const dataUrl = canvas.toDataURL('image/png', 0.95);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = imageSrc;
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  // Crop and save
  const cropAndSave = useCallback(async () => {
    if (!image) {
      setError('No image to crop');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const croppedDataUrl = await applyFilters(
        image,
        completedCrop || crop,
        rotation,
        brightness,
        contrast,
        saturation
      );

      setPreviewUrl(croppedDataUrl);

      // Convert to file
      const response = await fetch(croppedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.png', { type: 'image/png' });

      // Resolve the promise with the file
      if (resolvePromise) {
        resolvePromise(file);
        resolvePromise(null);
      }

      // Close dialog
      closeCrop();
    } catch (err) {
      console.error('Crop save error:', err);
      setError('Failed to crop image. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [image, completedCrop, crop, rotation, brightness, contrast, saturation, applyFilters, resolvePromise, closeCrop]);

  // Cancel crop
  const cancelCrop = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(null);
      resolvePromise(null);
    }
    closeCrop();
  }, [resolvePromise, closeCrop]);

  // Reset all adjustments
  const resetAdjustments = useCallback(() => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((file, options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        if (!file) {
          reject(new Error('No file provided'));
          return;
        }

        if (!file.type.startsWith('image/')) {
          reject(new Error('Please upload an image file'));
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          reject(new Error('Image must be less than 10MB'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imageUrl = e.target.result;
            openCrop(imageUrl, options).then(resolve).catch(reject);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }, [openCrop]);

  return (
    <CropContext.Provider
      value={{
        isOpen,
        image,
        originalImage,
        crop,
        setCrop,
        completedCrop,
        setCompletedCrop,
        rotation,
        setRotation,
        brightness,
        setBrightness,
        contrast,
        setContrast,
        saturation,
        setSaturation,
        aspectRatio,
        setAspectRatio,
        aspectRatios,
        previewUrl,
        loading,
        error,
        openCrop,
        closeCrop,
        cropAndSave,
        cancelCrop,
        resetAdjustments,
        handleFileUpload,
        applyFilters,
      }}
    >
      {children}
      
      {/* Crop Modal */}
      {isOpen && <CropModal />}
    </CropContext.Provider>
  );
};

// Crop Modal Component
const CropModal = () => {
  const {
    image,
    crop,
    setCrop,
    setCompletedCrop,
    rotation,
    setRotation,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    saturation,
    setSaturation,
    aspectRatio,
    setAspectRatio,
    aspectRatios,
    loading,
    error,
    previewUrl,
    cropAndSave,
    cancelCrop,
    resetAdjustments,
  } = useCrop();

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#A80808]/5 to-[#A80808]/5">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#A80808]">Image Editor</h3>
            <p className="text-xs text-ink-soft">Crop, rotate, and adjust your image</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetAdjustments}
              className="px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-ink hover:bg-gray-100 rounded-lg transition-all"
            >
              Reset
            </button>
            <button
              onClick={cancelCrop}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={cropAndSave}
              disabled={loading}
              className="px-6 py-2 bg-[#A80808] text-white rounded-lg text-sm font-semibold hover:bg-[#660505] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply & Save
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Image Editor Area */}
          <div className="flex-1 p-4 bg-gray-50 overflow-auto relative min-h-[400px] lg:min-h-[500px]">
            <div className="relative flex items-center justify-center h-full">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio || undefined}
                minWidth={50}
                minHeight={50}
                className="max-w-full max-h-full"
              >
                <img
                  src={image}
                  alt="Crop"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    filter: `
                      brightness(${brightness}%)
                      contrast(${contrast}%)
                      saturate(${saturation}%)
                    `,
                    transform: `rotate(${rotation}deg)`,
                  }}
                  className="select-none"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 overflow-y-auto p-4 space-y-4 max-h-[300px] lg:max-h-none">
            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
              >
                {aspectRatios.map((ar) => (
                  <option key={ar.label} value={ar.value}>
                    {ar.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                Rotation: {rotation}°
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A80808]"
                />
                <button
                  onClick={() => setRotation(rotation + 90)}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 rounded hover:bg-gray-200 transition-all"
                >
                  ↻ 90°
                </button>
                <button
                  onClick={() => setRotation(0)}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 rounded hover:bg-gray-200 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink">Brightness</label>
                <span className="text-xs text-ink-soft">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A80808]"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink">Contrast</label>
                <span className="text-xs text-ink-soft">{contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A80808]"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-ink">Saturation</label>
                <span className="text-xs text-ink-soft">{saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A80808]"
              />
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-ink-soft mb-1">Preview</p>
                <img src={previewUrl} alt="Preview" className="w-full h-20 object-cover rounded" />
              </div>
            )}

            {/* Quick Presets */}
            <div className="mt-2">
              <p className="text-xs text-ink-soft mb-1.5">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Normal', b: 100, c: 100, s: 100 },
                  { label: 'Vibrant', b: 105, c: 110, s: 130 },
                  { label: 'Warm', b: 105, c: 100, s: 110 },
                  { label: 'Cool', b: 95, c: 105, s: 100 },
                  { label: 'High Contrast', b: 100, c: 140, s: 110 },
                  { label: 'Soft', b: 110, c: 80, s: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setBrightness(preset.b);
                      setContrast(preset.c);
                      setSaturation(preset.s);
                    }}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="text-xs text-ink-soft">
            {loading ? 'Processing...' : 'Drag to crop • Use controls to adjust'}
          </div>
        </div>
      </div>
    </div>
  );
};