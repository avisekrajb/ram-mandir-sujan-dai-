/**
 * The "आयोजन गरिने कार्यक्रमहरू" (Programs Conducted) section of the Events page.
 *
 * Stored in AdminSettings.programSections. Each entry is one numbered section
 * with an optional photo and an ordered list of blocks, so a section can hold a
 * heading, a paragraph, a bulleted list or a table - which is what the temple's
 * program list actually needs (three tables among the eight sections).
 *
 * The photo is optional: a section saved without one is published as a numbered
 * block on its own, with no empty picture area left on the page.
 *
 * `ne` holds the published Nepali text and `en` an English translation; `hi` /
 * `zh` / `ta` are left empty on purpose and fall back to English until they are
 * filled in from Admin -> Events.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

/** A heading inside a section. */
const H = (ne, en) => ({ type: 'heading', text: L(ne, en) });
/** A paragraph. */
const P = (ne, en) => ({ type: 'para', text: L(ne, en) });
/** A bulleted list. */
const UL = (items) => ({ type: 'list', points: items.map(([ne, en]) => L(ne, en)) });
/** A table: a header row plus data rows, each row a list of localized cells. */
const T = (headers, rows) => ({
  type: 'table',
  headers: headers.map(([ne, en]) => L(ne, en)),
  rows: rows.map((row) => ({ cells: row.map(([ne, en]) => L(ne, en)) })),
});

