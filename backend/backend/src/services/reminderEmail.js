// Festival / calendar reminder email: wording in the five site languages and the
// HTML in the same house style as the other temple emails (emailService.js).

const { sendEmail } = require('./emailService');
const { parseYmd, addDays } = require('../utils/reminderDates');

const escapeHtml = (value) =>
  String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const LOCALES = { en: 'en-GB', ne: 'ne-NP', hi: 'hi-IN', zh: 'zh-CN', ta: 'ta-IN' };

// {n} {title} {date} {name} are filled in below.
const STRINGS = {
  en: {
    kicker: 'Festival reminder',
    when: { today: 'today', tomorrow: 'tomorrow', inDays: 'in {n} days' },
    greeting: 'Dear {name},',
    body: '{title} falls {when}, on {date}.',
    tithi: 'Tithi',
    note: 'Your note',
    cta: 'Open the temple calendar',
    addCal: 'Add to Google Calendar',
    blessing: 'Jai Shree Ram! 🙏',
    why: 'You asked the Shree Ramchandra Temple calendar to remind you about this day.',
    stop: 'Stop this reminder',
    test: 'This is a test email. Your real reminder will arrive on the days you chose.',
    auto: 'This is an automated email. Please do not reply to it.',
  },
  ne: {
    kicker: 'पर्वको सम्झना',
    when: { today: 'आज', tomorrow: 'भोलि', inDays: '{n} दिनपछि' },
    greeting: 'आदरणीय {name},',
    body: '{title} {when}, {date} मा पर्दछ।',
    tithi: 'तिथि',
    note: 'तपाईंको टिपोट',
    cta: 'मन्दिरको पात्रो खोल्नुहोस्',
    addCal: 'गुगल क्यालेन्डरमा थप्नुहोस्',
    blessing: 'जय श्री राम! 🙏',
    why: 'तपाईंले श्री रामचन्द्र मन्दिरको पात्रोबाट यो दिनको सम्झना माग्नुभएको थियो।',
    stop: 'यो सम्झना बन्द गर्नुहोस्',
    test: 'यो परीक्षण इमेल हो। वास्तविक सम्झना तपाईंले रोजेका दिनमा आउनेछ।',
    auto: 'यो स्वचालित इमेल हो। कृपया यसको जवाफ नदिनुहोस्।',
  },
  hi: {
    kicker: 'त्योहार की याद',
    when: { today: 'आज', tomorrow: 'कल', inDays: '{n} दिन बाद' },
    greeting: 'आदरणीय {name},',
    body: '{title} {when}, {date} को है।',
    tithi: 'तिथि',
    note: 'आपका नोट',
    cta: 'मंदिर का कैलेंडर खोलें',
    addCal: 'गूगल कैलेंडर में जोड़ें',
    blessing: 'जय श्री राम! 🙏',
    why: 'आपने श्री रामचंद्र मंदिर के कैलेंडर से इस दिन की याद दिलाने को कहा था।',
    stop: 'यह अनुस्मारक बंद करें',
    test: 'यह एक परीक्षण ईमेल है। असली याद आपके चुने हुए दिनों पर आएगी।',
    auto: 'यह एक स्वचालित ईमेल है। कृपया इसका उत्तर न दें।',
  },
  zh: {
    kicker: '节日提醒',
    when: { today: '今天', tomorrow: '明天', inDays: '{n}天后' },
    greeting: '亲爱的{name}，',
    body: '{title}在{when}，即{date}。',
    tithi: '太阴日',
    note: '您的备注',
    cta: '打开神庙日历',
    addCal: '添加到 Google 日历',
    blessing: '吉祥如意！🙏',
    why: '您请求神庙日历提醒您这一天。',
    stop: '停止此提醒',
    test: '这是一封测试邮件。正式提醒将在您选择的日期发送。',
    auto: '这是一封自动发送的邮件，请勿回复。',
  },
  ta: {
    kicker: 'திருவிழா நினைவூட்டல்',
    when: { today: 'இன்று', tomorrow: 'நாளை', inDays: '{n} நாட்களில்' },
    greeting: 'அன்புள்ள {name},',
    body: '{title} {when}, {date} அன்று வருகிறது.',
    tithi: 'திதி',
    note: 'உங்கள் குறிப்பு',
    cta: 'கோவில் நாட்காட்டியைத் திறக்கவும்',
    addCal: 'Google நாட்காட்டியில் சேர்க்கவும்',
    blessing: 'ஜெய் ஸ்ரீ ராம்! 🙏',
    why: 'இந்த நாளை நினைவூட்டுமாறு நீங்கள் கோவில் நாட்காட்டியிடம் கேட்டிருந்தீர்கள்.',
    stop: 'இந்த நினைவூட்டலை நிறுத்து',
    test: 'இது ஒரு சோதனை மின்னஞ்சல். உண்மையான நினைவூட்டல் நீங்கள் தேர்ந்தெடுத்த நாட்களில் வரும்.',
    auto: 'இது தானியங்கி மின்னஞ்சல். பதிலளிக்க வேண்டாம்.',
  },
};

