/**
 * Published content for the Donate page ("दान तथा सहयोग").
 *
 * Stored in AdminSettings:
 *   - DONATE_PAGE_TITLE -> AdminSettings.donatePageTitle
 *   - DONATE_INTRO      -> AdminSettings.donateIntro
 *   - DEFAULT_DONATE_CONTENT -> AdminSettings.donateContent
 *
 * This block is appended BELOW everything the donate page already renders, so
 * the existing donation form, QR and bank sections are untouched.
 *
 * `paragraphs` is a free-length array (not the fixed p1..p4 shape) because the
 * institutional-support section needs more than four paragraphs.
 *
 * Every string is localized. `ne` holds the published Nepali text and `en` an
 * English translation; `hi` / `zh` / `ta` are left empty on purpose and fall
 * back to English until they are filled in from Admin → Donations.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

/** Free-length paragraph list: P('first', 'second', ...) */
const P = (...texts) => texts.map((ne) => L(ne, ''));

const E = L('', '');

const EN_INTRO =
  'Donations and support from devotees, donors, well-wishers, various government agencies and organisations have been important for the conservation, restoration and management of Shree Ramchandra Temple.';

/* ── Page heading ───────────────────────────────────────────────────────── */
const DONATE_PAGE_TITLE = L('दान तथा सहयोग', 'Donations and Support');

/* ── Page intro ─────────────────────────────────────────────────────────── */
const DONATE_INTRO = L(
  'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनका लागि भक्तजन, दाता, शुभेच्छुक तथा विभिन्न सरकारी निकाय र संघ–संस्थाबाट प्राप्त सहयोग महत्वपूर्ण रहेको उल्लेख छ।',
  EN_INTRO
);

