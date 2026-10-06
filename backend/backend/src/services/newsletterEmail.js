// The e-mails of the "Stay updated" subscription: confirmation, welcome, a new event, a new blog post,
// a festival wish and an announcement written by an admin. Wording in the five site languages, HTML in
// the same house style as the other temple e-mails (reminderEmail.js), everything a visitor or an
// admin typed is escaped, and every mailing carries a personal unsubscribe link plus the
// List-Unsubscribe headers mail programs use for their own "Unsubscribe" button.

const escapeHtml = require('../utils/escapeHtml');

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

const TEMPLE = {
  en: 'Shree Ramchandra Temple',
  ne: 'श्री रामचन्द्र मन्दिर',
  hi: 'श्री रामचंद्र मंदिर',
  zh: '室利罗摩钱德拉神庙',
  ta: 'ஸ்ரீ ராமச்சந்திர கோவில்',
};

// {temple} {name} are filled in by `fill`.
const STRINGS = {
  en: {
    confirm: {
      kicker: 'Confirm your subscription',
      title: 'One last step',
      body: 'Please confirm that you would like to receive news from {temple}: temple events, festival wishes and news.',
      topicsLabel: 'You chose:',
      button: 'Yes, subscribe me',
      ignore: 'If you did not ask for this, simply ignore this message: nothing will be sent to you.',
    },
    welcome: {
      kicker: 'Welcome',
      title: 'You are subscribed',
      body: 'Thank you for joining {temple}. From now on you will receive:',
      blessing: 'Jai Shree Ram! 🙏',
    },
    topics: { events: 'Temple events', festivals: 'Festival wishes', news: 'Temple news and blogs' },
    event: { kicker: 'New at the temple', date: 'Date', button: 'See the event' },
    blog: { kicker: 'From the temple blog', button: 'Read more' },
    festival: {
      kicker: 'Festival greetings',
      title: 'Happy {name}!',
      body: '{temple} wishes you and your family a joyful {name}. May Lord Ram, Mother Sita and Lakshman bless your home with peace, health and happiness.',
      button: 'Open the temple calendar',
      blessing: 'Jai Shree Ram! 🙏',
    },
    custom: { kicker: 'A message from the temple', button: 'Read more' },
    chrome: {
      why: 'You are receiving this because you subscribed to {temple} updates.',
      unsubscribe: 'Unsubscribe',
      auto: 'Please do not reply to this e-mail.',
      test: 'This is a test e-mail.',
    },
  },
  ne: {
    confirm: {
      kicker: 'सदस्यता पुष्टि गर्नुहोस्',
      title: 'अन्तिम एक चरण',
      body: 'तपाईंले {temple} बाट मन्दिरका कार्यक्रम, पर्वका शुभकामना र समाचार इमेलमा पाउन चाहनुहुन्छ भन्ने कृपया पुष्टि गर्नुहोस्।',
      topicsLabel: 'तपाईंले रोज्नुभयो:',
      button: 'हो, मलाई सदस्य बनाउनुहोस्',
      ignore: 'यदि तपाईंले यो माग्नुभएको होइन भने यो सन्देशलाई बेवास्ता गर्नुहोस्: तपाईंलाई केही पठाइने छैन।',
    },
    welcome: {
      kicker: 'स्वागत छ',
      title: 'तपाईं सदस्य हुनुभयो',
      body: '{temple} सँग जोडिनुभएकोमा धन्यवाद। अबदेखि तपाईंले पाउनुहुनेछ:',
      blessing: 'जय श्री राम! 🙏',
    },
    topics: { events: 'मन्दिरका कार्यक्रम', festivals: 'पर्वका शुभकामना', news: 'मन्दिरका समाचार र ब्लग' },
    event: { kicker: 'मन्दिरमा नयाँ', date: 'मिति', button: 'कार्यक्रम हेर्नुहोस्' },
    blog: { kicker: 'मन्दिरको ब्लगबाट', button: 'थप पढ्नुहोस्' },
    festival: {
      kicker: 'पर्वको शुभकामना',
      title: '{name} को हार्दिक शुभकामना!',
      body: '{temple} को तर्फबाट तपाईं र तपाईंको परिवारलाई {name} को हार्दिक मंगलमय शुभकामना। भगवान् श्रीराम, माता सीता र लक्ष्मणको कृपाले तपाईंको घरमा शान्ति, स्वास्थ्य र सुख-समृद्धि रहोस्।',
      button: 'मन्दिरको पात्रो खोल्नुहोस्',
      blessing: 'जय श्री राम! 🙏',
    },
    custom: { kicker: 'मन्दिरबाट सन्देश', button: 'थप पढ्नुहोस्' },
    chrome: {
      why: 'तपाईंले {temple} का समाचार पाउन सदस्यता लिनुभएकाले यो इमेल पाउनुभएको हो।',
      unsubscribe: 'सदस्यता रद्द गर्नुहोस्',
      auto: 'कृपया यो इमेलको जवाफ नदिनुहोस्।',
      test: 'यो परीक्षण इमेल हो।',
    },
  },
  hi: {
    confirm: {
      kicker: 'सदस्यता की पुष्टि करें',
      title: 'बस एक कदम और',
      body: 'कृपया पुष्टि करें कि आप {temple} से मंदिर के कार्यक्रम, पर्वों की शुभकामनाएँ और समाचार ईमेल पर पाना चाहते हैं।',
      topicsLabel: 'आपने चुना:',
      button: 'हाँ, मुझे सदस्य बनाएँ',
      ignore: 'यदि आपने यह नहीं माँगा था तो इस संदेश को अनदेखा करें: आपको कुछ नहीं भेजा जाएगा।',
    },
    welcome: {
      kicker: 'स्वागत है',
      title: 'आप सदस्य बन गए हैं',
      body: '{temple} से जुड़ने के लिए धन्यवाद। अब आपको मिलेगा:',
      blessing: 'जय श्री राम! 🙏',
    },
    topics: { events: 'मंदिर के कार्यक्रम', festivals: 'पर्वों की शुभकामनाएँ', news: 'मंदिर के समाचार और ब्लॉग' },
    event: { kicker: 'मंदिर में नया', date: 'तिथि', button: 'कार्यक्रम देखें' },
    blog: { kicker: 'मंदिर के ब्लॉग से', button: 'और पढ़ें' },
    festival: {
      kicker: 'पर्व की शुभकामनाएँ',
      title: '{name} की हार्दिक शुभकामनाएँ!',
      body: '{temple} की ओर से आपको और आपके परिवार को {name} की हार्दिक मंगलकामनाएँ। भगवान श्रीराम, माता सीता और लक्ष्मण की कृपा से आपके घर में शांति, स्वास्थ्य और सुख-समृद्धि बनी रहे।',
      button: 'मंदिर का कैलेंडर खोलें',
      blessing: 'जय श्री राम! 🙏',
    },
    custom: { kicker: 'मंदिर की ओर से संदेश', button: 'और पढ़ें' },
    chrome: {
      why: 'आपने {temple} की जानकारी पाने के लिए सदस्यता ली थी, इसलिए आपको यह ईमेल मिला है।',
      unsubscribe: 'सदस्यता रद्द करें',
      auto: 'कृपया इस ईमेल का उत्तर न दें।',
      test: 'यह एक परीक्षण ईमेल है।',
    },
  },
  zh: {
    confirm: {
      kicker: '请确认订阅',
      title: '只差最后一步',
      body: '请确认您希望通过电子邮件接收{temple}的活动、节日祝福和新闻。',
      topicsLabel: '您选择了：',
      button: '是的，请为我订阅',
      ignore: '如果这不是您本人的操作，请忽略此邮件：我们不会向您发送任何内容。',
    },
    welcome: {
      kicker: '欢迎',
      title: '您已成功订阅',
      body: '感谢加入{temple}。今后您将收到：',
      blessing: '吉祥如意！🙏',
    },
    topics: { events: '神庙活动', festivals: '节日祝福', news: '神庙新闻与博客' },
    event: { kicker: '神庙新活动', date: '日期', button: '查看活动' },
    blog: { kicker: '来自神庙博客', button: '阅读更多' },
    festival: {
      kicker: '节日祝福',
      title: '祝您{name}快乐！',
      body: '{temple}祝您和家人{name}快乐。愿罗摩、悉多和罗什曼的恩典为您的家庭带来平安、健康与幸福。',
      button: '打开神庙日历',
      blessing: '吉祥如意！🙏',
    },
    custom: { kicker: '来自神庙的消息', button: '阅读更多' },
    chrome: {
      why: '您收到此邮件是因为您订阅了{temple}的最新消息。',
      unsubscribe: '取消订阅',
      auto: '请勿回复此邮件。',
      test: '这是一封测试邮件。',
    },
  },
  ta: {
    confirm: {
      kicker: 'சந்தாவை உறுதிப்படுத்துங்கள்',
      title: 'இன்னும் ஒரு படி',
      body: '{temple} இடமிருந்து கோவில் நிகழ்ச்சிகள், பண்டிகை வாழ்த்துகள் மற்றும் செய்திகளை மின்னஞ்சலில் பெற விரும்புகிறீர்கள் என்பதை உறுதிப்படுத்துங்கள்.',
      topicsLabel: 'நீங்கள் தேர்ந்தெடுத்தது:',
      button: 'ஆம், என்னை சந்தாதாரராக்குங்கள்',
      ignore: 'இதை நீங்கள் கேட்கவில்லை என்றால் இந்த செய்தியைப் புறக்கணியுங்கள்: உங்களுக்கு எதுவும் அனுப்பப்படாது.',
    },
    welcome: {
      kicker: 'வரவேற்கிறோம்',
      title: 'நீங்கள் சந்தா செலுத்திவிட்டீர்கள்',
      body: '{temple} உடன் இணைந்ததற்கு நன்றி. இனி நீங்கள் பெறுவது:',
      blessing: 'ஜெய் ஸ்ரீ ராம்! 🙏',
    },
    topics: { events: 'கோவில் நிகழ்ச்சிகள்', festivals: 'பண்டிகை வாழ்த்துகள்', news: 'கோவில் செய்திகள் மற்றும் வலைப்பதிவு' },
    event: { kicker: 'கோவிலில் புதியது', date: 'தேதி', button: 'நிகழ்ச்சியைப் பாருங்கள்' },
    blog: { kicker: 'கோவில் வலைப்பதிவிலிருந்து', button: 'மேலும் படிக்க' },
    festival: {
      kicker: 'பண்டிகை வாழ்த்துகள்',
      title: '{name} நல்வாழ்த்துகள்!',
      body: '{temple} உங்களுக்கும் உங்கள் குடும்பத்தினருக்கும் {name} நல்வாழ்த்துகளைத் தெரிவிக்கிறது. இராமர், சீதை, இலக்குமணன் அருளால் உங்கள் இல்லத்தில் அமைதி, ஆரோக்கியம், மகிழ்ச்சி நிலவட்டும்.',
      button: 'கோவில் நாட்காட்டியைத் திறக்கவும்',
      blessing: 'ஜெய் ஸ்ரீ ராம்! 🙏',
    },
    custom: { kicker: 'கோவிலிலிருந்து ஒரு செய்தி', button: 'மேலும் படிக்க' },
    chrome: {
      why: '{temple} செய்திகளுக்கு நீங்கள் சந்தா செலுத்தியதால் இந்த மின்னஞ்சல் உங்களுக்கு வந்தது.',
      unsubscribe: 'சந்தாவை நிறுத்து',
      auto: 'இந்த மின்னஞ்சலுக்குப் பதிலளிக்க வேண்டாம்.',
      test: 'இது ஒரு சோதனை மின்னஞ்சல்.',
    },
  },
};

