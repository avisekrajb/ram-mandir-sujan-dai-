/**
 * Published content for the Booking page ("पूजा तथा धार्मिक कार्यक्रम बुकिङ").
 *
 * Stored in AdminSettings.bookingContent. Each entry is one heading with
 * paragraphs and an optional bulleted list.
 *
 * Two extra fields shape the page:
 *   - `group`   : optional parent heading, printed once above its sections
 *   - `showForm`: renders the actual booking form at that position
 *
 * `ne` holds the published Nepali text and `en` an English translation; `hi` /
 * `zh` / `ta` are left empty on purpose and fall back to English until they are
 * filled in from Admin → Bookings.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

const P = (p1 = '', p2 = '', p3 = '', p4 = '') => ({
  p1: L(p1, ''),
  p2: L(p2, ''),
  p3: L(p3, ''),
  p4: L(p4, ''),
});

const E = L('', '');

const DEFAULT_BOOKING_CONTENT = [
  {
    key: 'booking-intro',
    order: 0,
    title: L('पूजा तथा धार्मिक कार्यक्रम बुकिङ', 'Puja and Religious Program Booking'),
    paragraphs: P(
      'श्रीरामचन्द्रमन्दिरमा दैनिक पूजा तथा आरतीसँगै विभिन्न धार्मिक, आध्यात्मिक तथा सांस्कृतिक पूजा, अनुष्ठान र कार्यक्रमहरू सञ्चालन हुँदै आएका छन्।',
      'भक्तजन तथा सेवाग्राहीहरूले उपलब्ध धार्मिक तथा सामाजिक कार्यक्रमका लागि बुकिङ गर्न सक्नेछन्।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'main-rituals',
    order: 1,
    title: L('मुख्य पूजा तथा धार्मिक अनुष्ठान', 'Main Puja and Religious Rituals'),
    paragraphs: P(),
    listTitle: E,
    points: [
      L('रामनवमी अर्चना', 'Ram Navami Archana'),
      L('भगवत् पूजा', 'Bhagwat Puja'),
      L('अखण्ड रामायण पाठ', 'Akhand Ramayan Path'),
      L('नवग्रह जप', 'Navagraha Japa'),
      L('सत्यनारायण पूजा', 'Saty Narayan Puja'),
      L('त्रिरुमाञ्जन', 'Tri Ramanjan'),
      L('राम–सीता पूजा', 'Ram–Sita Puja'),
      L('हनुमान चालीसा', 'Hanuman Chaalisa'),
      L('विष्णु सहस्रनाम', 'Vishnu Sahasranama'),
      L('तुलसी अर्चना', 'Tulsi Archana'),
      L('बिहानको भोग', 'Morning Bhog'),
      L('एकादशी व्रत तथा अर्पण', 'Ekadashi Vrat and Offering'),
      L('आरती', 'Aarti')
    ],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'special-programs',
    order: 2,
    title: L('विशेष धार्मिक तथा सांस्कृतिक कार्यक्रम', 'Special Religious and Cultural Programs'),
    paragraphs: P(),
    listTitle: E,
    points: [
      L('अन्नकूट/गोवर्धन पूजा', 'Annakoot / Govardhan Puja'),
      L('राम–सीता विवाह महोत्सव (विवाह पञ्चमी)', 'Ram–Sita Wedding Festival (Vivah Panchami)'),
      L('योग तथा ध्यान', 'Yoga and Meditation'),
      L('साधना–सन्ध्या', 'Sadhana–Sandhya'),
      L('बालविहार', 'Bal Bibhar'),
      L('रामनवमीसँग सम्बन्धित धार्मिक तथा सांगीतिक कार्यक्रम', 'Religious and musical programs related to Ram Navami')
    ],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'religious-social',
    order: 3,
    title: L('धार्मिक तथा सामाजिक कार्यक्रम', 'Religious and Social Programs'),
    paragraphs: P(
      'मन्दिर परिसरमा निम्न धार्मिक तथा सामाजिक कार्यक्रमहरू आयोजना गर्न सकिन्छ:'
    ),
    listTitle: E,
    points: [
      L('विवाह', 'Wedding'),
      L('व्रतबन्ध', 'Bratabandha'),
      L('पास्नी', 'Pasni'),
      L('इन्गेजमेन्ट', 'Engagement'),
      L('जन्मदिन', 'Birthday'),
      L('वार्षिकोत्सव', 'Anniversary')
    ],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'other-programs',
    order: 4,
    title: L('अन्य कार्यक्रम', 'Other Programs'),
    paragraphs: P('मन्दिर परिसरमा निम्न कार्यक्रमहरू पनि आयोजना हुने उल्लेख छ:'),
    listTitle: E,
    points: [
      L('सभा तथा सेमिनार', 'Meetings and Seminars'),
      L('फिल्म तथा म्युजिक भिडियो छायांकन', 'Film and Music Video Shooting')
    ],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'daily-aarti',
    order: 5,
    title: L('नियमित पूजा तथा आरती', 'Regular Puja and Aarti'),
    paragraphs: P(
      'मन्दिरमा दैनिक सेवा बिहान ५:०० बजेबाट प्रारम्भ हुन्छ। बिहान करिब ८:३० बजे स्नान तथा अभिषेक र बिहान ९:०० बजे आरती तथा भोग गरिन्छ।',
      'साँझको आरती गर्मी समयमा साँझ ६:०० बजे तथा जाडो समयमा साँझ ५:३० बजे गरिन्छ।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'monthly-special',
    order: 6,
    title: L('मासिक तथा विशेष पूजा', 'Monthly and Special Puja'),
    paragraphs: P(
      'प्रत्येक संक्रान्तिमा त्रिरुमाञ्जन विशेष पूजा गरिन्छ। विभिन्न धार्मिक अवसर तथा पर्वहरूमा विशेष पूजा तथा अनुष्ठानहरू आयोजना गरिन्छ।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'sadhana-sandhya',
    order: 7,
    title: L('साधना–सन्ध्या', 'Sadhana–Sandhya'),
    paragraphs: P(
      'अमावस्याका दिनहरूमा साँझ ४:०० बजेदेखि ७:०० बजेसम्म साधना–सन्ध्या कार्यक्रम सञ्चालन हुँदै आएको छ। यस कार्यक्रममा भक्तिगीत तथा शास्त्रीय संगीत प्रस्तुत गरिन्छ।',
      'वि.सं. २०७६ देखि २०७९ सम्म कोभिड–१९ का कारण यो कार्यक्रम स्थगित भएको थियो। वि.सं. २०८० मा नेपाल ललितकला क्याम्पससँगको सहकार्यमा कार्यक्रम पुनः सञ्चालन गरिएको हो।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'bal-bibhar',
    order: 8,
    title: L('बालविहार', 'Bal Bibhar'),
    paragraphs: P(
      'प्रत्येक शनिबार साँझ ४:०० बजेदेखि ५:०० बजेसम्म ६ देखि १६ वर्ष उमेर समूहका बालबालिका तथा किशोरकिशोरीका लागि बालविहार कार्यक्रम सञ्चालन गरिन्छ।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'ayodhya',
    order: 9,
    title: L(
      'अयोध्यामा श्रीराम मूर्ति प्राणप्रतिष्ठा विशेष पूजा',
      'Special Puja for the Pratishtha of Lord Ram\'s Idol in Ayodhya'
    ),
    paragraphs: P(
      'अयोध्यामा श्रीरामको मूर्ति प्राणप्रतिष्ठा भएको अवसरमा वि.सं. २०८० माघ ८ गते विशेष पूजा आयोजना गरिएको थियो।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'program-fees',
    order: 10,
    title: L('कार्यक्रम तथा सेवा सम्बन्धी व्यवस्था', 'Programs and Service Arrangements'),
    paragraphs: P(
      'मन्दिरमा विवाह, व्रतबन्ध, पास्नी, चौरासी पूजा, जन्मदिन, वार्षिकोत्सव लगायतका धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'food',
    order: 11,
    title: L('भोजन सम्बन्धी व्यवस्था', 'Food Arrangements'),
    paragraphs: P('मन्दिर परिसरमा शाकाहारी भोजन मात्र स्वीकार गरिन्छ।'),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'prohibited',
    order: 12,
    title: L('निषेधित विषय', 'Prohibited Items'),
    paragraphs: P(
      'मन्दिर परिसरमा मदिरा, मासु तथा विदेशी संगीत प्रयोग गर्न निषेध गरिएको छ।'
    ),
    listTitle: E,
    points: [],
    group: E,
    showForm: false,
    enabled: true
  },
  {
    key: 'booking-form',
    order: 13,
    title: L('बुकिङ फाराम', 'Booking Form'),
    paragraphs: P(),
    listTitle: E,
    points: [
      L('नाम', 'Name'),
      L('फोन नम्बर', 'Phone Number'),
      L('कार्यक्रम/पूजाको प्रकार', 'Program / Puja Type'),
      L('मिति', 'Date'),
      L('विवरण', 'Description')
    ],
    group: E,
    // the real booking form is rendered at this position
    showForm: true,
    enabled: true
  },
  {
    key: 'available-rituals',
    order: 14,
    title: L('पूजा तथा अनुष्ठान', 'Puja and Rituals'),
    paragraphs: P(
      'रामनवमी अर्चना, भगवत् पूजा, अखण्ड रामायण पाठ, नवग्रह जप, सत्यनारायण पूजा, त्रिरुमाञ्जन, राम–सीता पूजा, हनुमान चालीसा, विष्णु सहस्रनाम, तुलसी अर्चना, बिहानको भोग, एकादशी व्रत तथा अर्पण र आरती।'
    ),
    listTitle: E,
    points: [],
    group: L('बुकिङका लागि उपलब्ध कार्यक्रम', 'Programs Available for Booking'),
    showForm: false,
    enabled: true
  },
  {
    key: 'available-special',
    order: 15,
    title: L('विशेष कार्यक्रम', 'Special Programs'),
    paragraphs: P(
      'अन्नकूट/गोवर्धन पूजा तथा राम–सीता विवाह महोत्सव (विवाह पञ्चमी)।'
    ),
    listTitle: E,
    points: [],
    group: L('बुकिङका लागि उपलब्ध कार्यक्रम', 'Programs Available for Booking'),
    showForm: false,
    enabled: true
  },
  {
    key: 'available-social',
    order: 16,
    title: L('धार्मिक तथा सामाजिक कार्यक्रम', 'Religious and Social Programs'),
    paragraphs: P('विवाह, व्रतबन्ध, पास्नी, इन्गेजमेन्ट, जन्मदिन तथा वार्षिकोत्सव।'),
    listTitle: E,
    points: [],
    group: L('बुकिङका लागि उपलब्ध कार्यक्रम', 'Programs Available for Booking'),
    showForm: false,
    enabled: true
  },
  {
    key: 'available-other',
    order: 17,
    title: L('अन्य कार्यक्रम', 'Other Programs'),
    paragraphs: P(
      'योग तथा ध्यान, सभा तथा सेमिनार तथा फिल्म तथा म्युजिक भिडियो छायांकन।'
    ),
    listTitle: E,
    points: [],
    group: L('बुकिङका लागि उपलब्ध कार्यक्रम', 'Programs Available for Booking'),
    showForm: false,
    enabled: true
  }
];

module.exports = { DEFAULT_BOOKING_CONTENT };
