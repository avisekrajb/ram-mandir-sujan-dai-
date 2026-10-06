import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Crop, X, Check } from 'lucide-react';

const ImageCropper = ({ image, onSave, onCancel, aspectRatio = 16/5, title = 'Crop Image' }) => {
  const [crop, setCrop] = useState({
    unit: '%',
    width: 80,
    height: 80 / aspectRatio,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const getCroppedImage = () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleSave = () => {
    const croppedImage = getCroppedImage();
    if (croppedImage) {
      onSave(croppedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Crop size={20} className="text-vermilion" />
            <h3 className="text-lg font-serif font-semibold text-ink">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-gray-100 rounded-xl overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={100}
              minHeight={100}
              keepSelection
            >
              <img
                ref={imgRef}
                src={image}
                alt="Crop"
                className="max-h-[50vh] w-auto mx-auto"
              />
            </ReactCrop>
          </div>
          <p className="text-xs text-ink-soft mt-3 text-center">
            Drag and resize the crop area. The image will be cropped to fit the banner.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-ink-soft font-medium hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-vermilion text-white font-semibold hover:bg-[#820606] transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;