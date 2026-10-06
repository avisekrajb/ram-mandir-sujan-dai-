import React, { useState, useRef, useEffect } from 'react';
import { Save, Image, Trash2, Eye, EyeOff, Palette, MapPin } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';

const AdminLogo = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const [activeLang, setActiveLang] = useState('en');
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Logo settings
  const [logoPhoto, setLogoPhoto] = useState(settings?.logo?.photo || null);
  const [logoText, setLogoText] = useState({});
  
  // Logo size settings - MODERN approach with max constraints
  const [logoSize, setLogoSize] = useState(settings?.logo?.size || 'w-12 h-12');
  const [logoShape, setLogoShape] = useState(settings?.logo?.shape || 'rounded-full');
  const [logoBgColor, setLogoBgColor] = useState(settings?.logo?.bgColor || 'from-vermilion to-maroon-deep');
  const [showText, setShowText] = useState(settings?.logo?.showText !== false);
  const [textColor, setTextColor] = useState(settings?.logo?.textColor || 'text-maroon');
  const [textSize, setTextSize] = useState(settings?.logo?.textSize || 'text-sm md:text-base');
  const [fontWeight, setFontWeight] = useState(settings?.logo?.fontWeight || 'font-bold');
  const [showLocation, setShowLocation] = useState(settings?.logo?.showLocation !== false);
  const [logoMaxWidth] = useState(settings?.logo?.maxWidth || 'max-w-[40px] sm:max-w-[50px]');

  // Initialize logo text from settings
  useEffect(() => {
    if (settings?.logo?.text) {
      setLogoText(settings.logo.text);
    } else {
      setLogoText({ 
        en: 'Shree Ramchandra', 
        ne: 'श्री रामचन्द्र', 
        hi: 'श्री रामचंद्र', 
        zh: '什里·拉姆钱德拉', 
        ta: 'ஸ்ரீ ராமச்சந்திர' 
      });
    }
  }, [settings]);

  const handleLangChange = (lang) => {
    setActiveLang(lang);
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast((t.uploadImageOnly || 'Please upload an image file'), 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast((t.a3_c_imageMaxSize || 'Image must be less than {size}MB').replace('{size}', '5'), 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoPhoto(response.data.url);
      await updateSettings({ 
        logo: { 
          ...settings?.logo, 
          photo: response.data.url,
          text: logoText,
          size: logoSize,
          shape: logoShape,
          bgColor: logoBgColor,
          showText: showText,
          textColor: textColor,
          textSize: textSize,
          fontWeight: fontWeight,
          showLocation: showLocation,
          maxWidth: logoMaxWidth,
        } 
      });
      showToast((t.a3_logo_uploaded || 'Logo uploaded successfully'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setLoading(false);
    }
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm((t.a3_logo_removeConfirm || 'Remove logo image?'))) return;
    setLogoPhoto(null);
    await updateSettings({ 
      logo: { 
        ...settings?.logo, 
        photo: null,
        text: logoText,
        size: logoSize,
        shape: logoShape,
        bgColor: logoBgColor,
        showText: showText,
        textColor: textColor,
        textSize: textSize,
        fontWeight: fontWeight,
        showLocation: showLocation,
        maxWidth: logoMaxWidth,
      } 
    });
    showToast((t.a3_logo_removed || 'Logo removed'), 'success');
  };

  const handleSave = async () => {
    try {
      const newLogo = {
        ...settings?.logo,
        text: logoText,
        photo: logoPhoto,
        size: logoSize,
        shape: logoShape,
        bgColor: logoBgColor,
        showText: showText,
        textColor: textColor,
        textSize: textSize,
        fontWeight: fontWeight,
        showLocation: showLocation,
        maxWidth: logoMaxWidth,
      };
      await updateSettings({ logo: newLogo });
      showToast((t.a3_logo_saved || 'Logo settings saved successfully'), 'success');
    } catch (error) {
      console.error('Save logo error:', error);
      showToast(error.response?.data?.message || (t.a3_logo_saveFailed || 'Failed to save logo'), 'error');
    }
  };

  // Shape options
  const shapeOptions = [
    { value: 'rounded', label: (t.a3_logo_softRound || 'Soft Round') },
    { value: 'rounded-xl', label: (t.a3_logo_rounded || 'Rounded') },
    { value: 'rounded-2xl', label: (t.a3_logo_extraRound || 'Extra Round') },
    { value: 'rounded-full', label: (t.a3_c_circle || 'Circle') },
    { value: 'rounded-none', label: (t.a3_c_square || 'Square') },
  ];

  // Size options - MODERN sizes with max width constraints
  const sizeOptions = [
    { value: 'w-8 h-8', label: 'XS (32px)', maxW: 'max-w-[32px]' },
    { value: 'w-10 h-10', label: `${(t.a3_c_small || 'Small')} (40px)`, maxW: 'max-w-[40px]' },
    { value: 'w-12 h-12', label: `${(t.a3_c_medium || 'Medium')} (48px)`, maxW: 'max-w-[48px]' },
    { value: 'w-14 h-14', label: `${(t.a3_c_large || 'Large')} (56px)`, maxW: 'max-w-[56px]' },
    { value: 'w-16 h-16', label: 'XL (64px)', maxW: 'max-w-[64px]' },
    { value: 'w-20 h-20', label: '2XL (80px)', maxW: 'max-w-[80px]' },
  ];

  // Text size options
  const textSizeOptions = [
    { value: 'text-xs sm:text-xs', label: 'XS' },
    { value: 'text-xs sm:text-xs', label: (t.a3_c_small || 'Small') },
    { value: 'text-xs sm:text-sm', label: (t.a3_c_medium || 'Medium') },
    { value: 'text-sm sm:text-base', label: (t.a3_c_large || 'Large') },
    { value: 'text-base sm:text-lg', label: 'XL' },
    { value: 'text-lg sm:text-xl', label: '2XL' },
  ];

  // Font weight options
  const fontWeightOptions = [
    { value: 'font-medium', label: (t.a3_c_medium || 'Medium') },
    { value: 'font-semibold', label: (t.a3_logo_semiBold || 'Semi Bold') },
    { value: 'font-bold', label: (t.a3_logo_bold || 'Bold') },
    { value: 'font-extrabold', label: (t.a3_logo_extraBold || 'Extra Bold') },
  ];

  // Color options
  const colorOptions = [
    { value: 'text-maroon', label: (t.a3_logo_maroon || 'Maroon') },
    { value: 'text-ink', label: (t.a3_logo_dark || 'Dark') },
    { value: 'text-white', label: (t.a3_logo_white || 'White') },
    { value: 'text-vermilion', label: (t.a3_logo_vermilion || 'Vermilion') },
    { value: 'text-ink-soft', label: (t.a3_logo_gray || 'Gray') },
  ];

  // BG color options
  const bgColorOptions = [
    { value: 'from-vermilion to-maroon-deep', label: (t.a3_logo_default || 'Default') },
    { value: 'from-red-600 to-red-800', label: (t.a3_logo_red || 'Red') },
    { value: 'from-amber-500 to-brand-600', label: (t.a3_logo_amber || 'Amber') },
    { value: 'from-brand-500 to-brand-600', label: (t.a3_logo_emerald || 'Emerald') },
    { value: 'from-brand-500 to-brand-600', label: (t.a3_logo_blue || 'Blue') },
    { value: 'from-brand-500 to-brand-500', label: (t.a3_logo_purple || 'Purple') },
  ];

  const currentText = getLocalizedText(logoText);
  const templeSub = t.templeSub || 'Gaushala, Kathmandu';

  // Get max width for selected size
  const getMaxWidth = (size) => {
    const option = sizeOptions.find(opt => opt.value === size);
    return option ? option.maxW : 'max-w-[48px]';
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="bg-white border border-line rounded-rt p-4 shadow-rt">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-serif font-semibold">{t.a3_logo_livePreview || 'Live Preview'}</h4>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="text-xs text-ink-soft hover:text-vermilion transition-colors flex items-center gap-1"
          >
            {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {previewMode ? (t.a3_logo_hidePreview || 'Hide Preview') : (t.a3_logo_showPreview || 'Show Preview')}
          </button>
        </div>
        
        {previewMode && (
          <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center border border-gray-200">
            <div className="flex items-center gap-3 max-w-full overflow-hidden">
              <div className={`${logoSize} ${logoShape} bg-gradient-to-br ${logoBgColor} text-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg shadow-black/10 ${getMaxWidth(logoSize)}`}>
                {logoPhoto ? (
                  <img src={logoPhoto} alt={(t.a3_logo_logo || 'Logo')} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">🕉</span>
                )}
              </div>
              {showText && (
                <div className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className={`font-serif ${textSize} ${fontWeight} ${textColor} truncate max-w-[150px] sm:max-w-[200px]`}>
                    {currentText || 'Shree Ramchandra'}
                  </span>
                  {showLocation && (
                    <span className="text-xs sm:text-xs text-ink-soft flex items-center gap-1 truncate max-w-[150px] sm:max-w-[200px]">
                      <MapPin size={10} className="text-vermilion flex-shrink-0" />
                      {templeSub}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logo Upload */}
      <div className="bg-white border border-line rounded-rt p-4 shadow-rt">
        <h4 className="text-sm font-serif font-semibold mb-1">{t.a3_logo_image || 'Logo Image'}</h4>
        <p className="text-xs text-ink-soft mb-4">{t.a3_logo_imageHint || 'Upload or manage your logo image'}</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div
            className="relative border-2 border-dashed border-line rounded-xl overflow-hidden h-32 flex-1 flex items-center justify-center cursor-pointer bg-panel hover:border-vermilion transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
            {logoPhoto ? (
              <img src={logoPhoto} alt={(t.a3_logo_logo || 'Logo')} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-ink-soft">
                <Image size={28} />
                <span className="text-xs font-semibold">{t.a3_c_clickToUpload || 'Click to upload'}</span>
                <span className="text-xs text-mute">PNG, JPG, WEBP • Max 5MB</span>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full animate-spin border-t-transparent" />
              </div>
            )}
          </div>

          {logoPhoto && (
            <button
              onClick={handleRemoveLogo}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-500 font-medium text-sm hover:bg-red-100 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 size={16} /> {t.remove || 'Remove'}
            </button>
          )}
        </div>
      </div>

      {/* Logo Text - Multi-language */}
      <div className="bg-white border border-line rounded-rt p-4 shadow-rt">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-serif font-semibold">{t.a3_logo_text || 'Logo Text'}</h4>
          <LanguageSwitcher active={activeLang} onChange={handleLangChange} t={t} />
        </div>

        <div className="mb-3">
          <label className="text-xs font-bold text-ink block mb-1.5">
            {(t.a3_logo_textIn || 'Text in {lang}').replace('{lang}', activeLang.toUpperCase())}
          </label>
          <input
            type="text"
            aria-label={(t.a3_logo_textIn || 'Text in {lang}').replace('{lang}', activeLang.toUpperCase())} value={logoText[activeLang] || ''}
            onChange={(e) => setLogoText({ ...logoText, [activeLang]: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none transition-colors text-sm bg-gray-50 hover:bg-white"
            placeholder={(t.a3_logo_enterText || 'Enter logo text in {lang}').replace('{lang}', activeLang)}
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={showText}
              onChange={(e) => setShowText(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
            />
            {t.a3_logo_showText || 'Show Text'}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(e) => setShowLocation(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-vermilion focus:ring-vermilion"
            />
            {t.a3_logo_showLocation || 'Show Location'}
          </label>
        </div>
      </div>

      {/* Styling Settings */}
      <div className="bg-white border border-line rounded-rt p-4 shadow-rt">
        <h4 className="text-sm font-serif font-semibold mb-3 flex items-center gap-2">
          <Palette size={16} className="text-vermilion" />
          {t.a3_logo_styling || 'Styling Settings'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Logo Size */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_size || 'Logo Size'}</label>
            <select
              aria-label={(t.a3_logo_size || 'Logo Size')} value={logoSize}
              onChange={(e) => setLogoSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {sizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-mute mt-1">{t.a3_logo_sizeHint || 'Logo will be constrained to prevent stretching'}</p>
          </div>

          {/* Logo Shape */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_shape || 'Logo Shape'}</label>
            <select
              aria-label={(t.a3_logo_shape || 'Logo Shape')} value={logoShape}
              onChange={(e) => setLogoShape(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {shapeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* BG Color */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_bgColor || 'Background Color'}</label>
            <select
              aria-label={(t.a3_logo_bgColor || 'Background Color')} value={logoBgColor}
              onChange={(e) => setLogoBgColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {bgColorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Text Size */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_textSize || 'Text Size'}</label>
            <select
              aria-label={(t.a3_logo_textSize || 'Text Size')} value={textSize}
              onChange={(e) => setTextSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {textSizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Font Weight */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_fontWeight || 'Font Weight'}</label>
            <select
              aria-label={(t.a3_logo_fontWeight || 'Font Weight')} value={fontWeight}
              onChange={(e) => setFontWeight(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {fontWeightOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Text Color */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_logo_textColor || 'Text Color'}</label>
            <select
              aria-label={(t.a3_logo_textColor || 'Text Color')} value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm bg-gray-50 hover:bg-white"
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all shadow-lg shadow-black/10 hover:shadow-xl"
        >
          <Save size={16} /> {t.a3_logo_saveAll || 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminLogo;