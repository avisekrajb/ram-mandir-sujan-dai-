import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Image as ImageIcon, List, Plus, Save,
  Table as TableIcon, Trash2, Type as TypeIcon, X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { Toggle } from './kit/kit';

/**
 * The "आयोजन गरिने कार्यक्रमहरू" sections of the Events page
 * (AdminSettings.programSections), shown as a second tab on Admin → Events.
 *
 * A section is a numbered block with an optional photo and an ordered list of
 * blocks: a sub-heading, a paragraph, a bulleted list or a table. The numbering
 * comes from the position on the page, so moving a section up or down renumbers
 * the whole page by itself and nothing has to be renumbered by hand.
 *
 * A photo is optional: a section saved without one is published as a numbered
 * block on its own, with no empty picture area left on the page.
 */

const LANG_NAMES = { ne: 'नेपाली', en: 'English', hi: 'हिन्दी', zh: '中文', ta: 'தமிழ்' };

const emptyLoc = () => ({ en: '', ne: '', hi: '', zh: '', ta: '' });

const BLOCK_TYPES = [
  { type: 'heading', label: 'Sub-heading', icon: TypeIcon },
  { type: 'para', label: 'Paragraph', icon: TypeIcon },
  { type: 'list', label: 'Bullet list', icon: List },
  { type: 'table', label: 'Table', icon: TableIcon },
];

const newBlock = (type) => {
  if (type === 'heading' || type === 'para') return { type, text: emptyLoc() };
  if (type === 'list') return { type, points: [emptyLoc()] };
  return { type: 'table', headers: [emptyLoc(), emptyLoc()], rows: [{ cells: [emptyLoc(), emptyLoc()] }] };
};

const newSection = (order) => ({
  key: `custom_${Date.now()}`,
  title: emptyLoc(),
  photo: '',
  blocks: [newBlock('para')],
  order,
  enabled: true,
});

const input =
  'w-full rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15';
const card = 'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm';

/** One localized field: a single language, chosen once for the whole panel. */
const LocInput = ({ value, onChange, lang, rows = 2, placeholder = '' }) => (
  <textarea
    rows={rows}
    value={(value && value[lang]) || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`${input} resize-y`}
  />
);

/** Header row + data rows of one table block, editable cell by cell. */
const TableBlock = ({ block, patch, lang }) => {
  const headers = block.headers || [];
  const rows = block.rows || [];

  const setHeader = (i, value) =>
    patch({ headers: headers.map((h, x) => (x === i ? { ...emptyLoc(), ...h, [lang]: value } : h)) });

  const setCell = (r, c, value) =>
    patch({
      rows: rows.map((row, x) =>
        x === r
          ? { cells: (row.cells || []).map((cell, y) => (y === c ? { ...emptyLoc(), ...cell, [lang]: value } : cell)) }
          : row
      ),
    });

  const cols = Math.max(headers.length, ...rows.map((r) => (r.cells || []).length), 1);

  const addRow = () => patch({ rows: [...rows, { cells: Array.from({ length: cols }, emptyLoc) }] });
  const removeRow = (i) => patch({ rows: rows.filter((_, x) => x !== i) });
  const addCol = () =>
    patch({
      headers: [...headers, emptyLoc()],
      rows: rows.map((r) => ({ cells: [...(r.cells || []), emptyLoc()] })),
    });
  const removeCol = (c) =>
    patch({
      headers: headers.filter((_, x) => x !== c),
      rows: rows.map((r) => ({ cells: (r.cells || []).filter((_, y) => y !== c) })),
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} className="p-1 align-top">
                <input
                  value={(headers[c] && headers[c][lang]) || ''}
                  onChange={(e) => setHeader(c, e.target.value)}
                  placeholder={`Column ${c + 1}`}
                  className={input}
                />
                {cols > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCol(c)}
                    title="Remove this column"
                    className="mt-1 text-mute hover:text-vermilion"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </th>
            ))}
            <th className="w-8 p-1" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-1 align-top">
                  <input
                    value={((row.cells || [])[c] || {})[lang] || ''}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    className={input}
                  />
                </td>
              ))}
              <td className="p-1 align-top">
                <button
                  type="button"
                  onClick={() => removeRow(r)}
                  title="Remove this row"
                  className="mt-2 text-mute hover:text-vermilion"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className="text-xs font-semibold text-brand-600 hover:underline">
          + Add row
        </button>
        <button type="button" onClick={addCol} className="text-xs font-semibold text-brand-600 hover:underline">
          + Add column
        </button>
      </div>
    </div>
  );
};