const DEFAULT_PROGRAM_SECTIONS = [
  /* ── 1 ─────────────────────────────────────────────────────────────── */
  {
    key: 'daily-programs',
    order: 0,
    photo: '',
    title: L('दैनिक कार्यक्रम / नियमित कार्यक्रमहरू', 'Daily / Regular Programs'),
    blocks: [
      H('दैनिक पूजा र अनुष्ठान', 'Daily Puja and Rituals'),
      UL([
        ['बिहान ५:०० बजे – मन्दिरमा कैङ्कर्य सुरु', '5:00 AM - the temple opens'],
        ['बिहान ८:३० बजे – स्नान र अभिषेक', '8:30 AM - bath and abhisheka'],
        ['बिहान ९:०० बजे – आरती र भोगराग', '9:00 AM - aarti and offering of food'],
        [
          'सायंकालिक आरती – गर्मीमा साँझ ६:०० बजे, जाडोमा ५:३० बजे, त्यसपछि भगवान्लाई सुकला',
          'Evening aarti - 6:00 PM in summer, 5:30 PM in winter, after which the deity is put to rest',
        ],
        [
          'पर्वविशेषमा दिउँसो पनि मन्दिर खुल्छ, अन्यथा भक्तजनको आगमन हेरेर खोलिन्छ',
          'On festival days the temple also opens during the day; otherwise it opens as devotees arrive',
        ],
      ]),
      P(
        'दैनिक सेवाहरू (मुख्य पूजा तथा अनुष्ठानहरूमा उल्लेखित)',
        'Daily services (detailed under the main rituals below)'
      ),
      UL([
        ['श्रीराम-सीता पूजा (दैनिक अर्चना)', 'Shri Ram-Sita puja (daily archana)'],
        [
          'तुलसी अर्चना, बिहानको भोगराग, एकादशी फलहार अर्पण र आरती',
          'Tulsi archana, morning bhog, Ekadashi fruit offering and aarti',
        ],
      ]),
    ],
    enabled: true,
  },

  /* ── 2 ─────────────────────────────────────────────────────────────── */
  {
    key: 'monthly-programs',
    order: 1,
    photo: '',
    title: L('मासिक कार्यक्रमहरू', 'Monthly Programs'),
    blocks: [
      H('त्रिरुमञ्जन पूजा (विशेष पूजा)', 'Trirumanjan Puja (Special Puja)'),
      P('कहिले: हरेक महिनाको सङ्क्रान्ति (१ गते)', 'When: every Sankranti, the 1st of the Nepali month'),
      P('कहिलेदेखि: वि.सं. २०५८ माघ १ देखि', 'Since: 1 Magh 2058 BS'),
      P(
        'विवरण: महानुभावहरूले अग्रिम नाम लेखाएर नियमित सहभागिता जनाउँछन्। सयौँ श्रद्धालुको उपस्थिति हुन्छ।',
        'Details: devotees register their name in advance and take part regularly. Hundreds attend.'
      ),
      P('मासिक पालो लिने महानुभावहरू:', 'The devotees who take the monthly part:'),
      T(
        [
          ['महिना', 'Month'],
          ['महानुभाव(हरू)', 'Devotee(s)'],
        ],
        [
          [
            ['माघ', 'Magh'],
            [
              'स्व. महेश्वरबहादुर टण्डन, श्री नोदजङ्ग कार्की, श्री दीपकध्वज राणा',
              'Late Maheshwar Bahadur Tandan, Shri Nodajung Karki, Shri Deepakdhwaj Rana',
            ],
          ],
          [['फागुन', 'Phagun'], ['स्व. लक्ष्मी थापा, श्री केशवध्वज राणा', 'Late Lakshmi Thapa, Shri Keshavdhwaj Rana']],
          [
            ['चैत्र', 'Chaitra'],
            ['श्री केशव घिमिरे खत्री, सुश्री मेनका कुँवर, श्री वीणा श्रेष्ठ', 'Shri Keshav Ghimire Khattri, Sushree Menka Kunder, Shri Bina Shrestha'],
          ],
          [
            ['वैशाख', 'Baishakh'],
            ['श्री नयन सिंह, श्रीमान्/श्रीमती विष्णु/शोभा ज्ञवाली', 'Shri Nayan Singh, Shri/Shrimati Vishnu/Shobha Jawale'],
          ],
          [['ज्येष्ठ', 'Jestha'], ['श्रीमती पुष्पलता श्रेष्ठ, श्री सरोज पौडेल', 'Srimati Pushpalata Shrestha, Shri Saroj Paudel']],
          [
            ['आषाढ', 'Ashadh'],
            ['श्री कृष्णलाल श्रेष्ठ, श्रीमती सुमित्रा श्रेष्ठ, श्री सुवास सिंह', 'Shri Krishnalal Shrestha, Srimati Sumitra Shrestha, Shri Subas Singh'],
          ],
          [['श्रावण', 'Shrawan'], ['श्रीमती तारादेवी श्रेष्ठ, श्री रविन्द्र राणा', 'Srimati Taradevi Shrestha, Shri Rabindra Rana']],
          [
            ['भाद्र', 'Bhadra'],
            ['श्रीमती शान्तादेवी श्रेष्ठ, स्व. शम्भुबहादुर कार्की', 'Srimati Shantadevi Shrestha, Late Shambhubahadur Karki'],
          ],
          [['आश्विन', 'Ashwin'], ['श्री शम्भु राना, श्री लक्ष्मी श्रेष्ठ', 'Shri Shambu Rana, Shri Lakshmi Shrestha']],
          [
            ['कार्तिक', 'Kartik'],
            ['श्री मुकुन्दराज सत्याल, श्रीमती लक्ष्मी श्रेष्ठ', 'Shri Mukundraj Satyal, Srimati Lakshmi Shrestha'],
          ],
          [['मङ्सिर', 'Mangsir'], ['श्री गुरुप्रसाद सुवेदी', 'Shri Guruprasad Suwedi']],
          [['पौष', 'Poush'], ['श्री बलध्वज राणा, श्रीमती लक्ष्मी श्रेष्ठ', 'Shri Baladhwaj Rana, Srimati Lakshmi Shrestha']],
        ]
      ),

      H('साधना-सन्ध्या कार्यक्रम', 'Sadhana-Sandhya Program'),
      P('कहिले: प्रत्येक औँसीको दिन दिउँसो ४:०० देखि साँझ ७:०० बजेसम्म', 'When: every fortnight, 4:00 PM to 7:00 PM'),
      P('कहिलेदेखि: विगत २० वर्षदेखि निरन्तर', 'Since: running continuously for the past 20 years'),
      P(
        'विवरण: नेपालका ख्यातिप्राप्त भक्तिगायक र शास्त्रीय सङ्गीतज्ञहरूको मधुर सहभागिता रहन्छ। ‘श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति’को आयोजना, ‘नेपाल ललितकला क्याम्पस’ र ‘श्रीराममन्दिर निजी गुठी’को सहयोग रहन्छ।',
        'Details: it features Nepal’s well-known devotional singers and classical musicians. Organised by the Shree Ramchandra Temple Renovation and Development Committee, with support from Nepal Lalit Kala Campus and the Shree Ram Temple private trust.'
      ),
      P(
        'नोट: कोभिड-१९ को प्रभावले वि.सं. २०७६ देखि २०७९ सम्म कठिनाइ भयो। वि.सं. २०८० देखि पुनर्जागृत गरिएको।',
        'Note: COVID-19 made it difficult from 2076 to 2079 BS. It was revived from 2080 BS.'
      ),

      H('बालविहार', 'Bal Bibhar (Children’s Classes)'),
      P('कहिले: हरेक शनिबार दिउँसो ४:०० बजेदेखि ५:०० बजेसम्म', 'When: every Saturday, 4:00 PM to 5:00 PM'),
      P('कसका लागि: ६ वर्षदेखि १६ वर्षसम्मका केटाकेटीहरू', 'For: children aged 6 to 16'),
      P(
        'विवरण: धर्म-संस्कृति र संस्कारहरूको बारे जानकारी, शिक्षा-दीक्षा दिने कार्यक्रम। सर्वोत्कृष्ट जीवन शाश्वत चिन्तन (साँचो जीवननिर्माण अभियान) को साथ-सहयोग र मार्गदर्शन रहन्छ। विगतमा श्रीचिन्मय आध्यात्मिक सेवा संघको सहयोगमा सञ्चालन भइरहेको थियो।',
        'Details: teaches religion, culture and rituals, and provides education. It is supported and guided by the Best Life, Everlasting Thoughts (Sach Jeevan Nirman Abhiyan) campaign. It used to be run with help from the Shri Chinmaya Spiritual Service Association.'
      ),
    ],
    enabled: true,
  },

  /* ── 3 ─────────────────────────────────────────────────────────────── */
  {
    key: 'annual-festivals',
    order: 2,
    photo: '',
    title: L('वार्षिक पर्व तथा विशेष कार्यक्रमहरू', 'Annual Festivals and Special Programs'),
    blocks: [
      H('श्रीरामनवमी (रामनवमी)', 'Shri Ramnavami'),
      P('कति दिन: तीन दिवसीय रूपमा मनाइन्छ', 'Length: celebrated over three days'),
      P('मुख्य कार्यक्रमहरू:', 'Main programs:'),
      UL([
        ['विशेष पूजा र हवन (वैदिक मन्त्रहरूको जप)', 'Special puja and havan (chanting of Vedic mantras)'],
        [
          'श्रीराम-सीतासहितको श्रीविग्रहमा अभिषेक (दूध, दही, घ्यू, मह, सक्खर आदि प्रयोग गरेर)',
          'Abhisheka of the deity with Shri Ram and Sita (using milk, curd, ghee, honey and sugar)',
        ],
        ['शृङ्गार एवं पूजा-अर्चना', 'Almirah and puja-archana'],
        [
          'भजन-कीर्तन: बिहान ८:०० बजेदेखि साँझ ७:०० बजेसम्म (स्थानीय भक्त समूह, साईबाबा भजन समूह र नेपालका गन्यमान्य कलाकारहरू)',
          'Bhajan and kirtan: 8:00 AM to 7:00 PM (local devotees’ groups, Sai Baba bhajan groups and well-known Nepali artists)',
        ],
        [
          'श्रीरामको जन्म, बाल्यकाल वा रावणवधजस्ता कथाहरूमा आधारित नृत्य प्रस्तुति',
          'Dance presentation based on stories of Shri Ram’s birth, childhood or the killing of Ravana',
        ],
        [
          'मन्दिर परिसरको सफाइ र सजावट (फूलमाला, बत्तीको सजावट)',
          'Cleaning and decoration of the temple premises (flower garlands and lamp decoration)',
        ],
        [
          'भीड व्यवस्थापन (स्वयंसेवकहरू खटाएर लाइन व्यवस्थापन र सुरक्षा)',
          'Crowd management (volunteers managing queues and security)',
        ],
        ['प्रसाद वितरण वा सामुदायिक भोज', 'Prasad distribution or a community meal'],
        [
          'मन्दिर संरक्षणका लागि कोष संकलन वा जागरूकता अभियान',
          'Fundraising or awareness campaigns for the temple’s protection',
        ],
        [
          'श्रीरामको मर्यादा, सत्य र कर्तव्यको सन्देश फैलाउने (पर्चा वितरण वा प्रवचन)',
          'Spreading the message of Shri Ram’s dignity, truth and duty (leaflet distribution or a discourse)',
        ],
        [
          'श्रीरामनवमीमा ‘कार्यप्रगति एवं आर्थिक विवरण’ पुस्तिका प्रकाशन तथा वितरण',
          'Publication and distribution of the “Progress and Financial Report” book on Ramnavami',
        ],
      ]),

      H('विवाह पञ्चमी (राम-सीता विवाह महोत्सव)', 'Vivah Panchami (Ram-Sita Wedding Festival)'),
      P('कहिले: मार्ग शुक्ल पञ्चमी', 'When: Magh Shukla Panchami'),
      P(
        'विवरण: भगवान राम र सीताको विवाह वार्षिकोत्सव। मन्दिरमा विशेष सजावट र पूजा।',
        'Details: the annual wedding anniversary of Lord Ram and Sita. The temple is specially decorated and puja is held.'
      ),

      H('सीताजयन्ती', 'Sita Jayanti'),
      P('विवरण: विशेष पूजाको आयोजना; पालो लिने: श्रीमती रसना टण्डन', 'Details: a special puja is held; taken by Srimati Rashna Tandan'),

      H('श्रीपञ्चमी', 'Shri Panchami'),
      P('विवरण: विशेष पूजाको आयोजना; पालो लिने: श्रीमती ईश्वरी शर्मा', 'Details: a special puja is held; taken by Srimati Ishwori Sharma'),

      H('हनुमान जयन्ती', 'Hanuman Jayanti'),
      P('विवरण: विशेष पूजाको आयोजना (विशेष पर्वहरूमा उल्लेखित)', 'Details: a special puja is held (see the special festivals above)'),

      H('एकादशी', 'Ekadashi'),
      P('विवरण: विशेष पूजाको आयोजना (विशेष पर्वहरूमा उल्लेखित)', 'Details: a special puja is held (see the special festivals above)'),

      H('अन्नकूट उत्सव (गोवर्धन पूजा)', 'Annakoot Festival (Govardhan Puja)'),
      P('कहिले: कार्तिक शुक्ल प्रतिपदा', 'When: Kartik Shukla Pratipada'),
      P('विवरण: विशाल प्रसाद चढाउने', 'Details: a large offering of food is made'),

      H('नवमी अर्चना तथा सङ्गीत उत्सव', 'Navami Archana and Music Festival'),
      P('कहिले: रामनवमीमा', 'When: on Ramnavami'),
      P('विवरण: भव्य कार्यक्रम, रथयात्रा आदि', 'Details: a large program, a chariot procession and more'),

      H('मन्दिरको वार्षिकोत्सव', 'The Temple’s Annual Festival'),
      P('विवरण: समितिले आयोजना गर्ने पर्वहरूमध्ये एक', 'Details: one of the festivals organised by the committee'),

      H('अयोध्या श्रीराम प्राणप्रतिष्ठाको विशेष पूजा', 'Special Puja on the Ayodhya Shri Ram Pratishtha'),
      P('कहिले: सन् २०२४ जनवरी २२ (वि.सं. २०८० माघ ८)', 'When: 22 January 2024 (8 Magh 2080 BS)'),
      P(
        'विवरण: भारतको अयोध्यामा श्रीरामको श्रीविग्रहको प्राणप्रतिष्ठाको दिन विश्वभर भव्यरूपले विशेषपूजाको आयोजना भएको सन्दर्भमा बत्तीसपुतलीस्थित श्रीरामचन्द्रमन्दिरमा पनि दीपप्रज्वलनको साथ एक दिवसीय विशेष पूजा। तीन दिन मन्दिरमा बिजुली बत्ती एवं फूलमालाले सजावट, विशेषपूजा एवं दर्शनार्थ आएका सम्पूर्ण भक्तजनहरूलाई प्रसादी वितरण।',
        'Details: on the day of the pratishtha of Shri Ram’s idol in Ayodhya, India, a special puja was organised worldwide. Shree Ramchandra Temple in Battisputali held a one-day special puja with lamps lit. For three days the temple was decorated with lights and flowers, with a special puja and prasad distributed to all who came for darshan.'
      ),
    ],
    enabled: true,
  },

  /* ── 4 ─────────────────────────────────────────────────────────────── */
  {
    key: 'special-puja-participants',
    order: 3,
    photo: '',
    title: L('विशेष पूजाको पालो लिने महानुभावहरू (पर्वहरूको लागि)', 'Devotees Taking the Special Puja (for the festivals)'),
    blocks: [
      T(
        [
          ['पर्व', 'Festival'],
          ['महानुभाव(हरू)', 'Devotee(s)'],
        ],
        [
          [['श्रीपञ्चमी', 'Shri Panchami'], ['श्रीमती ईश्वरी शर्मा', 'Srimati Ishwori Sharma']],
          [['सीताजयन्ती', 'Sita Jayanti'], ['श्रीमती रसना टण्डन', 'Srimati Rashna Tandan']],
          [
            ['विवाहपञ्चमी', 'Vivah Panchami'],
            ['श्री शिवकुमार गोयल / श्रीमती सीता गोयल', 'Shri Shivkumar Goyal / Srimati Sita Goyal'],
          ],
        ]
      ),
    ],
    enabled: true,
  },

  /* ── 5 ─────────────────────────────────────────────────────────────── */
  {
    key: 'yoga-dhyana',
    order: 4,
    photo: '',
    title: L('योग तथा ध्यान सेवा', 'Yoga and Meditation'),
    blocks: [
      P('कहिले: बिहानको समयमा', 'When: in the morning'),
      P('विवरण: नियमित कक्षा', 'Details: regular classes'),
    ],
    enabled: true,
  },

  /* ── 6 ─────────────────────────────────────────────────────────────── */
  {
    key: 'other-services',
    order: 5,
    photo: '',
    title: L('मन्दिर परिसरमा उपलब्ध अन्य सेवाहरू', 'Other Services in the Temple Premises'),
    blocks: [
      UL([
        ['विवाह', 'Weddings'],
        ['उपनयन (ब्रतबन्ध)', 'Upanayan ( Bratabandha)'],
        ['पासनी', 'Pashni'],
        ['सगाई', 'Engagement'],
        ['जन्मदिन', 'Birthdays'],
        ['वार्षिकोत्सव', 'Anniversaries'],
        ['सेमिनार/बैठक', 'Seminars / meetings'],
        ['फिल्म/म्युजिक भिडियो सुटिङ', 'Film / music video shooting'],
        [
          'केटरिङ सेवा (शाकाहारी खाना, १०० भन्दा कम वा बढी व्यक्तिहरूका लागि व्यवस्था)',
          'Catering (vegetarian food, arranged for fewer or more than 100 people)',
        ],
      ]),
      P(
        'नोट: मन्दिर प्राङ्गणमा हुने कार्यक्रमहरूमा मद्यपान, मांस र विदेशी सङ्गीत निषेध छ; शाकाहारी भोजनबाहेक अन्य अनुमति छैन।',
        'Note: for programs held in the temple courtyard, alcohol, meat and foreign music are prohibited; only vegetarian food is permitted.'
      ),
    ],
    enabled: true,
  },

  /* ── 7 ─────────────────────────────────────────────────────────────── */
  {
    key: 'quick-summary',
    order: 6,
    photo: '',
    title: L('कार्यक्रमहरूको संक्षिप्त तालिका (छिटो हेर्नको लागि)', 'Summary Table of Programs (for a quick look)'),
    blocks: [
      T(
        [
          ['कार्यक्रम', 'Program'],
          ['आवृत्ति', 'Frequency'],
          ['समय/मिति', 'Time / date'],
        ],
        [
          [
            ['दैनिक पूजा र आरती', 'Daily puja and aarti'],
            ['दैनिक', 'Daily'],
            ['बिहान ५:०० बजेदेखि; ९:०० बजे आरती; सायंकालिक आरती', 'From 5:00 AM; aarti at 9:00 AM; evening aarti'],
          ],
          [['त्रिरुमञ्जन पूजा', 'Trirumanjan puja'], ['मासिक', 'Monthly'], ['सङ्क्रान्ति (नेपाली महिनाको १ गते)', 'Sankranti (1st of the Nepali month)']],
          [['साधना-सन्ध्या', 'Sadhana-Sandhya'], ['मासिक', 'Monthly'], ['हरेक औँसी, दिउँसो ४–७ बजे', 'Every fortnight, 4-7 PM']],
          [['बालविहार', 'Bal Bibhar'], ['साप्ताहिक', 'Weekly'], ['हरेक शनिबार, दिउँसो ४–५ बजे', 'Every Saturday, 4-5 PM']],
          [['श्रीरामनवमी', 'Shri Ramnavami'], ['वार्षिक', 'Annual'], ['तीन दिवसीय', 'Three days']],
          [['विवाह पञ्चमी', 'Vivah Panchami'], ['वार्षिक', 'Annual'], ['मार्ग शुक्ल पञ्चमी', 'Magh Shukla Panchami']],
          [['सीताजयन्ती', 'Sita Jayanti'], ['वार्षिक', 'Annual'], ['–', '-']],
          [['श्रीपञ्चमी', 'Shri Panchami'], ['वार्षिक', 'Annual'], ['–', '-']],
          [['हनुमान जयन्ती', 'Hanuman Jayanti'], ['वार्षिक', 'Annual'], ['–', '-']],
          [['एकादशी', 'Ekadashi'], ['वार्षिक', 'Annual'], ['–', '-']],
          [['अन्नकूट उत्सव', 'Annakoot festival'], ['वार्षिक', 'Annual'], ['कार्तिक शुक्ल प्रतिपदा', 'Kartik Shukla Pratipada']],
          [['योग तथा ध्यान', 'Yoga and meditation'], ['नियमित', 'Regular'], ['बिहान', 'Morning']],
          [['मन्दिर वार्षिकोत्सव', 'Temple annual festival'], ['वार्षिक', 'Annual'], ['–', '-']],
        ]
      ),
    ],
    enabled: true,
  },

  /* ── 8 ─────────────────────────────────────────────────────────────── */
  {
    key: 'extra-information',
    order: 7,
    photo: '',
    title: L('कार्यक्रम पृष्ठको लागि थप जानकारी', 'Additional Information'),
    blocks: [
      P(
        'बुकिङ: विवाह, व्रतबन्धजस्ता कार्यक्रमका लागि दुई-तीन महिना अघिबाटै बुकिङ गर्नुपर्ने अवस्था छ।',
        'Booking: for programs such as weddings and Bratabandha, booking has to be made two to three months in advance.'
      ),
      P(
        'दैनिक कार्यक्रम: कहिलेकाहीँ दैनिक १०-१२ वटा कार्यक्रम हुन्छन्, जहाँ १,२००-१,५०० निम्तालु सहभागी हुन्छन्।',
        'Daily programs: on some days there are 10-12 programs in a single day, attended by 1,200-1,500 guests.'
      ),
      P(
        'चन्दा/सहयोग: रु. २ (दुई) को सानो सहयोग गर्ने दाताको नाम पनि सम्मानसाथ अङ्कित हुन्छ। हरेक वर्ष श्रीरामनवमीमा ‘श्रीरामचन्द्रमन्दिरको परिचय, कार्य प्रगति तथा आर्थिक विवरण’ पुस्तिका प्रकाशित हुन्छ।',
        'Donations: even the name of a donor who contributes a small amount of Rs. 2 is recorded with respect. Every year a “Shree Ramchandra Temple: Introduction, Progress and Financial Report” book is published on Ramnavami.'
      ),
      P(
        'सम्पर्क: यी पुनीत कार्यमा सहभागी हुन चाहनेले मन्दिर कार्यालयमा सम्पर्क गर्न सक्नुहुनेछ।',
        'Contact: anyone wishing to take part in these noble activities may contact the temple office.'
      ),
    ],
    enabled: true,
  },
];

module.exports = { DEFAULT_PROGRAM_SECTIONS };