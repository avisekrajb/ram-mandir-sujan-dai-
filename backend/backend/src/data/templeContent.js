/**
 * Published content for the temple ("श्रीरामचन्द्रमन्दिर").
 *
 * Where each block lives:
 *   - हाम्रो परिचय                          -> introText
 *   - धार्मिक महत्व ... हाम्रो प्रतिबद्धता      -> sections
 *   - साधना–सन्ध्या, बालविहार                 -> Event.seedKey (Events page)
 *   - आयोजना गर्न सकिने कार्यक्रम              -> AdminSettings.pujaTypes (Book Puja)
 *
 * Every string is localized. `ne` holds the published Nepali text and `en` an
 * English translation; `hi` / `zh` / `ta` are left empty on purpose and fall
 * back to English until they are filled in from the admin panel.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

/* ── हाम्रो परिचय → introText ───────────────────────────────────────────── */
const INTRO_TEXT = L(
  'काठमाडौंको बत्तीसपुतलीस्थित श्रीरामचन्द्रमन्दिर भगवान् श्रीरामप्रति समर्पित महत्वपूर्ण धार्मिक, सांस्कृतिक, ऐतिहासिक तथा पुरातात्त्विक स्थल हो। पशुपतिक्षेत्रको दक्षिण–पश्चिमतर्फको थुम्कामा अवस्थित यस मन्दिरको स्थापना वि.सं. १९२८ मा कम्याण्डर कर्णेल सनकसिंह टण्डनले गरेको विवरणमा उल्लेख गरिएको छ। मन्दिरमा श्रीराम, श्रीसीता, श्रीलक्ष्मण, श्रीभरत र श्रीशत्रुघ्नका मूर्तिहरू मुख्य गर्भगृहमा प्रतिष्ठापित छन्।',
  'Shree Ramchandra Temple, located in Battisputali, Kathmandu, is an important religious, cultural, historical and archaeological site dedicated to Lord Ram. Situated in Thumka, south-west of Pashupati, the temple is recorded as having been established in 1928 VS by Commander Karnel Sanaksinh Tandan. The idols of Lord Ram, Sita, Lakshman, Bharat and Shatrughna are enshrined in the main sanctum sanctorum.'
);

const emptyParagraphs = () => ({ p1: L('', ''), p2: L('', ''), p3: L('', ''), p4: L('', '') });

/* ── sections ───────────────────────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
  {
    key: 'dharmik_mahattwa',
    title: L('धार्मिक महत्व', 'Religious Significance'),
    // kept in sync with p1 so older readers still get the opening paragraph
    body: L(
      'श्रीरामचन्द्रमन्दिरमा भगवान् श्रीराम, माता सीता, लक्ष्मण, भरत, शत्रुघ्न तथा हनुमानको आराधना गरिन्छ।',
      'Lord Ram, Mata Sita, Lakshman, Bharat, Shatrughna and Hanuman are worshipped at Shree Ramchandra Temple.'
    ),
    paragraphs: {
      p1: L(
        'श्रीरामचन्द्रमन्दिरमा भगवान् श्रीराम, माता सीता, लक्ष्मण, भरत, शत्रुघ्न तथा हनुमानको आराधना गरिन्छ।',
        'Lord Ram, Mata Sita, Lakshman, Bharat, Shatrughna and Hanuman are worshipped at Shree Ramchandra Temple.'
      ),
      p2: L(
        'मन्दिरमा दैनिक पूजा, आरती, भोग, अभिषेक तथा विभिन्न विशेष धार्मिक अनुष्ठान सञ्चालन हुन्छन्।',
        'Daily puja, aarti, bhog, abhishek and various special religious rituals are performed at the temple.'
      ),
      p3: L(
        'तपाईंहरूको भक्तिसेवामा समर्पित यी सेवाहरू मन्दिरमा नियमित रूपमा समावेश गरिएका छन्।',
        'Dedicated to the devotion of the devotees, these services are regularly included in the temple routine.'
      ),
      p4: L('', '')
    },
    listTitle: L('मुख्य धार्मिक सेवाहरू:', 'Main religious services include:'),
    points: [
      L('श्रीराम–सीता पूजा', 'Shree Ram–Sita Puja'),
      L('हनुमान चालिसा', 'Hanuman Chaalisha'),
      L('विष्णु सहस्रनाम', 'Vishnu Sahasranama'),
      L('तुलसी अर्चना', 'Tulsi Archana'),
      L('नवग्रह जप', 'Navagraha Japa'),
      L('सत्यनारायण पूजा', 'Saty Narayan Puja'),
      L('अखण्ड रामायण पाठ', 'Akhand Ramayan Path'),
      L('भगवत् पूजा', 'Bhagwat Puja'),
      L('रामनवमी अर्चना', 'Ram Navami Archana'),
      L('त्रिरुमाञ्जन', 'Tri Ramanjan'),
      L('आरती', 'Aarti'),
      L('एकादशी विशेष भोग', 'Ekadashi Special Bhog')
    ],
    image: '/1.jpg',
    order: 0,
    enabled: true
  },
  {
    key: 'dainik_puja_aarti',
    title: L('दैनिक पूजा तथा आरती', 'Daily Puja and Aarti'),
    body: L(
      'मन्दिरमा दैनिक धार्मिक सेवा बिहान करिब ५ बजेदेखि सुरु हुने विवरणमा उल्लेख गरिएको छ।',
      'Daily religious services at the temple begin at around 5:00 AM, as recorded in the available description.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिरमा दैनिक धार्मिक सेवा बिहान करिब ५ बजेदेखि सुरु हुने विवरणमा उल्लेख गरिएको छ।',
        'Daily religious services at the temple begin at around 5:00 AM, as recorded in the available description.'
      ),
      p2: L(
        'करिब बिहान ८:३० बजे स्नान तथा अभिषेक र बिहान ९ बजे आरती तथा भोगको व्यवस्था हुन्छ।',
        'Bathing and abhishek take place at around 8:30 AM, followed by aarti and bhog at around 9:00 AM.'
      ),
      p3: L(
        'साँझको आरती याम्रा अनुसार समयमा हुने उल्लेख गरिएको छ।',
        'The evening aarti is held at the time stated, according to the season.'
      ),
      p4: L('', '')
    },
    listTitle: L('साँझको आरती:', 'Evening aarti:'),
    points: [
      L('गर्मी समयमा: साँझ ६:०० बजे', 'Summer season: 6:00 PM'),
      L('जाडो समयमा: साँझ ५:३० बजे', 'Winter season: 5:30 PM')
    ],
    image: '/2.jpg',
    order: 1,
    enabled: true
  },
  {
    key: 'vishesh_dharmik_karyakram',
    title: L('विशेष धार्मिक कार्यक्रम', 'Special Religious Programs'),
    body: L(
      'वर्षभरि रामनवमी, विवाहपञ्चमी, एकादशी, संक्रान्ति तथा अन्य धार्मिक अवसरमा विशेष पूजा तथा कार्यक्रम सञ्चालन हुन्छन्।',
      'Throughout the year, special puja and programs are organized on Ram Navami, Vivah Panchami, Ekadashi, Sankranti and other religious occasions.'
    ),
    paragraphs: {
      p1: L(
        'वर्षभरि रामनवमी, विवाहपञ्चमी, एकादशी, संक्रान्ति तथा अन्य धार्मिक अवसरमा विशेष पूजा तथा कार्यक्रम सञ्चालन हुन्छन्।',
        'Throughout the year, special puja and programs are organized on Ram Navami, Vivah Panchami, Ekadashi, Sankranti and other religious occasions.'
      ),
      p2: L(
        'प्रत्येक संक्रान्तिमा विशेष त्रिरुमाञ्जन पूजा गरिने उल्लेख गरिएको छ।',
        'A special Tri Ramanjan puja is performed on every Sankranti, as mentioned in the records.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('', ''),
    points: [],
    image: '/3.jpg',
    order: 2,
    enabled: true
  },
  {
    key: 'mandir_parisar',
    title: L('मन्दिर परिसर', 'Temple Complex'),
    body: L(
      'मन्दिर परिसरमा मुख्य श्रीरामचन्द्र मन्दिरसँगै हनुमान मन्दिर, विभिन्न शिवालय, नारायण मन्दिर तथा अन्य धार्मिक संरचनाहरू रहेका छन्।',
      'Along with the main Shree Ramchandra Temple, the complex houses a Hanuman temple, various Shiva temples, a Narayan temple and other religious structures.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिर परिसरमा मुख्य श्रीरामचन्द्र मन्दिरसँगै हनुमान मन्दिर, विभिन्न शिवालय, नारायण मन्दिर तथा अन्य धार्मिक संरचनाहरू रहेका छन्।',
        'Along with the main Shree Ramchandra Temple, the complex houses a Hanuman temple, various Shiva temples, a Narayan temple and other religious structures.'
      ),
      p2: L(
        'परिसरका यी शिवालयहरू मन्दिरको पवित्र वातावरणलाई अझ सुन्दर बनाउँदै छन्।',
        'These Shiva temples further enhance the sacred atmosphere of the complex.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('परिसरका महत्वपूर्ण शिवालयहरू:', 'Important Shiva temples in the complex:'),
    points: [
      L('श्रीसनकसिंहेश्वर', 'Shree Sanakasingheshwar'),
      L('श्रीशारदादेश्वर', 'Shree Sharada Deshwar'),
      L('श्रीसन्तकुमारेश्वर', 'Shree Sant Kumareshwar'),
      L('श्रीबालकुमारेश्वर', 'Shree Balakumareshwar'),
      L('श्रीहर्षकुमारेश्वर', 'Shree Harshakumareshwar'),
      L('श्रीयशोधरादेश्वर', 'Shree Yashodharadeshwar'),
      L('श्रीलक्ष्मीकुमारेश्वर', 'Shree Laxmikumareshwar')
    ],
    image: '/4.jpg',
    order: 3,
    enabled: true
  },
  {
    key: 'dharmik_sanskrutik_gatividhi',
    title: L('धार्मिक तथा सांस्कृतिक गतिविधि', 'Religious and Cultural Activities'),
    body: L(
      'मन्दिरमा पूजा तथा धार्मिक अनुष्ठानका अतिरिक्त विभिन्न सांस्कृतिक तथा सामाजिक गतिविधि सञ्चालन हुँदै आएका छन्।',
      'Along with puja and religious rituals, a range of cultural and social activities are carried out at the temple.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिरमा पूजा तथा धार्मिक अनुष्ठानका अतिरिक्त विभिन्न सांस्कृतिक तथा सामाजिक गतिविधि सञ्चालन हुँदै आएका छन्।',
        'Along with puja and religious rituals, a range of cultural and social activities are carried out at the temple.'
      ),
      p2: L(
        'यी सबै कार्यक्रम भक्तजनको भक्तिसेवामा समर्पित छन्।',
        'All of these programs are dedicated to the service of the devotees.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L(
      'मन्दिरमा पूजा तथा धार्मिक अनुष्ठानका अतिरिक्त:',
      'In addition to puja and religious rituals, the temple runs:'
    ),
    points: [
      L('साधना–सन्ध्या', 'Sadhana–Sandhya'),
      L('बालविहार', 'Bal Bibhar'),
      L('योग तथा ध्यान', 'Yoga and meditation'),
      L('धार्मिक प्रवचन/कार्यक्रम', 'Religious discourses and programs'),
      L('शास्त्रीय तथा भक्तिमूलक संगीत', 'Classical and devotional music'),
      L('रामायणसम्बन्धी कार्यक्रम', 'Ramayan-related programs'),
      L('सांस्कृतिक कार्यक्रम', 'Cultural programs')
    ],
    image: '/1.jpg',
    order: 4,
    enabled: true
  },
  {
    key: 'samajik_sanskrutik_seva',
    title: L('सामाजिक तथा सांस्कृतिक सेवा', 'Social and Cultural Service'),
    body: L(
      'मन्दिरलाई पूजा गर्ने स्थान मात्र नभई सामाजिक तथा सांस्कृतिक गतिविधिको केन्द्रका रूपमा पनि विकास गर्ने उद्देश्य राखिएको छ।',
      'The temple is intended to develop not only as a place of worship but also as a centre of social and cultural activity.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिरलाई पूजा गर्ने स्थान मात्र नभई सामाजिक तथा सांस्कृतिक गतिविधिको केन्द्रका रूपमा पनि विकास गर्ने उद्देश्य राखिएको छ।',
        'The temple is intended to develop not only as a place of worship but also as a centre of social and cultural activity.'
      ),
      p2: L(
        'दान तथा मन्दिरबाट प्राप्त आम्दानीलाई सामाजिक तथा राष्ट्रिय सेवामा उपयोग गर्ने उद्देश्य समितिले राखेको विवरणमा उल्लेख गरिएको छ।',
        'The committee is recorded as intending to use donations and income from the temple for social and national service.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('', ''),
    points: [],
    image: '/2.jpg',
    order: 5,
    enabled: true
  },
  {
    key: 'bhojan_byavastha',
    title: L('भोजन व्यवस्था', 'Food Arrangements'),
    body: L(
      'मन्दिरको धार्मिक वातावरण र परम्पराअनुसार शाकाहारी भोजनको व्यवस्था गरिन्छ।',
      'Vegetarian food is served in keeping with the religious atmosphere and tradition of the temple.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिरको धार्मिक वातावरण र परम्पराअनुसार शाकाहारी भोजनको व्यवस्था गरिन्छ।',
        'Vegetarian food is served in keeping with the religious atmosphere and tradition of the temple.'
      ),
      p2: L(
        'मन्दिर परिसरमा यी पदार्थ तथा संगीतलाई अनुमति नदिने व्यवस्था रहेको विवरणमा उल्लेख गरिएको छ।',
        'It is recorded that the following items and music are not permitted in the temple complex.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('मन्दिर परिसरमा:', 'In the temple complex:'),
    points: [
      L('मांसाहारी भोजन', 'Non-vegetarian food'),
      L('मदिरा', 'Alcohol'),
      L('अन्य निषेधित पदार्थ', 'Other prohibited items'),
      L('धार्मिक वातावरणसँग नमिल्ने विदेशी/अनुचित संगीत', 'Foreign or inappropriate music that does not suit the religious atmosphere')
    ],
    image: '/3.jpg',
    order: 6,
    enabled: true
  },
  {
    key: 'sanrakshan_byavasthan',
    title: L('संरक्षण र व्यवस्थापन', 'Conservation and Management'),
    body: L(
      'मन्दिरको संरक्षण तथा व्यवस्थापनका लागि वि.सं. २०४८ मा श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति गठन गरिएको विवरणमा उल्लेख गरिएको छ।',
      'It is recorded that the Shree Ramchandra Temple Renovation and Development Committee was formed in 2048 VS for the conservation and management of the temple.'
    ),
    paragraphs: {
      p1: L(
        'मन्दिरको संरक्षण तथा व्यवस्थापनका लागि वि.सं. २०४८ मा श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति गठन गरिएको विवरणमा उल्लेख गरिएको छ।',
        'It is recorded that the Shree Ramchandra Temple Renovation and Development Committee was formed in 2048 VS for the conservation and management of the temple.'
      ),
      p2: L(
        'समितिको उद्देश्य मन्दिरको धार्मिक परम्परा जोगाउनुका साथै ऐतिहासिक संरचना संरक्षण, भक्तजनका लागि सुविधा विकास र व्यवस्थित व्यवस्थापन गर्नु हो।',
        'The committee aims to safeguard the religious tradition of the temple, conserve its historic structures, develop facilities for devotees and ensure systematic management.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('', ''),
    points: [],
    image: '/4.jpg',
    order: 7,
    enabled: true
  },
  {
    key: 'pratibaddata',
    title: L('हाम्रो प्रतिबद्धता', 'Our Commitment'),
    body: L(
      'श्रीरामचन्द्रमन्दिरको धार्मिक आस्था, सांस्कृतिक परम्परा, ऐतिहासिक पहिचान, वास्तुकला तथा पुरातात्त्विक महत्वलाई संरक्षण गर्दै आगामी पुस्तासम्म पुर्‍याउने हाम्रो प्रमुख उद्देश्य हो।',
      'Our chief purpose is to preserve and pass on to future generations the religious faith, cultural tradition, historical identity, architecture and archaeological importance of Shree Ramchandra Temple.'
    ),
    paragraphs: {
      p1: L(
        'श्रीरामचन्द्रमन्दिरको धार्मिक आस्था, सांस्कृतिक परम्परा, ऐतिहासिक पहिचान, वास्तुकला तथा पुरातात्त्विक महत्वलाई संरक्षण गर्दै आगामी पुस्तासम्म पुर्‍याउने हाम्रो प्रमुख उद्देश्य हो।',
        'Our chief purpose is to preserve and pass on to future generations the religious faith, cultural tradition, historical identity, architecture and archaeological importance of Shree Ramchandra Temple.'
      ),
      p2: L(
        'धर्म, संस्कृति, मानव मूल्य र आध्यात्मिक चेतनाको संरक्षण तथा प्रवर्द्धनमा मन्दिरले निरन्तर योगदान पुर्‍याउने लक्ष्य राखेको छ।',
        'The temple aims to contribute continuously to the preservation and promotion of religion, culture, human values and spiritual consciousness.'
      ),
      p3: L('', ''),
      p4: L('', '')
    },
    listTitle: L('', ''),
    points: [],
    image: '/1.jpg',
    order: 8,
    enabled: true
  }
];

/* ── आयोजन गरिने कार्यक्रमहरू → Events ──────────────────────────────────── */
/**
 * Fourteen standing programs of the temple. `date` is required by the model,
 * so each recurring program carries a nominal upcoming date; the printed
 * information is the `period` / `yearText` pair, not the date.
 */