// Warmer wording for a few festivals (English and Nepali; the other languages use the standard wishes).
const SPECIAL_WISHES = [
  {
    test: /ram navami|rama navami/i,
    en: 'Happy Ram Navami! Today we celebrate the birth of Lord Shree Ram. May his blessings of dharma, compassion and courage be with you and your family.',
    ne: 'श्रीराम नवमीको हार्दिक शुभकामना! आज भगवान् श्रीरामको जन्मोत्सव मनाइँदैछ। धर्म, करुणा र साहसको उहाँको आशीर्वाद तपाईं र तपाईंको परिवारमा रहिरहोस्।',
  },
  {
    test: /vijaya dashami/i,
    en: 'Happy Vijaya Dashami! May the victory of good over evil, the Tika and the blessings of elders bring joy and prosperity to you and your family.',
    ne: 'विजया दशमीको हार्दिक शुभकामना! असत्यमाथि सत्यको विजय, टीका र ठूलाबडाको आशीर्वादले तपाईं र तपाईंको परिवारमा सुख र समृद्धि ल्याओस्।',
  },
  {
    test: /new year/i,
    en: 'May the new year bring good health, peace and joy to you and your loved ones, with the blessings of Lord Ram.',
    ne: 'नयाँ वर्षले तपाईं र तपाईंका प्रियजनमा स्वास्थ्य, शान्ति र आनन्द ल्याओस्। भगवान् श्रीरामको आशीर्वाद सदैव रहिरहोस्।',
  },
  {
    test: /laxmi puja|tihar/i,
    en: 'May the festival of lights fill your home with light, prosperity and the blessings of Goddess Laxmi.',
    ne: 'दीपावलीको उज्यालोले तपाईंको घरमा प्रकाश, समृद्धि र लक्ष्मी माताको आशीर्वाद ल्याओस्।',
  },
  {
    test: /bhai tika/i,
    en: 'May the bond of love between brothers and sisters grow stronger every year.',
    ne: 'दाजुभाइ र दिदीबहिनीबीचको माया वर्षैपिच्छे झन् गहिरो होस्।',
  },
];

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : vars[k]));

