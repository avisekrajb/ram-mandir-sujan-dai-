import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

/**
 * Sign in with a code emailed to the person: the way in when Google does not work
 * (blocked script, closed pop-up, no Google account), and the only one for a Google
 * account that never had a password. Step 1 asks for the email, step 2 for the
 * 6-digit code. A visitor with no account gets one on the first successful code.
 *
 * Rendered inside the login modal in place of its forms. `onDone()` is called after
 * the session has started; `onBack()` returns to the password form.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? `{${k}}` : vars[k]));

const EmailCodeSignIn = ({ initialEmail = '', onBack, onDone }) => {
  const { t, lang } = useLanguage();
  const { loginWithCode } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0); // seconds until another code may be asked for
  const codeRef = useRef(null);

  // Count the resend wait down.
  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  useEffect(() => {
    if (step === 'code' && codeRef.current) codeRef.current.focus();
  }, [step]);

  const askForCode = async () => {
    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      setError(t.lc_badEmail || 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/auth/login-code/request', { email: address, lang });
      setEmail(address);
      setCode('');
      setWait(Number(response.data?.retryAfter) || 60);
      setStep('code');
      showToast(t.lc_sentToast || 'Code sent. Check your email.', 'success');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429 && data?.code === 'cooldown') {
        // A code went out a moment ago: it is still good, so go and type it.
        setEmail(address);
        setWait(Number(data.retryAfter) || 60);
        setStep('code');
      } else if (err.response?.status === 400) {
        setError(t.lc_badEmail || 'Enter a valid email address.');
      } else if (err.response?.status === 429) {
        setError(t.lc_tooMany || 'Too many attempts. Please wait a while and try again.');
      } else {
        setError(t.lc_sendFailed || 'We could not send the email just now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError(t.lc_enter6 || 'Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await loginWithCode(email, code);
    setBusy(false);
    if (result.success) {
      const text = result.isNewAccount ? (t.lc_welcome || 'Welcome, {name}!') : (t.lc_welcomeBack || 'Welcome back, {name}!');
      showToast(fill(text, { name: result.user?.name || '' }), 'success');
      onDone(result);
      return;
    }
    setCode('');
    // A wrong or expired code is a 400; no answer at all or a 5xx is our side (or the network),
    // and must not be reported as the person's mistake.
    if (result.status === 429) setError(t.lc_tooMany || 'Too many attempts. Please wait a while and try again.');
    else if (!result.status || result.status >= 500) setError(t.lc_serverError || 'Something went wrong on our side. Please try again.');
    else setError(t.lc_badCode || 'That code is wrong or has expired.');
    if (codeRef.current) codeRef.current.focus();
  };

  const field = 'flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors';
  const primary = 'w-full py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50';
  const link = 'text-xs font-bold text-vermilion hover:underline bg-transparent border-0 disabled:opacity-50 disabled:no-underline';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={step === 'code' ? () => { setStep('email'); setError(''); setCode(''); } : onBack}
          aria-label={t.lc_back || 'Back to sign in'}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h4 className="text-lg font-serif font-semibold text-ink">{t.lc_title || 'Sign in with an email code'}</h4>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
          {error}
        </div>
      )}

      {step === 'email' ? (
        <form
          onSubmit={(e) => { e.preventDefault(); askForCode(); }}
          className="flex flex-col gap-4"
          noValidate
        >
          <p className="text-sm text-ink-soft m-0">{t.lc_intro || 'We’ll email you a 6-digit code. No password needed, and if you’re new this creates your account.'}</p>

          <div>
            <label htmlFor="lc-email" className="text-xs font-bold text-ink block mb-1.5">{t.email || 'Email'}</label>
            <div className={field}>
              <Mail size={16} className="text-ink-soft flex-shrink-0" aria-hidden="true" />
              <input
                id="lc-email"
                type="email"
                value={email}
                autoComplete="email"
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className={primary}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.lc_sending || 'Sending…'}
              </span>
            ) : (
              t.lc_send || 'Send code'
            )}
          </button>

          <p className="text-xs text-ink-soft text-center m-0">{t.lc_staffNote || 'Temple staff accounts sign in with a password.'}</p>
        </form>
      ) : (
        <form onSubmit={checkCode} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-ink-soft m-0">
            {/* the address goes where the sentence puts it, which differs by language */}
            {(t.lc_sentTo || 'Enter the 6-digit code we sent to {email}.').split('{email}').flatMap((part, i, parts) =>
              i < parts.length - 1
                ? [part, <strong key={`e${i}`} className="text-ink [overflow-wrap:anywhere]">{email}</strong>]
                : [part]
            )}
          </p>

          <div>
            <label htmlFor="lc-code" className="text-xs font-bold text-ink block mb-1.5">{t.lc_codeLabel || 'Sign-in code'}</label>
            <div className={field}>
              <KeyRound size={16} className="text-ink-soft flex-shrink-0" aria-hidden="true" />
              <input
                id="lc-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                aria-label={t.lc_codeLabel || 'Sign-in code'}
                className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-center text-2xl font-bold tracking-[0.5em]"
              />
            </div>
          </div>

          <button type="submit" disabled={busy || code.length !== 6} className={primary}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.lc_verifying || 'Checking…'}
              </span>
            ) : (
              t.lc_verify || 'Verify and sign in'
            )}
          </button>

          <p className="text-xs text-ink-soft text-center m-0">{t.lc_spam || 'Not there? Check your spam folder. The code works for 10 minutes.'}</p>

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={askForCode} disabled={busy || wait > 0} className={link}>
              {wait > 0 ? fill(t.lc_resendIn || 'Send a new code in {n}s', { n: wait }) : (t.lc_resend || 'Send a new code')}
            </button>
            <button type="button" onClick={() => { setStep('email'); setError(''); setCode(''); }} className={link}>
              {t.lc_otherEmail || 'Use a different email'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmailCodeSignIn;
