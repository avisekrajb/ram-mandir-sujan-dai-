import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Wand2 } from 'lucide-react';
import { inputCls, cx } from './kit';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Random 12-character password in three groups of four, e.g. "kT7m-Qp3x-Vn8d". */
export const generatePassword = () => {
  const pick = () => {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return ALPHABET[buf[0] % ALPHABET.length];
  };
  for (;;) {
    const raw = Array.from({ length: 12 }, pick).join('');
    if (/[a-z]/.test(raw) && /[A-Z]/.test(raw) && /\d/.test(raw)) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
    }
  }
};

/** 0 (empty) .. 4 (strong). Length matters most; variety adds a little. */
export const passwordStrength = (pw = '') => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  else if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += pw.length >= 10 ? 1 : 0;
  return Math.min(score, 4);
};

const LEVELS = [
  { label: '', bar: 'bg-gray-200' },
  { label: 'Weak', bar: 'bg-red-500' },
  { label: 'Fair', bar: 'bg-amber-500' },
  { label: 'Good', bar: 'bg-lime-500' },
  { label: 'Strong', bar: 'bg-green-600' },
];

export const StrengthMeter = ({ password, t = {} }) => {
  const s = passwordStrength(password);
  if (!password) return null;
  const names = [
    '',
    t.k7_pwWeak || 'Weak',
    t.k7_pwFair || 'Fair',
    t.k7_pwGood || 'Good',
    t.k7_pwStrong || 'Strong',
  ];
  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cx('h-1.5 flex-1 rounded-full', n <= s ? LEVELS[s].bar : 'bg-gray-200')} />
        ))}
      </div>
      <span className="w-12 text-right text-xs font-medium text-ink-soft">{names[s]}</span>
    </div>
  );
};

/**
 * Password input with show/hide, optional generator and strength meter.
 * `onChange` receives the new string.
 */
const PasswordField = ({
  id, value, onChange, placeholder, autoComplete = 'new-password', showMeter = false, generator = false, required, minLength, t = {}, ...rest
}) => {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable: the value is visible when generated */ }
  };

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className={cx(inputCls, generator ? 'pr-[5.5rem]' : 'pr-10')}
          {...rest}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
          {generator && (
            <button
              type="button"
              onClick={() => { onChange(generatePassword()); setShown(true); }}
              aria-label={t.k7_generatePassword || 'Generate a password'}
              title={t.k7_generatePassword || 'Generate a password'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-mute hover:bg-gray-100 hover:text-vermilion"
            >
              <Wand2 size={15} aria-hidden="true" />
            </button>
          )}
          {generator && value && shown && (
            <button
              type="button"
              onClick={copy}
              aria-label={t.k7_copy || 'Copy'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-mute hover:bg-gray-100 hover:text-vermilion"
            >
              {copied ? <Check size={15} className="text-green-600" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? (t.a1_settingsHidePassword || 'Hide password') : (t.a1_settingsShowPassword || 'Show password')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-mute hover:bg-gray-100 hover:text-ink"
          >
            {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {showMeter && <StrengthMeter password={value} t={t} />}
    </div>
  );
};

export default PasswordField;
