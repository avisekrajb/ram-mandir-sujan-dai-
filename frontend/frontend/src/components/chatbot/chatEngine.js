import chatbotData from '../../data/chatbotData.json';
import { detectIntent, asksForVideos } from './intents';
import { nextAarti, formatWait, pageContext } from './chatAware';
import {
  getSettings, getUpcomingEvents, getGalleryItems, getTeamMembers, getBlogs,
  localized, shorten, realPhone, cardImage, sortedTeam,
  eventCard, photoCard, teamCard, blogCard,
} from './chatData';

/**
 * Turns a visitor's question into a reply: { text, cards?, actions?, suggestions? }.
 *
 * Cards are {image, title, subtitle, to}; actions are {label, to, auth?}.
 * Everything shown comes from the live API (or the static knowledge file for
 * general text); nothing is made up, and missing fields are left out.
 */

const MAX_CARDS = 4;

const CHIP_FALLBACK = {
  Events: 'Upcoming events',
  Gallery: 'Photos & videos',
  Team: 'Temple team',
  Booking: 'Book a puja',
  Donate: 'Donate',
  Timings: 'Darshan timings',
  Contact: 'Contact & location',
  Calendar: 'Nepali calendar',
  History: 'Temple history',
  Aarti: 'Aarti schedule',
  Blogs: 'News & blogs',
  Converter: 'Unicode converter',
};

// Which follow-up chips to offer after each kind of answer.
const FOLLOW_UPS = {
  events: ['Gallery', 'Calendar', 'Booking'],
  gallery: ['Events', 'Team', 'History'],
  team: ['History', 'Contact', 'Events'],
  hours: ['Aarti', 'Contact', 'Booking'],
  aarti: ['Timings', 'Booking', 'Events'],
  booking: ['Timings', 'Donate', 'Contact'],
  donation: ['Booking', 'Events', 'Contact'],
  contact: ['Timings', 'Booking', 'Events'],
  visiting: ['Timings', 'Contact', 'Events'],
  calendar: ['Events', 'Converter', 'Booking'],
  converter: ['Calendar', 'Events', 'Contact'],
  history: ['Team', 'Gallery', 'Events'],
  founder: ['Team', 'History', 'Events'],
  blogs: ['Events', 'Gallery', 'History'],
  legal: ['Contact', 'History', 'Events'],
  start: ['Events', 'Timings', 'Booking', 'Contact'],
  fallback: ['Events', 'Timings', 'Booking', 'Contact'],
};

// ---------------------------------------------------------------------------
// search over the static knowledge file (used when no intent matches)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set(['what', 'which', 'when', 'where', 'who', 'how', 'the', 'and', 'are', 'for', 'our', 'any', 'about', 'can', 'you', 'tell', 'me', 'like', 'is', 'of', 'in', 'on', 'to', 'a', 'an', 'do', 'does', 'did', 'at', 'from', 'नि', 'को', 'का', 'मा', 'हो']);

const wordScore = (query, text) => {
  if (!text) return 0;
  const q = String(query).toLowerCase().trim();
  const t = String(text).toLowerCase();
  if (!q) return 0;
  if (t.includes(q)) return 12;
  const words = q
    .split(/[\s?.,!]+/)
    .filter((w) => w.replace(/[^A-Za-z0-9ऀ-ॿ぀-ヿ஀-௿一-鿿]/gi, '').length > 1 && !STOP_WORDS.has(w));
  return words.reduce((sum, w) => (t.includes(w) ? sum + 3 : sum), 0);
};

