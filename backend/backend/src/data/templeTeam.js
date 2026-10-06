/**
 * Published content for the Team page ("कार्यसमिति तथा सदस्यहरू").
 *
 *  - DEFAULT_TEAM_MEMBERS  -> seeded into the Team collection
 *  - TEAM_PAGE_TITLE       -> AdminSettings.teamPageTitle (the page heading)
 *  - DEFAULT_TEAM_CONTENT  -> AdminSettings.teamContent (the prose sections)
 *
 * Every string is localized. `ne` holds the published Nepali text and `en` an
 * English translation; `hi` / `zh` / `ta` are left empty on purpose and fall
 * back to English until they are filled in from Admin → Team.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

const P = (p1 = '', p2 = '', p3 = '', p4 = '') => ({
  p1: L(p1, ''),
  p2: L(p2, ''),
  p3: L(p3, ''),
  p4: L(p4, ''),
});

const E = L('', '');

/* ── Page heading ───────────────────────────────────────────────────────── */
const TEAM_PAGE_TITLE = L('कार्यसमिति तथा सदस्यहरू', 'Committee and Members');

/* ── वर्तमान कार्यसमिति ────────────────────────────────────────────────── */
/* `roleType` drives the icon/badge; `role` holds the printed designation.  */
const DESIGNATION = {
  adhyaksha: { ne: 'अध्यक्ष', en: 'Chairman' },
  upadhyaksha: { ne: 'उपाध्यक्ष', en: 'Vice Chairman' },
  sadasyaSachiv: { ne: 'सदस्य–सचिव', en: 'Member Secretary' },
  koshadhyaksha: { ne: 'कोषाध्यक्ष', en: 'Treasurer' },
  pratinidhi: { ne: 'प्रतिनिधि सदस्य', en: 'Representative Member' },
  sadasya: { ne: 'सदस्य', en: 'Member' },
};

const D = (key) => L(DESIGNATION[key].ne, DESIGNATION[key].en);

const DEFAULT_TEAM_MEMBERS = [
  {
    seedKey: 'committee-01',
    name: L('डा. गोविन्द टण्डन', 'Dr. Govind Tandan'),
    role: D('adhyaksha'),
    roleType: 'president',
    order: 0,
  },
  {
    seedKey: 'committee-02',
    name: L('पुण्य प्रसाद लोहनी', 'Punya Prasad Lohani'),
    role: D('upadhyaksha'),
    roleType: 'vicePresident',
    order: 1,
  },
  {
    seedKey: 'committee-03',
    name: L('केशव घिमिरे खत्री', 'Keshav Ghimire Khetri'),
    role: D('sadasyaSachiv'),
    roleType: 'secretary',
    order: 2,
  },
  {
    seedKey: 'committee-04',
    name: L('सागर प्रसाद सिग्देल', 'Sagar Prasad Sigdel'),
    role: D('koshadhyaksha'),
    roleType: 'treasurer',
    order: 3,
  },
  {
    seedKey: 'committee-05',
    name: L('संगीता श्रेष्ठ एन्ड हाउस', 'Sangita Shrestha and House'),
    role: D('sadasya'),
    roleType: 'member',
    order: 4,
  },
  {
    seedKey: 'committee-06',
    name: L('केशवध्वज राणा', 'Keshabdhwaj Rana'),
    role: D('pratinidhi'),
    roleType: 'coCoordinator',
    order: 5,
  },
  {
    seedKey: 'committee-07',
    name: L('बालध्वज राणा', 'Baladhwaj Rana'),
    role: D('pratinidhi'),
    roleType: 'coCoordinator',
    order: 6,
  },
  {
    seedKey: 'committee-08',
    name: L('शम्भुध्वज राणा', 'Shambudhwaj Rana'),
    role: D('pratinidhi'),
    roleType: 'coCoordinator',
    order: 7,
  },
  {
    seedKey: 'committee-09',
    name: L('गोपाल मल्ल', 'Gopal Mall'),
    role: D('sadasya'),
    roleType: 'member',
    order: 8,
  },
  {
    seedKey: 'committee-10',
    name: L('अञ्जन राज भण्डारी', 'Anjan Raj Bhandari'),
    role: D('sadasya'),
    roleType: 'member',
    order: 9,
  },
];

/* ── Committee prose sections ───────────────────────────────────────────── */
const DEFAULT_TEAM_CONTENT = [
  {
    key: 'committee-about',
    order: 0,
    title: L('श्रीरामचन्द्रमन्दिर जीर्णोद्धार तथा प्रवर्द्धन समिति', 'Shree Ramchandra Temple Renovation and Development Committee'),
    paragraphs: P(
      'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा प्रवर्द्धनका लागि वि.सं. २०४८ मा श्रीरामचन्द्रमन्दिर जीर्णोद्धार तथा प्रवर्द्धन समिति गठन तथा दर्ता गरिएको थियो।',
      'समितिको पहल डा. गोविन्द टण्डनको नेतृत्वमा अघि बढेको उल्लेख छ।'
    ),
    listTitle: E,
    points: [],
    // render the committee member list at this position
    showMembers: true,
    enabled: true
  },
  {
    key: 'committee-objectives',
    order: 1,
    title: L('समितिका उद्देश्य', 'Objectives of the Committee'),
    paragraphs: P(),
    listTitle: E,
    points: [
      L('धार्मिक तथा सांस्कृतिक परम्पराको संरक्षण गर्ने।', 'To conserve the religious and cultural tradition.'),
      L('मन्दिर तथा परिसरको योजनाबद्ध संरक्षण तथा व्यवस्थापन गर्ने।', 'To carry out planned conservation and management of the temple and its complex.'),
      L('भक्तजन तथा पर्यटकका लागि आवश्यक सुविधा उपलब्ध गराउने।', 'To provide necessary facilities for devotees and visitors.'),
      L('मन्दिरबाट प्राप्त हुने दान तथा आम्दानीलाई सामाजिक तथा राष्ट्रिय सेवामा उपयोग गर्ने।', 'To use donations and income from the temple for social and national service.')
    ],
    showMembers: false,
    enabled: true
  },
  {
    key: 'committee-role',
    order: 2,
    title: L('समितिको संरक्षण तथा व्यवस्थापनमा भूमिका', 'Role of the Committee in Conservation and Management'),
    paragraphs: P(
      'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था, दाता, भक्तजन तथा शुभेच्छुकहरूको सहयोग रहेको छ।',
      'विशेषगरी पुरातत्व विभाग, काठमाडौं महानगरपालिका वडा नं. ९, बागमती प्रदेश तथा अन्य सहयोगी संस्था र दाताहरूको योगदान रहेको छ।'
    ),
    listTitle: E,
    points: [],
    showMembers: false,
    enabled: true
  },
];

module.exports = {
  TEAM_PAGE_TITLE,
  DEFAULT_TEAM_MEMBERS,
  DEFAULT_TEAM_CONTENT,
};
