// Public side of the "Stay updated" subscription (no login needed):
//
//   POST /api/subscribe                      the form on every page: sends a confirmation e-mail
//   GET  /api/subscribe/confirm/:token       page with a "Yes, subscribe me" button (opening a link changes nothing)
//   POST /api/subscribe/confirm/:token       the button: the person becomes active
//   GET  /api/subscribe/unsubscribe/:token   page with a "Yes, unsubscribe" button
//   POST /api/subscribe/unsubscribe/:token   the button, and the one-click unsubscribe of mail programs
//
// Safe by design: the form answers the same way for every address (it cannot be used to find out who is
// subscribed), never changes or mails an address that is already active, mails an unconfirmed address at most
// once per 10 minutes / three a day, and a hidden field catches simple bots. Mail scanners open links in
// messages, which is why a GET only shows a button and the POST does the work.
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('../middleware/rateLimit');
const escapeHtml = require('../utils/escapeHtml');
const newsletter = require('../services/newsletterService');
const { createNotification } = require('../controllers/notificationController');

const router = express.Router();

const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many subscribe requests from this address. Please try again later.',
});
const pageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many requests.' });

// A signed-in caller, if the request carries a valid login token (the form works for everyone).
const optionalUser = async (req) => {
  const header = String(req.headers.authorization || '');
  if (!/^Bearer /.test(header)) return null;
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (decoded.purpose) return null;
    const user = await User.findById(decoded.id);
    if (!user || user.active === false) return null;
    if (user.tokensValidAfter && decoded.iat * 1000 < user.tokensValidAfter.getTime()) return null;
    return user;
  } catch {
    return null;
  }
};

const GENERIC_MESSAGE = 'If this address can be subscribed, a message with a confirmation link is on its way.';

