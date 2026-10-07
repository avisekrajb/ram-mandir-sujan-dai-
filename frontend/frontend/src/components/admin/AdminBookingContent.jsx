import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Info, RotateCcw, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import OmLoader from '../common/OmLoader';
import { Toggle } from './kit/kit';
import { LANGS, TEXT_GROUPS, ALL_TEXT_KEYS } from '../../data/bookingPageText';
import { BOOKING_PAGE_LABELS } from '../../data/bookingPageLabels';

/** The wording the booking page shows for this field in this language. */
const builtinFor = (key, code) => {
  const byLang = BOOKING_PAGE_LABELS[code] || BOOKING_PAGE_LABELS.en;
  return byLang?.[key] || BOOKING_PAGE_LABELS.en?.[key] || '';
};

/*
 * Every field starts on the wording the booking page already shows, so an
 * administrator edits the real sentence rather than an empty box they have to
 * reconstruct. It is prefilled as a starting point only - anything left untouched
 * is pruned on save (see `prune`), so the page keeps its built-in wording and
 * nothing redundant is stored. That matters because these built-in strings live
 * in the code: storing a copy of every one of them would freeze today's wording
 * into the database, and a later improvement to the page would never reach the
 * site.
 */
const blankBucket = (group) =>
  group.fields.reduce((acc, { key }) => {
    acc[key] = LANGS.reduce((a, [code]) => {
      a[code] = builtinFor(key, code);
      return a;
    }, {});
    return acc;
  }, {});

const emptyForm = () =>
  TEXT_GROUPS.reduce((acc, g) => {
    acc[g.id] = blankBucket(g);
    return acc;
  }, { enabled: true });

/**
 * Merge what the server sent over the built-in wording, so a group added later
 * still appears. A line the server has is the override and wins; a line it does
 * not have keeps the wording the page already shows.
 */
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

/**
 * Store only the lines that actually differ from the built-in wording.
 *
 * A field still holding its built-in text is dropped, so the saved document holds
 * genuine overrides and nothing else. An empty line is dropped too - that is the
 * booking page's own signal to fall back to the wording it ships with.
 */
const prune = (form) => {
  const out = { enabled: form.enabled !== false };
  TEXT_GROUPS.forEach((group) => {
    const bucket = {};
    group.fields.forEach(({ key }) => {
      const values = form[group.id][key];
      const filled = LANGS.filter(([code]) => {
        const typed = (values[code] || '').trim();
        return typed && typed !== builtinFor(key, code).trim();
      });
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
  // The lines an administrator has typed in. This is what tells "never touched,
  // still showing the built-in wording" from "edited and then typed back to
  // exactly the original" - only the second is worth offering a revert for.
  const [touched, setTouched] = useState({});
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

  const setValue = (groupId, key, code, value) => {
    setTouched((prev) => ({ ...prev, [`${groupId}.${key}.${code}`]: true }));
    setForm((f) => {
      setDirty(true);
      return { ...f, [groupId]: { ...f[groupId], [key]: { ...f[groupId][key], [code]: value } } };
    });
  };

  /** Put one line back to the wording the booking page ships with. */
  const revertOne = (groupId, key, code) => {
    setTouched((prev) => ({ ...prev, [`${groupId}.${key}.${code}`]: false }));
    setForm((f) => {
      setDirty(true);
      return {
        ...f,
        [groupId]: { ...f[groupId], [key]: { ...f[groupId][key], [code]: builtinFor(key, code) } },
      };
    });
  };

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

  /**
   * Put every line back to the wording the booking page ships with. This is the
   * old "Clear all", renamed for what it now does - the fields stay filled with
   * the seeded wording, they are simply no longer overrides.
   */
  const revertAll = () => {
    if (!window.confirm(t?.a1_bpcClearConfirm || 'Revert every line to the wording the booking page uses?')) return;
    setForm(emptyForm());
    setTouched({});
    setDirty(true);
  };

  /** Lines that differ from the built-in wording - these are the ones being saved. */
  const changedCount = useMemo(() => {
    if (!form) return 0;
    let n = 0;
    TEXT_GROUPS.forEach((g) =>
      g.fields.forEach(({ key }) => {
        if (LANGS.some(([code]) => {
          const typed = (form[g.id][key][code] || '').trim();
          return typed && typed !== builtinFor(key, code).trim();
        })) n += 1;
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
            'Every line of wording on the booking page: the heading, the form labels, the buttons and the messages. Each box starts with the wording the page shows now — edit it to change it, or leave it and the page keeps using it.'}
        </p>
      </div>

      {/* Where the titles and bullet points are, so nobody looks in the wrong place. */}
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>
          {t?.a1_bpcSectionsHint ||
            'Only the lines you change are saved. A box left as it is keeps the wording built into the booking page, so a later improvement to the page still reaches visitors.'}
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
                  {LANGS.map(([code, name]) => {
                    const isChanged = Boolean(touched[`${group.id}.${field.key}.${code}`]);
                    return (
                    <div key={code}>
                      <label className="sr-only" htmlFor={`${group.id}-${field.key}-${code}`}>
                        {`${t?.[field.labelKey] || field.fallback} — ${name}`}
                      </label>
                      <textarea
                        id={`${group.id}-${field.key}-${code}`}
                        rows={2}
                        value={form[group.id][field.key][code] || ''}
                        onChange={(e) => setValue(group.id, field.key, code, e.target.value)}
                        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-vermilion/15 ${
                          isChanged ? 'border-vermilion/50' : 'border-[#8F8685]'
                        }`}
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-mute">{name}</p>
                        {isChanged && (
                          <button
                            type="button"
                            onClick={() => revertOne(group.id, field.key, code)}
                            className="text-[11px] font-semibold text-vermilion hover:underline"
                          >
                            {t?.a1_bpcRevertOne || 'Use original'}
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-mute">
          {(t?.a1_bpcCount || '{done} of {total} lines changed').replace('{done}', String(changedCount)).replace('{total}', String(ALL_TEXT_KEYS.length))}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={revertAll}
            disabled={busy || changedCount === 0}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={15} aria-hidden="true" />
            {t?.a1_bpcClearAll || 'Revert all'}
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