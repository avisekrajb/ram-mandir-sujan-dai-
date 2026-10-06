import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Save, Image, Plus, Trash2, Eye, EyeOff,
  MoveUp, MoveDown, ChevronDown, ChevronRight
} from 'lucide-react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import OmLoader from '../../components/common/OmLoader';

const AdminAbout = ({ t = {} }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const [aboutData, setAboutData] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedActivity, setExpandedActivity] = useState(null);
  
  const heroImageInputRef = useRef(null);

  // Language options
  const langLabels = {
    en: 'English',
    ne: 'नेपाली',
    hi: 'हिन्दी',
    zh: '中文',
    ta: 'தமிழ்'
  };

  // Fetch about data
  useEffect(() => {
    fetchAboutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/about');
      console.log('Fetched data:', response.data.data);
      setAboutData(response.data.data);
    } catch (error) {
      console.error('Error fetching about data:', error);
      showToast(t.a4_aboutLoadFailed || 'Failed to load about data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  const setLocalized = (obj, value) => {
    if (!obj) return { [activeLang]: value };
    return { ...obj, [activeLang]: value };
  };

  // ----- HERO SECTION -----
  const updateHeroField = (field, value) => {
    setAboutData({
      ...aboutData,
      hero: {
        ...aboutData.hero,
        [field]: value
      }
    });
  };

  const updateHeroLocalized = (field, value) => {
    setAboutData({
      ...aboutData,
      hero: {
        ...aboutData.hero,
        [field]: setLocalized(aboutData.hero[field], value)
      }
    });
  };

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast(t.a4_imageMax10MB || 'Image must be less than 10MB', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/about/hero', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateHeroField('image', response.data.url);
      showToast(t.a4_aboutHeroUploaded || 'Hero image uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t.a3_c_uploadFailed || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  // ----- INTRO TEXT (Below Hero) -----
  const updateIntroTextLocalized = (value) => {
    setAboutData({
      ...aboutData,
      introText: setLocalized(aboutData.introText, value)
    });
  };

  // ----- SECTIONS -----
  const addSection = () => {
    const newSection = {
      key: `section_${Date.now()}`,
      title: { en: 'New Section', ne: 'नयाँ खण्ड', hi: 'नया खंड', zh: '新部分', ta: 'புதிய பகுதி' },
      body: { en: 'Section description...', ne: 'खण्ड विवरण...', hi: 'खंड विवरण...', zh: '部分描述...', ta: 'பகுதி விளக்கம்...' },
      paragraphs: {
        p1: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p2: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p3: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p4: { en: '', ne: '', hi: '', zh: '', ta: '' }
      },
      listTitle: { en: '', ne: '', hi: '', zh: '', ta: '' },
      points: [],
      image: '',
      order: aboutData?.sections?.length || 0,
      enabled: true
    };
    setAboutData({
      ...aboutData,
      sections: [...(aboutData?.sections || []), newSection]
    });
    setExpandedSection(newSection.key);
  };

  const removeSection = (key) => {
    if (window.confirm(t.a4_aboutRemoveSectionConfirm || 'Are you sure you want to remove this section?')) {
      setAboutData({
        ...aboutData,
        sections: aboutData.sections.filter(s => s.key !== key)
      });
      showToast(t.a4_aboutSectionRemoved || 'Section removed', 'success');
    }
  };

  const updateSection = (key, field, value) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s => 
        s.key === key ? { ...s, [field]: value } : s
      )
    });
  };

  const updateSectionLocalized = (key, field, value) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s => 
        s.key === key ? { ...s, [field]: setLocalized(s[field], value) } : s 
      )
    });
  };

  const updateSectionParagraph = (key, paraKey, value) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s => {
        if (s.key !== key) return s;
        const next = {
          ...s,
          paragraphs: { ...(s.paragraphs || {}), [paraKey]: setLocalized(s.paragraphs?.[paraKey], value) }
        };
        // keep the legacy single-paragraph field in sync with paragraph 1
        if (paraKey === 'p1') next.body = next.paragraphs.p1;
        return next;
      })
    });
  };

  const addSectionPoint = (key) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s =>
        s.key === key
          ? { ...s, points: [...(s.points || []), { en: '', ne: '', hi: '', zh: '', ta: '' }] }
          : s
      )
    });
  };

  const updateSectionPoint = (key, index, value) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s =>
        s.key === key
          ? {
              ...s,
              points: (s.points || []).map((p, i) => (i === index ? setLocalized(p, value) : p))
            }
          : s
      )
    });
  };

  const removeSectionPoint = (key, index) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s =>
        s.key === key
          ? { ...s, points: (s.points || []).filter((_, i) => i !== index) }
          : s
      )
    });
  };

  const moveSectionPoint = (key, index, dir) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s => {
        if (s.key !== key) return s;
        const points = [...(s.points || [])];
        const target = index + dir;
        if (target < 0 || target >= points.length) return s;
        [points[index], points[target]] = [points[target], points[index]];
        return { ...s, points };
      })
    });
  };


  const toggleSectionEnabled = (key) => {
    setAboutData({
      ...aboutData,
      sections: aboutData.sections.map(s => 
        s.key === key ? { ...s, enabled: !s.enabled } : s
      )
    });
  };

  const moveSection = (key, direction) => {
    const sections = [...aboutData.sections];
    const index = sections.findIndex(s => s.key === key);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections.forEach((s, i) => s.order = i);
    setAboutData({ ...aboutData, sections });
  };

  const handleSectionImageUpload = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(t.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast(t.a4_imageMax10MB || 'Image must be less than 10MB', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/upload/about/section', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateSection(key, 'image', response.data.url);
      showToast(t.a4_aboutSectionImageUploaded || 'Section image uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || t.a3_c_uploadFailed || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  // ----- ACTIVITIES -----
  const addActivity = () => {
    const newActivity = {
      key: `activity_${Date.now()}`,
      title: { en: 'New Activity', ne: 'नयाँ गतिविधि', hi: 'नई गतिविधि', zh: '新活动', ta: 'புதிய செயல்பாடு' },
      desc: { en: '', ne: '', hi: '', zh: '', ta: '' },
      paragraphs: {
        p1: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p2: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p3: { en: '', ne: '', hi: '', zh: '', ta: '' },
        p4: { en: '', ne: '', hi: '', zh: '', ta: '' }
      },
      order: aboutData?.activities?.length || 0,
      enabled: true
    };
    setAboutData({
      ...aboutData,
      activities: [...(aboutData?.activities || []), newActivity]
    });
    setExpandedActivity(newActivity.key);
  };

  const removeActivity = (key) => {
    if (window.confirm(t.a4_aboutRemoveActivityConfirm || 'Are you sure you want to remove this activity?')) {
      setAboutData({
        ...aboutData,
        activities: aboutData.activities.filter(a => a.key !== key)
      });
      showToast(t.a4_aboutActivityRemoved || 'Activity removed', 'success');
    }
  };

  const updateActivityLocalized = (key, field, value) => {
    setAboutData({
      ...aboutData,
      activities: aboutData.activities.map(a => 
        a.key === key ? { ...a, [field]: setLocalized(a[field], value) } : a
      )
    });
  };

  const updateActivityParagraph = (key, paraKey, value) => {
    setAboutData({
      ...aboutData,
      activities: aboutData.activities.map(a => 
        a.key === key ? { 
          ...a, 
          paragraphs: { 
            ...a.paragraphs, 
            [paraKey]: setLocalized(a.paragraphs[paraKey], value) 
          } 
        } : a 
      )
    });
  };

  const toggleActivityEnabled = (key) => {
    setAboutData({
      ...aboutData,
      activities: aboutData.activities.map(a => 
        a.key === key ? { ...a, enabled: !a.enabled } : a
      )
    });
  };

  const moveActivity = (key, direction) => {
    const activities = [...aboutData.activities];
    const index = activities.findIndex(a => a.key === key);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;
    [activities[index], activities[newIndex]] = [activities[newIndex], activities[index]];
    activities.forEach((a, i) => a.order = i);
    setAboutData({ ...aboutData, activities });
  };

  // ----- SAVE -----
  const handleSave = async () => {
    setLoading(true);
    try {
      // Make sure we have all the data properly structured
      const dataToSave = {
        hero: aboutData.hero || { title: {}, image: '' },
        introText: aboutData.introText || {},
        sections: aboutData.sections || [],
        activities: aboutData.activities || []
      };
      
      console.log('Saving data:', dataToSave);
      
      const response = await api.put('/about', dataToSave);
      console.log('Save response:', response.data);
      
      showToast(t.a4_aboutSaved || 'About page saved successfully', 'success');
      
      // Refetch to get updated data
      await fetchAboutData();
    } catch (error) {
      console.error('Save error:', error);
      console.error('Error response:', error.response);
      showToast(error.response?.data?.message || t.a4_saveFailed || 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!aboutData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ==================== HERO SECTION ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-serif font-semibold text-ink">{t.heroBanner || 'Hero Banner'}</h4>
          <LanguageSwitcher active={activeLang} onChange={setActiveLang} />
        </div>

        {/* Hero Image */}
        <div className="mb-4">
          <label className="text-xs font-bold text-ink block mb-1.5">{t.a4_aboutHeroBgImage || 'Hero Background Image'}</label>
          <div
            className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden h-48 flex items-center justify-center cursor-pointer bg-gray-50 hover:border-vermilion transition-colors"
            onClick={() => heroImageInputRef.current?.click()}
          >
            <input
              ref={heroImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroImageUpload}
              className="hidden"
            />
            {aboutData.hero?.image ? (
              <img src={aboutData.hero.image} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-ink-soft">
                <Image size={32} />
                <span className="text-xs font-semibold">{t.a4_aboutClickUploadHero || 'Click to upload hero image'}</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full animate-spin border-t-transparent" />
              </div>
            )}
          </div>
          <p className="text-xs text-ink-soft mt-1">{t.a4_aboutHeroBgNote || 'This image appears as the hero background'}</p>
        </div>

        {/* Hero Title - Only title shows on the image */}
        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">
            {t.a4_aboutHeroTitleLabel || 'Title (Shown on Hero Image)'} ({langLabels[activeLang]})
          </label>
          <input
            type="text"
            aria-label={`${t.a4_aboutHeroTitleLabel || 'Title (Shown on Hero Image)'} (${langLabels[activeLang]})`} value={getLocalized(aboutData.hero?.title)}
            onChange={(e) => updateHeroLocalized('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
            placeholder={t.a4_aboutHeroTitlePlaceholder || 'Hero title...'}
          />
          <p className="text-xs text-ink-soft mt-1">{t.a4_aboutHeroTitleNote || 'This title appears on the hero banner image'}</p>
        </div>
      </div>

      {/* ==================== INTRO TEXT - BELOW HERO ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a4_aboutIntroHeading || 'Intro Text (Below Hero Banner)'}</h4>
            <p className="text-xs text-ink-soft">{t.a4_aboutIntroSub || 'This text appears below the hero banner, not on the image'}</p>
          </div>
          <LanguageSwitcher active={activeLang} onChange={setActiveLang} />
        </div>

        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">
            {t.a4_introText || 'Intro Text'} ({langLabels[activeLang]})
          </label>
          <textarea
            rows={4}
            aria-label={`${t.a4_introText || 'Intro Text'} (${langLabels[activeLang]})`} value={getLocalized(aboutData.introText)}
            onChange={(e) => updateIntroTextLocalized(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
            placeholder={t.a4_aboutIntroPlaceholder || 'Enter introduction text that appears below the hero banner...'}
          />
          <p className="text-xs text-ink-soft mt-1">
            {t.a4_aboutIntroNote || 'This text is displayed on a white background below the hero banner'}
          </p>
        </div>
      </div>

      {/* ==================== SECTIONS ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a4_aboutSections || 'About Sections'}</h4>
            <p className="text-xs text-ink-soft">{t.a4_aboutSectionsSub || 'Sections shown below the intro text'}</p>
          </div>
          <button
            onClick={addSection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
          >
            <Plus size={14} /> {t.a4_addSection || 'Add Section'}
          </button>
        </div>

        <LanguageSwitcher active={activeLang} onChange={setActiveLang} className="mb-4" />

        {aboutData.sections?.length === 0 ? (
          <div className="text-center py-8 text-ink-soft text-sm">{t.a4_aboutNoSections || 'No sections added'}</div>
        ) : (
          <div className="space-y-3">
            {aboutData.sections.map((section, index) => (
              <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setExpandedSection(expandedSection === section.key ? null : section.key)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-ink-soft font-mono w-12">{index + 1}</span>
                    <span className="text-sm font-medium text-ink truncate">
                      {getLocalized(section.title) || t.a3_c_untitled || 'Untitled'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${section.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {section.enabled ? (t.a4_visible || 'Visible') : (t.a3_c_hidden || 'Hidden')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => moveSection(section.key, 'up')}
                      aria-label={t.a4_aboutMoveSectionUp || 'Move section up'}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      onClick={() => moveSection(section.key, 'down')}
                      aria-label={t.a4_aboutMoveSectionDown || 'Move section down'}
                      disabled={index === aboutData.sections.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      onClick={() => toggleSectionEnabled(section.key)}
                      aria-label={section.enabled ? (t.a4_aboutHideSection || 'Hide section') : (t.a4_aboutShowSection || 'Show section')}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => removeSection(section.key)}
                      aria-label={t.a4_aboutDeleteSection || 'Delete section'}
                      className="p-1 rounded hover:bg-red-100 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-200" aria-label={expandedSection === section.key ? (t.a4_aboutCollapseSection || 'Collapse section') : (t.a4_aboutExpandSection || 'Expand section')}>
                      {expandedSection === section.key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {expandedSection === section.key && (
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    {/* Section Image */}
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1.5">{t.a4_image || 'Image'}</label>
                      <div className="flex items-center gap-3">
                        <div
                          className="relative w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer bg-gray-50 hover:border-vermilion transition-colors flex-shrink-0"
                          onClick={() => {
                            const input = document.getElementById(`section-img-${section.key}`);
                            if (input) input.click();
                          }}
                        >
                          <input
                            id={`section-img-${section.key}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSectionImageUpload(e, section.key)}
                            className="hidden"
                          />
                          {section.image ? (
                            <img src={section.image} alt="Section" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-ink-soft">
                              <Image size={20} />
                            </div>
                          )}
                        </div>
                        {section.image && (
                          <button
                            onClick={() => updateSection(section.key, 'image', '')}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            {t.remove || 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Title */}
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1.5">
                        {t.a4_title || 'Title'} ({langLabels[activeLang]})
                      </label>
                      <input
                        type="text"
                        aria-label={`${t.a4_title || 'Title'} (${langLabels[activeLang]})`} value={getLocalized(section.title)}
                        onChange={(e) => updateSectionLocalized(section.key, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                        placeholder={t.a4_sectionTitlePlaceholder || 'Section title...'}
                      />
                    </div>

                    {/* Section Body */}
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1.5">
                        {t.description || 'Description'} ({langLabels[activeLang]})
                      </label>
                      <textarea
                        rows={3}
                        aria-label={`${t.description || 'Description'} (${langLabels[activeLang]})`} value={getLocalized(section.body)}
                        onChange={(e) => updateSectionLocalized(section.key, 'body', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
                        placeholder={t.a4_aboutSectionDescPlaceholder || 'Section description...'}
                      />
                    </div>

                    {/* Section Paragraphs */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <div>
                        <label className="text-xs font-bold text-ink block mb-1.5">
                          {t.a4_paragraphs || 'Paragraphs'} ({langLabels[activeLang]})
                        </label>
                        <p className="text-xs text-ink-soft mb-2">
                          {t.a4_aboutParagraphsNote || 'These are shown on the page. Paragraph 1 is also used as the fallback Description.'}
                        </p>
                        {['p1', 'p2', 'p3', 'p4'].map((pKey) => (
                          <div key={pKey} className="mb-2">
                            <label className="text-xs text-ink-soft block mb-0.5">
                              {pKey.toUpperCase()}
                            </label>
                            <textarea
                              rows={2}
                              aria-label={pKey.toUpperCase()} value={getLocalized(section.paragraphs?.[pKey])}
                              onChange={(e) => updateSectionParagraph(section.key, pKey, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
                              placeholder={(t.a4_paragraphPlaceholder || 'Paragraph {n}...').replace('{n}', pKey)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section Bullet List */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <div>
                        <label className="text-xs font-bold text-ink block mb-1.5">
                          {t.a4_listHeadingOptional || 'List Heading (optional)'} ({langLabels[activeLang]})
                        </label>
                        <input
                          type="text"
                          aria-label={`${t.a4_listHeadingOptional || 'List Heading (optional)'} (${langLabels[activeLang]})`} value={getLocalized(section.listTitle)}
                          onChange={(e) => updateSectionLocalized(section.key, 'listTitle', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                          placeholder={t.a4_aboutListHeadingExample || 'e.g. Main religious services include:'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-ink">{t.a4_bulletPoints || 'Bullet Points'}</label>
                        <button
                          type="button"
                          onClick={() => addSectionPoint(section.key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-vermilion text-xs font-semibold hover:bg-vermilion/20 transition-all"
                        >
                          <Plus size={12} /> {t.a4_addPoint || 'Add Point'}
                        </button>
                      </div>

                      {(section.points || []).length === 0 ? (
                        <p className="text-xs text-ink-soft">{t.a4_aboutNoBulletPointsYet || 'No bullet points yet.'}</p>
                      ) : (
                        <div className="space-y-2">
                          {section.points.map((point, pIndex) => (
                            <div key={pIndex} className="flex items-start gap-1.5">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  aria-label={`${(t.a4_point || 'Point {n}').replace('{n}', pIndex + 1)} (${langLabels[activeLang]})`} value={getLocalized(point)}
                                  onChange={(e) => updateSectionPoint(section.key, pIndex, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                                  placeholder={`${(t.a4_point || 'Point {n}').replace('{n}', pIndex + 1)} (${langLabels[activeLang]})`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => moveSectionPoint(section.key, pIndex, -1)}
                                disabled={pIndex === 0}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t.a3_c_moveUp || 'Move up'}
                              >
                                <MoveUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSectionPoint(section.key, pIndex, 1)}
                                disabled={pIndex === section.points.length - 1}
                                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                                title={t.a3_c_moveDown || 'Move down'}
                              >
                                <MoveDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSectionPoint(section.key, pIndex)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500"
                                title={t.remove || 'Remove'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== ACTIVITIES ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-serif font-semibold text-ink">{t.a4_aboutActivities || 'Activities & Programs'}</h4>
            <p className="text-xs text-ink-soft">{t.a4_aboutActivitiesSub || 'Activities shown at the bottom of the about page'}</p>
          </div>
          <button
            onClick={addActivity}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vermilion text-white text-xs font-semibold hover:bg-[#820606] transition-all"
          >
            <Plus size={14} /> {t.a4_aboutAddActivity || 'Add Activity'}
          </button>
        </div>

        <LanguageSwitcher active={activeLang} onChange={setActiveLang} className="mb-4" />

        {aboutData.activities?.length === 0 ? (
          <div className="text-center py-8 text-ink-soft text-sm">{t.a4_aboutNoActivities || 'No activities added'}</div>
        ) : (
          <div className="space-y-3">
            {aboutData.activities.map((activity, index) => (
              <div key={activity.key} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setExpandedActivity(expandedActivity === activity.key ? null : activity.key)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-ink-soft font-mono w-12">{index + 1}</span>
                    <span className="text-sm font-medium text-ink truncate">
                      {getLocalized(activity.title) || t.a3_c_untitled || 'Untitled'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${activity.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {activity.enabled ? (t.a4_visible || 'Visible') : (t.a3_c_hidden || 'Hidden')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => moveActivity(activity.key, 'up')}
                      aria-label={t.a4_aboutMoveActivityUp || 'Move activity up'}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      onClick={() => moveActivity(activity.key, 'down')}
                      aria-label={t.a4_aboutMoveActivityDown || 'Move activity down'}
                      disabled={index === aboutData.activities.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      onClick={() => toggleActivityEnabled(activity.key)}
                      aria-label={activity.enabled ? (t.a4_aboutHideActivity || 'Hide activity') : (t.a4_aboutShowActivity || 'Show activity')}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      {activity.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => removeActivity(activity.key)}
                      aria-label={t.a4_aboutDeleteActivity || 'Delete activity'}
                      className="p-1 rounded hover:bg-red-100 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-200" aria-label={expandedActivity === activity.key ? (t.a4_aboutCollapseActivity || 'Collapse activity') : (t.a4_aboutExpandActivity || 'Expand activity')}>
                      {expandedActivity === activity.key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {expandedActivity === activity.key && (
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    {/* Activity Title */}
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1.5">
                        {t.a4_title || 'Title'} ({langLabels[activeLang]})
                      </label>
                      <input
                        type="text"
                        aria-label={`${t.a4_title || 'Title'} (${langLabels[activeLang]})`} value={getLocalized(activity.title)}
                        onChange={(e) => updateActivityLocalized(activity.key, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                        placeholder={t.a4_aboutActivityTitlePlaceholder || 'Activity title...'}
                      />
                    </div>

                    {/* Activity Description (optional) */}
                    <div>
                      <label className="text-xs font-bold text-ink block mb-1.5">
                        {t.a4_aboutShortDescOptional || 'Short Description (optional)'} ({langLabels[activeLang]})
                      </label>
                      <input
                        type="text"
                        aria-label={`${t.a4_aboutShortDescOptional || 'Short Description (optional)'} (${langLabels[activeLang]})`} value={getLocalized(activity.desc)}
                        onChange={(e) => updateActivityLocalized(activity.key, 'desc', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm"
                        placeholder={t.a4_aboutShortDescPlaceholder || 'Short description...'}
                      />
                    </div>

                    {/* Activity Paragraphs */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-ink block">{t.a4_paragraphs || 'Paragraphs'}</label>
                      {['p1', 'p2', 'p3', 'p4'].map((pKey) => (
                        <div key={pKey}>
                          <label className="text-xs text-ink-soft block mb-0.5">
                            {pKey.toUpperCase()} ({langLabels[activeLang]})
                          </label>
                          <textarea
                            rows={2}
                            aria-label={`${pKey.toUpperCase()} (${langLabels[activeLang]})`} value={getLocalized(activity.paragraphs?.[pKey])}
                            onChange={(e) => updateActivityParagraph(activity.key, pKey, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-vermilion focus:outline-none text-sm resize-none"
                            placeholder={(t.a4_aboutParagraphTextPlaceholder || 'Paragraph {n} text...').replace('{n}', pKey)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== SAVE ==================== */}
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
              {t.a4_aboutSavePage || 'Save About Page'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminAbout;