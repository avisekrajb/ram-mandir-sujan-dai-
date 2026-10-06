import React, { useState, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Save, Video, Trash2, Plus, MoveUp, MoveDown, Eye, EyeOff, Image
} from 'lucide-react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import OmLoader from '../../components/common/OmLoader';

const AdminHome = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const aboutInputRef = useRef(null);

  // Hero Video
  const [heroVideo, setHeroVideo] = useState(settings?.heroVideo || null);
  const [heroEnabled, setHeroEnabled] = useState(settings?.heroEnabled !== false);

  // Gallery Images
  const [galleryImages, setGalleryImages] = useState(settings?.galleryImages || []);
  
  // ===== ABOUT PREVIEW (Homepage only) =====
  const [aboutPreviewImages, setAboutPreviewImages] = useState(settings?.aboutPreview?.images || []);
  const [aboutPreviewTitle, setAboutPreviewTitle] = useState(settings?.aboutPreview?.title || {
    en: 'About the Temple',
    ne: 'मन्दिरको बारेमा',
    hi: 'मंदिर के बारे में',
    zh: '关于神庙',
    ta: 'கோயிலைப் பற்றி'
  });
  const [aboutPreviewText, setAboutPreviewText] = useState(settings?.aboutPreview?.text || {
    en: 'Nestled in the heart of Gaushala, Shree Ramchandra Temple has stood as a beacon of devotion for generations, welcoming devotees of Lord Ram with open doors and open hearts.',
    ne: 'गौशालाको हृदयमा अवस्थित श्री रामचन्द्र मन्दिर पुस्तौंदेखि भक्तिको प्रतीकको रूपमा उभिएको छ, भगवान रामका भक्तहरूलाई खुला मन र खुला ढोकाले स्वागत गर्दै।',
    hi: 'गौशाला के हृदय में स्थित श्री रामचंद्र मंदिर पीढ़ियों से भक्ति का प्रतीक बना हुआ है, भगवान राम के भक्तों का खुले दिल और खुले द्वार से स्वागत करते हुए।',
    zh: '什里·拉姆钱德拉神庙坐落于高沙拉的中心，世代以来一直是信仰的象征，以开放的大门和心怀敬意的态度欢迎罗摩神的信众。',
    ta: 'கௌஷாலாவின் இதயத்தில் அமைந்துள்ள ஸ்ரீ ராமச்சந்திர கோயில், தலைமுறை தலைமுறையாக பக்தியின் ஒளிவிளக்காக நின்று, ராமர் பக்தர்களை திறந்த மனதுடன் வரவேற்கிறது.'
  });
  const [aboutPreviewEnabled, setAboutPreviewEnabled] = useState(settings?.aboutPreview?.enabled !== false);

  // Live Video
  const [liveVideo, setLiveVideo] = useState(settings?.liveVideo || {
    enabled: true,
    url: 'https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&autoplay=1&mute=1',
    title: { en: 'Live Darshan', ne: 'लाइभ दर्शन', hi: 'लाइव दर्शन', zh: '现场朝拜', ta: 'நேரடி தரிசனம்' },
    description: { 
      en: 'Experience the divine presence of Lord Ram from anywhere in the world',
      ne: 'संसारको कुनै पनि स्थानबाट भगवान रामको दिव्य उपस्थिति अनुभव गर्नुहोस्',
      hi: 'दुनिया में कहीं से भी भगवान राम की दिव्य उपस्थिति का अनुभव करें',
      zh: '从世界任何地方体验罗摩神的神圣存在',
      ta: 'உலகில் எங்கிருந்தும் ராமரின் தெய்வீக இருப்பை அனுபவியுங்கள்'
    },
  });

  // Helper
  const getLocalizedValue = (obj, lang) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };

  // ===== HERO VIDEO =====
  const handleHeroVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast((t.a3_c_uploadVideoOnly || 'Please upload a video file'), 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast((t.a3_c_videoMaxSize || 'Video must be less than {size}MB').replace('{size}', '50'), 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/admin/upload/hero', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeroVideo(response.data.url);
      showToast((t.a3_home_heroUploaded || 'Hero video uploaded successfully'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleHeroRemove = () => {
    setHeroVideo(null);
    showToast((t.a3_home_heroRemoved || 'Hero video removed'), 'success');
  };

  // ===== GALLERY IMAGES =====
  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast((t.uploadImageOnly || 'Please upload an image file'), 'error');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '20'), 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('data', JSON.stringify({
      cap: { en: 'Gallery Image' },
      hue: '#A80808',
    }));

    try {
      const response = await api.post('/admin/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newImageData = response.data.data || response.data;
      const newImage = {
        id: newImageData._id || Date.now().toString(),
        src: newImageData.photo || newImageData.url,
        alt: { en: 'Gallery Image', ne: 'ग्यालरी छवि', hi: 'गैलरी छवि', zh: '图库图片', ta: 'கேலரி படம்' },
        order: galleryImages.length,
        enabled: true,
      };
      setGalleryImages([...galleryImages, newImage]);
      showToast((t.a3_home_galleryAdded || 'Image added to gallery'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleGalleryRemove = (id) => {
    setGalleryImages(galleryImages.filter(img => img.id !== id));
    showToast((t.a3_home_galleryRemoved || 'Image removed from gallery'), 'success');
  };

  const handleGalleryToggle = (id) => {
    setGalleryImages(galleryImages.map(img => 
      img.id === id ? { ...img, enabled: !img.enabled } : img
    ));
  };

  const handleGalleryMove = (id, direction) => {
    const index = galleryImages.findIndex(img => img.id === id);
    if (direction === 'up' && index > 0) {
      const newImages = [...galleryImages];
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      setGalleryImages(newImages);
    } else if (direction === 'down' && index < galleryImages.length - 1) {
      const newImages = [...galleryImages];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      setGalleryImages(newImages);
    }
  };

  // ===== ABOUT PREVIEW IMAGES =====
  const handleAboutPreviewUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast((t.uploadImageOnly || 'Please upload an image file'), 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '10'), 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/about', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newImage = {
        id: Date.now().toString(),
        src: response.data.url,
        alt: { en: 'About Image', ne: 'बारेमा छवि', hi: 'बारे में छवि', zh: '关于图片', ta: 'பற்றிய படம்' },
        order: aboutPreviewImages.length,
        enabled: true,
      };
      setAboutPreviewImages([...aboutPreviewImages, newImage]);
      showToast((t.a3_home_aboutImgAdded || 'About preview image added'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleAboutPreviewRemove = (id) => {
    setAboutPreviewImages(aboutPreviewImages.filter(img => img.id !== id));
    showToast((t.a3_home_aboutImgRemoved || 'About preview image removed'), 'success');
  };

  const handleAboutPreviewToggle = (id) => {
    setAboutPreviewImages(aboutPreviewImages.map(img => 
      img.id === id ? { ...img, enabled: !img.enabled } : img
    ));
  };

  const handleAboutPreviewMove = (id, direction) => {
    const index = aboutPreviewImages.findIndex(img => img.id === id);
    if (direction === 'up' && index > 0) {
      const newImages = [...aboutPreviewImages];
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      setAboutPreviewImages(newImages);
    } else if (direction === 'down' && index < aboutPreviewImages.length - 1) {
      const newImages = [...aboutPreviewImages];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      setAboutPreviewImages(newImages);
    }
  };

  // ===== SAVE =====
  const handleSave = async () => {
    setLoading(true);
    try {
      const data = {
        heroVideo,
        heroEnabled,
        galleryImages,
        aboutPreview: {
          images: aboutPreviewImages,
          title: aboutPreviewTitle,
          text: aboutPreviewText,
          enabled: aboutPreviewEnabled,
        },
        liveVideo,
      };
      await updateSettings(data);
      showToast((t.a3_home_saved || 'Home page settings saved successfully'), 'success');
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.response?.data?.message || (t.a3_c_failedToSave || 'Failed to save settings'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ===== ABOUT PREVIEW TEXT HELPERS =====
  const updateAboutTitle = (value) => {
    setAboutPreviewTitle({ ...aboutPreviewTitle, [activeLang]: value });
  };

  const updateAboutText = (value) => {
    setAboutPreviewText({ ...aboutPreviewText, [activeLang]: value });
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a3_home_heroVideo || 'Hero Video'}</h4>
            <p className="text-xs text-ink-soft">{t.a3_home_heroVideoHint || 'Upload a hero video for the homepage'}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <input
                type="checkbox"
                checked={heroEnabled}
                onChange={(e) => setHeroEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
              />
              {t.a3_c_showOnHomepage || 'Show on Homepage'}
            </label>
          </div>
        </div>

        <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 hover:border-vermilion transition-colors">
          {heroVideo ? (
            <div className="relative aspect-video">
              <video src={heroVideo} className="w-full h-full object-cover" controls />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={handleHeroRemove}
                  aria-label={(t.a3_c_removeVideo || 'Remove video')}
                  className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center h-48 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video size={40} className="text-mute mb-2" />
              <span className="text-sm font-medium text-ink-soft">{t.a3_home_clickUploadHero || 'Click to upload hero video'}</span>
              <span className="text-xs text-mute">MP4, MOV, AVI • {(t.a5_maxFileSize || 'Max {size}').replace('{size}', '50MB')}</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleHeroVideoUpload}
            className="hidden"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white text-center">
                <OmLoader size="lg" color="white" className="mx-auto mb-2" />
                <span className="text-sm">{t.uploading || 'Uploading...'}</span>
              </div>
            </div>
          )}
        </div>
        {heroVideo && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs text-vermilion hover:text-[#820606] transition-colors"
          >
            {t.a3_c_changeVideo || 'Change Video'}
          </button>
        )}
      </div>

      {/* Gallery Images */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a3_home_galleryImages || 'Gallery Images'}</h4>
            <p className="text-xs text-ink-soft">{t.a3_home_galleryHint || 'Manage images shown in the homepage gallery carousel'}</p>
          </div>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
          >
            <Plus size={14} /> {t.a3_c_addImage || 'Add Image'}
          </button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleGalleryUpload}
            className="hidden"
          />
        </div>

        {galleryImages.length === 0 ? (
          <div className="text-center py-8 text-ink-soft text-sm">
            {t.a3_home_noGallery || 'No gallery images added yet'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {galleryImages.map((img, index) => (
              <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                <img src={img.src} alt={img.alt?.en} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleGalleryToggle(img.id)}
                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                    title={img.enabled ? (t.a3_c_hide || 'Hide') : (t.a3_c_show || 'Show')}
                  >
                    {img.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleGalleryMove(img.id, 'up')}
                    aria-label={(t.a3_c_moveUp || 'Move up')}
                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-30"
                    disabled={index === 0}
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    onClick={() => handleGalleryMove(img.id, 'down')}
                    aria-label={(t.a3_c_moveDown || 'Move down')}
                    className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-30"
                    disabled={index === galleryImages.length - 1}
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    onClick={() => handleGalleryRemove(img.id)}
                    aria-label={(t.a3_c_deleteImage || 'Delete image')}
                    className="p-1.5 rounded-lg bg-red-500/70 text-white hover:bg-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {!img.enabled && (
                  <div className="absolute top-1 left-1 bg-gray-800/80 text-white text-xs px-2 py-0.5 rounded">
                    {t.a3_c_hidden || 'Hidden'}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== ABOUT PREVIEW (Homepage Only) ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a3_home_aboutPreview || 'About Preview (Homepage)'}</h4>
            <p className="text-xs text-ink-soft">{t.a3_home_aboutPreviewHint || 'Manage the About section shown on the homepage'}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={aboutPreviewEnabled}
              onChange={(e) => setAboutPreviewEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
            />
            {t.a3_c_showOnHomepage || 'Show on Homepage'}
          </label>
        </div>

        <LanguageSwitcher active={activeLang} onChange={setActiveLang} />

        {/* About Title */}
        <div className="mt-4">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', activeLang.toUpperCase())}
          </label>
          <input
            type="text"
            aria-label={(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', activeLang.toUpperCase())} value={getLocalizedValue(aboutPreviewTitle, activeLang)}
            onChange={(e) => updateAboutTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
            placeholder={(t.a3_c_enterTitleIn || 'Enter title in {lang}').replace('{lang}', activeLang)}
          />
        </div>

        {/* About Text */}
        <div className="mt-3">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', activeLang.toUpperCase())}
          </label>
          <textarea
            rows={4}
            aria-label={(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', activeLang.toUpperCase())} value={getLocalizedValue(aboutPreviewText, activeLang)}
            onChange={(e) => updateAboutText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
            placeholder={(t.a3_c_enterDescriptionIn || 'Enter description in {lang}').replace('{lang}', activeLang)}
          />
        </div>

        {/* About Preview Images */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-ink block">{t.a3_home_previewImages || 'Preview Images'}</label>
            <button
              onClick={() => aboutInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
            >
              <Plus size={14} /> {t.a3_c_addImage || 'Add Image'}
            </button>
            <input
              ref={aboutInputRef}
              type="file"
              accept="image/*"
              onChange={handleAboutPreviewUpload}
              className="hidden"
            />
          </div>

          {aboutPreviewImages.length === 0 ? (
            <div className="text-center py-6 text-ink-soft text-sm border-2 border-dashed border-gray-200 rounded-lg">
              <Image size={24} className="mx-auto text-ink-soft/30 mb-2" />
              {t.a3_home_noPreviewImages || 'No preview images added yet'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {aboutPreviewImages.map((img, index) => (
                <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                  <img src={img.src} alt={img.alt?.en} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleAboutPreviewToggle(img.id)}
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
                      title={img.enabled ? (t.a3_c_hide || 'Hide') : (t.a3_c_show || 'Show')}
                    >
                      {img.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => handleAboutPreviewMove(img.id, 'up')}
                      aria-label={(t.a3_c_moveUp || 'Move up')}
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-30"
                      disabled={index === 0}
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      onClick={() => handleAboutPreviewMove(img.id, 'down')}
                      aria-label={(t.a3_c_moveDown || 'Move down')}
                      className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all disabled:opacity-30"
                      disabled={index === aboutPreviewImages.length - 1}
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      onClick={() => handleAboutPreviewRemove(img.id)}
                      aria-label={(t.a3_c_deleteImage || 'Delete image')}
                      className="p-1.5 rounded-lg bg-red-500/70 text-white hover:bg-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {!img.enabled && (
                    <div className="absolute top-1 left-1 bg-gray-800/80 text-white text-xs px-2 py-0.5 rounded">
                      {t.a3_c_hidden || 'Hidden'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-soft mt-2">{t.a3_home_previewImagesHint || 'These images appear in the About section on the homepage only'}</p>
        </div>
      </div>

      {/* Live Video Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a3_home_liveVideo || 'Live Video'}</h4>
            <p className="text-xs text-ink-soft">{t.a3_home_liveVideoHint || 'Manage the live video section on the homepage'}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={liveVideo.enabled}
              onChange={(e) => setLiveVideo({ ...liveVideo, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
            />
            {t.a3_c_showOnHomepage || 'Show on Homepage'}
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_home_youtubeUrl || 'YouTube URL'}</label>
            <input
              type="text"
              aria-label={(t.a3_home_youtubeUrl || 'YouTube URL')} value={liveVideo.url}
              onChange={(e) => setLiveVideo({ ...liveVideo, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
              placeholder="https://www.youtube.com/embed/..."
            />
            <p className="text-xs text-ink-soft mt-1">{t.a3_home_youtubeHint || 'Paste the embed URL from YouTube'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', 'English')}</label>
              <input
                type="text"
                aria-label={(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', 'English')} value={liveVideo.title?.en || ''}
                onChange={(e) => setLiveVideo({ ...liveVideo, title: { ...liveVideo.title, en: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">{(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', 'नेपाली')}</label>
              <input
                type="text"
                aria-label={(t.a3_c_titleLang || 'Title ({lang})').replace('{lang}', 'नेपाली')} value={liveVideo.title?.ne || ''}
                onChange={(e) => setLiveVideo({ ...liveVideo, title: { ...liveVideo.title, ne: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', 'English')}</label>
            <textarea
              rows={2}
              aria-label={(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', 'English')} value={liveVideo.description?.en || ''}
              onChange={(e) => setLiveVideo({ ...liveVideo, description: { ...liveVideo.description, en: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', 'नेपाली')}</label>
            <textarea
              rows={2}
              aria-label={(t.a3_c_descriptionLang || 'Description ({lang})').replace('{lang}', 'नेपाली')} value={liveVideo.description?.ne || ''}
              onChange={(e) => setLiveVideo({ ...liveVideo, description: { ...liveVideo.description, ne: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50 shadow-lg shadow-black/10"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.a3_c_saving || 'Saving...'}
            </>
          ) : (
            <>
              <Save size={16} />
              {t.a3_home_save || 'Save Home Settings'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminHome;