// Renders the newsletter e-mails (all kinds, several languages) to PNGs so they can be looked at.
const fs = require('fs'); const path = require('path'); const os = require('os');
const { execFileSync } = require('child_process');
const BACKEND = 'C:/Users/Acer/Desktop/New folder/backend/backend';
const { buildNewsletterEmail } = require(BACKEND + '/src/services/newsletterEmail');
const OUT = path.join(__dirname, 'shots', 'mail'); fs.mkdirSync(OUT, { recursive: true });
const common = { siteUrl: 'https://ramchandratemple.org.np', unsubscribeUrl: 'https://api.example.org/api/subscribe/unsubscribe/' + 'a'.repeat(48), confirmUrl: 'https://api.example.org/api/subscribe/confirm/' + 'b'.repeat(48), topics: ['events', 'festivals'] };
const event = { title: { en: 'Ram Navami Mahotsav', ne: 'राम नवमी महोत्सव', hi: '', zh: '', ta: '' }, summary: { en: 'Join us for the special aarti, bhajan and prasad distribution at the temple.', ne: 'विशेष आरती, भजन र प्रसाद वितरणमा सहभागी हुनुहोस्।' }, dateText: { en: '26 March 2027', ne: 'चैत्र १३, २०८३' }, photo: '', url: 'https://ramchandratemple.org.np/events' };
const festival = { key: 'vijaya-dashami-dashain', nameEn: 'Vijaya Dashami (Dashain)', nameNe: 'विजया दशमी', messages: null };
const laxmi = { key: 'laxmi-puja-tihar', nameEn: 'Laxmi Puja (Tihar)', nameNe: 'लक्ष्मी पूजा', messages: null };
const custom = { subject: { en: 'Temple closed for cleaning on Friday', ne: 'सरसफाइका लागि शुक्रबार मन्दिर बन्द' }, body: { en: 'The temple will open again on Saturday at the usual time.\n\nThank you for your understanding.', ne: 'मन्दिर शनिबार सामान्य समयमा खुल्नेछ।\n\nबुझिदिनुभएकोमा धन्यवाद।' }, url: 'https://ramchandratemple.org.np/', buttonLabel: { en: 'Temple timings', ne: 'मन्दिरको समय' } };
const jobs = [
  ['confirm', 'ne', {}], ['welcome', 'en', {}], ['event', 'en', event], ['event', 'ne', event],
  ['festival', 'ne', festival], ['festival', 'en', festival], ['festival', 'hi', festival], ['festival', 'ta', laxmi], ['festival', 'zh', laxmi], ['custom', 'ne', custom],
];
for (const [kind, lang, data] of jobs) {
  const m = buildNewsletterEmail({ kind, lang, data, ...common });
  const name = `${kind}-${lang}`;
  const html = path.join(OUT, name + '.html');
  fs.writeFileSync(html, m.html);
  const png = path.join(OUT, name + '.png');
  execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'pv-'))}`, '--window-size=680,900', `--screenshot=${png}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
  console.log(name, '|', m.subject);
}
