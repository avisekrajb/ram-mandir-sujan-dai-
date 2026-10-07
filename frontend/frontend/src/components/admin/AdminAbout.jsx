import React, { useEffect, useRef, useState } from 'react';
import {
  Image, MoveDown, MoveUp, Pencil, Plus, Sparkles, Trash2, Type, LayoutList, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import LanguageSwitcher from '../common/LanguageSwitcher';
import OmLoader from '../../components/common/OmLoader';
import { Button, Field, Pill, inputCls } from './kit/kit';
import { Modal } from './kit/Overlays';
import { Card, Dropzone, SaveBar } from './kit/PageShell';

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];
const LANG_LABELS = { en: 'English', ne: 'नेपाली', hi: 'हिन्दी', zh: '中文', ta: 'தமிழ்' };
const PARAGRAPH_KEYS = ['p1', 'p2', 'p3', 'p4'];

const emptyLoc = () => LANGS.reduce((acc, l) => ({ ...acc, [l]: '' }), {});
const emptyParagraphs = () => PARAGRAPH_KEYS.reduce((acc, k) => ({ ...acc, [k]: emptyLoc() }), {});

/** One compact row per section or activity: what it is, plus the row of controls. */
const Row = ({ n, title, enabled, onEdit, onMoveUp, onMoveDown, onToggle, onDelete, labels }) => (
  <li className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 transition-colors hover:border-brand-300">
    <span aria-hidden="true" className="w-6 shrink-0 text-center text-xs font-semibold text-mute">{n}</span>
    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</span>
    <Pill tone={enabled ? 'green' : 'neutral'}>{enabled ? labels.visible : labels.hidden}</Pill>
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={onMoveUp} disabled={!onMoveUp} aria-label={labels.up} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
        <MoveUp size={15} aria-hidden="true" />
      </button>
      <button type="button" onClick={onMoveDown} disabled={!onMoveDown} aria-label={labels.down} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
        <MoveDown size={15} aria-hidden="true" />
      </button>
      <button type="button" onClick={onToggle} aria-label={enabled ? labels.hide : labels.show} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink">
        {enabled ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
      </button>
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion">
        <Pencil size={12} aria-hidden="true" /> {labels.edit}
      </button>
      <button type="button" onClick={onDelete} aria-label={labels.remove} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600">
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </div>
  </li>
);

const AdminAbout = ({ t = {} }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeLang, setActiveLang] = useState('en');
  const [aboutData, setAboutData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [editKey, setEditKey] = useState(null);

  const heroRef = useRef(null);
  const sectionImgRef = useRef(null);
  const imgTargetRef = useRef(null);

  useEffect(() => {
    fetchAboutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/about');
      const data = response.data.data;
      setAboutData(data);
      setBaseline(data);
    } catch (error) {
      console.error('Error fetching about data:', error);
      showToast(t.a4_aboutLoadFailed || 'Failed to load about data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const dirty = baseline ? JSON.stringify(aboutData) !== JSON.stringify(baseline) : false;
  const langLabel = LANG_LABELS[activeLang] || activeLang;

  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[activeLang] || obj.en || '';
  };

  const setLocalized = (obj, value) => (obj ? { ...obj, [activeLang]: value } : { [activeLang]: value });

  const patch = (fn) => setAboutData((d) => ({ ...d, ...fn(d) }));

  const patchSections = (fn) => patch((d) => ({ sections: fn(d.sections || []) }));
  const patchActivities = (fn) => patch((d) => ({ activities: fn(d.activities || []) }));

  // ----- HERO -----
  const updateHeroField = (field, value) => patch((d) => ({ hero: { ...d.hero, [field]: value } }));
  const updateHeroLocalized = (field, value) => patch((d) => ({ hero: { ...d.hero, [field]: setLocalized(d.hero?.[field], value) } }));

  const uploadTo = async (e, url, after) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
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
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await api.post(url, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      after(res.data.url);
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadHeroImage = (e) => uploadTo(e, '/admin/upload/about/hero', (url) => {
    updateHeroField('image', url);
    showToast(t.a4_aboutHeroUploaded || 'Hero image uploaded successfully', 'success');
  });

  const uploadSectionImage = (e) => uploadTo(e, '/admin/upload/about/section', (url) => {
    patchSections((list) => list.map((s) => (s.key === imgTargetRef.current ? { ...s, image: url } : s)));
    showToast(t.a4_aboutSectionImageUploaded || 'Section image uploaded successfully', 'success');
  });

  const updateIntroTextLocalized = (value) => patch((d) => ({ introText: setLocalized(d.introText, value) }));

  // ----- SECTIONS -----
  const addSection = () => {
    const key = `section_${Date.now()}`;
    patch((d) => ({
      sections: [...(d.sections || []), {
        key,
        title: { en: 'New Section', ne: 'नयाँ खण्ड', hi: 'नया खंड', zh: '新部分', ta: 'புதிய பகுதி' },
        body: { en: 'Section description...', ne: 'खण्ड विवरण...', hi: 'खंड विवरण...', zh: '部分描述...', ta: 'பகுதி விளக்கம்...' },
        paragraphs: emptyParagraphs(),
        listTitle: emptyLoc(),
        points: [],
        image: '',
        order: (d.sections || []).length,
        enabled: true,
      }],
    }));
    setEditKey(key);
  };

  const removeSection = (key) => {
    if (!window.confirm(t.a4_aboutRemoveSectionConfirm || 'Are you sure you want to remove this section?')) return;
    patchSections((list) => list.filter((s) => s.key !== key));
    setEditKey(null);
    showToast(t.a4_aboutSectionRemoved || 'Section removed', 'success');
  };

  const updateSection = (key, field, value) => patchSections((list) => list.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  const updateSectionLocalized = (key, field, value) =>
    patchSections((list) => list.map((s) => (s.key === key ? { ...s, [field]: setLocalized(s[field], value) } : s)));
  const updateSectionParagraph = (key, pKey, value) =>
    patchSections((list) =>
      list.map((s) => {
        if (s.key !== key) return s;
        const next = { ...s, paragraphs: { ...(s.paragraphs || {}), [pKey]: setLocalized(s.paragraphs?.[pKey], value) } };
        // keep the legacy single-paragraph field in sync with paragraph 1
        if (pKey === 'p1') next.body = next.paragraphs.p1;
        return next;
      })
    );

  const addSectionPoint = (key) => patchSections((list) => list.map((s) => (s.key === key ? { ...s, points: [...(s.points || []), emptyLoc()] } : s)));
  const updateSectionPoint = (key, i, value) =>
    patchSections((list) => list.map((s) => (s.key === key ? { ...s, points: (s.points || []).map((p, x) => (x === i ? setLocalized(p, value) : p)) } : s)));
  const removeSectionPoint = (key, i) =>
    patchSections((list) => list.map((s) => (s.key === key ? { ...s, points: (s.points || []).filter((_, x) => x !== i) } : s)));
  const moveSectionPoint = (key, i, dir) =>
    patchSections((list) =>
      list.map((s) => {
        if (s.key !== key) return s;
        const points = [...(s.points || [])];
        const target = i + dir;
        if (target < 0 || target >= points.length) return s;
        [points[i], points[target]] = [points[target], points[i]];
        return { ...s, points };
      })
    );
  const toggleSectionEnabled = (key) => patchSections((list) => list.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
  const moveSection = (key, direction) =>
    patchSections((list) => {
      const next = [...list];
      const i = next.findIndex((s) => s.key === key);
      const target = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || target < 0 || target >= next.length) return list;
      [next[i], next[target]] = [next[target], next[i]];
      return next.map((s, x) => ({ ...s, order: x }));
    });

  // ----- ACTIVITIES -----
  const addActivity = () => {
    const key = `activity_${Date.now()}`;
    patch((d) => ({
      activities: [...(d.activities || []), {
        key,
        title: { en: 'New Activity', ne: 'नयाँ गतिविधि', hi: 'नई गतिविधि', zh: '新活动', ta: 'புதிய செயல்பாடு' },
        desc: emptyLoc(),
        paragraphs: emptyParagraphs(),
        order: (d.activities || []).length,
        enabled: true,
      }],
    }));
    setEditKey(key);
  };

  const removeActivity = (key) => {
    if (!window.confirm(t.a4_aboutRemoveActivityConfirm || 'Are you sure you want to remove this activity?')) return;
    patchActivities((list) => list.filter((a) => a.key !== key));
    setEditKey(null);
    showToast(t.a4_aboutActivityRemoved || 'Activity removed', 'success');
  };

  const updateActivityLocalized = (key, field, value) =>
    patchActivities((list) => list.map((a) => (a.key === key ? { ...a, [field]: setLocalized(a[field], value) } : a)));
  const updateActivityParagraph = (key, pKey, value) =>
    patchActivities((list) => list.map((a) => (a.key === key ? { ...a, paragraphs: { ...a.paragraphs, [pKey]: setLocalized(a.paragraphs?.[pKey], value) } } : a)));
  const toggleActivityEnabled = (key) => patchActivities((list) => list.map((a) => (a.key === key ? { ...a, enabled: !a.enabled } : a)));
  const moveActivity = (key, direction) =>
    patchActivities((list) => {
      const next = [...list];
      const i = next.findIndex((a) => a.key === key);
      const target = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || target < 0 || target >= next.length) return list;
      [next[i], next[target]] = [next[target], next[i]];
      return next.map((a, x) => ({ ...a, order: x }));
    });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/about', {
        hero: aboutData.hero || { title: {}, image: '' },
        introText: aboutData.introText || {},
        sections: aboutData.sections || [],
        activities: aboutData.activities || [],
      });
      showToast(t.a4_aboutSaved || 'About page saved successfully', 'success');
      await fetchAboutData();
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.response?.data?.message || (t.a4_saveFailed || 'Failed to save'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!aboutData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  const editingSection = (aboutData.sections || []).find((s) => s.key === editKey) || null;
  const editingActivity = (aboutData.activities || []).find((a) => a.key === editKey) || null;
  const sections = aboutData.sections || [];
  const activities = aboutData.activities || [];
  const rowLabels = {
    visible: t.a4_visible || 'Visible',
    hidden: t.a3_c_hidden || 'Hidden',
    up: t.a4_aboutMoveSectionUp || 'Move up',
    down: t.a4_aboutMoveSectionDown || 'Move down',
    hide: t.a4_aboutHideSection || 'Hide',
    show: t.a4_aboutShowSection || 'Show',
    edit: t.edit || 'Edit',
    remove: t.remove || 'Remove',
  };

  return (
    <div className="space-y-4 pb-2">
      <Card
        n={1}
        icon={Image}
        title={t.heroBanner || 'Hero Banner'}
        description={t.a4_aboutHeroBgNote || 'This image appears as the hero background.'}
        actions={<LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />}
      >
        <div className="space-y-5">
          <Field label={t.a4_aboutHeroBgImage || 'Hero Background Image'}>
            <Dropzone
              inputRef={heroRef}
              onPick={uploadHeroImage}
              preview={aboutData.hero?.image}
              busy={uploading}
              boxClassName="h-44"
              onRemove={() => updateHeroField('image', '')}
              removeLabel={t.remove || 'Remove'}
              empty={
                <div className="flex flex-col items-center gap-1.5 p-4 text-center text-ink-soft">
                  <Image size={28} aria-hidden="true" />
                  <span className="text-xs font-semibold">{t.a4_aboutClickUploadHero || 'Click to upload hero image'}</span>
                  <span className="text-xs text-mute">PNG, JPG, WEBP · 10MB</span>
                </div>
              }
            />
          </Field>
          <Field label={`${t.a4_aboutHeroTitleLabel || 'Title (Shown on Hero Image)'} (${langLabel})`} htmlFor="about-hero-title">
            <input
              id="about-hero-title"
              type="text"
              value={getLocalized(aboutData.hero?.title)}
              onChange={(e) => updateHeroLocalized('title', e.target.value)}
              className={inputCls}
              placeholder={t.a4_aboutHeroTitlePlaceholder || 'Hero title...'}
            />
          </Field>
        </div>
      </Card>

      <Card
        n={2}
        icon={Type}
        title={t.a4_aboutIntroHeading || 'Intro Text'}
        description={t.a4_aboutIntroSub || 'This text appears below the hero banner, not on the image.'}
        actions={<LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />}
      >
        <Field label={`${t.a4_introText || 'Intro Text'} (${langLabel})`} htmlFor="about-intro">
          <textarea
            id="about-intro"
            rows={5}
            value={getLocalized(aboutData.introText)}
            onChange={(e) => updateIntroTextLocalized(e.target.value)}
            className={`${inputCls} resize-y`}
            placeholder={t.a4_aboutIntroPlaceholder || 'Enter introduction text...'}
          />
        </Field>
      </Card>

      <Card
        n={3}
        icon={LayoutList}
        title={t.a4_aboutSections || 'About Sections'}
        description={t.a4_aboutSectionsSub || 'Sections shown below the intro text.'}
        actions={
          <>
            <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />
            <Button variant="primary" icon={Plus} onClick={addSection}>
              {t.a4_addSection || 'Add Section'}
            </Button>
          </>
        }
        bodyClassName="p-3"
      >
        {sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">{t.a4_aboutNoSections || 'No sections added'}</p>
        ) : (
          <ul className="space-y-2">
            {sections.map((section, index) => (
              <Row
                key={section.key}
                n={index + 1}
                title={getLocalized(section.title) || (t.a3_c_untitled || 'Untitled')}
                enabled={section.enabled !== false}
                labels={rowLabels}
                onEdit={() => setEditKey(section.key)}
                onMoveUp={index > 0 ? () => moveSection(section.key, 'up') : undefined}
                onMoveDown={index < sections.length - 1 ? () => moveSection(section.key, 'down') : undefined}
                onToggle={() => toggleSectionEnabled(section.key)}
                onDelete={() => removeSection(section.key)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card
        n={4}
        icon={Sparkles}
        title={t.a4_aboutActivities || 'Activities & Programs'}
        description={t.a4_aboutActivitiesSub || 'Activities shown at the bottom of the about page.'}
        actions={
          <>
            <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />
            <Button variant="primary" icon={Plus} onClick={addActivity}>
              {t.a4_aboutAddActivity || 'Add Activity'}
            </Button>
          </>
        }
        bodyClassName="p-3"
      >
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">{t.a4_aboutNoActivities || 'No activities added'}</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((activity, index) => (
              <Row
                key={activity.key}
                n={index + 1}
                title={getLocalized(activity.title) || (t.a3_c_untitled || 'Untitled')}
                enabled={activity.enabled !== false}
                labels={rowLabels}
                onEdit={() => setEditKey(activity.key)}
                onMoveUp={index > 0 ? () => moveActivity(activity.key, 'up') : undefined}
                onMoveDown={index < activities.length - 1 ? () => moveActivity(activity.key, 'down') : undefined}
                onToggle={() => toggleActivityEnabled(activity.key)}
                onDelete={() => removeActivity(activity.key)}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Section editor */}
      <Modal
        open={Boolean(editingSection)}
        onClose={() => setEditKey(null)}
        size="lg"
        title={editingSection ? (getLocalized(editingSection.title) || (t.a4_title || 'Title')) : ''}
        description={t.a4_aboutEditSectionHint || 'Text, paragraphs, bullet points and picture for this section.'}
        footer={<Button variant="primary" onClick={() => setEditKey(null)}>{t.gl_close || 'Close'}</Button>}
      >
        {editingSection && (
          <div className="space-y-5">
            <Field label={t.a4_image || 'Image'}>
              <Dropzone
                inputRef={sectionImgRef}
                onPick={(e) => { imgTargetRef.current = editingSection.key; uploadSectionImage(e); }}
                preview={editingSection.image}
                busy={uploading}
                boxClassName="h-28"
                onRemove={() => updateSection(editingSection.key, 'image', '')}
                removeLabel={t.remove || 'Remove'}
                empty={<div className="flex items-center justify-center p-4 text-ink-soft"><Image size={20} aria-hidden="true" /></div>}
              />
            </Field>

            <Field label={`${t.a4_title || 'Title'} (${langLabel})`} htmlFor="sec-title">
              <input
                id="sec-title"
                data-autofocus
                type="text"
                value={getLocalized(editingSection.title)}
                onChange={(e) => updateSectionLocalized(editingSection.key, 'title', e.target.value)}
                className={inputCls}
                placeholder={t.a4_sectionTitlePlaceholder || 'Section title...'}
              />
            </Field>

            <Field label={`${t.description || 'Description'} (${langLabel})`} htmlFor="sec-desc">
              <textarea
                id="sec-desc"
                rows={3}
                value={getLocalized(editingSection.body)}
                onChange={(e) => updateSectionLocalized(editingSection.key, 'body', e.target.value)}
                className={`${inputCls} resize-y`}
                placeholder={t.a4_aboutSectionDescPlaceholder || 'Section description...'}
              />
            </Field>

            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-ink">
                {t.a4_paragraphs || 'Paragraphs'} ({langLabel})
              </legend>
              <p className="text-xs text-ink-soft">
                {t.a4_aboutParagraphsNote || 'These are shown on the page. Paragraph 1 is also used as the fallback Description.'}
              </p>
              {PARAGRAPH_KEYS.map((pKey) => (
                <Field key={pKey} label={pKey.toUpperCase()} htmlFor={`sec-${pKey}`}>
                  <textarea
                    id={`sec-${pKey}`}
                    rows={2}
                    value={getLocalized(editingSection.paragraphs?.[pKey])}
                    onChange={(e) => updateSectionParagraph(editingSection.key, pKey, e.target.value)}
                    className={`${inputCls} resize-y`}
                    placeholder={(t.a4_paragraphPlaceholder || 'Paragraph {n}...').replace('{n}', pKey)}
                  />
                </Field>
              ))}
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-ink">
                {t.a4_bulletPoints || 'Bullet Points'}
              </legend>
              <Field label={`${t.a4_listHeadingOptional || 'List Heading (optional)'} (${langLabel})`} htmlFor="sec-list-title">
                <input
                  id="sec-list-title"
                  type="text"
                  value={getLocalized(editingSection.listTitle)}
                  onChange={(e) => updateSectionLocalized(editingSection.key, 'listTitle', e.target.value)}
                  className={inputCls}
                  placeholder={t.a4_aboutListHeadingExample || 'e.g. Main religious services include:'}
                />
              </Field>

              {(editingSection.points || []).length === 0 ? (
                <p className="text-xs text-ink-soft">{t.a4_aboutNoBulletPointsYet || 'No bullet points yet.'}</p>
              ) : (
                <ul className="space-y-2">
                  {editingSection.points.map((point, pIndex) => (
                    <li key={pIndex} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        aria-label={`${(t.a4_point || 'Point {n}').replace('{n}', pIndex + 1)} (${langLabel})`}
                        value={getLocalized(point)}
                        onChange={(e) => updateSectionPoint(editingSection.key, pIndex, e.target.value)}
                        className={inputCls}
                      />
                      <button type="button" onClick={() => moveSectionPoint(editingSection.key, pIndex, -1)} disabled={pIndex === 0} aria-label={t.a3_c_moveUp || 'Move up'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
                        <MoveUp size={14} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => moveSectionPoint(editingSection.key, pIndex, 1)} disabled={pIndex === editingSection.points.length - 1} aria-label={t.a3_c_moveDown || 'Move down'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
                        <MoveDown size={14} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeSectionPoint(editingSection.key, pIndex)} aria-label={t.remove || 'Remove'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button icon={Plus} onClick={() => addSectionPoint(editingSection.key)}>
                {t.a4_addPoint || 'Add Point'}
              </Button>
            </fieldset>
          </div>
        )}
      </Modal>

      {/* Activity editor */}
      <Modal
        open={Boolean(editingActivity)}
        onClose={() => setEditKey(null)}
        size="lg"
        title={editingActivity ? (getLocalized(editingActivity.title) || (t.a4_title || 'Title')) : ''}
        description={t.a4_aboutEditActivityHint || 'Title, short description and paragraphs for this activity.'}
        footer={<Button variant="primary" onClick={() => setEditKey(null)}>{t.gl_close || 'Close'}</Button>}
      >
        {editingActivity && (
          <div className="space-y-5">
            <Field label={`${t.a4_title || 'Title'} (${langLabel})`} htmlFor="act-title">
              <input
                id="act-title"
                data-autofocus
                type="text"
                value={getLocalized(editingActivity.title)}
                onChange={(e) => updateActivityLocalized(editingActivity.key, 'title', e.target.value)}
                className={inputCls}
                placeholder={t.a4_aboutActivityTitlePlaceholder || 'Activity title...'}
              />
            </Field>
            <Field label={`${t.a4_aboutShortDescOptional || 'Short Description (optional)'} (${langLabel})`} htmlFor="act-desc">
              <input
                id="act-desc"
                type="text"
                value={getLocalized(editingActivity.desc)}
                onChange={(e) => updateActivityLocalized(editingActivity.key, 'desc', e.target.value)}
                className={inputCls}
                placeholder={t.a4_aboutShortDescPlaceholder || 'Short description...'}
              />
            </Field>
            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-ink">{t.a4_paragraphs || 'Paragraphs'}</legend>
              {PARAGRAPH_KEYS.map((pKey) => (
                <Field key={pKey} label={`${pKey.toUpperCase()} (${langLabel})`} htmlFor={`act-${pKey}`}>
                  <textarea
                    id={`act-${pKey}`}
                    rows={2}
                    value={getLocalized(editingActivity.paragraphs?.[pKey])}
                    onChange={(e) => updateActivityParagraph(editingActivity.key, pKey, e.target.value)}
                    className={`${inputCls} resize-y`}
                    placeholder={(t.a4_aboutParagraphTextPlaceholder || 'Paragraph {n} text...').replace('{n}', pKey)}
                  />
                </Field>
              ))}
            </fieldset>
          </div>
        )}
      </Modal>

      <SaveBar
        dirty={dirty}
        saving={loading}
        onSave={handleSave}
        onReset={dirty ? fetchAboutData : undefined}
        saveLabel={t.a4_aboutSavePage || 'Save About Page'}
        resetLabel={t.a3_c_reset || 'Reload'}
      />
    </div>
  );
};

export default AdminAbout;