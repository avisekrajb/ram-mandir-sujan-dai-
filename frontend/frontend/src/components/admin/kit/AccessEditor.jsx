import React from 'react';
import { Check } from 'lucide-react';
import { AREAS, AREA_KEYS } from '../../../utils/permissions';
import { Toggle, cx } from './kit';

/**
 * Chooses which parts of the admin panel an admin may use.
 * `value` is null (full access) or an array of area keys.
 */
const AccessEditor = ({ value, onChange, t = {}, disabled, requireOne }) => {
  const full = !Array.isArray(value);
  const selected = Array.isArray(value) ? value : AREA_KEYS;

  const toggleArea = (key) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-gray-50/70 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t.k7_fullAccess || 'Full access'}</p>
          <p className="text-xs text-ink-soft">
            {t.k7_fullAccessDesc || 'Can use every part of the admin panel. Turn off to choose areas.'}
          </p>
        </div>
        <Toggle
          checked={full}
          disabled={disabled}
          label={t.k7_fullAccess || 'Full access'}
          onChange={(on) => onChange(on ? null : AREA_KEYS.slice())}
        />
      </div>

      <div className={cx('grid gap-2 sm:grid-cols-2', full && 'opacity-50')}>
        {AREAS.map((a) => {
          const on = selected.includes(a.key);
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={full || disabled}
              onClick={() => toggleArea(a.key)}
              className={cx(
                'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                on ? 'border-vermilion/60 bg-brand-50/60' : 'border-line bg-white hover:border-brand-300'
              )}
            >
              <span
                className={cx(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  on ? 'border-vermilion bg-vermilion text-white' : 'border-gray-300 bg-white'
                )}
              >
                {on && <Check size={13} strokeWidth={3} aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Icon size={14} className="text-mute" aria-hidden="true" />
                  {t[a.labelKey] || a.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{t[a.descKey] || a.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* With requireOne the dialog itself explains (next to its disabled button). */}
      {!full && selected.length === 0 && !requireOne && (
        <p className="text-xs text-amber-700">
          {t.k7_noAreasWarn || 'With no areas selected this admin can sign in but cannot open any section.'}
        </p>
      )}
    </div>
  );
};

export default AccessEditor;
