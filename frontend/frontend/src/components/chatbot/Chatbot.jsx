import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, CalendarDays, CalendarRange, Clock, Flower2, Heart, Image as ImageIcon, Landmark, Languages,
  MapPin, Newspaper, RotateCcw, Send, Users, X,
} from 'lucide-react';
import RealisticDiya from './RealisticDiya';
import { useChatbot } from '../../context/ChatbotContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useHeroInView from '../../hooks/useHeroInView';
import useFooterOverlap from '../../hooks/useFooterOverlap';
import { useLanguage } from '../../context/LanguageContext';
import useSiteSettings from '../../hooks/useSiteSettings';
import TempleIcon from '../common/TempleIcon';
import { ChatCardRow, ChatActions, Linkified } from './ChatCards';
import { ktmNow, nextAarti, formatWait } from './chatAware';

const sizedLogo = (url) => (url && url.includes('/upload/') ? url.replace('/upload/', '/upload/w_96,q_auto,f_auto/') : url);
const openLogin = () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));

// quick-question chips, by the name used in the chip strings (c1_chip<Name>)
const CHIP_ICONS = {
  Events: CalendarDays, Gallery: ImageIcon, Team: Users, Booking: Flower2, Donate: Heart, Timings: Clock,
  Contact: MapPin, Calendar: CalendarRange, History: Landmark, Aarti: Bell, Blogs: Newspaper, Converter: Languages,
};

/** The small round badge that marks the assistant's messages: a lamp on a light circle. */
const Avatar = ({ animated = false }) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D9D0CE] bg-white" aria-hidden="true">
    <RealisticDiya size={22} animated={animated} />
  </span>
);

/**
 * Temple assistant: a floating launcher and a chat panel.
 *
 * The look is deliberately quiet: white and warm-grey surfaces with the logo red
 * used only for the title, the send button, the first link button and small
 * icons. The one thing that moves is the lit diya (the launcher, the welcome
 * screen and the typing indicator).
 *
 * It is aware of the moment: the greeting follows the hour in Kathmandu and the
 * visitor's name, a strip under the header counts down to the next aarti, and the
 * first questions offered depend on the page being viewed. Answers carry cards
 * and link buttons (events, photos, people, news, directions, calls) that open
 * the page without a reload. The panel is a bottom sheet on phones and a 420px
 * card on larger screens; the launcher steps aside over the hero video and the
 * footer. It is shown to everyone; a visitor who is not signed in is asked to log in
 * when they tap it.
 */