router.post('/', joinLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    // Hidden field only bots fill in: pretend it worked, do nothing.
    if (body.hp_field) return res.json({ success: true, state: 'check_inbox', message: GENERIC_MESSAGE });
    if (typeof body.email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // Signed in with this very address, and it is a verified one: no e-mail round trip needed.
    const user = await optionalUser(req);
    const own = !!user && user.emailVerified === true && newsletter.cleanEmail(user.email) === newsletter.cleanEmail(body.email);

    const result = await newsletter.subscribe({
      email: body.email,
      lang: body.lang,
      topics: body.topics,
      verifiedAccount: own,
      userId: own ? user._id : undefined,
    });

    if (result.state === 'invalid') {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (result.state === 'subscribed') {
      createNotification('subscribe', 'New Subscriber', `${result.subscriber.email} subscribed to temple updates`, {
        id: result.subscriber._id,
        email: result.subscriber.email,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
      return res.json({ success: true, state: 'subscribed', message: 'You are subscribed.' });
    }
    // 'confirmation_sent', 'already' and 'throttled' look exactly the same from outside.
    return res.json({ success: true, state: 'check_inbox', message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('Subscribe error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not subscribe right now. Please try again later.' });
  }
});

// ---------------------------------------------------------------------------
// The confirm / unsubscribe pages (small HTML pages served by the API)
// ---------------------------------------------------------------------------

const TEMPLE = {
  en: 'Shree Ramchandra Temple',
  ne: 'श्री रामचन्द्र मन्दिर',
  hi: 'श्री रामचंद्र मंदिर',
  zh: '室利罗摩钱德拉神庙',
  ta: 'ஸ்ரீ ராமச்சந்திர கோவில்',
};
const PAGE = {
  en: {
    confirmTitle: 'Confirm your subscription',
    confirmText: 'Press the button to start receiving news from {temple}: events, festival wishes and news.',
    confirmButton: 'Yes, subscribe me',
    doneTitle: 'You are subscribed',
    doneText: 'Thank you! Temple events, festival wishes and news will now reach you by e-mail.',
    unsubTitle: 'Unsubscribe?',
    unsubText: 'Stop all e-mails from {temple} to {email}?',
    unsubButton: 'Yes, unsubscribe',
    keep: 'Keep me subscribed',
    unsubDoneTitle: 'You have been unsubscribed',
    unsubDoneText: 'You will not get any more e-mails from us. You can subscribe again at any time from our website.',
    badTitle: 'This link is not valid',
    badText: 'It may already have been used, or it has expired.',
    visit: 'Visit the website',
  },
  ne: {
    confirmTitle: 'सदस्यता पुष्टि गर्नुहोस्',
    confirmText: '{temple} का कार्यक्रम, पर्वका शुभकामना र समाचार पाउन तलको बटन थिच्नुहोस्।',
    confirmButton: 'हो, मलाई सदस्य बनाउनुहोस्',
    doneTitle: 'तपाईं सदस्य हुनुभयो',
    doneText: 'धन्यवाद! अब मन्दिरका कार्यक्रम, पर्वका शुभकामना र समाचार तपाईंलाई इमेलमा आउनेछन्।',
    unsubTitle: 'सदस्यता रद्द गर्ने?',
    unsubText: '{email} मा {temple} का सबै इमेल बन्द गर्ने?',
    unsubButton: 'हो, सदस्यता रद्द गर्नुहोस्',
    keep: 'मलाई सदस्य नै राख्नुहोस्',
    unsubDoneTitle: 'तपाईंको सदस्यता रद्द भयो',
    unsubDoneText: 'तपाईंले अब हामीबाट कुनै इमेल पाउनुहुने छैन। चाहेको बेला हाम्रो वेबसाइटबाट फेरि सदस्य बन्न सक्नुहुन्छ।',
    badTitle: 'यो लिंक मान्य छैन',
    badText: 'यो पहिले नै प्रयोग भइसकेको वा म्याद सकिएको हुन सक्छ।',
    visit: 'वेबसाइट हेर्नुहोस्',
  },
  hi: {
    confirmTitle: 'सदस्यता की पुष्टि करें',
    confirmText: '{temple} के कार्यक्रम, पर्वों की शुभकामनाएँ और समाचार पाने के लिए नीचे का बटन दबाएँ।',
    confirmButton: 'हाँ, मुझे सदस्य बनाएँ',
    doneTitle: 'आप सदस्य बन गए हैं',
    doneText: 'धन्यवाद! अब मंदिर के कार्यक्रम, पर्वों की शुभकामनाएँ और समाचार आपको ईमेल पर मिलेंगे।',
    unsubTitle: 'सदस्यता रद्द करें?',
    unsubText: '{email} पर {temple} के सभी ईमेल बंद करें?',
    unsubButton: 'हाँ, सदस्यता रद्द करें',
    keep: 'मुझे सदस्य बनाए रखें',
    unsubDoneTitle: 'आपकी सदस्यता रद्द हो गई है',
    unsubDoneText: 'अब आपको हमारी ओर से कोई ईमेल नहीं मिलेगा। आप कभी भी हमारी वेबसाइट से दोबारा सदस्य बन सकते हैं।',
    badTitle: 'यह लिंक मान्य नहीं है',
    badText: 'यह पहले ही उपयोग हो चुका है या इसकी अवधि समाप्त हो गई है।',
    visit: 'वेबसाइट देखें',
  },
  zh: {
    confirmTitle: '请确认订阅',
    confirmText: '点击按钮即可开始接收{temple}的活动、节日祝福和新闻。',
    confirmButton: '是的，请为我订阅',
    doneTitle: '您已成功订阅',
    doneText: '谢谢！神庙活动、节日祝福和新闻今后将通过电子邮件发送给您。',
    unsubTitle: '取消订阅？',
    unsubText: '不再向 {email} 发送{temple}的所有邮件？',
    unsubButton: '是的，取消订阅',
    keep: '保持订阅',
    unsubDoneTitle: '您已取消订阅',
    unsubDoneText: '您将不再收到我们的邮件。您可以随时在我们的网站上重新订阅。',
    badTitle: '此链接无效',
    badText: '它可能已被使用，或已过期。',
    visit: '访问网站',
  },
  ta: {
    confirmTitle: 'சந்தாவை உறுதிப்படுத்துங்கள்',
    confirmText: '{temple} நிகழ்ச்சிகள், பண்டிகை வாழ்த்துகள் மற்றும் செய்திகளைப் பெற கீழே உள்ள பொத்தானை அழுத்துங்கள்.',
    confirmButton: 'ஆம், என்னை சந்தாதாரராக்குங்கள்',
    doneTitle: 'நீங்கள் சந்தா செலுத்திவிட்டீர்கள்',
    doneText: 'நன்றி! கோவில் நிகழ்ச்சிகள், பண்டிகை வாழ்த்துகள் மற்றும் செய்திகள் இனி மின்னஞ்சலில் உங்களுக்கு வரும்.',
    unsubTitle: 'சந்தாவை நிறுத்தவா?',
    unsubText: '{email} க்கு {temple} இன் அனைத்து மின்னஞ்சல்களையும் நிறுத்தவா?',
    unsubButton: 'ஆம், சந்தாவை நிறுத்து',
    keep: 'என்னை சந்தாதாரராகவே வைத்திருங்கள்',
    unsubDoneTitle: 'உங்கள் சந்தா நிறுத்தப்பட்டது',
    unsubDoneText: 'இனி எங்களிடமிருந்து மின்னஞ்சல்கள் வராது. எங்கள் இணையதளத்தில் எப்போது வேண்டுமானாலும் மீண்டும் சந்தா செலுத்தலாம்.',
    badTitle: 'இந்த இணைப்பு செல்லுபடியாகாது',
    badText: 'இது ஏற்கனவே பயன்படுத்தப்பட்டிருக்கலாம் அல்லது காலாவதியாகியிருக்கலாம்.',
    visit: 'இணையதளத்தைப் பார்க்கவும்',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : vars[k]));

const mask = (email) => {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 1)}***@${domain}`;
};

// Same look as the reminder pages: a flat white card.
const page = (lang, title, bodyHtml) => `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f7f5f4;color:#1c1717;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;border:1px solid #ece5e4;border-radius:16px;max-width:440px;width:100%;padding:28px;text-align:center}
  h1{font-size:20px;margin:0 0 8px}p{color:#5e5757;line-height:1.6;margin:8px 0}
  button,a.btn{display:inline-block;margin-top:14px;padding:11px 24px;background:#a80808;color:#fff;border:0;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;cursor:pointer}
  a.link{display:inline-block;margin-top:14px;color:#a80808;font-weight:600;text-decoration:none}
</style></head><body><div class="card">${bodyHtml}</div></body></html>`;

// These two kinds of page are real HTML (inline style, a form back to this address), so they get their own
// policy instead of the API-wide "load nothing" one.
const pageCsp = (req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  // The API-wide policy is no-referrer, and with it a browser sends 'Origin: null' on a form POST, which the CORS
  // check refuses. Same-origin keeps the button working and still sends the page address to nobody else.
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
};

const P = (lang) => PAGE[PAGE[lang] ? lang : 'en'];
const bad = (res, lang = 'en') => {
  const s = P(lang);
  return res.status(404).send(page(lang, s.badTitle, `<h1>${escapeHtml(s.badTitle)}</h1><p>${escapeHtml(s.badText)}</p>`));
};
const home = (lang) => `<a class="link" href="${escapeHtml(newsletter.siteUrl())}">${escapeHtml(P(lang).visit)}</a>`;

router.get('/confirm/:token', pageLimiter, pageCsp, async (req, res) => {
  try {
    const sub = await newsletter.findPendingByToken(req.params.token);
    if (!sub) return bad(res);
    const s = P(sub.lang);
    const temple = TEMPLE[sub.lang] || TEMPLE.en;
    return res.send(
      page(
        sub.lang,
        s.confirmTitle,
        `<h1>${escapeHtml(s.confirmTitle)}</h1><p>${escapeHtml(fill(s.confirmText, { temple }))}</p>
         <form method="post" action=""><button type="submit">${escapeHtml(s.confirmButton)}</button></form>`
      )
    );
  } catch (error) {
    console.error('Confirm page error:', error.message);
    return res.status(500).send(page('en', 'Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

router.post('/confirm/:token', pageLimiter, pageCsp, async (req, res) => {
  try {
    const sub = await newsletter.confirmByToken(req.params.token);
    if (!sub) return bad(res);
    createNotification('subscribe', 'New Subscriber', `${sub.email} subscribed to temple updates`, {
      id: sub._id,
      email: sub.email,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
    const s = P(sub.lang);
    return res.send(page(sub.lang, s.doneTitle, `<h1>${escapeHtml(s.doneTitle)}</h1><p>${escapeHtml(s.doneText)}</p>${home(sub.lang)}`));
  } catch (error) {
    console.error('Confirm error:', error.message);
    return res.status(500).send(page('en', 'Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

router.get('/unsubscribe/:token', pageLimiter, pageCsp, async (req, res) => {
  try {
    const sub = await newsletter.findByUnsubscribeToken(req.params.token);
    if (!sub) return bad(res);
    const s = P(sub.lang);
    const temple = TEMPLE[sub.lang] || TEMPLE.en;
    return res.send(
      page(
        sub.lang,
        s.unsubTitle,
        `<h1>${escapeHtml(s.unsubTitle)}</h1><p>${escapeHtml(fill(s.unsubText, { temple, email: mask(sub.email) }))}</p>
         <form method="post" action=""><button type="submit">${escapeHtml(s.unsubButton)}</button></form>
         <a class="link" href="${escapeHtml(newsletter.siteUrl())}">${escapeHtml(s.keep)}</a>`
      )
    );
  } catch (error) {
    console.error('Unsubscribe page error:', error.message);
    return res.status(500).send(page('en', 'Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

router.post('/unsubscribe/:token', pageLimiter, pageCsp, async (req, res) => {
  try {
    const sub = await newsletter.unsubscribeByToken(req.params.token);
    if (!sub) return bad(res);
    const s = P(sub.lang);
    return res.send(page(sub.lang, s.unsubDoneTitle, `<h1>${escapeHtml(s.unsubDoneTitle)}</h1><p>${escapeHtml(s.unsubDoneText)}</p>${home(sub.lang)}`));
  } catch (error) {
    console.error('Unsubscribe error:', error.message);
    return res.status(500).send(page('en', 'Error', '<h1>Something went wrong</h1><p>Please try again later.</p>'));
  }
});

module.exports = router;