const S = (lang) => STRINGS[LANGS.includes(lang) ? lang : 'en'];
const pickLang = (lang) => (LANGS.includes(lang) ? lang : 'en');

// A localized value { en, ne, ... } or a plain string: the subscriber's language, else English.
const localized = (value, lang) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return (value[lang] && String(value[lang]).trim()) || (value.en && String(value.en).trim()) || '';
};

// A link in a mail must be https (or http for a local test) and never contain markup characters.
const safeLink = (url) => {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
};

// Paragraphs from plain text: a blank line starts a new paragraph, a single line break becomes <br>.
const paragraphsHtml = (text) =>
  String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

const CSS = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1c1717; max-width: 560px; margin: 0 auto; padding: 20px; background: #f7f5f4; }
    .container { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ece5e4; }
    .header { background: #820606; color: #ffffff; padding: 26px 20px; text-align: center; }
    .header .kicker { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: .8; }
    .header h1 { margin: 6px 0 0; font-size: 24px; font-weight: 700; line-height: 1.3; }
    .content { padding: 26px 24px; }
    .photo { display: block; width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; margin: 0 0 16px; }
    .meta { display: inline-block; background: #f7f5f4; border: 1px solid #ece5e4; color: #a80808; font-weight: 700; border-radius: 999px; padding: 4px 14px; font-size: 13px; margin: 0 0 12px; }
    .list { background: #faf8f8; border-left: 4px solid #a80808; border-radius: 10px; padding: 10px 16px; margin: 14px 0; }
    .list div { padding: 2px 0; font-size: 15px; }
    .test { background: #fff7e6; border: 1px solid #f2d9a6; color: #7a5a14; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; font-size: 13px; }
    .btn { display: inline-block; padding: 11px 26px; background: #a80808; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; padding: 18px; border-top: 1px solid #ece5e4; font-size: 12px; color: #6f6868; background: #faf8f8; }
    .footer a { color: #6f6868; }
`;

/**
 * @param {object} p
 * @param {'confirm'|'welcome'|'event'|'blog'|'festival'|'custom'} p.kind
 * @param {string} p.lang
 * @param {object} p.data            what the mail is about (see each kind below)
 * @param {string} p.siteUrl         the website (FRONTEND_URL)
 * @param {string} [p.confirmUrl]    confirm kind only
 * @param {string} [p.unsubscribeUrl]
 * @param {string[]} [p.topics]      confirm / welcome: what the person chose
 * @param {boolean} [p.isTest]
 */
const buildNewsletterEmail = ({ kind, lang: rawLang, data = {}, siteUrl, confirmUrl, unsubscribeUrl, topics = [], isTest = false }) => {
  const lang = pickLang(rawLang);
  const L = S(lang);
  const temple = TEMPLE[lang];
  const site = String(siteUrl || '').replace(/\/+$/, '');

  let kicker = '';
  let title = '';
  let subject = '';
  let bodyHtml = '';
  let bodyText = '';
  let button = null; // { label, url }
  let blessing = '';
  let photo = '';

  if (kind === 'confirm') {
    kicker = L.confirm.kicker;
    title = L.confirm.title;
    subject = `${L.confirm.kicker} - ${temple}`;
    const chosen = (topics.length ? topics : Object.keys(L.topics)).map((t) => L.topics[t]).filter(Boolean);
    bodyHtml =
      `<p style="margin:0 0 10px;">${escapeHtml(fill(L.confirm.body, { temple }))}</p>` +
      `<p style="margin:12px 0 4px;color:#6f6868;font-size:14px;">${escapeHtml(L.confirm.topicsLabel)}</p>` +
      `<div class="list">${chosen.map((c) => `<div>• ${escapeHtml(c)}</div>`).join('')}</div>` +
      `<p style="margin:14px 0 0;color:#6f6868;font-size:13px;">${escapeHtml(L.confirm.ignore)}</p>`;
    bodyText = `${fill(L.confirm.body, { temple })}\n${L.confirm.topicsLabel} ${chosen.join(', ')}\n\n${L.confirm.ignore}`;
    button = confirmUrl ? { label: L.confirm.button, url: confirmUrl } : null;
  } else if (kind === 'welcome') {
    kicker = L.welcome.kicker;
    title = L.welcome.title;
    subject = `${L.welcome.title} - ${temple}`;
    const chosen = (topics.length ? topics : Object.keys(L.topics)).map((t) => L.topics[t]).filter(Boolean);
    bodyHtml =
      `<p style="margin:0 0 10px;">${escapeHtml(fill(L.welcome.body, { temple }))}</p>` +
      `<div class="list">${chosen.map((c) => `<div>• ${escapeHtml(c)}</div>`).join('')}</div>`;
    bodyText = `${fill(L.welcome.body, { temple })}\n${chosen.map((c) => `- ${c}`).join('\n')}`;
    blessing = L.welcome.blessing;
    button = site ? { label: L.festival.button, url: `${site}/calendar` } : null;
  } else if (kind === 'event') {
    kicker = L.event.kicker;
    title = localized(data.title, lang) || 'Temple event';
    subject = `📅 ${title} - ${temple}`;
    const summary = localized(data.summary, lang);
    const dateText = localized(data.dateText, lang);
    photo = safeLink(data.photo);
    bodyHtml = `${dateText ? `<div class="meta">${escapeHtml(L.event.date)} · ${escapeHtml(dateText)}</div>` : ''}${paragraphsHtml(summary)}`;
    bodyText = `${dateText ? `${L.event.date}: ${dateText}\n\n` : ''}${summary}`;
    const url = safeLink(data.url) || (site ? `${site}/events` : '');
    button = url ? { label: L.event.button, url } : null;
  } else if (kind === 'blog') {
    kicker = L.blog.kicker;
    title = localized(data.title, lang) || 'Temple news';
    subject = `📰 ${title} - ${temple}`;
    const summary = localized(data.summary, lang);
    photo = safeLink(data.photo);
    bodyHtml = paragraphsHtml(summary);
    bodyText = summary;
    const url = safeLink(data.url) || (site ? `${site}/blogs` : '');
    button = url ? { label: L.blog.button, url } : null;
  } else if (kind === 'festival') {
    kicker = L.festival.kicker;
    const name = lang === 'ne' || lang === 'hi' ? data.nameNe || data.nameEn || '' : data.nameEn || data.nameNe || '';
    title = fill(L.festival.title, { name });
    subject = `🪔 ${title} - ${temple}`;
    let message = (data.messages && data.messages[lang] && String(data.messages[lang]).trim()) || '';
    if (!message) {
      const special = SPECIAL_WISHES.find((s) => s.test.test(`${data.nameEn || ''} ${data.key || ''}`));
      if (special && special[lang]) message = special[lang];
    }
    if (!message) message = fill(L.festival.body, { temple, name });
    bodyHtml = paragraphsHtml(message);
    bodyText = message;
    blessing = L.festival.blessing;
    button = site ? { label: L.festival.button, url: `${site}/calendar` } : null;
  } else {
    // custom announcement
    kicker = L.custom.kicker;
    title = localized(data.subject, lang) || 'Message from the temple';
    subject = title;
    const body = localized(data.body, lang);
    bodyHtml = paragraphsHtml(body);
    bodyText = body;
    const url = safeLink(data.url);
    button = url ? { label: localized(data.buttonLabel, lang) || L.custom.button, url } : null;
  }
  subject = subject.replace(/[\r\n]+/g, ' ').slice(0, 200);

  const isMailing = kind !== 'confirm';
  const testBlock = isTest ? `<div class="test">${escapeHtml(L.chrome.test)}</div>` : '';
  const unsubscribeBlock =
    isMailing && unsubscribeUrl
      ? `<p style="margin:10px 0 0;">${escapeHtml(fill(L.chrome.why, { temple }))}<br><a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(L.chrome.unsubscribe)}</a></p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="kicker">🕉 ${escapeHtml(kicker)}</div>
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${testBlock}
      ${photo ? `<img class="photo" src="${escapeHtml(photo)}" alt="">` : ''}
      ${bodyHtml}
      ${button ? `<div style="text-align:center;margin:22px 0 6px;"><a href="${escapeHtml(button.url)}" class="btn">${escapeHtml(button.label)}</a></div>` : ''}
      ${blessing ? `<p style="margin:18px 0 0;color:#a80808;font-weight:600;">${escapeHtml(blessing)}</p>` : ''}
    </div>
    <div class="footer">
      <p style="margin:0;font-weight:600;color:#a80808;">${escapeHtml(temple)}</p>
      <p style="margin:2px 0 0;">Gaushala, Kathmandu, Nepal</p>
      ${unsubscribeBlock}
      <p style="margin:8px 0 0;font-size:11px;color:#a89e9d;">${escapeHtml(L.chrome.auto)}</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    isTest ? L.chrome.test : '',
    title,
    '',
    bodyText,
    '',
    button ? `${button.label}: ${button.url}` : '',
    blessing,
    '',
    isMailing && unsubscribeUrl ? `${L.chrome.unsubscribe}: ${unsubscribeUrl}` : '',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Mail programs show their own "Unsubscribe" button from these (one click, no page needed).
  const headers = {};
  if (isMailing && unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    headers.Precedence = 'bulk';
  }

  return { subject, html, text, headers };
};

module.exports = { buildNewsletterEmail, LANGS, TEMPLE, STRINGS, SPECIAL_WISHES };
