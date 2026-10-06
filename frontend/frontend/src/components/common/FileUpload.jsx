import React, { useRef } from 'react';
import { Upload, Image, Video } from 'lucide-react';

const FileUpload = ({ 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  accept = 'image/*',
  preview = true,
  className = '',
}) => {
  const ref = useRef(null);

  const handleClick = () => ref.current?.click();

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (onChange) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          onChange(event.target.result, file);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('File read error:', error);
        onChange(null);
      }
    }
    e.target.value = '';
  };

  const isVideo = accept?.includes('video');

  return (
    <div
      className={`relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors ${className}`}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={ref}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      
      {value && preview ? (
        isVideo ? (
          <video src={value} className="w-full h-full object-cover" muted />
        ) : (
          <img src={value} alt={label} className="w-full h-full object-cover" />
        )
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-ink-soft">
          {Icon ? <Icon size={28} /> : isVideo ? <Video size={28} /> : <Image size={28} />}
          <span className="text-xs font-semibold">{label || 'Upload'}</span>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs font-bold py-1.5 flex items-center justify-center gap-1.5">
        <Upload size={13} /> {label || 'Upload'}
      </div>
    </div>
  );
};

export default FileUpload;