const fill = (text, vars) =>
  String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : vars[k]));

const pickTitle = (title = {}, lang) => {
  const order =
    lang === 'ne' || lang === 'hi' ? [title.ne, title.en] : [title.en, title.ne];
  return order.find((s) => s && s.trim()) || '';
};

const formatDate = (ymd, lang) => {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return ymd;
  }
};

const compact = (ymd) => ymd.replace(/-/g, '');

/**
 * @param {object} p
 * @param {object} p.reminder     Reminder document (or plain object)
 * @param {number} p.daysLeft     whole days from today (Nepal) to the event day
 * @param {boolean} [p.isTest]
 * @param {string} p.siteUrl      where the calendar lives (FRONTEND_URL)
 * @param {string} p.unsubscribeUrl
 */
const buildReminderEmail = ({ reminder, daysLeft, isTest = false, siteUrl, unsubscribeUrl }) => {
  const lang = STRINGS[reminder.lang] ? reminder.lang : 'en';
  const S = STRINGS[lang];

  const title = pickTitle(reminder.title, lang) || 'Calendar reminder';
  const when =
    daysLeft <= 0
      ? S.when.today
      : daysLeft === 1
        ? S.when.tomorrow
        : fill(S.when.inDays, { n: daysLeft });
  const dateText = formatDate(reminder.eventDate, lang);
  const name = reminder.name || (lang === 'en' ? 'Devotee' : '');

  const subject = `🔔 ${when.charAt(0).toUpperCase()}${when.slice(1)}: ${title} - Shree Ramchandra Temple`;

  const intro = fill(S.body, { title, when, date: dateText });
  const greeting = fill(S.greeting, { name: name || (lang === 'en' ? 'Devotee' : '') }).replace(
    /\s+,/,
    ','
  );

  const calendarUrl = `${siteUrl}/calendar`;
  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${compact(reminder.eventDate)}/${compact(addDays(reminder.eventDate, 1))}` +
    `&details=${encodeURIComponent('Shree Ramchandra Temple calendar')}`;

  const detailRows = [
    reminder.bsLabel ? ['', escapeHtml(reminder.bsLabel)] : null,
    reminder.tithi ? [S.tithi, escapeHtml(reminder.tithi)] : null,
  ].filter(Boolean);

  const detailsBlock = detailRows.length
    ? `<div class="details">${detailRows
        .map(
          ([label, value]) =>
            `<div class="row">${label ? `<span class="label">${label}</span>` : ''}<span class="value">${value}</span></div>`
        )
        .join('')}</div>`
    : '';

  const noteBlock = reminder.note
    ? `<div class="note"><strong>${escapeHtml(S.note)}:</strong><br>${escapeHtml(reminder.note)}</div>`
    : '';

  const testBlock = isTest ? `<div class="test">${escapeHtml(S.test)}</div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1c1717; max-width: 560px; margin: 0 auto; padding: 20px; background: #f7f5f4; }
    .container { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ece5e4; }
    .header { background: #820606; color: #ffffff; padding: 26px 20px; text-align: center; }
    .header .kicker { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: .8; }
    .header h1 { margin: 6px 0 0; font-size: 24px; font-weight: 700; line-height: 1.3; }
    .content { padding: 26px 24px; }
    .greeting { font-size: 17px; font-weight: 600; margin: 0 0 10px; }
    .when { display: inline-block; background: #f7f5f4; border: 1px solid #ece5e4; color: #a80808; font-weight: 700; border-radius: 999px; padding: 4px 14px; font-size: 13px; margin: 0 0 12px; }
    .details { background: #faf8f8; border-left: 4px solid #a80808; border-radius: 10px; padding: 12px 16px; margin: 16px 0; }
    .details .row { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; font-size: 14px; }
    .details .label { color: #6f6868; }
    .details .value { font-weight: 600; }
    .note { background: #f7f5f4; border-radius: 10px; padding: 12px 16px; margin: 14px 0; font-size: 14px; color: #463f3f; }
    .test { background: #fff7e6; border: 1px solid #f2d9a6; color: #7a5a14; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; font-size: 13px; }
    .btn { display: inline-block; padding: 11px 26px; background: #a80808; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .btn-ghost { display: inline-block; padding: 9px 18px; color: #a80808 !important; text-decoration: none; border: 1px solid #e2dbd8; border-radius: 8px; font-weight: 600; font-size: 14px; margin-left: 6px; }
    .footer { text-align: center; padding: 18px; border-top: 1px solid #ece5e4; font-size: 12px; color: #6f6868; background: #faf8f8; }
    .footer a { color: #6f6868; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="kicker">🕉 ${escapeHtml(S.kicker)}</div>
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${testBlock}
      <p class="greeting">${escapeHtml(greeting)}</p>
      <div class="when">${escapeHtml(when)} · ${escapeHtml(dateText)}</div>
      <p style="margin:0 0 4px;">${escapeHtml(intro)}</p>
      ${detailsBlock}
      ${noteBlock}
      <div style="text-align:center;margin:22px 0 6px;">
        <a href="${escapeHtml(calendarUrl)}" class="btn">${escapeHtml(S.cta)}</a>
        <a href="${escapeHtml(googleUrl)}" class="btn-ghost">${escapeHtml(S.addCal)}</a>
      </div>
      <p style="margin:18px 0 0;color:#a80808;font-weight:600;">${escapeHtml(S.blessing)}</p>
    </div>
    <div class="footer">
      <p style="margin:0;font-weight:600;color:#a80808;">Shree Ramchandra Temple</p>
      <p style="margin:2px 0 0;">Gaushala, Kathmandu, Nepal</p>
      <p style="margin:10px 0 0;">${escapeHtml(S.why)}<br><a href="${escapeHtml(unsubscribeUrl)}">${escapeHtml(S.stop)}</a></p>
      <p style="margin:8px 0 0;font-size:11px;color:#a89e9d;">${escapeHtml(S.auto)}</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    isTest ? S.test : '',
    greeting,
    '',
    intro,
    reminder.bsLabel || '',
    reminder.tithi ? `${S.tithi}: ${reminder.tithi}` : '',
    reminder.note ? `${S.note}: ${reminder.note}` : '',
    '',
    `${S.cta}: ${calendarUrl}`,
    `${S.addCal}: ${googleUrl}`,
    '',
    `${S.stop}: ${unsubscribeUrl}`,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { subject, html, text };
};

/** Build and send. Resolves to sendEmail's result (it never throws). */
const sendReminderEmail = (opts) => {
  const { subject, html, text } = buildReminderEmail(opts);
  return sendEmail({ to: opts.reminder.email, subject, html, text });
};

module.exports = { buildReminderEmail, sendReminderEmail };