const ListBlock = ({ block, patch, lang }) => {
  const points = block.points || [];
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            rows={2}
            value={(p && p[lang]) || ''}
            onChange={(e) =>
              patch({ points: points.map((x, y) => (y === i ? { ...emptyLoc(), ...x, [lang]: e.target.value } : x)) })
            }
            className={`${input} resize-y`}
          />
          <button
            type="button"
            onClick={() => patch({ points: points.filter((_, y) => y !== i) })}
            title="Remove this item"
            className="mt-2 text-mute hover:text-vermilion"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => patch({ points: [...points, emptyLoc()] })}
        className="text-xs font-semibold text-brand-600 hover:underline"
      >
        + Add item
      </button>
    </div>
  );
};

const AdminProgramSections = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const [sections, setSections] = useState([]);
  const [lang, setLang] = useState('ne');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef(null);
  const uploadFor = useRef(null);

  useEffect(() => {
    if (Array.isArray(settings?.programSections)) setSections(settings.programSections);
  }, [settings]);

  const patch = (index, fn) => {
    setDirty(true);
    setSections((prev) => prev.map((s, i) => (i === index ? fn(s) : s)));
  };

  const move = (index, dir) => {
    setDirty(true);
    setSections((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      // The number on the page is the position, so the stored order is rewritten
      // to match: the public page never has to guess which section is "1st".
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  const addSection = () => {
    setDirty(true);
    setSections((prev) => [...prev, newSection(prev.length)]);
    setOpen(sections.length);
  };

  const removeSection = (index) => {
    if (!window.confirm(t?.a2_progRemoveSection || 'Remove this section?')) return;
    setDirty(true);
    setSections((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const patchBlock = (sectionIndex, blockIndex, next) =>
    patch(sectionIndex, (s) => ({
      ...s,
      blocks: (s.blocks || []).map((b, i) => (i === blockIndex ? { ...b, ...next } : b)),
    }));

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t?.a2_imageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await api.post('/admin/upload/event', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      patch(uploadFor.current, (s) => ({ ...s, photo: res.data.url }));
      showToast(t?.a2_photoUploaded || 'Photo uploaded successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t?.a2_uploadFailed || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async () => {
    setBusy(true);
    const payload = { programSections: sections.map((s, i) => ({ ...s, order: i })) };
    try {
      // updateSettings (from AdminPage) does the PUT and refreshes the shared state.
      if (updateSettings) await updateSettings(payload);
      else {
        await api.put('/admin/settings', payload);
        showToast(t?.a2_progSaved || 'Program sections saved', 'success');
      }
      setDirty(false);
    } catch (error) {
      if (!updateSettings) {
        showToast(error.response?.data?.message || t?.a2_progSaveFailed || 'Failed to save', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const headingOf = (s) => (s.title && (s.title[lang] || s.title.en || s.title.ne)) || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-ink">
            {t?.a2_progTitle || 'Program sections (आयोजन गरिने कार्यक्रमहरू)'}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t?.a2_progHint ||
              'The numbered program sections under “आयोजन गरिने कार्यक्रमहरू” on the Events page. Each one takes a heading, an optional photo and any number of headings, paragraphs, bullet lists and tables. A section with no photo is published as a numbered block on its own.'}
          </p>
        </div>
        <LanguageSwitcher active={lang} onChange={setLang} />
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-mute">
            {t?.a2_progEditingIn || 'Editing in'} <strong>{LANG_NAMES[lang]}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addSection}
              className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50"
            >
              <Plus size={15} aria-hidden="true" />
              {t?.a2_progAddSection || 'Add section'}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl bg-vermilion px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8B0606] disabled:opacity-60"
            >
              {busy ? <OmLoader size="sm" color="white" /> : <Save size={15} aria-hidden="true" />}
              {t?.save || 'Save'}
            </button>
          </div>
        </div>
      </div>

      {sections.length === 0 && (
        <p className={card}>{t?.a2_progNoSections || 'No sections yet. Add one to get started.'}</p>
      )}

      {sections.map((section, index) => {
        const isOpen = open === index;
        const hasPhoto = Boolean(section.photo);
        return (
          <div key={section.key || index} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {headingOf(section) || (t?.a2_progUntitled || 'Untitled section')}
                  </span>
                  <span className="block text-xs text-mute">
                    {(section.blocks || []).length} {t?.a2_progBlocks || 'blocks'}
                    {hasPhoto ? '' : ` · ${t?.a2_progNoPhoto || 'no photo'}`}
                  </span>
                </span>
                {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>

              <div className="flex items-center gap-2">
                <Toggle
                  checked={section.enabled !== false}
                  onChange={(next) => patch(index, (s) => ({ ...s, enabled: next }))}
                  label={t?.a2_progShow || 'Show'}
                />
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Move up" className="p-1 text-mute hover:text-ink disabled:opacity-30">
                  <ChevronUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === sections.length - 1}
                  title="Move down"
                  className="p-1 text-mute hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => removeSection(index)} title="Remove section" className="p-1 text-mute hover:text-vermilion">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="mt-5 space-y-5 border-t border-line pt-5">
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-ink">{t?.a2_progSectionTitle || 'Section heading'}</p>
                  <LocInput
                    value={section.title}
                    onChange={(v) => patch(index, (s) => ({ ...s, title: { ...emptyLoc(), ...s.title, [lang]: v } }))}
                    placeholder={t?.a2_progTitlePlaceholder || 'e.g. दैनिक कार्यक्रम / नियमित कार्यक्रमहरू'}
                  />
                </div>

                {/* Photo is optional: without one the section prints as a numbered block only. */}
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-ink">
                    {t?.a2_progPhoto || 'Photo (optional)'}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={() => {
                      uploadFor.current = index;
                    }}
                    onChange={uploadPhoto}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    {hasPhoto && (
                      <img
                        src={section.photo}
                        alt=""
                        className="h-20 w-28 rounded-lg border border-line object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        uploadFor.current = index;
                        fileRef.current?.click();
                      }}
                      disabled={uploading}
                      className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      <ImageIcon size={15} aria-hidden="true" />
                      {uploading ? (t?.a2_progUploading || 'Uploading...') : hasPhoto ? (t?.a2_eventsChangePhoto || 'Change photo') : (t?.a2_progUploadPhoto || 'Upload photo')}
                    </button>
                    {hasPhoto && (
                      <button
                        type="button"
                        onClick={() => patch(index, (s) => ({ ...s, photo: '' }))}
                        className="text-xs font-semibold text-mute hover:text-vermilion"
                      >
                        {t?.a2_progRemovePhoto || 'Remove photo'}
                      </button>
                    )}
                  </div>
                  {!hasPhoto && (
                    <p className="mt-1.5 text-xs text-mute">
                      {t?.a2_progPhotoHint || 'Saved without a photo: the section shows only its number and text, with no picture box.'}
                    </p>
                  )}
                </div>

                {/* Blocks */}
                <div>
                  <p className="mb-2 text-sm font-semibold text-ink">{t?.a2_progContent || 'Content'}</p>
                  <div className="space-y-3">
                    {(section.blocks || []).map((block, b) => {
                      const meta = BLOCK_TYPES.find((x) => x.type === block.type) || BLOCK_TYPES[1];
                      return (
                        <div key={b} className="rounded-xl border border-line p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mute">
                              <meta.icon size={13} aria-hidden="true" />
                              {meta.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => patch(index, (s) => ({ ...s, blocks: s.blocks.filter((_, i) => i !== b) }))}
                              title="Remove this block"
                              className="text-mute hover:text-vermilion"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>

                          {(block.type === 'heading' || block.type === 'para') && (
                            <LocInput
                              value={block.text}
                              onChange={(v) => patchBlock(index, b, { text: { ...emptyLoc(), ...block.text, [lang]: v } })}
                            />
                          )}
                          {block.type === 'list' && (
                            <ListBlock block={block} lang={lang} patch={(next) => patchBlock(index, b, next)} />
                          )}
                          {block.type === 'table' && (
                            <TableBlock block={block} lang={lang} patch={(next) => patchBlock(index, b, next)} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => patch(index, (s) => ({ ...s, blocks: [...(s.blocks || []), newBlock(type)] }))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion"
                      >
                        <Icon size={13} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {dirty && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t?.a2_progUnsaved || 'You have unsaved changes. Press Save to publish them to the Events page.'}
        </p>
      )}
    </div>
  );
};

export default AdminProgramSections;