const P = (...texts) => texts.map((ne) => L(ne, ''));

/**
 * English for every seeded paragraph. The Nepali body text is the source of
 * truth, so the translation is looked up by the Nepali string and applied
 * after DEFAULT_EVENTS is built. Without this, the paragraphs would carry an
 * empty `en` and appear blank in Admin → Events, which opens on English.
 */
const PARAGRAPH_EN = {
  'मन्दिरमा दैनिक सेवा बिहान ५ बजेबाट सुरु हुन्छ।': 'Daily worship at the temple begins at 5 AM.',
  'बिहान करिब ८:३० बजे स्नान तथा अभिषेक गरिन्छ।': 'Around 8:30 AM the deity is bathed and anointed.',
  'बिहान ९ बजे आरती तथा भोगको व्यवस्था हुन्छ।': 'At 9 AM aarti and bhog are offered.',
  'साँझको आरती गर्मीमा ६ बजे तथा जाडोमा ५:३० बजे हुने गर्दछ।': 'The evening aarti is at 6 PM in summer and 5:30 PM in winter.',

  'प्रत्येक संक्रान्तिमा त्रिरुमञ्जन विशेष पूजा गरिन्छ।': 'Trirumanjan special puja is performed on every Sankranti.',
  'विभिन्न धार्मिक अवसर तथा पर्वहरूमा विशेष पूजा तथा अनुष्ठानहरू आयोजना गरिन्छ।': 'Special pujas and rituals are organised on various religious occasions and festivals.',

  'रामनवमी अर्चना, भगवत् पूजा, अखण्ड रामायण पाठ तथा नवग्रह जप सञ्चालन गरिन्छ।': 'Ram Navami archana, Bhagwat puja, Akhand Ramayan path and Navagraha japa are performed.',
  'सत्यनारायण पूजा, त्रिरुमञ्जन तथा राम–सीता पूजा गरिन्छ।': 'Saty Narayan puja, Trirumanjan and Ram–Sita puja are performed.',
  'हनुमान चालीसा, विष्णु सहस्रनाम तथा तुलसी अर्चना गरिन्छ।': 'Hanuman Chaalisa, Vishnu Sahasranama and Tulsi archana are performed.',
  'बिहानको भोग, एकादशी व्रत तथा अर्पण र आरती लगायतका धार्मिक गतिविधिहरू सञ्चालन गरिन्छ।': 'Religious activities including morning bhog, Ekadashi vrat with offering, and aarti are conducted.',

  'अमावस्याका दिनहरूमा साँझ ४ बजेदेखि ७ बजेसम्म साधना–सन्ध्या कार्यक्रम सञ्चालन हुँदै आएको छ।': 'Sadhana–Sandhya has been held from 4 PM to 7 PM on Amavasya nights.',
  'यस कार्यक्रममा भक्तिगीत तथा शास्त्रीय संगीत प्रस्तुत गरिन्छ।': 'Devotional songs and classical music are performed during the program.',
  'साधना–सन्ध्या कार्यक्रम वि.सं. २०७६ देखि २०७९ सम्म कोभिड–१९ का कारण रोकिएको थियो।': 'The Sadhana–Sandhya program was suspended from 2076 to 2079 BS because of Covid-19.',
  'वि.सं. २०८० मा नेपाल ललितकला क्याम्पससँगको सहकार्यमा साधना–सन्ध्या कार्यक्रम पुनः सञ्चालन गरिएको उल्लेख छ।': 'In 2080 BS the program was resumed in collaboration with Nepal Lalit Kala Campus.',

  'बालबालिका तथा किशोरकिशोरीका लागि प्रत्येक शनिबार साँझ ४ बजेदेखि ५ बजेसम्म बालविहार कार्यक्रम सञ्चालन गरिन्छ।': 'Bal Bibhar is conducted for children and teenagers every Saturday from 4 PM to 5 PM.',
  'यस कार्यक्रममा ६ देखि १६ वर्ष उमेर समूहका बालबालिका तथा किशोरकिशोरी सहभागी हुने व्यवस्था रहेको छ।': 'Children and teenagers aged 6 to 16 take part in the program.',

  'रामनवमीका अवसरमा विशेष पूजा तथा धार्मिक कार्यक्रमहरू सञ्चालन गरिन्छ।': 'Special puja and religious programs are held on the occasion of Ram Navami.',
  'रामनवमीका अवसरमा सांगीतिक कार्यक्रमहरू पनि आयोजना गरिन्छ।': 'Cultural programs are also organised on the occasion of Ram Navami.',

  'मन्दिरमा अन्नकूट/गोवर्धन पूजा आयोजना हुँदै आएको छ।': 'Annakuta / Govardhan puja is regularly held at the temple.',
  'मन्दिरमा राम–सीता विवाह महोत्सव अर्थात् विवाह पञ्चमी आयोजना हुँदै आएको छ।': 'The Ram–Sita wedding festival, known as Vivah Panchami, is held at the temple.',
  'मन्दिरमा योग तथा ध्यानसम्बन्धी गतिविधिहरू सञ्चालन हुँदै आएका छन्।': 'Yoga and meditation activities are regularly conducted at the temple.',

  'मन्दिरमा विवाह, उपनयन/व्रतबन्ध, पास्नी, इन्गेजमेन्ट, जन्मदिन तथा वार्षिकोत्सव लगायतका सामाजिक कार्यक्रमहरू आयोजना गर्न सकिने व्यवस्था रहेको छ।': 'Social programs including weddings, upanayana and bratabandha, pashni, engagement, birthdays and anniversaries can be organised at the temple.',
  'मन्दिरमा विवाह, व्रतबन्ध, चौरासी पूजा, जन्मदिन तथा वार्षिकोत्सव लगायतका धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।': 'Fees and support are received from religious and social programs including weddings, bratabandha, Chaurasi puja, birthdays and anniversaries.',

  'मन्दिर परिसरमा सेमिनार तथा बैठकहरू आयोजना गर्न सकिने व्यवस्था रहेको छ।': 'Seminars and meetings can be organised in the temple premises.',
  'मन्दिर परिसरमा फिल्म तथा म्युजिक भिडियो छायांकनका लागि पनि प्रयोग हुँदै आएको छ।': 'The temple premises are also used for film and music video shooting.',

  'मन्दिर परिसरमा शाकाहारी भोजन मात्र स्वीकार गरिन्छ।': 'Only vegetarian food is accepted within the temple premises.',
  'मन्दिरमा शाकाहारी खानपानको व्यवस्था रहेको छ।': 'Vegetarian food is provided at the temple.',
  'मदिरा, मासु तथा विदेशी संगीत प्रयोग गर्न निषेध गरिएको उल्लेख छ।': 'Alcohol, meat and foreign music are prohibited.',

  // 04 — Sadhana–Sandhya
  'यस कार्यक्रममा नेपालका ख्यातिप्राप्त भक्तिगायक तथा शास्त्रीय सङ्गीतज्ञहरूबाट कार्यक्रम सञ्चालन गरिन्छ।': 'The program is conducted by Nepal’s renowned devotional singers and classical musicians.',
  'श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति तथा श्रीराममन्दिर निजी गुठीको सहयोगमा कार्यक्रम आयोजना गरिन्छ।': 'The program is organised with the support of the Shree Ramchandra Temple Conservation and Development Committee and the Shree Ram Temple Private Trust.',
  'त्रिभुवन विश्वविद्यालयअन्तर्गत नेपाल ललितकला क्याम्पसको सहभागिता रहेको छ।': 'Nepal Lalit Kala Campus under Tribhuvan University is a collaborator in the program.',
  'नयाँ तथा पुराना प्रतिभावान गायक–गायिका एवं कलाकारहरूलाई पनि साझा मञ्चमा अवसर दिइन्छ।': 'New and established talented singers and artists are also given a chance to perform on the shared stage.',
  'काठमाडौँ उपत्यकाको सांस्कृतिक मञ्चमा कार्यक्रमको स्थान रहेको छ।': 'The program is held on a cultural stage in the Kathmandu Valley.',
  'हरेक औँसीमा शुभेच्छुकहरूको व्यापक सहभागिता रहेको छ।': 'Well-wishers take part in large numbers on every full-moon night.',
  'कोभिड–१९ को प्रभावले वि.सं. २०७६ देखि २०७९ सम्म यो कार्यक्रम सञ्चालनमा कठिनाइ भयो। तर, वि.सं. २०८० देखि पुनर्जागृत गरिएको यो कार्यक्रम त्रिभुवन विश्वविद्यालयअन्तर्गत नेपाल ललितकला क्याम्पसको सहभागिताले झन् आकर्षक बनेको छ।': 'The Covid-19 pandemic made it difficult to run the program from 2076 to 2079 BS. However, since it was revived in 2080 BS, the participation of Nepal Lalit Kala Campus under Tribhuvan University has made it far more attractive.',

  // 05 — Bal Bibhar
  'यस कार्यक्रममा ६ देखि १६ वर्ष उमेर समूहका बालबालिका तथा किशोरकिशोरी सहभागी हुने व्यवस्था रहेको छ।': 'Children and teenagers aged 6 to 16 take part in the program.',
  'कार्यक्रममा धर्म-संस्कृति र संस्कारको जानकारी तथा शिक्षा–दीक्षा सम्बन्धी विस्तृत जानकारी दिइन्छ।': 'The program provides detailed information on religion, culture and tradition, and on teaching and learning.',
  'बालबालिकामा सकारात्मक परिणाम तथा आध्यात्मिक मार्गमा प्रेरणा दिलाइन्छ।': 'It instils positive outcomes in children and inspires them on the spiritual path.',
  'सर्वोत्कृष्ट जीवन शाश्वत चिन्तन (साँचो जीवननिर्माण अभियान) अन्तर्गत यो कार्यक्रम सञ्चालन गरिएको छ।': 'The program is run under the “Best Life, Everlasting Thoughts” (Sach Jeevan Nirman Abhiyan) campaign.',
  'श्रीचिन्मय आध्यात्मिक सेवा संघको विगतमा यस कार्यक्रमलाई सहयोग प्राप्त भएको छ।': 'The program has received support from the Shri Chinmaya Spiritual Service Association in the past.',

  '२०८० साल माघ ८ गते अर्थात् जनवरी २२, २०२४ मा अयोध्यामा श्रीरामको मूर्ति प्राणप्रतिष्ठा भएको अवसरमा मन्दिरमा विशेष पूजा तथा कार्यक्रम गरिएको उल्लेख छ।': 'A special puja and program was held at the temple on the occasion of the pratishtha of Shri Ram’s idol in Ayodhya on 8 Magh 2080 BS, that is 22 January 2024.',
};

const DEFAULT_EVENTS = [
  {
    seedKey: 'daily-puja-aarti',
    seedVersion: 2,
    date: '2026-10-01',
    photo: '/1.jpg',
    upcoming: true,
    order: 1,
    yearText: '',
    period: L('दैनिक', 'Daily'),
    title: L('दैनिक पूजा तथा आरती', 'Daily Puja and Aarti'),
    desc: L(
      'मन्दिरमा दैनिक सेवा बिहान ५ बजेबाट सुरु हुन्छ। बिहान करिब ८:३० बजे स्नान तथा अभिषेक गरिन्छ र बिहान ९ बजे आरती तथा भोगको व्यवस्था हुन्छ। साँझको आरती गर्मीमा ६ बजे तथा जाडोमा ५:३० बजे हुने गर्दछ।',
      'Daily worship at the temple begins at 5 AM. Around 8:30 AM the deity is bathed and anointed, and at 9 AM aarti and bhog are offered. The evening aarti is at 6 PM in summer and 5:30 PM in winter.'
    ),
    // The description already carries all four timings, so repeating them as
    // paragraphs would print the same sentences twice.
    paragraphs: P(),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'trirumanjan-special',
    seedVersion: 2,
    date: '2026-10-08',
    photo: '/2.jpg',
    upcoming: true,
    order: 2,
    yearText: '',
    period: L('प्रत्येक संक्रान्ति तथा विभिन्न धार्मिक अवसर', 'Each Sankranti and religious occasion'),
    title: L('त्रिरुमञ्जन तथा विशेष पूजा', 'Trirumanjan and Special Puja'),
    desc: L(
      'प्रत्येक संक्रान्तिमा त्रिरुमञ्जन विशेष पूजा तथा विभिन्न धार्मिक अवसरमा विशेष पूजा तथा अनुष्ठानहरू आयोजना गरिन्छ।',
      'Trirumanjan special puja is held on every Sankranti, and special pujas and rituals are organised on various religious occasions.'
    ),
    // Both sentences were clauses of the description above.
    paragraphs: P(),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'main-rituals',
    seedVersion: 2,
    date: '2026-10-15',
    photo: '/3.jpg',
    upcoming: true,
    order: 3,
    yearText: '',
    period: L('नियमित तथा विशेष धार्मिक अवसर', 'Regular and special religious occasions'),
    title: L('मुख्य धार्मिक अनुष्ठान', 'Main Religious Rituals'),
    desc: L(
      'मन्दिरमा विभिन्न धार्मिक तथा आध्यात्मिक अनुष्ठानहरू सञ्चालन गरिन्छ।',
      'Various religious and spiritual rituals are performed at the temple.'
    ),
    paragraphs: P(
      'रामनवमी अर्चना, भगवत् पूजा, अखण्ड रामायण पाठ तथा नवग्रह जप सञ्चालन गरिन्छ।',
      'सत्यनारायण पूजा, त्रिरुमञ्जन तथा राम–सीता पूजा गरिन्छ।',
      'हनुमान चालीसा, विष्णु सहस्रनाम तथा तुलसी अर्चना गरिन्छ।',
      'बिहानको भोग, एकादशी व्रत तथा अर्पण र आरती लगायतका धार्मिक गतिविधिहरू सञ्चालन गरिन्छ।'
    ),
    // The bullet list restated these four paragraphs word for word, so only
    // the prose is kept and printed once.
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'sadhana-sandhya',
    seedVersion: 2,
    date: '2026-10-22',
    photo: '/4.jpg',
    upcoming: true,
    order: 4,
    // No year label: the program was suspended 2076–2079 and resumed in 2080,
    // so a single "2076–2080" range would misrepresent it.
    yearText: '',
    period: L('प्रत्येक अमावस्या', 'Every Amavasya'),
    title: L('साधना–सन्ध्या', 'Sadhana–Sandhya'),
    desc: L(
      'अमावस्याका दिनहरूमा साँझ ४ बजेदेखि ७ बजेसम्म साधना–सन्ध्या कार्यक्रम सञ्चालन हुँदै आएको छ, जसमा भक्तिगीत तथा शास्त्रीय संगीत प्रस्तुत गरिन्छ।',
      'Sadhana–Sandhya is held from 4 PM to 7 PM on Amavasya nights, featuring devotional songs and classical music.'
    ),
    paragraphs: P(
      'यस कार्यक्रममा नेपालका ख्यातिप्राप्त भक्तिगायक तथा शास्त्रीय सङ्गीतज्ञहरूबाट कार्यक्रम सञ्चालन गरिन्छ।',
      'श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति तथा श्रीराममन्दिर निजी गुठीको सहयोगमा कार्यक्रम आयोजना गरिन्छ।',
      'त्रिभुवन विश्वविद्यालयअन्तर्गत नेपाल ललितकला क्याम्पसको सहभागिता रहेको छ।',
      'नयाँ तथा पुराना प्रतिभावान गायक–गायिका एवं कलाकारहरूलाई पनि साझा मञ्चमा अवसर दिइन्छ।',
      'काठमाडौँ उपत्यकाको सांस्कृतिक मञ्चमा कार्यक्रमको स्थान रहेको छ।',
      'हरेक औँसीमा शुभेच्छुकहरूको व्यापक सहभागिता रहेको छ।',
      'कोभिड–१९ को प्रभावले वि.सं. २०७६ देखि २०७९ सम्म यो कार्यक्रम सञ्चालनमा कठिनाइ भयो। तर, वि.सं. २०८० देखि पुनर्जागृत गरिएको यो कार्यक्रम त्रिभुवन विश्वविद्यालयअन्तर्गत नेपाल ललितकला क्याम्पसको सहभागिताले झन् आकर्षक बनेको छ।'
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'bal-bibhar',
    seedVersion: 2,
    date: '2026-10-29',
    photo: '/5.jpg',
    upcoming: true,
    order: 5,
    yearText: '',
    period: L('प्रत्येक शनिबार', 'Every Saturday'),
    title: L('बालविहार कार्यक्रम', 'Bal Bibhar Program'),
    desc: L(
      'बालबालिका तथा किशोरकिशोरीका लागि प्रत्येक शनिबार साँझ ४ बजेदेखि ५ बजेसम्म बालविहार कार्यक्रम सञ्चालन गरिन्छ।',
      'Bal Bibhar is held for children and teenagers every Saturday from 4 PM to 5 PM.'
    ),
    paragraphs: P(
      'यस कार्यक्रममा ६ देखि १६ वर्ष उमेर समूहका बालबालिका तथा किशोरकिशोरी सहभागी हुने व्यवस्था रहेको छ।',
      'कार्यक्रममा धर्म-संस्कृति र संस्कारको जानकारी तथा शिक्षा–दीक्षा सम्बन्धी विस्तृत जानकारी दिइन्छ।',
      'बालबालिकामा सकारात्मक परिणाम तथा आध्यात्मिक मार्गमा प्रेरणा दिलाइन्छ।',
      'सर्वोत्कृष्ट जीवन शाश्वत चिन्तन (साँचो जीवननिर्माण अभियान) अन्तर्गत यो कार्यक्रम सञ्चालन गरिएको छ।',
      'श्रीचिन्मय आध्यात्मिक सेवा संघको विगतमा यस कार्यक्रमलाई सहयोग प्राप्त भएको छ।'
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'ramnavami-program',
    seedVersion: 2,
    date: '2026-11-05',
    photo: '/6.jpg',
    upcoming: true,
    order: 6,
    yearText: '',
    period: L('रामनवमी', 'Ram Navami'),
    title: L('रामनवमी विशेष कार्यक्रम', 'Ram Navami Special Program'),
    desc: L(
      'रामनवमीका अवसरमा धार्मिक तथा सांगीतिक कार्यक्रमहरू आयोजना गरिन्छ।',
      'Religious and cultural programs are organised on the occasion of Ram Navami.'
    ),
    // The two sentences below were rewrites of the description above.
    paragraphs: P(),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'annakuta-govardhan',
    seedVersion: 2,
    date: '2026-11-12',
    photo: '/7.jpg',
    upcoming: true,
    order: 7,
    yearText: '',
    period: L('धार्मिक पर्व', 'Religious festival'),
    title: L('अन्नकूट तथा गोवर्धन पूजा', 'Annakuta and Govardhan Puja'),
    desc: L(
      'मन्दिरमा अन्नकूट/गोवर्धन पूजा आयोजना हुँदै आएको छ।',
      'Annakuta / Govardhan puja is regularly held at the temple.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'ram-sita-wedding',
    seedVersion: 2,
    date: '2026-11-19',
    photo: '/8.jpg',
    upcoming: true,
    order: 8,
    yearText: '',
    period: L('विवाह पञ्चमी', 'Vivah Panchami'),
    title: L('राम–सीता विवाह महोत्सव', 'Ram–Sita Wedding Festival'),
    desc: L(
      'मन्दिरमा राम–सीता विवाह महोत्सव अर्थात् विवाह पञ्चमी आयोजना हुँदै आएको छ।',
      'The Ram–Sita wedding festival, known as Vivah Panchami, is held at the temple.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'yoga-dhyana',
    seedVersion: 2,
    date: '2026-11-26',
    photo: '/9.jpg',
    upcoming: true,
    order: 9,
    yearText: '',
    period: L('धार्मिक तथा आध्यात्मिक गतिविधि', 'Religious and spiritual activity'),
    title: L('योग तथा ध्यान', 'Yoga and Meditation'),
    desc: L(
      'मन्दिरमा योग तथा ध्यानसम्बन्धी गतिविधिहरू सञ्चालन हुँदै आएका छन्।',
      'Yoga and meditation activities are regularly conducted at the temple.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'religious-social-programs',
    seedVersion: 2,
    date: '2026-12-03',
    photo: '/10.jpg',
    upcoming: true,
    order: 10,
    yearText: '',
    period: L('धार्मिक तथा सामाजिक कार्यक्रम', 'Religious and social programs'),
    title: L('धार्मिक तथा सामाजिक कार्यक्रम', 'Religious and Social Programs'),
    desc: L(
      'मन्दिर परिसरमा विभिन्न धार्मिक तथा सामाजिक कार्यक्रमहरू आयोजना गर्न सकिने व्यवस्था रहेको छ।',
      'Various religious and social programs can be organised in the temple premises.'
    ),
    paragraphs: P(
      'मन्दिरमा विवाह, उपनयन/व्रतबन्ध, पास्नी, इन्गेजमेन्ट, जन्मदिन तथा वार्षिकोत्सव लगायतका सामाजिक कार्यक्रमहरू आयोजना गर्न सकिने व्यवस्था रहेको छ।',
      'मन्दिरमा विवाह, व्रतबन्ध, चौरासी पूजा, जन्मदिन तथा वार्षिकोत्सव लगायतका धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।'
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'seminar-meeting',
    seedVersion: 2,
    date: '2026-12-10',
    photo: '/11.jpg',
    upcoming: true,
    order: 11,
    yearText: '',
    period: L('कार्यक्रम तथा गतिविधि', 'Programs and activities'),
    title: L('सेमिनार तथा बैठक', 'Seminar and Meeting'),
    desc: L(
      'मन्दिर परिसरमा सेमिनार तथा बैठकहरू आयोजना गर्न सकिने व्यवस्था रहेको छ।',
      'Seminars and meetings can be organised in the temple premises.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'film-music-shooting',
    seedVersion: 2,
    date: '2026-12-17',
    photo: '/12.jpg',
    upcoming: true,
    order: 12,
    yearText: '',
    period: L('सांस्कृतिक तथा सिर्जनात्मक गतिविधि', 'Cultural and creative activity'),
    title: L('फिल्म तथा म्युजिक भिडियो छायांकन', 'Film and Music Video Shooting'),
    desc: L(
      'मन्दिर परिसरमा फिल्म तथा म्युजिक भिडियो छायांकनका लागि पनि प्रयोग हुँदै आएको छ।',
      'The temple premises are also used for film and music video shooting.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'vegetarian-food',
    seedVersion: 2,
    date: '2026-12-24',
    photo: '/13.jpg',
    upcoming: true,
    order: 13,
    yearText: '',
    period: L('मन्दिर परिसरको व्यवस्था', 'Arrangement in the temple premises'),
    title: L('शाकाहारी खानपान', 'Vegetarian Food'),
    desc: L(
      'मन्दिरमा शाकाहारी खानपानको व्यवस्था रहेको छ।',
      'Vegetarian food is provided at the temple.'
    ),
    // the middle sentence repeated the description word for word
    paragraphs: P(
      'मन्दिर परिसरमा शाकाहारी भोजन मात्र स्वीकार गरिन्छ।',
      'मदिरा, मासु तथा विदेशी संगीत प्रयोग गर्न निषेध गरिएको उल्लेख छ।'
    ),
    listTitle: L('', ''),
    points: [],
  },
  {
    seedKey: 'ayodhya-pranpratistha',
    seedVersion: 2,
    date: '2026-12-31',
    photo: '/14.jpg',
    upcoming: true,
    order: 14,
    yearText: '२०८०',
    period: L('वि.सं. २०८० माघ ८ / जनवरी २२, २०२४', '8 Magh 2080 BS / 22 January 2024'),
    title: L('अयोध्या राममूर्ति प्राणप्रतिष्ठा अवसरको विशेष पूजा', 'Special Puja on the Ayodhya Ram Pratishtha Occasion'),
    desc: L(
      '२०८० साल माघ ८ गते अर्थात् जनवरी २२, २०२४ मा अयोध्यामा श्रीरामको मूर्ति प्राणप्रतिष्ठा भएको अवसरमा मन्दिरमा विशेष पूजा तथा कार्यक्रम गरिएको उल्लेख छ।',
      'A special puja and program was held at the temple on the occasion of the pratishtha of Shri Ram’s idol in Ayodhya on 8 Magh 2080 BS, that is 22 January 2024.'
    ),
    paragraphs: P(
    ),
    listTitle: L('', ''),
    points: [],
  },
];

// Attach the English translation to every seeded paragraph.
for (const ev of DEFAULT_EVENTS) {
  ev.paragraphs = (ev.paragraphs || []).map((p) => {
    const en = p && p.ne ? PARAGRAPH_EN[p.ne] : null;
    return en ? { ...p, en } : p;
  });
}

/* ── आयोजना गर्न सकिने कार्यक्रम → Book Puja (AdminSettings.pujaTypes) ──── */
const PUJA_TYPES = [
  'Ram Puja',
  'Satyanarayan Puja',
  'Griha Pravesh Puja',
  'Birthday Puja',
  'General Darshan Booking',
  'Wedding (Vivah)',
  'Bratabandha',
  'Pasni',
  'Chauraasi Puja',
  'Wedding Anniversary',
  'Engagement',
  'Religious Puja & Rituals',
  'Meeting & Seminar',
  'Cultural Program',
  'Film & Music Video Shooting'
];

/* Nepali equivalents, used by the booking form when a language is selected. */
const PUJA_TYPES_LOCALIZED = {
  en: PUJA_TYPES,
  ne: [
    'राम पूजा', 'सत्यनारायण पूजा', 'गृह प्रवेश पूजा', 'जन्मदिन पूजा', 'साधारण दर्शन बुकिङ',
    'विवाह', 'व्रतबन्ध', 'पास्नी', 'चौरासी पूजा', 'वैवाहिक वर्षगाँठ',
    'इन्गेजमेन्ट', 'धार्मिक पूजा तथा अनुष्ठान', 'सभा तथा सेमिनार', 'सांस्कृतिक कार्यक्रम',
    'फिल्म तथा म्युजिक भिडियो छायांकन'
  ],
  hi: [
    'राम पूजा', 'सत्यनारायण पूजा', 'गृह प्रवेश पूजा', 'जन्मदिन पूजा', 'सामान्य दर्शन बुकिंग',
    'विवाह', 'व्रतबंध', 'पासनी', 'चौरासी पूजा', 'वैवाहिक वर्षगाँठ',
    'इंगेजमेंट', 'धार्मिक पूजा एवं अनुष्ठान', 'सभा एवं सेमिनार', 'सांस्कृतिक कार्यक्रम',
    'फिल्म एवं म्यूजिक वीडियो शूटिंग'
  ],
  zh: [
    '罗摩祈福', '萨蒂亚那罗延祈福', '乔迁祈福', '生日祈福', '普通参拜预约',
    '婚礼', '结缘仪式', '帕斯尼仪式', '八十四岁祭', '结婚周年',
    '订婚', '宗教祈福与仪式', '会议与研讨会', '文化活动',
    '电影与音乐视频拍摄'
  ],
  ta: [
    'ராம பூஜை', 'சத்யநாராயண பூஜை', 'கிரக பிரவேச பூஜை', 'பிறந்தநாள் பூஜை', 'பொது தரிசன பதிவு',
    'திருமணம்', 'நிலை விழா', 'பஸ்னி', 'உறைசாஸ்தி பூஜை', 'திருமண ஆண்டு விழா',
    'நிம்சம்', 'சடங்கு மற்றும் புரோட்டா', 'கூட்டம் மற்றும் சிமினார்', 'கலாச்சார நிகழ்ச்சி',
    'திரைப்படம் மற்றும் இசை வீடியோ பதிவு'
  ]
};

/** Section keys shipped with the very first version of the About page. */
const LEGACY_SECTION_KEYS = ['architecture', 'deity', 'location'];

/* ── /events पेजको शीर्षकहरू → AdminSettings.eventsPageText ────────────── */
/**
 * Every heading and note on the events page, as rows so the admin can edit,
 * reorder, disable or add their own. `key` is the slot the front end reads;
 * `label` is only an English hint shown in admin.
 */
const T = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

const DEFAULT_EVENTS_PAGE_TEXT = [
  { key: 'page-title', label: 'Page title', text: T('आयोजना तथा कार्यक्रम', 'Events and Programs'), order: 0, enabled: true },
  { key: 'page-subtitle', label: 'Page subtitle', text: T('मन्दिरमा नियमित रूपमा सञ्चालन हुने कार्यक्रमहरूको विवरण।', 'Details of the programs regularly conducted at the temple.'), order: 1, enabled: true },
  { key: 'festivals-title', label: 'Festivals section heading', text: T('पर्व तथा उत्सव', 'Festivals and Events'), order: 2, enabled: true },
  { key: 'programs-title', label: 'Programs section heading', text: T('आयोजन गरिने कार्यक्रमहरू', 'Programs Conducted'), order: 3, enabled: true },
  { key: 'footer-note', label: 'Footer note', text: T('कार्यक्रमको विवरणमा परिवर्तन हुन सक्छ।', 'Program details are subject to change.'), order: 4, enabled: true },
];

module.exports = {
  INTRO_TEXT,
  DEFAULT_SECTIONS,
  DEFAULT_EVENTS,
  DEFAULT_EVENTS_PAGE_TEXT,
  PUJA_TYPES,
  PUJA_TYPES_LOCALIZED,
  LEGACY_SECTION_KEYS,
  emptyParagraphs
};