const Chatbot = () => {
  const {
    isOpen, toggleChat, closeChat, messages, sendMessage, isTyping, inputValue, setInputValue,
    suggestions, startSuggestions, pageKey, handleSuggestionClick, messagesEndRef, getTranslation,
    c1, lang, clearAllMessages, navigateTo,
  } = useChatbot();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const settings = useSiteSettings();
  const heroInView = useHeroInView('any');
  // The launcher steps aside before the footer reaches it: 16 + 48 + 12 on phones, 24 + 56 + 12 above.
  const footerInView = useFooterOverlap(() => (window.innerWidth < 640 ? 76 : 92));
  const [clock, setClock] = useState(() => ktmNow());
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const launcherRef = useRef(null);
  const wasOpen = useRef(false);
  const atStart = messages.length <= 1;

  const tr = (key, fallback) => {
    const value = typeof getTranslation === 'function' ? getTranslation(key) : '';
    return value && value !== key ? value : fallback;
  };

  // Focus the input when the panel opens; Escape closes it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e) => { if (e.key === 'Escape') closeChat(); };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeChat]);

  // While the panel is open, keep the Kathmandu clock (and so the aarti countdown) current.
  useEffect(() => {
    if (!isOpen) return undefined;
    setClock(ktmNow());
    const id = setInterval(() => setClock(ktmNow()), 60000);
    return () => clearInterval(id);
  }, [isOpen]);

  // The first screen reads from the top (the provider scrolls new messages into view
  // from the bottom, which would hide the welcome); wait a beat so this runs last.
  useEffect(() => {
    if (!isOpen || !atStart) return undefined;
    const id = setTimeout(() => { if (logRef.current) logRef.current.scrollTop = 0; }, 60);
    return () => clearTimeout(id);
  }, [isOpen, atStart, messages]);

  // Closing the panel hands focus back to the launcher.
  useEffect(() => {
    if (wasOpen.current && !isOpen) launcherRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  const requireLogin = () => {
    if (isAuthenticated()) return false;
    showToast(tr('loginRequired', 'Please log in to use the assistant'), 'warning');
    closeChat();
    openLogin();
    return true;
  };

  const handleSend = () => {
    if (requireLogin()) return;
    if (inputValue.trim()) sendMessage(inputValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    const date = timestamp ? new Date(timestamp) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  };

  // Shown to everyone: a logged-out visitor who taps it is asked to log in (see requireLogin).
  // It only steps aside over a hero banner and just before the footer.
  if ((footerInView || heroInView) && !isOpen) return null;

  const logoPhoto = settings?.logo?.photo || null;
  const assistantName = tr('templeAssistant', 'Temple Assistant');
  const templeName = settings?.logo?.text?.[lang] || '';
  const aarti = nextAarti(settings, lang, clock);
  const iconFor = (label) => {
    const name = Object.keys(CHIP_ICONS).find((n) => c1(`c1_chip${n}`, '') === label);
    return name ? CHIP_ICONS[name] : null;
  };
  const ask = (text) => { if (!requireLogin()) handleSuggestionClick(text); };
  const contextLine = pageKey ? c1(`c2_ctx_${pageKey}`, '') : '';
  const followUps = suggestions.slice(0, 4);

  return (
    <>
      {/* Launcher: a lit diya on a white disc */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => { if (!requireLogin()) toggleChat(); }}
        aria-label={assistantName}
        aria-expanded={isOpen}
        tabIndex={isOpen ? -1 : 0}
        className={`group fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#D9D0CE] bg-white shadow-md transition-all duration-300 hover:scale-105 hover:border-vermilion hover:shadow-lg sm:bottom-6 sm:right-6 ${
          isOpen ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <RealisticDiya size={30} />
        <span className="pointer-events-none absolute right-full mr-3 hidden translate-x-2 whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink opacity-0 shadow-lg border border-[#D9D0CE] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
          {assistantName}
        </span>
      </button>

      {/* Phones: a light dim behind the bottom sheet */}
      <div
        aria-hidden="true"
        onClick={closeChat}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 sm:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Panel */}
      <section
        key={lang}
        role="dialog"
        aria-modal="false"
        aria-label={assistantName}
        aria-hidden={!isOpen}
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[min(78dvh,640px)] origin-bottom-right flex-col overflow-hidden rounded-t-2xl border border-[#D9D0CE] bg-white shadow-2xl shadow-black/20 transition-all duration-300 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[400px] sm:rounded-2xl ${
          isOpen ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible pointer-events-none translate-y-6 scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <header className="shrink-0 border-b border-[#E3DCDA] bg-white">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="relative shrink-0">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#D9D0CE] bg-white">
                {logoPhoto ? (
                  <img src={sizedLogo(logoPhoto)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <TempleIcon size={20} className="text-vermilion" />
                )}
              </span>
              {/* the assistant is always on */}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-semibold leading-tight text-ink">{assistantName}</p>
              {templeName ? <p className="truncate text-xs text-mute">{templeName}</p> : null}
            </div>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={clearAllMessages}
                aria-label={c1('c2_newChat', 'New chat')}
                title={c1('c2_newChat', 'New chat')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-ink-soft transition-colors hover:border-[#D9D0CE] hover:bg-panel hover:text-ink"
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={closeChat}
              aria-label={tr('close', 'Close')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-ink-soft transition-colors hover:border-[#D9D0CE] hover:bg-panel hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {aarti && (
            <button
              type="button"
              onClick={() => ask(c1('c1_chipAarti', 'Aarti schedule'))}
              title={c1('c2_ktm', 'Kathmandu time')}
              className="mx-4 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-[#E3DCDA] bg-panel px-3 py-2 text-left text-sm transition-colors hover:border-[#D9D0CE] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-vermilion"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E3DCDA] bg-white text-vermilion">
                <Bell size={15} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-xs text-mute">{c1('c2_nextAarti', 'Next aarti')}</span>
                <span className="block truncate font-semibold text-ink">{aarti.name}</span>
              </span>
              <span className="shrink-0 text-right leading-tight">
                <span className="block font-semibold text-ink">{aarti.label}</span>
                <span className="block text-xs text-mute">
                  {aarti.tomorrow ? `${c1('c2_tomorrow', 'tomorrow')} · ` : ''}
                  {c1('c2_inTime', 'in {t}').replace('{t}', formatWait(aarti.inMinutes, c1))}
                </span>
              </span>
            </button>
          )}
        </header>

        {/* Messages */}
        <div
          ref={logRef}
          className="scroll-hidden relative flex-1 space-y-4 overflow-y-auto overscroll-contain bg-panel px-4 py-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t.c1_conversation || 'Conversation'}
        >
          {/* Welcome: the lit diya, then the greeting below */}
          {atStart && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#D9D0CE] bg-white p-3.5">
              <RealisticDiya size={56} className="shrink-0" />
              <div className="min-w-0">
                <p className="font-serif text-xl font-semibold leading-tight text-ink">{c1('c2_welcomeTitle', 'How can I help?')}</p>
                <p className="mt-1 text-sm leading-snug text-ink-soft">
                  {c1('c2_welcomeSub', 'Ask about darshan, events, bookings or directions. I use the temple’s live information.')}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const mine = message.sender === 'user';
            return (
              <div key={message.id} className={`flex min-w-0 animate-chat-bubble flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className={`flex max-w-full items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && <Avatar />}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? 'rounded-br-md border border-[#DDD3D0] bg-[#EFE9E7] text-ink'
                        : 'rounded-bl-md border border-[#D9D0CE] bg-white text-ink shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                      <Linkified text={message.text} onNavigate={navigateTo} />
                    </p>
                    <span className="mt-1 block text-xs text-mute">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
                {!mine && (message.cards?.length || message.actions?.length) ? (
                  <div className="w-full min-w-0">
                    <ChatCardRow
                      cards={message.cards}
                      openLabel={t.c1_open || 'Open'}
                      label={t.c1_relatedLinks || 'Related links'}
                      onNavigate={navigateTo}
                    />
                    <div className="pl-10">
                      <ChatActions actions={message.actions} onNavigate={navigateTo} newTabLabel={c1('c2_opensNew', 'Opens in a new tab')} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-end gap-2" role="status" aria-label={tr('typing', 'Typing…')}>
              <Avatar animated />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#D9D0CE] bg-white px-4 py-3 shadow-sm">
                <span className="chatbot-typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="chatbot-typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="chatbot-typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* First screen: where the visitor is, then quick questions as tiles */}
          {atStart && !isTyping && (
            <div className="space-y-3 pt-1">
              {contextLine && (
                <p className="flex items-start gap-2 rounded-xl border border-[#D9D0CE] bg-white px-3 py-2 text-sm text-ink-soft">
                  <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-vermilion" />
                  <span>{contextLine}</span>
                </p>
              )}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-mute">
                  {pageKey ? c1('c2_forThisPage', 'Suggested for this page') : c1('c2_quick', 'Quick help')}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {startSuggestions.slice(0, 6).map((label) => {
                    const Icon = iconFor(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => ask(label)}
                        className="flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border border-[#D9D0CE] bg-white px-3 py-2.5 text-left text-sm font-semibold text-ink transition duration-200 hover:border-vermilion hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
                      >
                        {Icon ? <Icon size={18} aria-hidden="true" className="shrink-0 text-vermilion" /> : null}
                        <span className="min-w-0 leading-snug">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* After the first answer: follow-up chips */}
          {!atStart && followUps.length > 0 && !isTyping && (
            <div className="pt-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-mute">{t.c1_tryAsking || 'Try asking'}</p>
              <div className="flex flex-wrap gap-2">
                {followUps.map((label) => {
                  const Icon = iconFor(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => ask(label)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#D9D0CE] bg-white px-4 text-sm font-medium text-ink transition duration-200 hover:border-vermilion hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
                    >
                      {Icon ? <Icon size={14} aria-hidden="true" className="text-vermilion" /> : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <form
          className="shrink-0 border-t border-[#E3DCDA] bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={c1('c2_placeholder', 'Ask in English, नेपाली or हिन्दी…')}
              aria-label={tr('typeMessage', 'Type your message')}
              enterKeyHint="send"
              autoComplete="off"
              dir="auto"
              className="h-11 min-w-0 flex-1 rounded-full border border-[#D6CDCB] bg-panel px-5 text-base text-ink outline-none transition placeholder:text-mute focus:border-vermilion focus:bg-white focus:ring-2 focus:ring-vermilion/15"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              aria-label={tr('send', 'Send')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vermilion text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-mute">{c1('c2_live', 'Live temple information')}</p>
        </form>
      </section>
    </>
  );
};

export default Chatbot;
