import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, Mail, MailCheck, Newspaper, PartyPopper } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import useSiteSettings from '../../hooks/useSiteSettings';
import SubTitle from './SubTitle';

const TOPICS = [
  { id: 'events', icon: CalendarDays, key: 'nl_events', fallback: 'Events' },
  { id: 'festivals', icon: PartyPopper, key: 'nl_festivals', fallback: 'Festival wishes' },
  { id: 'news', icon: Newspaper, key: 'nl_news', fallback: 'News' },
];

/**
 * "Stay updated": the subscribe band above the footer on every public page. Flat, one e-mail field and three
 * topic choices. Nobody needs an account: the form only asks the server to send a confirmation e-mail, and the
 * answer is always the same, so it never shows whether an address was already subscribed. The hidden
 * `hp_field` is for bots (a person never sees or fills it). Can be switched off in Admin → Footer.
 */
const StayUpdated = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const settings = useSiteSettings();
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState(() => TOPICS.map((topic) => topic.id));
  const [honey, setHoney] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // 'check_inbox' | 'subscribed'
  const text = (key, fallback) => t[key] || fallback;
  const emailRef = useRef(null);
  const doneRef = useRef(null);
  const focusEmailNext = useRef(false);
  const shownFor = useRef(''); // the signed-in address the field was filled from

  // A signed-in visitor's own address is filled in (unless they typed another one) and removed again at sign-out, so the
  // next person on a shared computer does not see it.
  useEffect(() => {
    const before = shownFor.current;
    shownFor.current = user?.email || '';
    setEmail((current) => {
      if (user?.email) return !current || current === before ? user.email : current;
      return before && current === before ? '' : current;
    });
  }, [user]);

  // Keyboard and screen-reader users: move focus to the result after sending, and back to the field after "use another".
  useEffect(() => {
    if (done && doneRef.current) doneRef.current.focus();
    if (!done && focusEmailNext.current) {
      focusEmailNext.current = false;
      if (emailRef.current) emailRef.current.focus();
    }
  }, [done]);

  if (!settings || settings.footer?.showSubscribe === false) return null;

  const toggle = (id) => {
    setError('');
    setTopics((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value) || value.length > 254) {
      setError(text('nl_invalid', 'Please enter a valid e-mail address.'));
      return;
    }
    if (!topics.length) {
      setError(text('nl_pickTopic', 'Please choose at least one topic.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/subscribe', { email: value, lang, topics, hp_field: honey });
      setDone(data?.state === 'subscribed' ? 'subscribed' : 'check_inbox');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) setError(text('nl_tooMany', 'Too many tries. Please try again a little later.'));
      else if (status === 400) setError(text('nl_invalid', 'Please enter a valid e-mail address.'));
      else setError(text('nl_failed', 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-stay-updated aria-labelledby="stay-updated-title" className="mt-12 border-t border-line bg-panel">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-7 text-center sm:px-6">
        {/* the icon and the title share a line and wrap together on a narrow screen */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-vermilion shadow-sm ring-1 ring-line" aria-hidden="true">
            <Mail size={16} />
          </span>
          <SubTitle size="md" align="center"><span id="stay-updated-title">{text('nl_title', 'Stay updated')}</span></SubTitle>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          {text('nl_sub', 'Temple events, festival wishes and news by e-mail. No spam, and you can unsubscribe at any time.')}
        </p>

        {done ? (
          <div ref={doneRef} tabIndex={-1} className="flex w-full max-w-md flex-col items-center gap-2 rounded-xl bg-white p-4 ring-1 ring-line focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true">
              <MailCheck size={18} />
            </span>
            <div className="min-w-0 text-base">
              <p className="font-medium text-ink">
                {done === 'subscribed'
                  ? text('nl_subscribed', 'You are subscribed. Thank you!')
                  : text('nl_checkInbox', 'Almost done: we sent a message to your inbox. Open it and press “Confirm”.')}
              </p>
              {done === 'check_inbox' && (
                <p className="mt-1 text-sm text-ink-soft">{text('nl_checkInboxSub', 'Nothing arrives until you confirm. Please also look in the spam folder.')}</p>
              )}
              <button
                type="button"
                onClick={() => { focusEmailNext.current = true; setDone(null); setEmail(''); }}
                className="mt-2 text-sm font-medium text-vermilion underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40"
              >
                {text('nl_another', 'Use a different address')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="w-full">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                value={email}
                onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }}
                placeholder={text('nl_placeholder', 'Your e-mail address')}
                aria-label={text('nl_email', 'E-mail address')}
                aria-invalid={error ? 'true' : undefined}
                className="h-10 w-full min-w-0 max-w-sm flex-1 basis-56 rounded-lg border border-[#8F8685] bg-white px-3.5 text-sm text-ink placeholder:text-mute focus:border-vermilion focus:outline-none focus:ring-2 focus:ring-vermilion/15"
              />
              {/* bots fill every field they find; people never see this one */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <input type="text" name="hp_field" tabIndex={-1} autoComplete="off" value={honey} onChange={(event) => setHoney(event.target.value)} />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-10 shrink-0 rounded-lg bg-vermilion px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? text('nl_sending', 'Subscribing…') : text('nl_button', 'Subscribe')}
              </button>
            </div>

            <fieldset className="mt-3 min-w-0">
              <legend className="sr-only">{text('nl_topics', 'What would you like to receive?')}</legend>
              <div className="flex flex-wrap justify-center gap-1.5">
                {TOPICS.map(({ id, icon: Icon, key, fallback }) => {
                  const on = topics.includes(id);
                  return (
                    <label key={id} className="cursor-pointer">
                      <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(id)} />
                      <span
                        className={`inline-flex min-h-[2rem] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-vermilion ${
                          on ? 'border-vermilion bg-white text-vermilion' : 'border-[#8F8685] bg-white text-ink-soft hover:border-vermilion'
                        }`}
                      >
                        {on ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
                        {text(key, fallback)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <p role="alert" aria-live="polite" className={`mt-2 text-sm text-vermilion ${error ? '' : 'sr-only'}`}>{error}</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-mute">
              {text('nl_privacy', 'Your address is only used for the temple’s updates. Every message has an unsubscribe link.')}
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

export default StayUpdated;
