// Service charges, copied from the two notice boards at the temple (the "विशेष सूचना"
// board and the "जय श्री राम" puja board). Nepali is the board's own wording; English is
// a translation. Hindi readers get the Nepali text and Chinese/Tamil readers the English.
// Amounts are in rupees. To change a price, edit `amount` here.

export const SERVICE_CHARGES = {
  heading: { ne: 'सेवा शुल्क', en: 'Service Charges' },

  courtyard: {
    title: { ne: 'मन्दिर प्राङ्गणमा कार्यक्रम', en: 'Programs in the Temple Courtyard' },
    intro: {
      ne: 'श्रीरामचन्द्रमन्दिरको प्राङ्गणमा तपसिल कार्यक्रमहरू गर्दा/गराउँदा निम्नानुसारको सेवा शुल्क निर्धारण गरिएको सूचित गरिन्छ।',
      en: 'The following service charges are set for holding these programs in the courtyard of Shree Ramchandra Temple.',
    },
    groups: [
      {
        key: 'wedding',
        title: { ne: 'विवाह', en: 'Wedding' },
        rows: [
          { label: { ne: 'विवाह गर्ने ठाउँ', en: 'Venue for the wedding' }, amount: 7500 },
          { label: { ne: 'विवाह गर्ने ठाउँ जग्गे सहित', en: 'Venue with jagge' }, amount: 9500 },
          { label: { ne: 'विवाह गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', en: 'Venue with jagge and catering' }, amount: 11500 },
        ],
      },
      {
        key: 'bratabandha',
        title: { ne: 'ब्रतबन्ध', en: 'Bratabandha' },
        rows: [
          { label: { ne: 'ब्रतबन्ध गर्ने ठाउँ', en: 'Venue for the bratabandha' }, amount: 7500 },
          { label: { ne: 'ब्रतबन्ध गर्ने ठाउँ जग्गे सहित', en: 'Venue with jagge' }, amount: 9500 },
          { label: { ne: 'ब्रतबन्ध गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', en: 'Venue with jagge and catering' }, amount: 11500 },
        ],
      },
      {
        key: 'tikatala',
        title: { ne: 'टिकाटाला', en: 'Tikatala' },
        rows: [
          { label: { ne: 'टिकाटाला गर्ने ठाउँ', en: 'Venue for the tikatala' }, amount: 7500 },
          { label: { ne: 'टिकाटाला गर्ने ठाउँ जग्गे र क्याटरिङ्ग सहित', en: 'Venue with jagge and catering' }, amount: 9500 },
        ],
      },
      {
        key: 'shooting',
        title: { ne: 'सुटिङ्ग', en: 'Shooting' },
        rows: [
          { label: { ne: 'सिनेमा', en: 'Cinema' }, amount: 15500 },
          { label: { ne: 'टेलिसिरियल/भिडियो', en: 'Tele-serial / video' }, amount: 7500 },
          { label: { ne: 'फोटो सुट', en: 'Photo shoot' }, amount: 1500 },
        ],
      },
    ],
  },

  puja: {
    title: { ne: 'पूजा तथा सेवा', en: 'Puja and Services' },
    intro: {
      ne: 'यस मन्दिरमा निम्नानुसार पूजा–आजाको पनि व्यवस्था भएकोले इच्छुक भक्तजनले समितिसँग सम्पर्क गर्नुहोला।',
      en: 'Puja and related services are also arranged at this temple as listed below. Interested devotees may contact the committee.',
    },
    rows: [
      { label: { ne: 'अन्नकूट उत्सव', en: 'Annakuta Utsav' }, amount: 51001 },
      { label: { ne: 'नवमी अर्चना एवं भक्तिवन्दना', en: 'Navami Archana and Bhaktivandana' }, amount: 21000 },
      {
        label: { ne: 'त्रिमञ्जन', en: 'Trimanjan' },
        detail: { ne: '(संक्रान्ति, मसान्त, नवमी, पूर्णिमा)', en: '(Sankranti, Masanta, Navami, Purnima)' },
        amount: 2100,
      },
      { label: { ne: 'विष्णुसहस्रनाम अर्चना', en: 'Vishnu Sahasranama Archana' }, amount: 1008 },
      { label: { ne: 'हनुमानचालिसा पाठ', en: 'Hanuman Chalisa recitation' }, amount: 1101 },
      { label: { ne: 'बिहानको भोगराग', en: 'Morning Bhogaraga' }, amount: 1101 },
      { label: { ne: 'बालभोग', en: 'Balbhog' }, amount: 501 },
      { label: { ne: '१०८ तुलसी अर्चना', en: '108 Tulsi Archana' }, amount: 301 },
      { label: { ne: 'एकादशी फलाहार अर्पण', en: 'Ekadashi Falahar offering' }, amount: 501 },
      { label: { ne: 'आरती', en: 'Aarti' }, amount: 500 },
    ],
  },

  contact: {
    label: { ne: 'थप जानकारीको लागि', en: 'For more information' },
    name: { ne: 'वसन्त खड्का', en: 'Basanta Khadka' },
    role: { ne: 'कार्यालय सचिव', en: 'Office Secretary' },
    phone: '9851154432',
    committee: {
      ne: 'श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति',
      en: 'Shree Ramchandra Mandir Restoration and Promotion Committee',
    },
    address: { ne: 'बत्तीसपुतली, काठमाडौं', en: 'Battisputali, Kathmandu' },
    officePhone: '01-4598526',
    note: {
      ne: 'नोट: माथिका कार्यहरू गर्नका लागि समिति भन्दा बाहिरका व्यक्तिहरूसँग सम्पर्क नगर्नुहोला।',
      en: 'Note: for the above, please do not deal with anyone outside the committee.',
    },
  },
};

export default SERVICE_CHARGES;
