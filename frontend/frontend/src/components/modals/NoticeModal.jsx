import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ArrowRight, QrCode, Phone, MapPin, Heart, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

/**
 * The notice is the same centred dialog on every screen size; on a phone it
 * fills the width (with a small margin), fits the viewport height and scrolls
 * inside. On phones only, it auto-hides after 10s, and because that calls
 * handleClose() the notice is recorded as seen for the rest of the session.
 */
const MOBILE_QUERY = '(max-width: 767px)';
const MOBILE_AUTO_HIDE_MS = 10000;

// Using sessionStorage instead of localStorage to show on every refresh
// but only once per browser session (tab)
const STORAGE_KEY = 'rcmt:notice-dismissed';

const NoticeModal = () => {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayLang, setDisplayLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Track the mobile/desktop breakpoint so the auto-hide timer and the sheet
  // layout only ever apply on phones.
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Language options
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ne', label: 'नेपाली' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'zh', label: '中文' },
    { code: 'ta', label: 'தமிழ்' },
  ];

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/admin/settings');
        setSettings(response.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Set default settings if API fails
        setSettings({
          notice: {
            enabled: true,
            photo: '',
            title: { 
              ne: 'हार्दिक अनुरोध', 
              en: 'Heartfelt Request',
              hi: 'हार्दिक अनुरोध',
              zh: '诚挚请求',
              ta: 'மனமார்ந்த வேண்டுகோள்'
            },
            banner: { 
              ne: "'लिफ्ट' राख्ने कार्यमा सहभागी बनौं ।", 
              en: "Let's participate in installing the 'Lift'.",
              hi: "'लिफ्ट' लगाने के कार्य में सहभागी बनें।",
              zh: "让我们参与安装'电梯'。",
              ta: "'லிஃப்ட்' அமைப்பதில் பங்கேற்போம்."
            },
            body: { 
              ne: 'भगवान् श्रीरामचन्द्रको मन्दिरमा वृद्ध-वृद्धा एवं विकलाङ्गहरूलाई दर्शन एवं आउ-जाउ गर्न सजिलो होस् भनी मन्दिरको ठिक पूर्वपट्टि ८ जनासम्म अटाउने लिफ्टको स्थापना ६ महीनाभित्र सक्ने गरी कार्य अगाडि बढिरहेको सन्दर्भमा यहाँहरूको सहयोगको अपेक्षासाथ यो सूचना जनसमक्ष जारी गरिएको छ ।',
              en: 'To make it easier for the elderly and differently-abled to visit and move around at the Shree Ramchandra Temple, we are installing a lift on the eastern side of the temple that can accommodate up to 8 people. The work is expected to be completed within 6 months.',
              hi: 'श्रीरामचन्द्र मंदिर में बुजुर्गों और दिव्यांगों को दर्शन और आने-जाने में सुविधा हो, इसके लिए मंदिर के ठीक पूर्व की ओर 8 लोगों तक की क्षमता वाली लिफ्ट स्थापित की जा रही है, जो 6 महीने के भीतर पूरी हो जाएगी।',
              zh: '为了方便老年人和残障人士在什里·拉姆钱德拉神庙参观和活动，我们正在神庙东侧安装一部可容纳8人的电梯，预计在6个月内完工。',
              ta: 'ஸ்ரீ ராமச்சந்திர கோவிலில் முதியவர்கள் மற்றும் மாற்றுத்திறனாளிகள் எளிதில் வந்து செல்லும் வகையில், கோவிலின் கிழக்குப் பக்கத்தில் 8 பேர் பயணிக்கும் வகையில் உள்ள லிஃப்ட் அமைக்கும் பணி 6 மாதங்களில் முடிக்க திட்டமிடப்பட்டுள்ளது.'
            },
            cost: { 
              ne: 'लिफ्टसहितको संरचनाको लागि करिब रु. ५५,००,०००/- (पचपन्न लाख) पर्ने अनुमान गरिएको छ ।',
              en: 'The estimated cost for the lift structure is approximately Rs. 55,00,000/- (Fifty-five lakh).',
              hi: 'लिफ्ट सहित की संरचना के लिए लगभग रु. ५५,००,०००/- (पचपन्न लाख) खर्च होने का अनुमान है।',
              zh: '电梯结构的估计成本约为550万卢比。',
              ta: 'லிஃப்ட் கட்டமைப்பிற்கான மதிப்பீடு ரூ. 55,00,000/- (ஐம்பத்தி ஐந்து லட்சம்) ஆகும்.'
            },
            donors: {
              ne: 'यस कार्यमा रु. १५,०००/- (पन्ध्र हजार) देखि माथि सहयोग गर्ने उदारमना दाताहरूको नाम लिफ्टको प्रवेशद्वारको वायाँपट्टि आकर्षक रूपले शिलापत्रमा उत्कीर्ण गरी राखिने जानकारी गराउँदछौं ।',
              en: 'The names of generous donors contributing Rs. 15,000/- (Fifteen thousand) and above will be prominently engraved on a stone plaque on the left side of the lift entrance.',
              hi: 'इस कार्य में रु. १५,०००/- (पंद्रह हजार) से अधिक सहयोग करने वाले उदार दाताओं के नाम लिफ्ट के प्रवेश द्वार के बाईं ओर आकर्षक रूप से शिलापत्र पर उत्कीर्ण किए जाएंगे।',
              zh: '捐赠15,000卢比及以上的慷慨捐助者姓名将刻在电梯入口左侧的石碑上。',
              ta: 'ரூ. 15,000/- (பதினைந்து ஆயிரம்) மற்றும் அதற்கு மேல் நன்கொடை அளிக்கும் தாராள மனம் கொண்ட நன்கொடையாளர்களின் பெயர்கள் லிஃப்ட் நுழைவாயிலின் இடது பக்கத்தில் கல்வெட்டில் பொறிக்கப்படும்.'
            },
            applicant: { 
              ne: 'प्रार्थी', 
              en: 'Applicant',
              hi: 'प्रार्थी',
              zh: '申请人',
              ta: 'விண்ணப்பதாரர்'
            },
            committee: { 
              ne: 'श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति',
              en: 'Shree Ramchandra Temple Renovation & Development Committee',
              hi: 'श्री रामचंद्र मंदिर जीर्णोद्धार एवं संवर्धन समिति',
              zh: '什里·拉姆钱德拉神庙修缮与发展委员会',
              ta: 'ஸ்ரீ ராமச்சந்திர கோவில் புனரமைப்பு மற்றும் மேம்பாட்டுக் குழு'
            },
            location: { 
              ne: 'बत्तीसपुतली, काठमाडौं, नेपाल', 
              en: 'Battisputali, Kathmandu, Nepal',
              hi: 'बत्तीसपुतली, काठमांडू, नेपाल',
              zh: '巴蒂斯普塔利，加德满都，尼泊尔',
              ta: 'பட்டீஸ்புதாலி, காத்மாண்டு, நேபாளம்'
            },
            contactNo: { 
              ne: 'सम्पर्क नं.', 
              en: 'Contact No.',
              hi: 'सम्पर्क नं.',
              zh: '联系电话',
              ta: 'தொடர்பு எண்'
            },
            contactDetails: { 
              ne: '01-4598526, 9851154432', 
              en: '01-4598526, 9851154432',
              hi: '01-4598526, 9851154432',
              zh: '01-4598526, 9851154432',
              ta: '01-4598526, 9851154432'
            },
            qrLabel: { 
              ne: 'क्यू आर कोड', 
              en: 'QR Code',
              hi: 'क्यू आर कोड',
              zh: '二维码',
              ta: 'கியூ ஆர் குறியீடு'
            },
            donateBtn: { 
              ne: 'सहयोग गर्नुहोस्', 
              en: 'Donate Now',
              hi: 'सहयोग करें',
              zh: '立即捐赠',
              ta: 'தானம் செய்யுங்கள்'
            },
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Check if notice should be shown - using sessionStorage
  useEffect(() => {
    if (loading) return;

    // Build the list of enabled notices (new `notices` array, or legacy single `notice`)
    const enabled = Array.isArray(settings?.notices) && settings.notices.length > 0
      ? settings.notices.filter(n => n && n.enabled !== false)
      : settings?.notice?.enabled !== false && settings?.notice
        ? [settings.notice]
        : [];

    if (enabled.length === 0) return;

    // Per-notice dismissal stored as a JSON array of notice ids
    let dismissedIds = [];
    try {
      dismissedIds = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      dismissedIds = [];
    }

    // Fall back to the legacy single-notice dismissal flag
    const legacyDismissed = sessionStorage.getItem(STORAGE_KEY) === '1';

    const firstUnseenIndex = enabled.findIndex(n => {
      if (legacyDismissed && enabled.length === 1) return false;
      return !dismissedIds.includes(n.id);
    });

    if (firstUnseenIndex >= 0) {
      setNoticeIndex(firstUnseenIndex);
      setOpen(true);
      // Default to English
      setDisplayLang('en');
    }
  }, [loading, settings]);

  // Update language when user changes (from app context)
  useEffect(() => {
    if (open) {
      const supportedLangs = ['en', 'ne', 'hi', 'zh', 'ta'];
      if (supportedLangs.includes(lang)) {
        setDisplayLang(lang);
      } else {
        setDisplayLang('en');
      }
    }
  }, [lang, open]);

  const getDismissedIds = useCallback(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }, []);

  const allNotices = useMemo(() => {
    const raw = Array.isArray(settings?.notices) && settings.notices.length > 0
      ? settings.notices
      : settings?.notice
        ? [settings.notice]
        : [];
    return raw.filter(n => n && n.enabled !== false);
  }, [settings]);

  const dismissNotice = useCallback((id) => {
    if (!id) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      return;
    }
    let dismissedIds = [];
    try {
      dismissedIds = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      dismissedIds = [];
    }
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dismissedIds));
    }
  }, []);

  const notice = allNotices[noticeIndex] || {};
  // The super admin can switch the donation QR off from Admin → Donation Account.
  const qrEnabled = settings?.donate?.qrEnabled !== false;
  const qrPhoto = qrEnabled ? settings?.donate?.qrPhoto || null : null;

  const handleClose = useCallback(() => {
    dismissNotice(notice?.id);
    setOpen(false);
    setLangMenuOpen(false);
  }, [dismissNotice, notice?.id]);

  // Mobile only: auto-hide after 10s. handleClose() is reused on purpose so the
  // notice is marked as seen and will not return during this session.
  useEffect(() => {
    if (!open || !isMobile) return undefined;

    const timer = setTimeout(() => {
      handleClose();
    }, MOBILE_AUTO_HIDE_MS);

    return () => clearTimeout(timer);
  }, [open, isMobile, handleClose]);

  const moveToNextNotice = useCallback(() => {
    if (allNotices[noticeIndex]) dismissNotice(allNotices[noticeIndex].id);
    const currentDismissed = getDismissedIds();
    const next = allNotices.find((n, i) => i > noticeIndex && !currentDismissed.includes(n.id));
    if (next) {
      const idx = allNotices.indexOf(next);
      setNoticeIndex(idx);
    } else {
      setOpen(false);
      setLangMenuOpen(false);
    }
  }, [allNotices, noticeIndex, dismissNotice, getDismissedIds]);

  const moveToPrevNotice = useCallback(() => {
    if (noticeIndex > 0) {
      setNoticeIndex(noticeIndex - 1);
    }
  }, [noticeIndex]);

  const handleDonateClick = () => {
    handleClose();
    navigate('/donate');
  };

  const handleLangSelect = (code) => {
    setDisplayLang(code);
    setLangMenuOpen(false);
    // Also update the global language context
    setLang(code);
  };

  const getText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj[displayLang]) return obj[displayLang];
    if (obj.en) return obj.en;
    const keys = Object.keys(obj);
    return keys.length > 0 ? obj[keys[0]] : '';
  };

  const isDevLocale = displayLang === 'ne' || displayLang === 'hi';
  const devFont = { fontFamily: "'Mukta', system-ui, sans-serif" };
  const bodyFont = isDevLocale ? devFont : {};

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal - compact half-sheet on mobile, centered dialog on desktop */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="scroll-hidden relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl shadow-2xl md:max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-label={getText(notice.title) || 'Notice'}
            style={{ background: '#ffffff' }}
          >
            {/* Close button (the phone auto-hide still needs an explicit control) */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>

            {/* Language Dropdown - Top Right */}
            <div className="absolute top-3 right-12 z-10">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLangMenuOpen(!langMenuOpen);
                  }}
                  className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-3 py-1.5 text-xs font-medium hover:border-vermilion transition-all duration-200 shadow-sm"
                >
                  <Globe size={14} className="text-ink-soft" />
                  <span className="font-bold text-ink">{displayLang.toUpperCase()}</span>
                  <span className="text-ink-soft text-xs">▾</span>
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] p-1.5 z-50 animate-fadeIn">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => handleLangSelect(l.code)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium hover:bg-panel transition-colors duration-200 ${
                          displayLang === l.code ? 'text-vermilion font-bold bg-vermilion/5' : 'text-ink'
                        }`}
                      >
                        {l.label}
                        {displayLang === l.code && <span className="text-vermilion text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top decorative border */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-800 via-brand-500 to-brand-800 rounded-t-2xl" />

            {/* Notice navigation (multiple notices) */}
            {allNotices.length > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4">
                <button
                  onClick={moveToPrevNotice}
                  disabled={noticeIndex <= 0}
                  className="inline-flex items-center gap-1 text-xs sm:text-xs font-semibold text-red-800 hover:text-red-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-transparent border-0"
                >
                  <span aria-hidden>←</span> Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-xs font-bold text-red-800 bg-red-50 rounded-full px-2.5 py-1">
                    {noticeIndex + 1} / {allNotices.length}
                  </span>
                </div>
                <button
                  onClick={moveToNextNotice}
                  className="inline-flex items-center gap-1 text-xs sm:text-xs font-semibold text-red-800 hover:text-red-950 transition-colors bg-transparent border-0"
                >
                  {noticeIndex < allNotices.length - 1 ? 'Next' : 'Finish'} <span aria-hidden>→</span>
                </button>
              </div>
            )}

            <div
              className={`px-4 sm:px-8 py-4 sm:py-8`}
            >
              {/* Title */}
              <h2
                style={bodyFont}
                className={`text-center font-bold text-red-900 mb-2.5 sm:mb-4 text-xl sm:text-3xl`}
              >
                {getText(notice.title) || 'Heartfelt Request'}
              </h2>

              {/* Banner */}
              <div
                className={`bg-red-800 rounded-xl px-3 sm:px-4 shadow-md py-2.5 sm:py-3 mb-4 sm:mb-5`}
              >
                <p
                  style={bodyFont}
                  className={`text-center text-white font-bold leading-relaxed text-base sm:text-xl`}
                >
                  {getText(notice.banner) || "Let's participate in installing the 'Lift'."}
                </p>
              </div>

              {/* Notice Photo */}
              {notice.photo && (
                <div
                  className={`rounded-xl overflow-hidden border border-red-200 shadow-md mb-4 sm:mb-5`}
                >
                  <img
                    src={notice.photo}
                    alt={getText(notice.title) || 'Notice'}
                    className={`w-full object-contain bg-white max-h-72 sm:max-h-96`}
                  />
                </div>
              )}

              {/* Content - the lift illustrations stay desktop-only so the mobile sheet
                  keeps its width for the text */}
              <div className="flex gap-3 sm:gap-6">
                {/* Left lift illustration - hidden on mobile */}
                <div className="hidden sm:flex flex-col items-center justify-center shrink-0">
                  <div className="w-16 h-28 border-2 border-gray-400 rounded-md bg-white flex items-center justify-center shadow-inner">
                    <div className="w-12 h-20 border border-gray-300 rounded-sm bg-gray-50 flex items-center justify-center">
                      <div className="flex flex-col gap-0.5 w-full px-1">
                        <div className="h-2 bg-red-500 rounded" />
                        <div className="flex-1 border border-gray-300 rounded-sm bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-400">🚪</span>
                        </div>
                        <div className="h-2 bg-red-500 rounded" />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 font-medium">Lift</span>
                </div>

                {/* Body text - smaller on mobile */}
                <div className="flex-1">
                  <p
                    style={bodyFont}
                    className="text-gray-800 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4"
                  >
                    {getText(notice.body) || 'To make it easier for the elderly and differently-abled to visit and move around at the Shree Ramchandra Temple, we are installing a lift on the eastern side of the temple that can accommodate up to 8 people. The work is expected to be completed within 6 months.'}
                  </p>

                  {/* Cost highlight - smaller on mobile */}
                  <div
                    className={`bg-brand-50 border border-brand-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3 mb-3 sm:mb-4`}
                  >
                    <p
                      style={bodyFont}
                      className="text-gray-800 text-sm sm:text-base font-semibold"
                    >
                      {getText(notice.cost) || 'The estimated cost for the lift structure is approximately Rs. 55,00,000/- (Fifty-five lakh).'}
                    </p>
                  </div>

                  <p
                    style={bodyFont}
                    className="text-gray-800 text-sm sm:text-base leading-relaxed"
                  >
                    {getText(notice.donors) || 'The names of generous donors contributing Rs. 15,000/- (Fifteen thousand) and above will be prominently engraved on a stone plaque on the left side of the lift entrance.'}
                  </p>
                </div>

                {/* Right lift illustration - hidden on mobile */}
                <div className="hidden sm:flex flex-col items-center justify-center shrink-0">
                  <div className="w-16 h-28 border-2 border-gray-400 rounded-md bg-white flex items-center justify-center shadow-inner">
                    <div className="w-12 h-20 border border-gray-300 rounded-sm bg-gray-50 flex items-center justify-center">
                      <div className="flex flex-col gap-0.5 w-full px-1">
                        <div className="h-2 bg-red-500 rounded" />
                        <div className="flex-1 border border-gray-300 rounded-sm bg-gray-100 flex items-center justify-center">
                          <span className="text-xs text-gray-400">🚪</span>
                        </div>
                        <div className="h-2 bg-red-500 rounded" />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 font-medium">Lift</span>
                </div>
              </div>

              {/* Divider */}
              <div
                className={`h-px bg-gradient-to-r from-transparent via-red-300 to-transparent my-4 sm:my-5`}
              />

              {/* QR + Contact Section - stacked on mobile */}
              <div
                className="rounded-xl overflow-hidden border border-[#820606]"
                style={{ background: '#820606' }}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* QR Code section - smaller on mobile. Hidden when the super
                      admin has switched the QR off. */}
                  {qrEnabled && (
                  <div
                    className={`flex items-center justify-center sm:border-r border-b sm:border-b-0 border-white/20 p-3 sm:p-5`}
                  >
                    <div className="text-center">
                      <div
                        className={`bg-white rounded-lg flex items-center justify-center mx-auto shadow-md overflow-hidden w-20 h-20 sm:w-28 sm:h-28`}
                      >
                        <div className="text-center px-2 w-full h-full flex items-center justify-center">
                          {qrPhoto ? (
                            <img src={qrPhoto} alt="QR" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="text-xs sm:text-xs text-red-700 font-bold mb-1">SCAN & PAY</div>
                              <QrCode size={24} className="text-gray-600" />
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-white/80 text-xs sm:text-xs mt-1.5 sm:mt-2 font-medium">
                        {getText(notice.qrLabel) || 'QR Code'}
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Contact info - smaller on mobile */}
                  <div
                    className={`flex-1 flex flex-col justify-center p-3 sm:p-5`}
                  >
                    <p className="text-brand-200 text-xs sm:text-sm font-bold mb-1.5 sm:mb-2" style={bodyFont}>
                      {getText(notice.applicant) || 'Applicant'}
                    </p>
                    <p className="text-white text-xs sm:text-sm font-bold leading-snug mb-1" style={bodyFont}>
                      {getText(notice.committee) || 'Shree Ramchandra Temple Renovation & Development Committee'}
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1.5" style={bodyFont}>
                      <MapPin size={12} className="text-brand-200" />
                      {getText(notice.location) || 'Battisputali, Kathmandu, Nepal'}
                    </p>
                    <p className="text-white/90 text-xs sm:text-sm flex items-center gap-1.5" style={bodyFont}>
                      <Phone size={12} className="text-brand-200" />
                      {getText(notice.contactNo) || 'Contact No.'}: {getText(notice.contactDetails) || '01-4598526, 9851154432'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Donate Button - smaller on mobile */}
              <div className={`text-center mt-4 sm:mt-5`}>
                <button
                  onClick={handleDonateClick}
                  className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: '#A80808',
                    ...bodyFont,
                  }}
                >
                  <Heart size={14} className="sm:w-[18px] sm:h-[18px]" />
                  {getText(notice.donateBtn) || 'Donate Now'}
                  <ArrowRight size={14} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>

              {/* Language hint - smaller on mobile */}
              <p
                className={`text-center text-xs sm:text-xs text-mute mt-2 sm:mt-3`}
              >
                {displayLang === 'ne' ? 'नेपालीमा देखाइएको' :
                 displayLang === 'hi' ? 'हिन्दी में दिखाया गया' :
                 displayLang === 'zh' ? '以中文显示' :
                 displayLang === 'ta' ? 'தமிழில் காட்டப்பட்டது' :
                 'Displayed in English'} 
                {' • '}
                <span 
                  className="cursor-pointer hover:text-vermilion transition-colors underline decoration-dotted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLangMenuOpen(!langMenuOpen);
                  }}
                >
                  {t.changeLanguage || 'Change Language'}
                </span>
              </p>
              {/* Phone only: the notice closes itself, so say so */}
              {isMobile && (
                <p className="mt-1 text-center text-xs text-red-900/55">
                  {t.noticeAutoHideHint || 'यी सूचना १० सेकेण्डपछि आफैँ हराउँछ'}
                </p>
              )}
            </div>

            {/* Bottom decorative border */}
            <div className="flex h-2">
              <div className="flex-1 bg-vermilion" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NoticeModal;