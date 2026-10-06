import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Info, RotateCcw, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';
import { Toggle } from './kit/kit';
import { LANGS, TEXT_GROUPS, ALL_TEXT_KEYS } from '../../data/bookingPageText';

/*
 * Every field arrives empty, which the booking page reads as "not overridden" and
 * falls back to the wording it ships with. So this page starts blank and blank
 * keeps working; an administrator types only what they want changed.
 */
const blankBucket = (group) =>
  group.fields.reduce((acc, { key }) => {
    acc[key] = LANGS.reduce((a, [code]) => {
      a[code] = '';
      return a;
    }, {});
    return acc;
  }, {});

const emptyForm = () =>
  TEXT_GROUPS.reduce((acc, g) => {
    acc[g.id] = blankBucket(g);
    return acc;
  }, { enabled: true });

/** Merge what the server sent over the blanks, so a group added later still appears. */
const hydrate = (saved) => {
  const form = emptyForm();
  if (!saved) return form;
  if (saved.enabled !== undefined) form.enabled = saved.enabled !== false;
  TEXT_GROUPS.forEach((group) => {
    const bucket = saved[group.id];
    if (!bucket) return;
    group.fields.forEach(({ key }) => {
      const value = bucket[key];
      if (!value) return;
      LANGS.forEach(([code]) => {
        if (typeof value[code] === 'string') form[group.id][key][code] = value[code];
      });
    });
  });
  return form;
};

/** Drop the fields nobody filled in, so the saved document stays small. */
const prune = (form) => {
  const out = { enabled: form.enabled !== false };
  TEXT_GROUPS.forEach((group) => {
    const bucket = {};
    group.fields.forEach(({ key }) => {
      const values = form[group.id][key];
      const filled = LANGS.filter(([code]) => (values[code] || '').trim());
      if (filled.length) bucket[key] = Object.fromEntries(filled.map(([code]) => [code, values[code].trim()]));
    });
    out[group.id] = bucket;
  });
  return out;
};

/**
 * Booking Page Content (Admin → Booking Page Content).
 *
 * The heading, the form labels, the buttons and the messages of /booking — the
 * thirty-six strings that are the page itself. The section titles and bullet
 * points are not here: those are the bookingContent sections, edited on Admin →
 * Bookings, and there is a pointer below saying so rather than moving a working
 * editor.
 *
 * Five languages per field, one save button. Saving keeps a field only if it has
 * been filled in, so the page keeps its built-in wording everywhere an
 * administrator has not been.
 */
const AdminBookingContent = ({ t = {} }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/admin/settings');
        if (alive) setForm(hydrate(res.data?.bookingPage));
      } catch (e) {
        if (alive) {
          setForm(emptyForm());
          setError(e.response?.data?.message || (t?.a1_bpcLoadFailed || 'Could not load the booking page text'));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [t]);

  const setValue = (groupId, key, code, value) =>
    setForm((f) => {
      setDirty(true);
      return { ...f, [groupId]: { ...f[groupId], [key]: { ...f[groupId][key], [code]: value } } };
    });

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.put('/admin/settings', { bookingPage: prune(form) });
      setForm(hydrate(res.data?.bookingPage));
      setDirty(false);
      showToast(t?.a1_bpcSaved || 'Booking page text saved', 'success');
    } catch (e) {
      setError(e.response?.data?.message || (t?.a1_bpcSaveFailed || 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    if (!window.confirm(t?.a1_bpcClearConfirm || 'Clear every saved line? The page will go back to its built-in wording.')) return;
    setForm(emptyForm());
    setDirty(true);
  };

  const filledCount = useMemo(() => {
    if (!form) return 0;
    let n = 0;
    TEXT_GROUPS.forEach((g) =>
      g.fields.forEach(({ key }) => {
        if (LANGS.some(([code]) => (form[g.id][key][code] || '').trim())) n += 1;
      })
    );
    return n;
  }, [form]);

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-16">
        <OmLoader size="md" color="maroon" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <FileText size={18} className="text-vermilion" aria-hidden="true" />
          {t?.a1_bpcTitle || 'Booking Page Content'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t?.a1_bpcHint ||
            'Every line of wording on the booking page: the heading, the form labels, the buttons and the messages. Leave a line empty to keep the wording it already has.'}
        </p>
      </div>

      {/* Where the titles and bullet points are, so nobody looks in the wrong place. */}
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>
          {t?.a1_bpcSectionsHint ||
            'The section titles, paragraphs and bullet points on that page are edited on Admin → Bookings, under “Booking page sections”. This page is the wording of the page itself.'}
        </span>
      </p>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {t?.a1_bpcEnabled || 'Show the saved wording'}
            </p>
            <p className="mt-0.5 text-xs text-mute">
              {form.enabled
                ? (t?.a1_bpcEnabledOn || 'The booking page uses the lines saved here.')
                : (t?.a1_bpcEnabledOff || 'Switched off: the page shows its built-in wording.')}
            </p>
          </div>
          <Toggle
            checked={form.enabled !== false}
            onChange={(next) => {
              setDirty(true);
              setForm((f) => ({ ...f, enabled: next }));
            }}
            label={t?.a1_bpcEnabled || 'Show the saved wording'}
          />
        </div>
      </div>

      {TEXT_GROUPS.map((group) => (
        <div key={group.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-mute">
            {t?.[group.labelKey] || group.fallback}
          </h3>

          <div className="mt-4 space-y-5">
            {group.fields.map((field) => (
              <fieldset key={field.key}>
                <legend className="mb-1.5 text-sm font-semibold text-ink">
                  {t?.[field.labelKey] || field.fallback}
                  <span className="ml-2 text-[11px] font-normal text-mute">{field.key}</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {LANGS.map(([code, name]) => (
                    <div key={code}>
                      <label className="sr-only" htmlFor={`${group.id}-${field.key}-${code}`}>
                        {`${t?.[field.labelKey] || field.fallback} — ${name}`}
                      </label>
                      <textarea
                        id={`${group.id}-${field.key}-${code}`}
                        rows={2}
                        value={form[group.id][field.key][code] || ''}
                        onChange={(e) => setValue(group.id, field.key, code, e.target.value)}
                        placeholder={t?.[field.labelKey] || field.fallback}
                        className="w-full resize-y rounded-lg border border-[#8F8685] bg-white px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
                      />
                      <p className="mt-1 text-[11px] text-mute">{name}</p>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-mute">
          {(t?.a1_bpcCount || '{done} of {total} lines saved').replace('{done}', String(filledCount)).replace('{total}', String(ALL_TEXT_KEYS.length))}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearAll}
            disabled={busy || filledCount === 0}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={15} aria-hidden="true" />
            {t?.a1_bpcClearAll || 'Clear all'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl bg-vermilion px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#820606] focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 disabled:opacity-50"
          >
            {busy ? <OmLoader size="sm" color="white" /> : <Save size={15} aria-hidden="true" />}
            {t?.save || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingContent;