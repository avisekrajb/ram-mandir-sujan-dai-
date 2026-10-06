// The "sign in with an email code" message: wording in the five site languages and
// the HTML in the same house style as the other temple emails (emailService.js).

const { sendEmail } = require('./emailService');

const escapeHtml = (value) =>
  String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const LANGS = ['en', 'ne', 'hi', 'zh', 'ta'];

// {minutes} is filled in below.
const STRINGS = {
  en: {
    subject: 'Your sign-in code - Shree Ramchandra Temple',
    title: 'Your sign-in code',
    intro: 'Use this code to sign in to the Shree Ramchandra Temple website:',
    valid: 'The code works for {minutes} minutes and can be used once.',
    ignore: 'If you did not ask for this, you can ignore this email. Nobody can sign in without the code.',
    blessing: 'Jai Shree Ram! 🙏',
  },
  ne: {
    subject: 'तपाईंको साइन-इन कोड - श्री रामचन्द्र मन्दिर',
    title: 'तपाईंको साइन-इन कोड',
    intro: 'श्री रामचन्द्र मन्दिरको वेबसाइटमा साइन इन गर्न यो कोड प्रयोग गर्नुहोस्:',
    valid: 'यो कोड {minutes} मिनेटसम्म चल्छ र एक पटक मात्र प्रयोग गर्न सकिन्छ।',
    ignore: 'तपाईंले यो माग्नुभएको होइन भने यो इमेललाई बेवास्ता गर्न सक्नुहुन्छ। कोडबिना कसैले साइन इन गर्न सक्दैन।',
    blessing: 'जय श्री राम! 🙏',
  },
  hi: {
    subject: 'आपका साइन-इन कोड - श्री रामचन्द्र मंदिर',
    title: 'आपका साइन-इन कोड',
    intro: 'श्री रामचन्द्र मंदिर की वेबसाइट में साइन इन करने के लिए यह कोड इस्तेमाल करें:',
    valid: 'यह कोड {minutes} मिनट तक चलता है और केवल एक बार इस्तेमाल हो सकता है।',
    ignore: 'अगर आपने यह नहीं माँगा है तो इस ईमेल को अनदेखा करें। कोड के बिना कोई साइन इन नहीं कर सकता।',
    blessing: 'जय श्री राम! 🙏',
  },
  zh: {
    subject: '您的登录验证码 - Shree Ramchandra 寺庙',
    title: '您的登录验证码',
    intro: '请使用此验证码登录 Shree Ramchandra 寺庙网站：',
    valid: '验证码 {minutes} 分钟内有效，且只能使用一次。',
    ignore: '如果这不是您本人的操作，请忽略此邮件。没有验证码，任何人都无法登录。',
    blessing: '罗摩万岁！🙏',
  },
  ta: {
    subject: 'உங்கள் உள்நுழைவு குறியீடு - ஸ்ரீ ராமச்சந்திர கோவில்',
    title: 'உங்கள் உள்நுழைவு குறியீடு',
    intro: 'ஸ்ரீ ராமச்சந்திர கோவில் இணையதளத்தில் உள்நுழைய இந்தக் குறியீட்டைப் பயன்படுத்துங்கள்:',
    valid: 'இந்தக் குறியீடு {minutes} நிமிடங்கள் செல்லும்; ஒரு முறை மட்டுமே பயன்படுத்தலாம்.',
    ignore: 'நீங்கள் இதைக் கேட்கவில்லை என்றால் இந்த மின்னஞ்சலைப் புறக்கணிக்கலாம். குறியீடு இல்லாமல் யாரும் உள்நுழைய முடியாது.',
    blessing: 'ஜெய் ஸ்ரீ ராம்! 🙏',
  },
};

const normaliseLang = (lang) => (LANGS.includes(lang) ? lang : 'en');

/**
 * Mail a sign-in code. Resolves to the mail transport's answer; like sendEmail it does
 * not throw, so the caller checks `result.error` (and `result.messageId === 'skipped'`
 * for a server with no email set up).
 */
const sendLoginCodeEmail = ({ email, code, lang, minutes }) => {
  const s = STRINGS[normaliseLang(lang)];
  const valid = s.valid.replace('{minutes}', String(minutes));
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(s.title)}</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#1a1a2e;max-width:500px;margin:0 auto;padding:20px;background:#fafafa;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background:#820606;color:#ffffff;padding:22px 20px;text-align:center;">
          <h2 style="margin:0;font-size:21px;font-weight:700;">🔐 ${escapeHtml(s.title)}</h2>
        </div>
        <div style="padding:25px;">
          <p style="margin:0 0 6px;">${escapeHtml(s.intro)}</p>
          <div style="font-size:36px;font-weight:bold;color:#820606;text-align:center;padding:15px;background:#f5f0ed;border-radius:10px;letter-spacing:10px;margin:15px 0;">${escapeHtml(code)}</div>
          <p style="margin:0 0 10px;font-size:14px;">${escapeHtml(valid)}</p>
          <p style="margin:0;font-size:14px;color:#6b6b7a;">${escapeHtml(s.ignore)}</p>
          <p style="margin:16px 0 0;">${escapeHtml(s.blessing)}</p>
        </div>
        <div style="text-align:center;padding:15px;border-top:1px solid #e8e4e0;font-size:12px;color:#8a8a9a;background:#fafafa;">
          <p style="margin:0;font-weight:600;color:#820606;">Shree Ramchandra Temple</p>
          <p style="margin:4px 0 0;">Gaushala, Kathmandu, Nepal</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${s.title}\n\n${s.intro}\n\n${code}\n\n${valid}\n${s.ignore}\n`;
  return sendEmail({ to: email, subject: s.subject, html, text });
};

module.exports = { sendLoginCodeEmail, normaliseLang };
