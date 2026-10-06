import React, { useState, useRef } from 'react';
import { 
  Save, Upload, Image, Trash2,
  Link2, Globe, Phone, Mail, MapPin, Heart,
  Video, Languages,
  Map
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';
import OmLoader from '../../components/common/OmLoader';

const BG_TYPES = ['color', 'image', 'video'];

const AdminFooter = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Footer settings state
  const [footerSettings, setFooterSettings] = useState(settings?.footer || {
    enabled: true,
    bgType: 'color',
    bgColor: '#ffffff',
    bgImage: null,
    bgVideo: null,
    logoShape: 'circle',
    logoSize: 'md',
    showSocial: true,
    showQuickLinks: true,
    showContact: true,
    showSupport: true,
    showMap: true,
    showSubscribe: true,
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.245849736379!2d85.3221176!3d27.7170489!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb190c9f5c8d7b%3A0x4f8b3f8b3f8b3f8b!2sGaushala%2C%20Kathmandu%2044600!5e0!3m2!1sen!2snp!4v1700000000000',
    socialLinks: {
      facebook: { enabled: true, url: 'https://facebook.com' },
      youtube: { enabled: true, url: 'https://youtube.com' },
      instagram: { enabled: true, url: 'https://instagram.com' },
      twitter: { enabled: true, url: 'https://twitter.com' },
    },
    contactInfo: {
      phone: '+977-1-4XXXXXX',
      email: 'info@ramchandratemple.org.np',
      address: { 
        en: 'Battisputali, Gaushala, Kathmandu, Nepal',
        ne: 'बत्तीसपुतली, गौशाला, काठमाडौं, नेपाल',
        hi: 'बत्तीसपुतली, गौशाला, काठमांडू, नेपाल',
        zh: '巴蒂斯普塔利，高沙拉，加德满都，尼泊尔',
        ta: 'பட்டீஸ்புதாலி, கௌஷாலா, காத்மாண்டு, நேபாளம்'
      },
    },
    footerText: {
      rights: { 
        en: 'All rights reserved.',
        ne: 'सबै अधिकार सुरक्षित।',
        hi: 'सभी अधिकार सुरक्षित।',
        zh: '保留所有权利。',
        ta: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.'
      },
      blessing: { 
        en: 'Jai Shree Ram',
        ne: 'जय श्री राम',
        hi: 'जय श्री राम',
        zh: '贾伊·什里·拉姆',
        ta: 'ஜெய் ஸ்ரீ ராம்'
      },
    },
    // Navigation buttons without icons - Fixed with proper initialization
    navButtons: [
      { label: { en: 'Home', ne: 'गृह', hi: 'होम', zh: '首页', ta: 'முகப்பு' }, path: '/' },
      { label: { en: 'About', ne: 'बारे', hi: 'के बारे में', zh: '关于', ta: 'பற்றி' }, path: '/about' },
      { label: { en: 'History', ne: 'इतिहास', hi: 'इतिहास', zh: '历史', ta: 'வரலாறு' }, path: '/history' },
      { label: { en: 'Events', ne: 'कार्यक्रम', hi: 'आयोजन', zh: '活动', ta: 'நிகழ்வுகள்' }, path: '/events' },
      { label: { en: 'Gallery', ne: 'ग्यालरी', hi: 'गैलरी', zh: '画廊', ta: 'கேலரி' }, path: '/gallery' },
      { label: { en: 'Contact', ne: 'सम्पर्क', hi: 'संपर्क', zh: '联系', ta: 'தொடர்பு' }, path: '/contact' },
      { label: { en: 'Donate', ne: 'दान', hi: 'दान', zh: '捐赠', ta: 'நன்கொடை' }, path: '/donate' },
      { label: { en: 'Team', ne: 'टोली', hi: 'टीम', zh: '团队', ta: 'குழு' }, path: '/templeteams' },
    ],
  });

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  // Handle Image Upload
  const handleBgImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      showToast((t.a3_footer_selectImage || 'Please select an image file'), 'warning');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast((t.a3_footer_imageTypes || 'Please upload an image file (JPG, PNG, WEBP)'), 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '10'), 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/footer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      
      if (response.data && response.data.url) {
        setFooterSettings({ 
          ...footerSettings, 
          bgImage: response.data.url, 
          bgType: 'image' 
        });
        showToast((t.a3_footer_bgImageUploaded || 'Background image uploaded successfully'), 'success');
      } else {
        showToast(response.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMsg = (t.a3_c_uploadFailedRetry || 'Upload failed. Please try again.');
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = (t.a3_footer_timeoutImage || 'Upload timed out. Please try with a smaller file.');
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMsg = (t.a3_c_networkError || 'Network error. Please check your connection and try again.');
      }
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Handle Video Upload - For footer top banner only
  const handleBgVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      showToast((t.a3_footer_selectVideo || 'Please select a video file'), 'warning');
      return;
    }

    if (!file.type.startsWith('video/')) {
      showToast((t.a3_footer_videoTypes || 'Please upload a video file (MP4, MOV)'), 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast((t.a3_c_videoMaxSize || 'Video must be less than {size}MB').replace('{size}', '100'), 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/admin/upload/footer/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      
      if (response.data && response.data.url) {
        setFooterSettings({ 
          ...footerSettings, 
          bgVideo: response.data.url, 
          bgType: 'video' 
        });
        showToast((t.a3_footer_bgVideoUploaded || 'Background video uploaded successfully'), 'success');
      } else {
        showToast(response.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMsg = (t.a3_c_uploadFailedRetry || 'Upload failed. Please try again.');
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = (t.a3_footer_timeoutVideo || 'Upload timed out. Please try with a smaller video file.');
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMsg = (t.a3_c_networkError || 'Network error. Please check your connection and try again.');
      }
      showToast(errorMsg, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings({ footer: footerSettings });
      showToast((t.a3_footer_saved || 'Footer settings saved successfully'), 'success');
    } catch (error) {
      console.error('Save error:', error);
      let errorMsg = (t.a3_c_failedToSaveRetry || 'Failed to save settings. Please try again.');
      if (error.message === 'Network Error') {
        errorMsg = (t.a3_c_networkError || 'Network error. Please check your connection and try again.');
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBg = () => {
    setFooterSettings({ 
      ...footerSettings, 
      bgImage: null, 
      bgVideo: null, 
      bgType: 'color' 
    });
    showToast((t.a3_footer_bgRemoved || 'Background removed'), 'success');
  };

  // Trigger file input for image
  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Trigger file input for video
  const triggerVideoUpload = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-serif font-semibold text-ink">{t.a3_footer_settings || 'Footer Settings'}</h4>
            <p className="text-sm text-ink-soft">{t.a3_footer_enableHint || 'Enable or disable the footer globally'}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={footerSettings.enabled}
              onChange={(e) => setFooterSettings({ ...footerSettings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vermilion"></div>
            <span className="ml-3 text-sm font-medium text-ink-soft">
              {footerSettings.enabled ? (t.a3_c_active || 'Active') : (t.a3_c_disabled || 'Disabled')}
            </span>
          </label>
        </div>
      </div>

      {/* Background Settings: colour, photo or video (shown behind the footer text band) */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4">{t.a3_footer_bannerBg || 'Footer Top Banner Background'}</h4>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {BG_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFooterSettings({ ...footerSettings, bgType: type })}
              className={`p-2.5 sm:p-4 rounded-xl border-2 text-center transition-all ${
                footerSettings.bgType === type 
                  ? 'border-vermilion bg-vermilion/5 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-sm font-medium ${footerSettings.bgType === type ? 'text-vermilion' : 'text-ink'}`}>
                {type === 'color' ? (t.a3_footer_color || 'Color') : type === 'image' ? (t.a3_footer_image || 'Image') : (t.a3_footer_video || 'Video')}
              </div>
              <div className="text-xs text-ink-soft mt-1">
                {type === 'color' ? (t.a3_footer_solidColor || 'Solid color') : type === 'image' ? (t.a3_footer_uploadImage || 'Upload image') : (t.a3_footer_uploadVideo || 'Upload video')}
              </div>
            </button>
          ))}
        </div>

        {(footerSettings.bgType === 'color' || !BG_TYPES.includes(footerSettings.bgType)) && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <label className="text-sm font-medium text-ink">{t.a3_footer_color || 'Color'}</label>
            <input
              type="color"
              aria-label={(t.a3_footer_bgColour || 'Background colour')} value={footerSettings.bgColor}
              onChange={(e) => setFooterSettings({ ...footerSettings, bgColor: e.target.value })}
              className="w-14 h-14 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-vermilion transition-colors"
            />
            <span className="text-sm text-ink-soft">{footerSettings.bgColor}</span>
          </div>
        )}

        {BG_TYPES.includes(footerSettings.bgType) && footerSettings.bgType !== 'color' && (
          <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 hover:border-vermilion transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleBgImageUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              onChange={handleBgVideoUpload}
              className="hidden"
            />
            
            <div className="relative">
              {footerSettings.bgType === 'image' && footerSettings.bgImage ? (
                <div className="relative">
                  <div className="w-full max-h-48 overflow-hidden bg-gray-100">
                    <img 
                      src={footerSettings.bgImage} 
                      alt={(t.a3_footer_background || 'Background')} 
                      className="w-full h-auto max-h-48 object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex flex-wrap items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity p-4">
                    <button
                      onClick={triggerImageUpload}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Upload size={16} /> {t.a3_c_change || 'Change'}
                    </button>
                    <button
                      onClick={handleRemoveBg}
                      className="px-3 py-2 bg-red-500/70 hover:bg-red-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} /> {t.remove || 'Remove'}
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {t.a3_c_preview || 'Preview'}
                  </div>
                </div>
              ) : footerSettings.bgType === 'video' && footerSettings.bgVideo ? (
                <div className="relative">
                  <div className="w-full max-h-48 overflow-hidden bg-gray-900">
                    <video 
                      src={footerSettings.bgVideo} 
                      className="w-full h-auto max-h-48 object-cover object-center"
                      muted 
                      playsInline
                      loop
                      autoPlay
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex flex-wrap items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity p-4">
                    <button
                      onClick={triggerVideoUpload}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Upload size={16} /> {t.a3_c_change || 'Change'}
                    </button>
                    <button
                      onClick={handleRemoveBg}
                      className="px-3 py-2 bg-red-500/70 hover:bg-red-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} /> {t.remove || 'Remove'}
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Video size={12} /> {t.a3_c_preview || 'Preview'}
                  </div>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center h-48 cursor-pointer p-4"
                  onClick={footerSettings.bgType === 'image' ? triggerImageUpload : triggerVideoUpload}
                >
                  <div className="flex flex-col items-center gap-2 text-ink-soft text-center">
                    {footerSettings.bgType === 'image' ? <Image size={40} className="opacity-50" /> : <Video size={40} className="opacity-50" />}
                    <span className="text-sm font-medium">
                      {footerSettings.bgType === 'image' ? (t.a3_footer_clickUploadImage || 'Click to upload image') : (t.a3_footer_clickUploadVideo || 'Click to upload video')}
                    </span>
                    <span className="text-xs text-mute">
                      {footerSettings.bgType === 'image' ? 'JPG, PNG, WEBP • Max 10MB' : 'MP4, MOV • Max 100MB'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        footerSettings.bgType === 'image' ? triggerImageUpload() : triggerVideoUpload();
                      }}
                      className="mt-2 px-4 py-2 bg-vermilion text-white rounded-lg text-sm font-medium hover:bg-[#820606] transition-all flex items-center gap-2"
                    >
                      <Upload size={16} /> {t.a3_footer_chooseFile || 'Choose File'}
                    </button>
                  </div>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <OmLoader size="lg" color="white" className="mx-auto mb-2" />
                    <span className="text-sm">{t.uploading || 'Uploading...'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logo Settings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4">{t.a3_footer_logoSettings || 'Logo Settings'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_footer_shape || 'Shape'}</label>
            <select
              aria-label={(t.a3_footer_shape || 'Shape')} value={footerSettings.logoShape}
              onChange={(e) => setFooterSettings({ ...footerSettings, logoShape: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
            >
              <option value="circle">{t.a3_c_circle || 'Circle'}</option>
              <option value="square">{t.a3_c_square || 'Square'}</option>
              <option value="rectangle">{t.a3_footer_rectangle || 'Rectangle'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_footer_size || 'Size'}</label>
            <select
              aria-label={(t.a3_footer_size || 'Size')} value={footerSettings.logoSize}
              onChange={(e) => setFooterSettings({ ...footerSettings, logoSize: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
            >
              <option value="sm">{t.a3_c_small || 'Small'}</option>
              <option value="md">{t.a3_c_medium || 'Medium'}</option>
              <option value="lg">{t.a3_c_large || 'Large'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Buttons - No Icons, Clean Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4 flex items-center gap-2">
          <Link2 size={20} className="text-vermilion" />
          {t.a3_footer_navButtons || 'Navigation Buttons'}
        </h4>
        <p className="text-sm text-ink-soft mb-4">{t.a3_footer_navButtonsHint || 'Customize navigation buttons without icons'}</p>
        
        {footerSettings.navButtons && footerSettings.navButtons.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {footerSettings.navButtons.map((btn, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-vermilion/30 transition-all">
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">{(t.a3_footer_labelLang || 'Label ({lang})').replace('{lang}', activeLang)}</label>
                    <input
                      type="text"
                      aria-label={(t.a3_footer_labelLang || 'Label ({lang})').replace('{lang}', activeLang)} value={getLocalizedText(btn.label)}
                      onChange={(e) => {
                        const newNavButtons = [...footerSettings.navButtons];
                        newNavButtons[index].label[activeLang] = e.target.value;
                        setFooterSettings({ ...footerSettings, navButtons: newNavButtons });
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-white"
                      placeholder={(t.a3_footer_buttonLabel || 'Button label')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">{t.a3_footer_path || 'Path'}</label>
                    <input
                      type="text"
                      aria-label={(t.a3_footer_path || 'Path')} value={btn.path}
                      onChange={(e) => {
                        const newNavButtons = [...footerSettings.navButtons];
                        newNavButtons[index].path = e.target.value;
                        setFooterSettings({ ...footerSettings, navButtons: newNavButtons });
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-white"
                      placeholder="/path"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const newNavButtons = footerSettings.navButtons.filter((_, i) => i !== index);
                      setFooterSettings({ ...footerSettings, navButtons: newNavButtons });
                      showToast((t.a3_footer_navRemoved || 'Navigation button removed'), 'success');
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors text-left flex items-center gap-1"
                  >
                    <Trash2 size={12} /> {t.remove || 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-ink-soft">
            <p>{t.a3_footer_noNav || 'No navigation buttons added yet.'}</p>
          </div>
        )}
        
        <button
          onClick={() => {
            const newNavButtons = [...(footerSettings.navButtons || [])];
            newNavButtons.push({ 
              label: { en: 'New Page', ne: 'नयाँ पृष्ठ', hi: 'नया पेज', zh: '新页面', ta: 'புதிய பக்கம்' }, 
              path: '/new-page' 
            });
            setFooterSettings({ ...footerSettings, navButtons: newNavButtons });
            showToast((t.a3_footer_navAdded || 'New navigation button added'), 'success');
          }}
          className="mt-4 px-4 py-2 bg-brand-50 text-vermilion rounded-lg text-sm font-medium hover:bg-vermilion/20 transition-all flex items-center gap-2"
        >
          + {t.a3_footer_addNav || 'Add Navigation Button'}
        </button>
      </div>

      {/* Multi-language Footer Text */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4 flex items-center gap-2">
          <Languages size={20} className="text-vermilion" />
          {t.a3_footer_text || 'Footer Text (Multi-language)'}
        </h4>
        
        <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_footer_rightsText || 'Rights Text'}</label>
            <input
              type="text"
              aria-label={(t.a3_footer_rightsText || 'Rights Text')} value={footerSettings.footerText?.rights?.[activeLang] || ''}
              onChange={(e) => setFooterSettings({
                ...footerSettings,
                footerText: {
                  ...footerSettings.footerText,
                  rights: { ...footerSettings.footerText?.rights, [activeLang]: e.target.value }
                }
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder={(t.allRightsReserved || 'All rights reserved.')}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_footer_blessingText || 'Blessing Text'}</label>
            <input
              type="text"
              aria-label={(t.a3_footer_blessingText || 'Blessing Text')} value={footerSettings.footerText?.blessing?.[activeLang] || ''}
              onChange={(e) => setFooterSettings({
                ...footerSettings,
                footerText: {
                  ...footerSettings.footerText,
                  blessing: { ...footerSettings.footerText?.blessing, [activeLang]: e.target.value }
                }
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder="Jai Shree Ram"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.address || 'Address'}</label>
            <input
              type="text"
              aria-label={(t.address || 'Address')} value={footerSettings.contactInfo?.address?.[activeLang] || ''}
              onChange={(e) => setFooterSettings({
                ...footerSettings,
                contactInfo: {
                  ...footerSettings.contactInfo,
                  address: { ...footerSettings.contactInfo?.address, [activeLang]: e.target.value }
                }
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder={(t.locationValue || 'Battisputali, Gaushala, Kathmandu, Nepal')}
            />
          </div>
        </div>
      </div>

      {/* Sections Toggle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4">{t.a3_footer_sections || 'Sections'}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { key: 'showSocial', label: (t.a3_footer_socialLinks || 'Social Links'), icon: <Globe size={16} /> },
            { key: 'showQuickLinks', label: (t.a3_footer_quickLinks || 'Quick Links'), icon: <Link2 size={16} /> },
            { key: 'showContact', label: (t.a3_footer_contactInfo || 'Contact Info'), icon: <Phone size={16} /> },
            { key: 'showSupport', label: (t.a3_footer_support || 'Support'), icon: <Heart size={16} /> },
            { key: 'showMap', label: (t.a3_footer_map || 'Map'), icon: <Map size={16} /> },
            { key: 'showSubscribe', label: (t.a3_footer_subscribe || 'Subscribe'), icon: <Mail size={16} /> },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={footerSettings[item.key] !== false}
                onChange={(e) => setFooterSettings({ ...footerSettings, [item.key]: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
              />
              <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                {item.icon} {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4 flex items-center gap-2">
          <Phone size={20} className="text-vermilion" />
          {t.a3_footer_contactInformation || 'Contact Information'}
        </h4>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5 flex items-center gap-1">
              <Phone size={14} className="text-ink-soft" /> {t.phone || 'Phone'}
            </label>
            <input
              type="text"
              aria-label={(t.phone || 'Phone')} value={footerSettings.contactInfo?.phone || ''}
              onChange={(e) => setFooterSettings({ 
                ...footerSettings, 
                contactInfo: { ...footerSettings.contactInfo, phone: e.target.value } 
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder="+977-1-4XXXXXX"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5 flex items-center gap-1">
              <Mail size={14} className="text-ink-soft" /> {t.email || 'Email'}
            </label>
            <input
              type="text"
              aria-label={(t.email || 'Email')} value={footerSettings.contactInfo?.email || ''}
              onChange={(e) => setFooterSettings({ 
                ...footerSettings, 
                contactInfo: { ...footerSettings.contactInfo, email: e.target.value } 
              })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
              placeholder="info@ramchandratemple.org.np"
            />
          </div>
        </div>
      </div>

      {/* Map Settings - Fixed to show in footer */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
        <h4 className="text-lg font-serif font-semibold text-ink mb-4 flex items-center gap-2">
          <Map size={20} className="text-vermilion" />
          {t.a3_footer_mapSettings || 'Map Settings'}
        </h4>
        <p className="text-sm text-ink-soft mb-4">{t.a3_footer_mapHint || 'Map will display in footer if enabled'}</p>
        <div>
          <label className="text-xs font-bold text-ink block mb-1.5 flex items-center gap-1">
            <MapPin size={14} className="text-ink-soft" /> {t.a3_footer_mapUrl || 'Google Maps Embed URL'}
          </label>
          <input
            type="text"
            aria-label={(t.a3_footer_mapUrl || 'Google Maps Embed URL')} value={footerSettings.mapUrl || ''}
            onChange={(e) => setFooterSettings({ ...footerSettings, mapUrl: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white transition-colors"
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
          <p className="text-xs text-mute mt-2">
            {t.a3_footer_mapUrlHint || 'Get embed URL from Google Maps → Share → Embed a map'}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-vermilion to-maroon-deep text-white font-semibold text-sm hover:shadow-lg hover:shadow-black/10 transition-all disabled:opacity-50 hover:-translate-y-0.5"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.a3_c_saving || 'Saving...'}
            </>
          ) : (
            <>
              <Save size={18} />
              {t.a3_footer_save || 'Save Footer Settings'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminFooter;