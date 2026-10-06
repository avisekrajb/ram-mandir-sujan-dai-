/**
 * Published content for the History page.
 *
 * Each entry is one numbered section of the temple's history. An entry may have
 * paragraphs, a bulleted list (listTitle + points) and a year-by-year list
 * (entries: [{ year, text }]).
 *
 * `ne` holds the published Nepali text and `en` an English translation; `hi` /
 * `zh` / `ta` are left empty on purpose and fall back to English until they are
 * filled in from Admin → History.
 */

const L = (ne, en) => ({ ne, en, hi: '', zh: '', ta: '' });

const P = (p1 = '', p2 = '', p3 = '', p4 = '') => ({
  p1: L(p1, ''),
  p2: L(p2, ''),
  p3: L(p3, ''),
  p4: L(p4, ''),
});

/**
 * A year is stored per language so the History page can show "2050" to an
 * English reader and "२०५०" to a Nepali one. Only the digits are swapped, so
 * ranges ("२०६४ र २०६८"), era prefixes ("वि.सं. २०४९ देखि") and free text
 * ("Present") survive untouched. Any language can be retyped from
 * Admin → History.
 */
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const toDevanagariDigits = (value) =>
  String(value).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]);

const toAsciiDigits = (value) =>
  String(value).replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

const YEAR = (value = '') => {
  const text = String(value).trim();
  return {
    en: toAsciiDigits(text),
    ne: toDevanagariDigits(text),
    hi: toDevanagariDigits(text),
    zh: toAsciiDigits(text),
    ta: toAsciiDigits(text),
  };
};

/** Build a year entry; `en` is left to be filled in from admin. */
const Y = (year, ne) => ({ year: YEAR(year), text: L(ne, '') });

const DEFAULT_HISTORY = [
  {
    seedKey: 'history-01',
    order: 0,
    title: L('श्रीरामचन्द्रमन्दिरको स्थापना', 'The Founding of Shree Ramchandra Temple'),
    period: L('वि.सं. १९२८', '1928 VS'),
    year: YEAR('1928'),
    desc: L(
      'काठमाडौंको बत्तीसपुतलीस्थित श्रीरामचन्द्रमन्दिर धार्मिक, ऐतिहासिक, सांस्कृतिक तथा पुरातात्त्विक दृष्टिले महत्वपूर्ण तीर्थस्थल हो। यो मन्दिर पशुपतिक्षेत्रको दक्षिण–पश्चिमतर्फ रहेको थुम्कोमा अवस्थित छ।',
      'Shree Ramchandra Temple in Battisputali, Kathmandu, is an important pilgrimage site of religious, historical, cultural and archaeological significance. The temple is located in Thumka, to the south-west of the Pashupati area.'
    ),
    paragraphs: P(
      'काठमाडौंको बत्तीसपुतलीस्थित श्रीरामचन्द्रमन्दिर धार्मिक, ऐतिहासिक, सांस्कृतिक तथा पुरातात्त्विक दृष्टिले महत्वपूर्ण तीर्थस्थल हो। यो मन्दिर पशुपतिक्षेत्रको दक्षिण–पश्चिमतर्फ रहेको थुम्कोमा अवस्थित छ।',
      'मन्दिरको स्थापना कम्याण्डर कर्णेल सनकसिंह टण्डनले वि.सं. १९२८ मा गरेका हुन्। मन्दिर राजकीय गुम्बज तथा राजपूत शैलीमा निर्माण गरिएको छ। यसको निर्माणमा इँटा, काठ र चुनाको प्रयोग गरिएको छ।',
      'मन्दिरको मुख्य गर्भगृहमा श्रीराम, सीता, लक्ष्मण, भरत र शत्रुघ्नका पूर्णकदका मूर्तिहरू रहेका छन्। यी मूर्तिहरू शालिग्राम शिलाबाट बनेका भनिन्छन्। मुख्य मन्दिरका चार कुनामा गणेश, सूर्य, दुर्गा र शंकरका मन्दिरहरू रहेका छन्।',
      'मुख्य मन्दिरको पूर्वतर्फ हनुमानजीको मन्दिर रहेको छ। मन्दिर परिसरमा श्री सनकसिंहेश्वर, श्री शारदेश्वर, श्री सन्तकुमारेेश्वर, श्री बालकुमारेेश्वर, श्री हर्षकुमारेेश्वर, श्री यशोधरादेश्वर र श्री लक्ष्मीकुमारेेश्वर गरी विभिन्न शिव मन्दिरहरू रहेका छन्। यी शिव मन्दिरहरू वि.सं. १९३३ देखि १९५१ सम्म निर्माण भएको उल्लेख छ। परिसरको उत्तर–पूर्वतर्फ एउटा सानो नारायण मन्दिर पनि रहेको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-02',
    order: 1,
    title: L(
      'संस्थापक सनकसिंह टण्डनको पारिवारिक तथा ऐतिहासिक पृष्ठभूमि',
      'Family and Historical Background of the Founder Sanaksinh Tandan'
    ),
    period: L('ऐतिहासिक पृष्ठभूमि', 'Historical Background'),
    year: YEAR(),
    desc: L(
      'मन्दिरका संस्थापक कम्याण्डर कर्णेल सनकसिंह टण्डनको वंशपरम्परालाई शशिधर क्षत्री/परशुराम क्षत्री तथा जंगबहादुर राणासँग जोडिएको उल्लेख पाइन्छ।',
      'The lineage of the founder Commander Karnel Sanaksinh Tandan is recorded as being linked to Shashidhar Kshatri/Parashuram Kshatri and Jang Bahadur Rana.'
    ),
    paragraphs: P(
      'मन्दिरका संस्थापक कम्याण्डर कर्णेल सनकसिंह टण्डनको वंशपरम्परालाई शशिधर क्षत्री/परशुराम क्षत्री तथा जंगबहादुर राणासँग जोडिएको उल्लेख पाइन्छ।',
      'उहाँका पिता वि.सं. १९०६ मा अर्घाखाँचीको बालकोटमा परशुरामेश्वर स्थापना गर्ने व्यक्ति भएको उल्लेख छ। यही धार्मिक तथा पारिवारिक परम्पराबाट सनकसिंह टण्डनले काठमाडौंमा श्रीरामचन्द्रमन्दिर स्थापना गरेको इतिहास प्रस्तुत गरिएको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-03',
    order: 2,
    title: L(
      'बत्तीसपुतली नामसँग सम्बन्धित स्थानीय किंवदन्ती',
      'Local Legend Behind the Name Battisputali'
    ),
    period: L('स्थानीय किंवदन्ती', 'Local Legend'),
    year: YEAR(),
    desc: L(
      'स्थानीय किंवदन्तीअनुसार विक्रमादित्यको सिंहासन अप्सराहरूले ल्याएर यस थुम्कोमा गाडेका थिए। उक्त सिंहासनमा ३२ जना अप्सराका आकृति रहेका कारण यस स्थानको नाम बत्तीसपुतली रहन गएको भनाइ छ।',
      'According to local legend, the throne of Vikramaditya with its apsaras was brought here and buried in this Thumka. Because the throne carried the figures of 32 apsaras, the place came to be known as Battisputali.'
    ),
    paragraphs: P(
      'स्थानीय किंवदन्तीअनुसार विक्रमादित्यको सिंहासन अप्सराहरूले ल्याएर यस थुम्कोमा गाडेका थिए। उक्त सिंहासनमा ३२ जना अप्सराका आकृति रहेका कारण यस स्थानको नाम बत्तीसपुतली रहन गएको भनाइ छ।',
      'यो विषयलाई स्थानीय किंवदन्तीका रूपमा प्रस्तुत गरिएको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-04',
    order: 3,
    title: L('पुरातात्त्विक तथा कलात्मक महत्व', 'Archaeological and Artistic Significance'),
    period: L('पुरातात्त्विक महत्व', 'Archaeological Significance'),
    year: YEAR(),
    desc: L(
      'मन्दिर परिसर वरिपरि लिच्छविकालीन अवशेष तथा पुरातात्त्विक सामग्रीहरू भेटिएको उल्लेख छ। मुख्य गर्भगृहमा रामायणसँग सम्बन्धित आधुनिक भित्तेचित्रहरू पनि रहेका छन्।',
      'Lichchhavi-period remains and archaeological material have been found around the temple complex. Modern murals related to the Ramayana are also present in the main sanctum.'
    ),
    paragraphs: P(
      'मन्दिर परिसर वरिपरि लिच्छविकालीन अवशेष तथा पुरातात्त्विक सामग्रीहरू भेटिएको उल्लेख छ। मुख्य गर्भगृहमा रामायणसँग सम्बन्धित आधुनिक भित्तेचित्रहरू पनि रहेका छन्।',
      'मन्दिर तथा यसको परिसर धार्मिक महत्वसँगै ऐतिहासिक, सांस्कृतिक, कलात्मक तथा पुरातात्त्विक महत्व बोकेको स्थानका रूपमा रहेको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-05',
    order: 4,
    title: L('समयसँगै आएको परिवर्तन', 'Change Over Time'),
    period: L('समयसँगै आएको परिवर्तन', 'Change Over Time'),
    year: YEAR(),
    desc: L(
      'पहिले श्रीरामचन्द्रमन्दिरबाट काठमाडौं उपत्यकाका विभिन्न स्थानको फराकिलो दृश्य देखिन्थ्यो। तर पछिल्लो समयमा बढ्दै गएको शहरीकरण तथा अग्ला भवनका कारण ती दृश्यहरू धेरै हदसम्म छेकिएका छन्।',
      'In the past, a wide view of various places in the Kathmandu valley could be seen from Shree Ramchandra Temple. However, growing urbanisation and tall buildings have blocked those views to a large extent.'
    ),
    paragraphs: P(
      'पहिले श्रीरामचन्द्रमन्दिरबाट काठमाडौं उपत्यकाका विभिन्न स्थानको फराकिलो दृश्य देखिन्थ्यो। तर पछिल्लो समयमा बढ्दै गएको शहरीकरण तथा अग्ला भवनका कारण ती दृश्यहरू धेरै हदसम्म छेकिएका छन्।',
      'त्यसैगरी बढ्दो ध्वनि प्रदूषणका कारण मन्दिरका घण्टी तथा धार्मिक अनुष्ठानका ध्वनिहरू पहिलेको जस्तो टाढासम्म सुनिन नसक्ने अवस्था आएको उल्लेख छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-06',
    order: 5,
    title: L(
      'मन्दिरको जीर्ण अवस्था र संरक्षणको सुरुवात',
      'The Temple\'s Dilapidated State and the Start of Conservation'
    ),
    period: L('वि.सं. २०४७/४८', '2047/48 VS'),
    year: YEAR(),
    desc: L(
      'वि.सं. २०४७/४८ सम्म आइपुग्दा मन्दिर परिसरका धेरै सत्तलहरू जीर्ण भई भत्किएका थिए। मन्दिर तथा परिसर संरक्षण र व्यवस्थापनको आवश्यकता बढ्दै गएको थियो।',
      'By 2047/48 VS many structures in the temple complex had become dilapidated and had collapsed. The need for conservation and management of the temple and its complex kept growing.'
    ),
    paragraphs: P(
      'वि.सं. २०४७/४८ सम्म आइपुग्दा मन्दिर परिसरका धेरै सत्तलहरू जीर्ण भई भत्किएका थिए। मन्दिर तथा परिसर संरक्षण र व्यवस्थापनको आवश्यकता बढ्दै गएको थियो।',
      'संस्थापकले मन्दिरका लागि करिब ३७४ रोपनी ८ आना गुठी जग्गा छोडेको उल्लेख छ। तर समयक्रममा अतिक्रमण तथा बढ्दो शहरीकरणका कारण मन्दिर परिसरमा करिब ३ रोपनी ४ आना मात्र जग्गा बाँकी रहेको उल्लेख गरिएको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-07',
    order: 6,
    title: L(
      'श्रीरामचन्द्रमन्दिर जीर्णोद्धार तथा संरक्षण समिति',
      'Shree Ramchandra Temple Renovation and Conservation Committee'
    ),
    period: L('वि.सं. २०४८', '2048 VS'),
    year: YEAR(),
    desc: L(
      'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा प्रवर्द्धनका लागि वि.सं. २०४८ मा श्रीरामचन्द्रमन्दिर जीर्णोद्धार तथा संवर्द्धन समिति गठन तथा दर्ता गरिएको थियो।',
      'For the conservation, renovation and development of Shree Ramchandra Temple, the Shree Ramchandra Temple Renovation and Development Committee was formed and registered in 2048 VS.'
    ),
    paragraphs: P(
      'श्रीरामचन्द्रमन्दिरको संरक्षण, जीर्णोद्धार तथा प्रवर्द्धनका लागि वि.सं. २०४८ मा श्रीरामचन्द्रमन्दिर जीर्णोद्धार तथा संवर्द्धन समिति गठन तथा दर्ता गरिएको थियो।',
      'समितिको पहल डा. गोविन्द टण्डनको नेतृत्वमा अघि बढेको उल्लेख छ।'
    ),
    listTitle: L('समितिका प्रमुख उद्देश्यहरू:', 'The main objectives of the committee:'),
    points: [
      L('धार्मिक तथा सांस्कृतिक परम्पराको संरक्षण गर्ने।', 'To conserve the religious and cultural tradition.'),
      L('मन्दिर तथा परिसरको योजनाबद्ध संरक्षण तथा व्यवस्थापन गर्ने।', 'To carry out planned conservation and management of the temple and its complex.'),
      L('भक्तजन तथा पर्यटकका लागि आवश्यक सुविधा उपलब्ध गराउने।', 'To provide necessary facilities for devotees and visitors.'),
      L('मन्दिरबाट प्राप्त हुने दान तथा आम्दानीलाई सामाजिक तथा राष्ट्रिय सेवामा उपयोग गर्ने।', 'To use donations and income from the temple for social and national service.')
    ],
    entries: []
  },
  {
    seedKey: 'history-08',
    order: 7,
    title: L('संरक्षण तथा जीर्णोद्धारको क्रम', 'Sequence of Conservation and Renovation'),
    period: L('वि.सं. २०४९ – २०८१', '2049 – 2081 VS'),
    year: YEAR(),
    desc: L(
      'वि.सं. २०४९ देखि मन्दिरमा वार्षिक रूपमा रंगरोगन गर्ने कार्य हुँदै आएको उल्लेख छ।',
      'From 2049 VS, annual painting of the temple has been carried out regularly.'
    ),
    paragraphs: P(
      'वि.सं. २०४९ देखि मन्दिरमा वार्षिक रूपमा रंगरोगन गर्ने कार्य हुँदै आएको उल्लेख छ।',
      'समितिको गठनपछि वि.सं. २०४९ देखि यसअघि निरन्तर रूपमा मन्दिरको मर्मत तथा जीर्णोद्धार कार्य भइरहेको उल्लेख छ।',
      '',
      ''
    ),
    listTitle: L('', ''),
    points: [],
    entries: [
      Y('२०४९', 'मन्दिरको छाना मर्मत तथा विद्युत् र टेलिफोनको व्यवस्था गरिएको।'),
      Y('२०५०', 'मन्दिरको गर्भगृहमा मार्बल राखिएको।'),
      Y('२०५१', 'प्रदक्षिणा मार्गमा मार्बल तथा बत्तीको व्यवस्था गरिएको।'),
      Y('२०५२', 'शिव मन्दिरहरूको मर्मत तथा ढुंगाका स्ल्याबहरू राखिएको।'),
      Y('२०५३', 'ढुंगाका स्ल्याबहरू राख्नुका साथै पानीको रिजर्भ ट्यांकी निर्माण गरिएको।'),
      Y('२०५४', 'हनुमान मन्दिरको मर्मत तथा छानो निर्माण गरिएको।'),
      Y('२०५५', 'विद्युत् सम्बन्धी बाँकी रकम भुक्तानी गरिएको।'),
      Y('२०५६', 'दक्षिणतर्फ जाने बाटो तथा सिँढी निर्माण र पंखाको व्यवस्था गरिएको।'),
      Y('२०५७', 'उत्तर दिशातर्फको बाटो तथा सिँढी निर्माण गरिएको। पुरातत्व विभागको सहयोगमा भित्तेचित्रहरूको संरक्षण तथा पुनर्स्थापना गरिएको।'),
      Y('२०५८', 'भान्सा पुनर्निर्माण गरिएको तथा संस्थापकको तस्बिर कलाकार शशी शाहबाट निर्माण गरिएको।'),
      Y('२०५९', 'यज्ञशाला, नयाँ सत्तल निर्माण तथा ऐना र बत्तीको व्यवस्था गरिएको।'),
      Y('२०६०', 'स्थायी शौचालय निर्माण तथा पूर्वतर्फको सत्तल पुनर्निर्माण गरिएको।'),
      Y('२०६२', 'दक्षिणतर्फको मूल ढोका पुनर्निर्माण गरिएको।'),
      Y('२०६४ र २०६८', 'मन्दिर परिसरको पर्खालको जग निर्माण गरिएको।'),
      Y('२०६९', 'पर्खाल निर्माण पूरा गरिएको।'),
      Y('२०७०', 'रेलिङ निर्माण गरिएको।'),
      Y('२०७१', 'भण्डारण कक्ष निर्माण गरिएको।'),
      Y('२०७२', 'भूकम्पबाट मन्दिरको मुख्य संरचनामा चिरा परेको थियो। आफ्नै स्रोतबाट ग्राउटिङ तथा भूकम्पीय सुदृढीकरणको काम गरिएको।'),
      Y('वि.सं. २०४९ देखि', 'मन्दिरमा वार्षिक रूपमा रंगरोगन गर्ने कार्य हुँदै आएको उल्लेख छ।'),
      Y('२०७५', 'उपत्यका खानेपानी आपूर्ति बोर्डसँगको सहकार्यमा फिल्टर गरिएको खानेपानीको व्यवस्था गरिएको।'),
      Y('२०७६/७७', 'चाँदीका कमलका पातहरू राखिएको तथा पुरातत्व विभागको सहयोगमा पश्चिमतर्फको सत्तल निर्माण गरिएको।'),
      Y('२०७८', 'बागमती प्रदेशबाट दक्षिणतर्फको रिटेनिङ वाल निर्माणका लागि रु. २५,००,००० सहयोग प्राप्त भएको।'),
      Y('२०७९', 'पूर्वतर्फको गर्भगृहको ढोका चाँदी तथा पित्तलबाट निर्माण गरिएको।'),
      Y('२०८०', 'काठमाडौं महानगरपालिका वडा नं. ९ को सहयोगमा सिँढी, ढुंगाका स्ल्याब, शौचालय तथा रंगरोगनका कार्यहरू गरिएको।'),
      Y('२०८१', 'दक्षिणतर्फको गर्भगृहको ढोका चाँदी तथा पित्तलबाट निर्माण गरिएको तथा वडा नं. ९ को सहयोगमा रंगरोगन गरिएको।')
    ]
  },
  {
    seedKey: 'history-09',
    order: 8,
    title: L('भूकम्प तथा मन्दिर संरक्षण', 'Earthquakes and Temple Conservation'),
    period: L('वि.सं. १९९० र २०७२', '1990 and 2072 VS'),
    year: YEAR(),
    desc: L(
      'नेपालमा वि.सं. १९९० तथा वि.सं. २०७२ मा आएको भूकम्पले विभिन्न संरचनामा प्रभाव पारेको थियो। वि.सं. २०७२ को भूकम्पमा श्रीरामचन्द्रमन्दिरको मुख्य संरचनामा चिरा परेको भए पनि ठूलो क्षति हुन पाएन।',
      'The earthquakes of 1990 and 2072 VS affected various structures in Nepal. Although cracks appeared in the main structure of Shree Ramchandra Temple in the 2072 VS earthquake, no major damage occurred.'
    ),
    paragraphs: P(
      'नेपालमा वि.सं. १९९० तथा वि.सं. २०७२ मा आएको भूकम्पले विभिन्न संरचनामा प्रभाव पारेको थियो। वि.सं. २०७२ को भूकम्पमा श्रीरामचन्द्रमन्दिरको मुख्य संरचनामा चिरा परेको भए पनि ठूलो क्षति हुन पाएन।',
      'मन्दिरको आवश्यक मर्मत तथा संरचनागत सुदृढीकरण समितिले आफ्नै स्रोतबाट गरेको उल्लेख छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-10',
    order: 9,
    title: L('धार्मिक तथा सामाजिक व्यवस्थापन', 'Religious and Social Management'),
    period: L('', ''),
    year: YEAR(),
    desc: L(
      'मन्दिर संरक्षण तथा व्यवस्थापनका लागि भक्तजन, दाता तथा शुभेच्छुकहरूबाट प्राप्त सहयोग महत्वपूर्ण रहेको उल्लेख छ।',
      'Support received from devotees, donors and well-wishers has been important for the conservation and management of the temple.'
    ),
    paragraphs: P(
      'मन्दिर संरक्षण तथा व्यवस्थापनका लागि भक्तजन, दाता तथा शुभेच्छुकहरूबाट प्राप्त सहयोग महत्वपूर्ण रहेको उल्लेख छ।',
      'मन्दिरमा विवाह, व्रतबन्ध, चौरासी पूजा, जन्मदिन, वार्षिकोत्सव लगायतका धार्मिक तथा सामाजिक कार्यक्रमबाट शुल्क तथा सहयोग प्राप्त हुने व्यवस्था रहेको छ।',
      'वि.सं. २०४८ देखि प्रत्येक वर्ष श्रीरामनवमीको अवसरमा दाता तथा सहयोगकर्ताहरूको विवरणसहित सहयोग पुस्तिका प्रकाशन हुँदै आएको छ। सानो रकम सहयोग गर्ने व्यक्तिहरूको नामसमेत समावेश गरिने उल्लेख छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  },
  {
    seedKey: 'history-11',
    order: 10,
    title: L('वर्तमान संरक्षण तथा भविष्यको योजना', 'Current Conservation and Future Plans'),
    period: L('वर्तमान तथा भविष्य', 'Present and Future'),
    year: YEAR(),
    desc: L(
      'मन्दिरको पहिलो चरणको मास्टर प्लान पूरा भएको उल्लेख छ।',
      'The first phase master plan of the temple has been completed.'
    ),
    paragraphs: P(
      'मन्दिरको पहिलो चरणको मास्टर प्लान पूरा भएको उल्लेख छ।',
      'काठमाडौं महानगरपालिका वडा नं. ९ बाट सिँढी, ढुंगा बिछ्याउने, शौचालय, पिलर, रंगरोगन लगायतका कार्यमा करिब रु. ८९ लाख खर्च भएको उल्लेख छ। भविष्यमा पनि सहयोग जारी रहने प्रतिबद्धता व्यक्त गरिएको छ।'
    ),
    listTitle: L('दोस्रो चरणमा:', 'In the second phase:'),
    points: [
      L('निरन्तर संरक्षण तथा जीर्णोद्धार गर्ने।', 'Carry out continuous conservation and renovation.'),
      L('मन्दिरको व्यवस्थापन तथा प्रवर्द्धन गर्ने।', 'Manage and develop the temple.'),
      L('श्रीरामचन्द्रमन्दिरको नाममा हुलाक टिकट जारी गराउने पहल गर्ने।', 'Start the process of issuing pilgrimage tickets in the name of Shree Ramchandra Temple.'),
      L('UNESCO World Cultural Heritage सूचीमा समावेश गराउने प्रयास गर्ने।', 'Work toward inclusion in the UNESCO World Cultural Heritage list.'),
      L('मन्दिर संरक्षणका लागि वार्षिक सरकारी बजेट सहयोगको व्यवस्था गर्ने।', 'Arrange annual government budget support for temple conservation.')
    ],
    entries: []
  },
  {
    seedKey: 'history-12',
    order: 11,
    title: L(
      'संरक्षणमा सहयोग गर्ने संस्था तथा दाता',
      'Institutions and Donors Supporting the Conservation'
    ),
    period: L('', ''),
    year: YEAR(),
    desc: L(
      'मन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था, दाता, भक्तजन तथा शुभेच्छुकहरूको सहयोग रहेको उल्लेख छ।',
      'The conservation, renovation and management of the temple has been supported by various government bodies, organisations, donors, devotees and well-wishers.'
    ),
    paragraphs: P(
      'मन्दिरको संरक्षण, जीर्णोद्धार तथा व्यवस्थापनमा विभिन्न सरकारी निकाय, संघ–संस्था, दाता, भक्तजन तथा शुभेच्छुकहरूको सहयोग रहेको उल्लेख छ।',
      'विशेषगरी पुरातत्व विभाग, काठमाडौं महानगरपालिका वडा नं. ९, बागमती प्रदेश तथा अन्य सहयोगी संस्था र दाताहरूको योगदान रहेको छ।'
    ),
    listTitle: L('', ''),
    points: [],
    entries: []
  }
];

module.exports = { DEFAULT_HISTORY };
