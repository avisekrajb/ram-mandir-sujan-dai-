import React, { useRef, useState } from 'react';
import { Upload, X, Play, Pause, RefreshCw, Type, Save, ImageIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../../components/common/OmLoader';

const HERO_LANGS = [
  ['en', 'EN'],
  ['ne', 'ने'],
  ['hi', 'हिं'],
  ['zh', '中'],
  ['ta', 'த'],
];

const DEFAULT_HERO_TITLE = {
  en: 'Shree Ramchandra Temple',
  ne: 'श्री रामचन्द्र मन्दिर',
  hi: 'श्री रामचंद्र मंदिर',
  zh: '什里·拉姆钱德拉神庙',
  ta: 'ஸ்ரீ ராமச்சந்திர கோவில்',
};

const DEFAULT_HERO_TAGLINE = {
  en: 'Where devotion meets the sacred banks of Bagmati',
  ne: 'जहाँ भक्ति बागमतीको पवित्र किनारमा मिल्छ',
  hi: 'जहाँ भक्ति बागमती के पवित्र तटों से मिलती है',
  zh: '虔诚与巴格马蒂圣河相遇之处',
  ta: 'பக்தி பாக்மதியின் புனித கரையில் சந்திக்கும் இடம்',
};

const DEFAULT_HERO_SHLOKA = {
  invocation: {
    en: 'Salutations to Lord Shri Ramachandra.',
    ne: 'श्रीरामचन्द्राय नमः',
    hi: 'श्रीरामचन्द्राय नमः',
    zh: '向室利罗摩旃陀罗致敬。',
    ta: 'ஸ்ரீ ராமச்சந்திராய நமஹ',
  },
  stutiLabel: {
    en: 'Hymn to Shri Rama:',
    ne: 'श्रीरामस्तुति:',
    hi: 'श्रीराम स्तुति:',
    zh: '室利罗摩赞颂：',
    ta: 'ஸ்ரீ ராம ஸ்துதி:',
  },
  verse: {
    en: 'I seek refuge in Lord Shri Ramachandra, who is beloved of all, courageous on the battlefield, lotus-eyed, and the Lord of the Raghu dynasty; who embodies compassion and is the bestower of mercy.',
    ne: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥',
    hi: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥',
    zh: '我皈依于室利罗摩旃陀罗，他令人世间喜爱，战场上英勇无畏，拥有如莲花般的双眼，是拉古王朝之主；他是慈悲的化身，是施予慈悲与恩典之主。',
    ta: 'உலகத்தாரால் நேசிக்கப்படுபவரும், போர்க்களத்தில் வீரமும் துணிவும் கொண்டவரும், தாமரை போன்ற கண்களையுடையவரும், ரகு வம்சத்தின் தலைவருமான ஸ்ரீ ராமச்சந்திரரை நான் சரணடைகிறேன். அவர் கருணையின் வடிவமாகவும், அருளை வழங்குபவராகவும் விளங்குகிறார்.',
  },
};

/*
 * Blank stored values are skipped so the form always opens on the seeded text:
 * an empty banner is never saved by accident, and clearing a language here
 * leaves it on the default rather than removing it from the home page.
 * Records written by an older build hold a group wrapped in a one-element array
 * (`verse: [{ en, ... }]`); it is unwrapped so the real text shows up instead of
 * an empty box.
 */
const withDefaults = (defaults, stored) => {
  const source =
    Array.isArray(stored) ? stored.find((entry) => entry && typeof entry === 'object') || {} : stored;
  const merged = { ...defaults };
  for (const [code, value] of Object.entries(source || {})) {
    if (code in defaults && String(value ?? '').trim()) merged[code] = value;
  }
  return merged;
};

const seedShloka = (stored) => ({
  enabled: stored?.enabled !== false,
  invocation: withDefaults(DEFAULT_HERO_SHLOKA.invocation, stored?.invocation ?? stored?.label),
  stutiLabel: withDefaults(DEFAULT_HERO_SHLOKA.stutiLabel, stored?.stutiLabel),
  verse: withDefaults(DEFAULT_HERO_SHLOKA.verse, stored?.verse),
});

const AdminHero = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // The banner shows a photo or a video, never both. The server retires the
  // other one on upload, and this mirrors it so the panel never offers two.
  const [heroImage, setHeroImage] = useState(settings?.heroImage || null);
  const [heroVideo, setHeroVideo] = useState(settings?.heroVideo || null);
  const [heroTitle, setHeroTitle] = useState({ ...(settings?.heroTitle || DEFAULT_HERO_TITLE) });
  const [heroTagline, setHeroTagline] = useState({ ...(settings?.heroTagline || DEFAULT_HERO_TAGLINE) });
  const [heroShloka, setHeroShloka] = useState(() => seedShloka(settings?.heroShloka));
  const [textLang, setTextLang] = useState('en');
  const [textSaving, setTextSaving] = useState(false);

  const setShlokaText = (part, value) =>
    setHeroShloka((prev) => ({ ...prev, [part]: { ...prev[part], [textLang]: value } }));

  const handleSaveText = async () => {
    setTextSaving(true);
    try {
      await updateSettings({ heroTitle, heroTagline, heroShloka });
      showToast(t.heroTextSaved || 'Hero text updated successfully', 'success');
    } catch (error) {
      console.error('Save hero text error:', error);
      showToast(error.response?.data?.message || (t.a3_hero_textSaveFailed || 'Failed to save hero text'), 'error');
    } finally {
      setTextSaving(false);
    }
  };

  const handleUpload = async (e) => {
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

    setLoading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await api.post('/admin/upload/hero', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // The upload endpoint already cleared the photo, so the panel follows it.
      setHeroVideo(response.data.url);
      setHeroImage(null);
      showToast(t.videoUploaded || (t.a3_hero_videoUploaded || 'Video uploaded successfully'), 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setLoading(false);
    }
    e.target.value = '';
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast((t.a3_c_uploadPhotoOnly || 'Please upload an image file'), 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast((t.a3_c_photoMaxSize || 'Photo must be less than {size}MB').replace('{size}', '10'), 'error');
      return;
    }

    if (heroVideo && !window.confirm((t.a3_hero_photoReplacesVideo || 'Uploading a photo will replace the hero video. Continue?'))) {
      e.target.value = '';
      return;
    }

    setImageLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/hero-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeroImage(response.data.url);
      setHeroVideo(null);
      showToast(t.a3_hero_photoUploaded || 'Photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload photo error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setImageLoading(false);
    }
    e.target.value = '';
  };

  const handleRemoveImage = async () => {
    if (!window.confirm((t.a3_hero_removePhotoConfirm || 'Remove the hero photo?'))) return;
    setImageLoading(true);
    try {
      await updateSettings({ heroImage: null });
      setHeroImage(null);
      showToast((t.a3_hero_photoRemoved || 'Photo removed successfully'), 'success');
    } catch (error) {
      console.error('Remove photo error:', error);
      showToast(error.response?.data?.message || (t.a3_hero_photoRemoveFailed || 'Failed to remove photo'), 'error');
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm((t.a3_hero_removeConfirm || 'Remove the hero video?'))) return;
    setLoading(true);
    try {
      await updateSettings({ heroVideo: null });
      setHeroVideo(null);
      showToast((t.a3_hero_videoRemoved || 'Video removed successfully'), 'success');
    } catch (error) {
      console.error('Remove error:', error);
      showToast(error.response?.data?.message || (t.a3_hero_removeFailed || 'Failed to remove video'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVideo = () => {
    fileInputRef.current?.click();
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-serif font-semibold text-ink">{t.heroBanner || 'Hero Banner'}</h4>
          <p className="text-xs text-ink-soft mt-0.5">
            {t.a3_hero_uploadHint || 'Upload a photo or a video for the hero section'}
          </p>
        </div>
        {heroVideo && (
          <div className="flex gap-2">
            <button
              onClick={handleChangeVideo}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-vermilion bg-brand-50 hover:bg-vermilion/20 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} /> {t.a3_c_changeVideo || 'Change Video'}
            </button>
            <button
              onClick={handleRemove}
              aria-label={(t.a3_c_removeVideo || 'Remove video')}
              disabled={loading}
              className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* The banner shows one source at a time: whichever is set wins, so the
          other control is shown greyed out with the reason rather than hidden. */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-ink-soft">
        <Type size={13} className="shrink-0 text-vermilion" />
        {heroVideo
          ? (t.a3_hero_showingVideo || 'Showing: video (upload a photo to switch to a photo)')
          : heroImage
            ? (t.a3_hero_showingPhoto || 'Showing: photo (upload a video to switch to a video)')
            : (t.a3_hero_showingNone || 'Showing: the plain colour background — upload a photo or a video')}
      </div>

      {/* ---------- Hero photo ---------- */}
      {heroImage ? (
        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[16/7] group">
          <img src={heroImage} alt={t.a3_hero_photo || 'Hero photo'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={imageLoading}
              className="px-4 py-2 rounded-lg bg-white/90 text-ink text-sm font-medium hover:bg-white transition-all inline-flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} /> {t.a3_c_changePhoto || 'Change Photo'}
            </button>
          </div>
          <div className="absolute bottom-2 left-2 text-white/80 text-xs flex items-center gap-1">
            <ImageIcon size={12} /> {t.a3_hero_photoLabel || 'Hero Photo'}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex gap-3">
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={imageLoading}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 border-2 ${
            heroImage
              ? 'border-vermilion text-vermilion hover:bg-vermilion hover:text-white'
              : 'border-vermilion bg-vermilion text-white hover:bg-[#820606]'
          }`}
        >
          {imageLoading ? <OmLoader size="sm" color={heroImage ? 'vermilion' : 'white'} /> : <Upload size={16} />}
          {imageLoading
            ? (t.uploading || 'Uploading...')
            : heroImage
              ? (t.a3_c_changePhoto || 'Change Photo')
              : (t.a3_c_uploadPhoto || 'Upload Photo')}
        </button>
        {heroImage && (
          <button
            onClick={handleRemoveImage}
            disabled={imageLoading}
            className="px-4 py-2.5 rounded-xl border-2 border-red-300 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <X size={16} />
            {t.remove || 'Remove'}
          </button>
        )}
      </div>
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleUploadImage}
        className="hidden"
      />
      <p className="text-xs text-mute mt-2 mb-5">
        {heroImage
          ? <span className="text-green-600">✅ {t.a3_hero_photoOnCloudinary || 'Photo uploaded to Cloudinary'}</span>
          : <span>🖼️ {t.a3_hero_noPhotoHint || 'Upload a photo to display in the hero section'}</span>}
      </p>

      {/* ---------- Hero video ---------- */}
      {heroVideo ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video group">
          <video
            ref={videoRef}
            src={heroVideo}
            className="w-full h-full object-cover"
            muted
            loop
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? (t.a3_c_pause || 'Pause') : (t.a3_c_play || 'Play')}
              className="w-14 h-14 rounded-full bg-white/90 text-ink hover:bg-white transition-all flex items-center justify-center shadow-lg"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/70 text-xs">
            <span>{t.a3_home_heroVideo || 'Hero Video'}</span>
            <span className="bg-black/50 px-2 py-0.5 rounded">{t.a3_c_clickToPlay || 'Click to play'}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 border-2 ${
            heroVideo
              ? 'border-vermilion text-vermilion hover:bg-vermilion hover:text-white'
              : 'border-vermilion bg-vermilion text-white hover:bg-[#820606]'
          }`}
        >
          {loading ? <OmLoader size="sm" color={heroVideo ? 'vermilion' : 'white'} /> : <Upload size={16} />}
          {loading
            ? (t.uploading || 'Uploading...')
            : heroVideo
              ? (t.a3_c_changeVideo || 'Change Video')
              : (t.a3_c_uploadVideo || 'Upload Video')}
        </button>
        {heroVideo && (
          <button
            onClick={handleRemove}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border-2 border-red-300 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <X size={16} />
            {t.remove || 'Remove'}
          </button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleUpload}
        className="hidden"
      />

      <p className="text-xs text-mute mt-3">
        {heroVideo ? (
          <span className="text-green-600">✅ {t.a3_hero_onCloudinary || 'Video uploaded to Cloudinary'}</span>
        ) : (
          <span>📹 {t.a3_hero_noVideoHint || 'Upload a video to display in the hero section'}</span>
        )}
      </p>

      <div className="border-t border-gray-100 mt-6 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Type size={16} className="text-vermilion" />
          <h4 className="text-sm font-serif font-semibold text-ink">
            {t.heroText || 'Hero Banner Text'}
          </h4>
          <p className="text-xs text-ink-soft">{t.heroTextHint || 'Title & tagline shown on the home page hero'}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {HERO_LANGS.map(([code, label]) => (
            <button
              key={code}
              onClick={() => setTextLang(code)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                textLang === code
                  ? 'bg-vermilion text-white'
                  : 'bg-gray-100 text-ink-soft hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">
              {t.heroTitleLabel || 'Title'}
            </label>
            <input
              type="text"
              aria-label={t.heroTitleLabel || 'Title'} value={heroTitle[textLang] || ''}
              onChange={(e) => setHeroTitle(prev => ({ ...prev, [textLang]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-line focus:border-vermilion"
              placeholder={t.templeName || 'Shree Ramchandra Temple'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">
              {t.heroTaglineLabel || 'Tagline'}
            </label>
            <textarea
              rows={2}
              aria-label={t.heroTaglineLabel || 'Tagline'} value={heroTagline[textLang] || ''}
              onChange={(e) => setHeroTagline(prev => ({ ...prev, [textLang]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-line focus:border-vermilion resize-none"
              placeholder={t.heroTagline || 'Where devotion meets the sacred banks of Bagmati'}
            />
          </div>
        </div>

        {/* Invocation / hymn — the three lines printed over the home page banner */}
        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold text-ink">
                {t.heroShlokaText || 'Invocation & Hymn'}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                {t.heroShlokaHint || 'Shown over the home page banner, under the title'}
              </p>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={heroShloka.enabled}
                onChange={(e) => setHeroShloka((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 accent-[#A80808] cursor-pointer"
              />
              <span className="text-xs text-ink-soft font-medium whitespace-nowrap">
                {t.heroShlokaShow || 'Show on banner'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                {t.heroInvocationLabel || 'Invocation'}
              </label>
              <input
                type="text"
                aria-label={t.heroInvocationLabel || 'Invocation'} value={heroShloka.invocation[textLang] || ''}
                onChange={(e) => setShlokaText('invocation', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-line focus:border-vermilion"
                placeholder={DEFAULT_HERO_SHLOKA.invocation[textLang]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                {t.heroStutiLabel || 'Hymn heading'}
              </label>
              <input
                type="text"
                aria-label={t.heroStutiLabel || 'Hymn heading'} value={heroShloka.stutiLabel[textLang] || ''}
                onChange={(e) => setShlokaText('stutiLabel', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-line focus:border-vermilion"
                placeholder={DEFAULT_HERO_SHLOKA.stutiLabel[textLang]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">
                {t.heroVerseLabel || 'Hymn text'}
              </label>
              <textarea
                rows={3}
                aria-label={t.heroVerseLabel || 'Hymn text'} value={heroShloka.verse[textLang] || ''}
                onChange={(e) => setShlokaText('verse', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-line focus:border-vermilion resize-none leading-relaxed"
                placeholder={DEFAULT_HERO_SHLOKA.verse[textLang]}
              />
              <p className="text-xs text-mute mt-1">
                {t.heroVerseHint || 'Each line is displayed as a separate line on the banner'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveText}
          disabled={textSaving}
          className="mt-4 w-full py-2.5 rounded-xl bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {textSaving ? (
            <OmLoader size="sm" color="white" />
          ) : (
            <Save size={16} />
          )}
          {textSaving ? (t.a3_c_saving || 'Saving...') : (t.saveHeroText || 'Save Hero Text')}
        </button>
      </div>
    </div>
  );
};

export default AdminHero;