const searchKnowledge = (query, knowledge) => {
  const results = [];
  const push = (type, data, text) => {
    const relevance = wordScore(query, text);
    if (relevance >= 4) results.push({ type, data, relevance });
  };

  const { temple, about, history, team, events, faqs, visiting } = knowledge;
  if (temple) push('temple', temple, `${temple.name} ${temple.description} ${temple.address}`);
  if (about) push('about', about, `${about.deities} ${about.significance} ${about.established}`);
  if (history) push('history', history, `${history.title} ${history.summary} ${(history.timeline || []).map((x) => `${x.year} ${x.event}`).join(' ')}`);
  if (visiting) push('visiting', visiting, `${visiting.info} ${visiting.howToReach} ${visiting.guidelines} ${visiting.bestTime}`);
  (team || []).forEach((m) => push('team', m, `${m.name} ${m.role} ${m.bio}`));
  (events || []).forEach((e) => push('event', e, `${e.title} ${e.description} ${e.date}`));
  (faqs || []).forEach((f) => push('faq', f, `${f.question} ${f.answer}`));

  return results.sort((a, b) => b.relevance - a.relevance);
};

// ---------------------------------------------------------------------------
// the reply builder
// ---------------------------------------------------------------------------

export const buildReply = async ({ query, lang, c1, trans }) => {
  const chip = (name) => c1(`c1_chip${name}`, CHIP_FALLBACK[name]);
  const chips = (key) => FOLLOW_UPS[key].map(chip);
  const reply = (text, extra = {}, followUp = 'fallback') => ({ text, suggestions: chips(followUp), ...extra });

  const openContact = { label: c1('c1_openContact', 'Contact page'), to: '/contact' };
  const bookAction = { label: c1('c1_bookPuja', 'Book a puja'), to: '/booking', auth: true };

  // A failed request still gets a useful answer: a direct link to the page.
  const loadFailed = (action, followUp) => reply(
    c1('c1_loadError', 'I could not load that just now. Please try again, or open the page directly:'),
    { actions: [action] },
    followUp,
  );

  const hit = detectIntent(query);
  const intent = hit?.id;

  switch (intent) {
    case 'greeting':
      return reply(trans('greeting'), {}, 'start');

    case 'thanks':
      return reply(c1('c1_thanks', 'You are welcome! Is there anything else I can help with?'), {}, 'start');

    case 'developer':
      return reply(`👨‍💻 ${trans('developer')}`, { actions: [{ label: c1('c1_meetTeam', 'Meet the team'), to: '/templeteams' }] }, 'history');

    case 'privacy':
      return reply(c1('c1_privacyInfo', 'You can read how we handle your information on the privacy policy page.'),
        { actions: [{ label: c1('c1_openPrivacy', 'Privacy policy'), to: '/privacy' }] }, 'legal');

    case 'terms':
      return reply(c1('c1_termsInfo', 'You can read the rules for using the site and its services on the terms page.'),
        { actions: [{ label: c1('c1_openTerms', 'Terms & conditions'), to: '/terms' }] }, 'legal');

    case 'calendar':
      return reply(c1('c1_calendarInfo', 'The Nepali calendar shows tithi, panchang and festival dates, and converts between BS and AD dates.'),
        { actions: [{ label: c1('c1_openCalendar', 'Open calendar'), to: '/calendar' }] }, 'calendar');

    case 'converter':
      return reply(c1('c1_converterInfo', 'The converter changes Preeti and other legacy Nepali fonts into Unicode text.'),
        { actions: [{ label: c1('c1_openConverter', 'Open converter'), to: '/tools' }] }, 'converter');

    case 'hours':
    case 'aarti': {
      let settings;
      try { settings = await getSettings(); } catch { return loadFailed(openContact, intent); }
      const info = settings.dailyAarti?.templeInfo;
      const hours = localized(info?.openingHours, lang)
        || (settings.timings?.open && settings.timings?.close ? `${settings.timings.open} – ${settings.timings.close}` : '');
      const aartis = settings.dailyAarti?.enabled === false ? [] : (settings.dailyAarti?.aartis || [])
        .map((a) => ({ name: localized(a.name, lang), time: String(a.time || '').trim() }))
        .filter((a) => a.name && a.time);
      const special = localized(info?.specialAartis, lang);

      const blocks = [];
      const upcoming = nextAarti(settings, lang);
      if (upcoming) {
        const when = c1('c2_inTime', 'in {t}').replace('{t}', formatWait(upcoming.inMinutes, c1));
        const day = upcoming.tomorrow ? `${c1('c2_tomorrow', 'tomorrow')}, ` : '';
        blocks.push(`🔔 ${c1('c2_nextAarti', 'Next aarti')}: ${upcoming.name} · ${upcoming.label} (${day}${when})`);
      }
      if (hours) blocks.push(`🕐 ${trans('templeHours')}:\n${hours}`);
      if (aartis.length) blocks.push(`🕉️ ${trans('aartiInfo')}:\n${aartis.map((a) => `• ${a.name}: ${a.time}`).join('\n')}${special ? `\n${special}` : ''}`);
      return reply(
        blocks.length ? blocks.join('\n\n') : c1('c1_timingsNone', 'Timings are not listed yet. Please check the contact page.'),
        { actions: [openContact, bookAction] },
        intent,
      );
    }

    case 'booking': {
      let settings = null;
      try { settings = await getSettings(); } catch { /* the booking page itself still works */ }
      const closed = settings && settings.bookingAvailable === false;
      const closedNote = closed ? localized(settings.availabilityMessage, lang) : '';
      const text = closed
        ? [c1('c1_bookingClosed', 'Online booking is not available at the moment.'), closedNote].filter(Boolean).join('\n')
        : c1('c1_bookingInfo', 'You can book a puja or a service online. Sign in, choose a puja and a date, and send your request.');
      const actions = closed ? [] : [bookAction];
      actions.push({ label: c1('c1_myBookings', 'My bookings'), to: '/mybookings', auth: true });
      return reply(text, { actions }, 'booking');
    }

    case 'donation': {
      let settings = null;
      try { settings = await getSettings(); } catch { /* QR is optional */ }
      const donate = settings?.donate;
      const cards = donate?.qrEnabled && donate?.qrPhoto
        ? [{
          image: cardImage(donate.qrPhoto, 500),
          title: c1('c1_donateQr', 'Donation QR'),
          subtitle: c1('c1_scanToDonate', 'Scan to donate'),
          to: '/donate',
        }]
        : [];
      return reply(
        c1('c1_donationInfo', 'Donations help care for and conserve the temple. You can donate from the donation page.'),
        { cards, actions: [{ label: c1('c1_donate', 'Donate'), to: '/donate' }] },
        'donation',
      );
    }

    case 'events': {
      const viewAll = { label: c1('c1_viewAllEvents', 'View all events'), to: '/events' };
      let events;
      try { events = await getUpcomingEvents(); } catch { return loadFailed(viewAll, 'events'); }
      const cards = events.map((e) => eventCard(e, lang)).filter((c) => c.title).slice(0, MAX_CARDS);
      if (!cards.length) return reply(c1('c1_eventsNone', 'There are no upcoming events listed right now. You can see everything on the events page.'), { actions: [viewAll] }, 'events');
      return reply(c1('c1_eventsIntro', 'Here are the upcoming events at the temple:'), { cards, actions: [viewAll] }, 'events');
    }

    case 'gallery': {
      const openGallery = { label: c1('c1_openGallery', 'Open gallery'), to: '/gallery' };
      let items;
      try { items = await getGalleryItems(); } catch { return loadFailed(openGallery, 'gallery'); }
      const newest = (list) => list.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const photos = newest(items.filter((i) => i && i.photo && (i.type === 'photo' || !i.type)));
      const videos = newest(items.filter((i) => i && i.photo && i.type === 'video'));
      const wantVideos = asksForVideos(query) && videos.length > 0;
      const pool = wantVideos ? videos : photos;
      const label = wantVideos ? c1('c1_video', 'Video') : c1('c1_photo', 'Photo');
      const cards = pool.slice(0, MAX_CARDS).map((i) => photoCard(i, lang, label));
      const actions = [openGallery];
      if (videos.length && !wantVideos) actions.push({ label: c1('c1_watchVideos', 'Watch videos'), to: '/gallery?tab=videos' });
      if (!cards.length) return reply(c1('c1_galleryNone', 'There is nothing in the gallery yet. You can still open the gallery page.'), { actions }, 'gallery');
      return reply(
        wantVideos ? c1('c1_videosIntro', 'Here are videos from the temple gallery:') : c1('c1_galleryIntro', 'Here are some photos from the temple gallery:'),
        { cards, actions },
        'gallery',
      );
    }

    case 'team': {
      const viewTeam = { label: c1('c1_viewTeam', 'View full team'), to: '/templeteams' };
      let members;
      try { members = sortedTeam(await getTeamMembers()); } catch { return loadFailed(viewTeam, 'team'); }
      const cards = members.map((m) => teamCard(m, lang)).filter((c) => c.title).slice(0, MAX_CARDS);
      if (!cards.length) return reply(c1('c1_teamNone', 'The team list is not available right now. You can open the team page.'), { actions: [viewTeam] }, 'team');
      return reply(c1('c1_teamIntro', 'These are the people who serve the temple ({n} members):').replace('{n}', String(members.length)), { cards, actions: [viewTeam] }, 'team');
    }

    case 'founder': {
      let members = [];
      try { members = sortedTeam(await getTeamMembers()); } catch { /* fall back to the static answer */ }
      const founder = members.find((m) => m.roleType === 'founder');
      const actions = [
        { label: c1('c1_meetTeam', 'Meet the team'), to: '/templeteams' },
        { label: c1('c1_aboutTemple', 'About the temple'), to: '/about' },
      ];
      if (founder) {
        const card = teamCard(founder, lang);
        const bio = localized(founder.bio, lang);
        return reply(`🙏 ${c1('c1_founderIntro', 'The founder of the temple:')}\n${card.title}${bio ? `\n\n${shorten(bio, 240)}` : ''}`, { cards: [card], actions }, 'founder');
      }
      const f = chatbotData.founder || {};
      return reply(`🙏 ${c1('c1_founderIntro', 'The founder of the temple:')}\n${f.name || ''}\n\n${f.bio || ''}`, { actions }, 'founder');
    }

    case 'history': {
      let settings = null;
      try { settings = await getSettings(); } catch { /* use the static summary */ }
      const name = localized(settings?.logo?.text, lang) || chatbotData.temple?.name || '';
      const about = (settings?.aboutPreview?.enabled !== false && localized(settings?.aboutPreview?.text, lang))
        || localized(settings?.about?.text, lang)
        || [chatbotData.temple?.description, chatbotData.history?.summary].filter(Boolean).join(' ');
      return reply(
        `🏛️ ${name}\n\n${shorten(about, 360)}`,
        {
          actions: [
            { label: c1('c1_templeHistory', 'Temple history'), to: '/history' },
            { label: c1('c1_aboutTemple', 'About the temple'), to: '/about' },
          ],
        },
        'history',
      );
    }

    case 'blogs': {
      const allBlogs = { label: c1('c1_allBlogs', 'All articles'), to: '/blogs' };
      let blogs;
      try { blogs = await getBlogs(); } catch { return loadFailed(allBlogs, 'blogs'); }
      const cards = blogs
        .filter((b) => b && b.published !== false)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((b) => blogCard(b, lang))
        .filter((c) => c.title)
        .slice(0, 3);
      if (!cards.length) return reply(c1('c1_blogsNone', 'There are no articles yet. You can open the blogs page.'), { actions: [allBlogs] }, 'blogs');
      return reply(c1('c1_blogsIntro', 'Here are the latest news and articles:'), { cards, actions: [allBlogs] }, 'blogs');
    }

    case 'visiting':
    case 'contact': {
      let settings;
      try { settings = await getSettings(); } catch { return loadFailed(openContact, intent); }
      const contact = settings.footer?.contactInfo || {};
      const address = localized(contact.address, lang) || localized(settings.dailyAarti?.templeInfo?.location, lang);
      const phone = realPhone(contact.phone);
      const email = String(contact.email || '').trim();
      const lines = [];
      if (address) lines.push(`📍 ${trans('address')}: ${address}`);
      if (phone) lines.push(`📞 ${trans('phone')}: ${phone}`);
      if (email) lines.push(`📧 ${trans('email')}: ${email}`);
      const intro = intent === 'visiting'
        ? c1('c1_visitingInfo', 'To plan your visit, see the address, map and contact details on the contact page.')
        : c1('c1_contactIntro', 'You can find and reach the temple here:');
      // Tappable shortcuts: a phone call, directions in Maps, an email, and the contact page.
      const english = localized(contact.address, 'en') || address;
      const actions = [];
      if (phone) actions.push({ label: c1('c2_call', 'Call'), to: `tel:${phone.replace(/[^\d+]/g, '')}` });
      if (english) actions.push({ label: c1('c2_directions', 'Directions'), to: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(english)}` });
      if (email) actions.push({ label: c1('c2_email', 'Email'), to: `mailto:${email}` });
      actions.push(openContact);
      return reply([intro, lines.join('\n')].filter(Boolean).join('\n\n'), { actions }, intent);
    }

    default:
      break;
  }

  // No intent: look through the static knowledge (FAQs, history...) plus live team and events.
  let team = [];
  let events = [];
  try { team = sortedTeam(await getTeamMembers()); } catch { /* optional */ }
  try { events = await getUpcomingEvents(); } catch { /* optional */ }
  const knowledge = {
    ...chatbotData,
    team: team.map((m) => ({ name: localized(m.name, lang), role: localized(m.role, lang), bio: localized(m.bio, lang), raw: m })),
    events: events.map((e) => ({ title: localized(e.title, lang), description: shorten(localized(e.desc, lang), 200), date: localized(e.dateNepali, lang), raw: e })),
  };
  const top = searchKnowledge(query, knowledge)[0];
  if (top) {
    const d = top.data;
    if (top.type === 'team') {
      return reply(`${d.name}\n${d.role}`, { cards: [teamCard(d.raw, lang)], actions: [{ label: c1('c1_viewTeam', 'View full team'), to: '/templeteams' }] }, 'team');
    }
    if (top.type === 'event') {
      return reply(`${d.title}${d.date ? `\n📅 ${d.date}` : ''}${d.description ? `\n${d.description}` : ''}`,
        { cards: [eventCard(d.raw, lang)], actions: [{ label: c1('c1_viewAllEvents', 'View all events'), to: '/events' }] }, 'events');
    }
    if (top.type === 'faq' && d.answer) return reply(`💡 ${d.answer}`, {}, 'fallback');
    if (top.type === 'history' && d.summary) {
      return reply(`📜 ${d.summary}`, { actions: [{ label: c1('c1_templeHistory', 'Temple history'), to: '/history' }] }, 'history');
    }
    if (top.type === 'about' && d.significance) {
      return reply(`🏛️ ${d.significance}`, { actions: [{ label: c1('c1_aboutTemple', 'About the temple'), to: '/about' }] }, 'history');
    }
    if (top.type === 'temple' && d.description) {
      return reply(`🏛️ ${d.name || ''}\n${d.description}`, { actions: [{ label: c1('c1_aboutTemple', 'About the temple'), to: '/about' }] }, 'history');
    }
    if (top.type === 'visiting') {
      return reply(`🚶 ${d.howToReach || d.info || ''}`, { actions: [openContact] }, 'visiting');
    }
  }

  return reply(c1('c1_fallback', 'I am not sure I understood that. Here are some things I can help with:'));
};

/** The chips shown at the start of a conversation, ordered for the page the visitor is on. */
export const startChips = (c1, pathname) => pageContext(pathname).chips
  .map((name) => c1(`c1_chip${name}`, CHIP_FALLBACK[name]));
