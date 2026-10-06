// Downloads from the gallery carry a small centred temple name, so shared copies stay traceable.
// ─── Watermark Utility Functions ──────────────────────────────────────────
const WATERMARK_TEXT = 'श्री राम मंदिर';

// Function to add centered text watermark to image
export const addWatermarkToImage = (imageSrc) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // ─── Centered Text Watermark ──────────────────────────────────────
        // Smaller font size - responsive
        const fontSize = Math.max(14, Math.min(24, Math.min(img.width, img.height) / 30));
        const textX = canvas.width / 2;
        const textY = canvas.height / 2;
        
        ctx.save();
        
        // Subtle shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Text settings - centered
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        
        // Semi-transparent white text with subtle gradient
        const gradient = ctx.createRadialGradient(
          textX - fontSize * 1.5, 
          textY - fontSize * 0.5, 
          fontSize * 0.5,
          textX, 
          textY, 
          fontSize * 4
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
        
        ctx.fillStyle = gradient;
        ctx.fillText(WATERMARK_TEXT, textX, textY);
        
        // Very subtle outline
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        ctx.strokeText(WATERMARK_TEXT, textX, textY);
        
        ctx.restore();
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};

// Function to add centered text watermark to video
export const addWatermarkToVideo = (videoSrc) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Create a media stream from canvas
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 5000000
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Play video and draw frames with watermark
        video.play();
        const drawFrame = () => {
          if (video.paused || video.ended) {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
            return;
          }
          
          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // ─── Centered Text Watermark ──────────────────────────────────
          const fontSize = Math.max(14, Math.min(24, Math.min(canvas.width, canvas.height) / 30));
          const textX = canvas.width / 2;
          const textY = canvas.height / 2;
          
          ctx.save();
          
          // Subtle shadow for readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          // Text settings - centered
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          
          // Semi-transparent white text with subtle gradient
          const gradient = ctx.createRadialGradient(
            textX - fontSize * 1.5, 
            textY - fontSize * 0.5, 
            fontSize * 0.5,
            textX, 
            textY, 
            fontSize * 4
          );
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
          gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
          gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
          
          ctx.fillStyle = gradient;
          ctx.fillText(WATERMARK_TEXT, textX, textY);
          
          // Very subtle outline
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 0.5;
          ctx.strokeText(WATERMARK_TEXT, textX, textY);
          
          ctx.restore();
          
          requestAnimationFrame(drawFrame);
        };
        
        video.addEventListener('ended', () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        });
        
        drawFrame();
      } catch (error) {
        reject(error);
      }
    };
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = videoSrc;
  });
};