/* ── Published sections ─────────────────────────────────────────────────── */
const DEFAULT_DONATE_CONTENT = [
  {
    key: 'donate-conservation',
    order: 0,
    title: L('मन्दिरको संरक्षण तथा जीर्णोद्धारमा सहयोग', 'Support for Temple Conservation and Restoration'),
    desc: L(
      'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनका लागि प्राप्त दान तथा सहयोग मन्दिर तथा परिसरको संरक्षण र आवश्यक कार्यहरूमा उपयोग हुँदै आएको छ।',
      'Donations and support received for the conservation, restoration and management of Shree Ramchandra Temple are used for protecting the temple and its premises and for necessary works.'
    ),
    paragraphs: P(
      'मन्दिरको संरक्षण तथा व्यवस्थापनका लागि भक्तजन, दाता तथा शुभेच्छुकहरूबाट प्राप्त सहयोग महत्वपूर्ण रहेको उल्लेख छ।',
      'मन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था, दाता, भक्तजन तथा शुभेच्छुकहरूको सहयोग रहेको उल्लेख छ।',
      'विशेषगरी पुरातत्व विभाग, काठमाडौं महानगरपालिका वडा नं. ९, बागमती प्रदेश तथा अन्य सहयोगी संस्था र दाताहरूको योगदान रहेको छ।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-areas',
    order: 1,
    title: L('दान तथा सहयोगका क्षेत्रहरू', 'Areas of Donation and Support'),
    desc: L(
      'मन्दिरको संरक्षण तथा विभिन्न धार्मिक, सामाजिक तथा मानवीय सेवाका कार्यहरूमा दान तथा सहयोग उपयोग हुने उल्लेख छ।',
      'Donations and support are used for the conservation of the temple and for various religious, social and humanitarian service activities.'
    ),
    paragraphs: P(
      'मन्दिरको संरक्षण तथा जीर्णोद्धारका लागि दान तथा सहयोग प्राप्त हुँदै आएको छ।',
      'मन्दिर संरक्षण, चाँदीका ढोका, भ्यू टावर, सदस्यता तथा वृद्धाश्रम, अनाथालय र मानव सेवाका कार्यहरूमा सहयोग गर्ने व्यवस्था रहेको उल्लेख छ।'
    ),
    listTitle: L('सहयोगका प्रमुख क्षेत्रहरू', 'Key Areas of Support'),
    points: [
      L('मन्दिरको संरक्षण', 'Temple conservation'),
      L('चाँदीका ढोका', 'Silver doors'),
      L('भ्यू टावर', 'View tower'),
      L('सदस्यता', 'Membership'),
      L('वृद्धाश्रम', 'Old age home'),
      L('अनाथालय', 'Orphanage'),
      L('मानव सेवा', 'Humanitarian service'),
    ],
    enabled: true,
  },
  {
    key: 'donate-donors',
    order: 2,
    title: L('दाता तथा सहयोगकर्ताहरू', 'Donors and Contributors'),
    desc: L(
      'वि.सं. २०४८ देखि प्रत्येक वर्ष श्रीरामनवमीको अवसरमा दाता तथा सहयोगकर्ताहरूको विवरणसहित सहयोग पुस्तिका प्रकाशन हुँदै आएको छ।',
      'Since 2048 BS, a support publication listing donors and contributors has been brought out every year on the occasion of Shri Ram Navami.'
    ),
    paragraphs: P(
      'वि.सं. २०४८ देखि प्रत्येक वर्ष श्रीरामनवमीको अवसरमा दाता तथा सहयोगकर्ताहरूको विवरणसहित सहयोग पुस्तिका प्रकाशन हुँदै आएको छ।',
      'सहयोग पुस्तिकामा सानो रकम सहयोग गर्ने व्यक्तिहरूको नामसमेत समावेश गरिने उल्लेख छ।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-programs',
    order: 3,
    title: L('धार्मिक तथा सामाजिक कार्यक्रमबाट प्राप्त सहयोग', 'Support from Religious and Social Programs'),
    desc: L(
      'मन्दिरमा विभिन्न धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।',
      'Fees and support are received from various religious and social programs held at the temple.'
    ),
    paragraphs: P(
      'मन्दिरमा विवाह, व्रतबन्ध, चौरासी पूजा, जन्मदिन, वार्षिकोत्सव लगायतका धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-premises',
    order: 4,
    title: L('मन्दिर परिसरको धार्मिक व्यवस्था', 'Religious Arrangements in the Temple Premises'),
    desc: L(
      'मन्दिर परिसरमा शाकाहारी भोजन मात्र स्वीकार गरिन्छ।',
      'Only vegetarian food is accepted within the temple premises.'
    ),
    paragraphs: P(
      'मन्दिर परिसरमा शाकाहारी भोजन मात्र स्वीकार गरिन्छ।',
      'मदिरा, मासु तथा विदेशी संगीत प्रयोग गर्न निषेध गरिएको उल्लेख छ।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-online',
    order: 5,
    title: L('अनलाइन दान तथा सहयोग', 'Online Donations and Support'),
    desc: L(
      'नेपालमा eSewa तथा विदेशबाट PayPal मार्फत अनलाइन दान तथा सहयोग गर्न सकिने व्यवस्था रहेको उल्लेख छ।',
      'Online donations and support can be made in Nepal through eSewa and from abroad through PayPal.'
    ),
    paragraphs: P(
      'नेपालमा eSewa मार्फत अनलाइन दान तथा सहयोग गर्न सकिने व्यवस्था रहेको उल्लेख छ।',
      'विदेशबाट PayPal मार्फत अनलाइन दान तथा सहयोग गर्न सकिने व्यवस्था रहेको उल्लेख छ।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-institutional',
    order: 6,
    title: L('संस्था तथा सरकारी निकायको सहयोग', 'Support from Organisations and Government Bodies'),
    desc: L(
      'मन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था तथा दाताहरूको योगदान रहेको छ।',
      'Various government bodies, organisations and donors have contributed to the conservation, restoration and management of the temple.'
    ),
    paragraphs: P(
      'विशेषगरी पुरातत्व विभाग, काठमाडौं महानगरपालिका वडा नं. ९, बागमती प्रदेश तथा अन्य सहयोगी संस्था र दाताहरूको योगदान रहेको छ।',
      'वि.सं. २०७८ मा बागमती प्रदेशबाट दक्षिणतर्फको रिटेनिङ वाल निर्माणका लागि रु. २५,००,००० सहयोग प्राप्त भएको।',
      'वि.सं. २०७६/७७ मा पुरातत्व विभागको सहयोगमा पश्चिमतर्फको सत्तल निर्माण गरिएको।',
      'वि.सं. २०८० मा काठमाडौं महानगरपालिका वडा नं. ९ को सहयोगमा सिँढी, ढुंगाका स्ल्याब, शौचालय तथा रंगरोगनका कार्यहरू गरिएको।',
      'वि.सं. २०८१ मा वडा नं. ९ को सहयोगमा रंगरोगन गरिएको।'
    ),
    listTitle: E,
    points: [],
    enabled: true,
  },
  {
    key: 'donate-call',
    order: 7,
    title: L('मन्दिर संरक्षणमा सहयोग', 'Support for Temple Conservation'),
    desc: L(
      'मन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था, दाता, भक्तजन तथा शुभेच्छुकहरूको सहयोग रहेको उल्लेख छ।',
      'Various government bodies, organisations, donors, devotees and well-wishers have supported the conservation, restoration and management of the temple.'
    ),
    paragraphs: P(),
    listTitle: E,
    points: [],
    enabled: true,
  },
];

module.exports = {
  DONATE_PAGE_TITLE,
  DONATE_INTRO,
  DEFAULT_DONATE_CONTENT,
};
