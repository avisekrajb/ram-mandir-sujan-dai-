/**
 * Placeholder names and short descriptions for gallery photos that have no real
 * title/description yet. They only fill gaps: as soon as a title or description
 * is set in Admin → Gallery, that text is shown instead.
 */
const SETS = [
  {
    en: ['Temple Entrance', 'The gateway to the sacred courtyard, open to devotees from early morning.'],
    ne: ['मन्दिरको प्रवेशद्वार', 'बिहान सबेरैदेखि भक्तजनका लागि खुला पवित्र चोकको प्रवेशद्वार।'],
    hi: ['मंदिर का प्रवेश द्वार', 'सुबह से भक्तों के लिए खुला पवित्र प्रांगण का द्वार।'],
    zh: ['神庙入口', '清晨起便向信众敞开的神圣庭院大门。'],
    ta: ['கோவில் நுழைவாயில்', 'அதிகாலை முதல் பக்தர்களுக்காகத் திறந்திருக்கும் புனித முற்றத்தின் வாயில்.'],
  },
  {
    en: ['Evening Aarti', 'Lamps and bells fill the temple as the daily evening aarti begins.'],
    ne: ['साँझको आरती', 'दैनिक साँझको आरती सुरु हुँदा दीप र घण्टले मन्दिर गुञ्जायमान हुन्छ।'],
    hi: ['संध्या आरती', 'दैनिक संध्या आरती के साथ दीप और घंटियों से मंदिर गूंज उठता है।'],
    zh: ['傍晚灯供', '每日傍晚灯供开始，灯火与钟声充满神庙。'],
    ta: ['மாலை ஆரத்தி', 'தினசரி மாலை ஆரத்தியின் போது தீபங்களும் மணியோசையும் கோவிலை நிரப்புகின்றன.'],
  },
  {
    en: ['Festival Procession', 'Devotees carry the deities through the streets on festival days.'],
    ne: ['पर्वको शोभायात्रा', 'पर्वका दिन भक्तजनले देवमूर्तिलाई सडकमा शोभायात्रामा लैजान्छन्।'],
    hi: ['पर्व की शोभायात्रा', 'पर्व के दिनों में भक्त देव-मूर्तियों को सड़कों पर शोभायात्रा में ले जाते हैं।'],
    zh: ['节日巡游', '节日里信众抬着神像穿行街巷。'],
    ta: ['திருவிழா ஊர்வலம்', 'திருவிழா நாட்களில் பக்தர்கள் தெய்வங்களைத் தெருக்களில் ஊர்வலமாக எடுத்துச் செல்கின்றனர்.'],
  },
  {
    en: ['Sacred Shikhara', 'The golden spires rise above the temple against the Kathmandu sky.'],
    ne: ['पवित्र शिखर', 'काठमाडौंको आकाशमा मन्दिरमाथि उठेका सुनौला शिखरहरू।'],
    hi: ['पवित्र शिखर', 'काठमांडू के आकाश में मंदिर के ऊपर उठते स्वर्णिम शिखर।'],
    zh: ['神圣塔顶', '金色塔尖耸立于加德满都的天空之下。'],
    ta: ['புனித சிகரம்', 'காத்மாண்டு வானில் கோவிலின் மேலே உயரும் தங்கக் கோபுரங்கள்.'],
  },
  {
    en: ['Marigold Offerings', 'Fresh marigold garlands offered to Lord Ram, Sita and Lakshman.'],
    ne: ['सयपत्रीका माला', 'श्रीराम, सीता र लक्ष्मणलाई अर्पण गरिएका ताजा सयपत्रीका माला।'],
    hi: ['गेंदे की मालाएँ', 'श्रीराम, सीता और लक्ष्मण को अर्पित ताज़ा गेंदे की मालाएँ।'],
    zh: ['万寿菊供花', '献给罗摩、悉多与罗什曼的新鲜万寿菊花环。'],
    ta: ['சாமந்தி மாலைகள்', 'ராமர், சீதை, லட்சுமணருக்குச் சமர்ப்பிக்கப்பட்ட புதிய சாமந்தி மாலைகள்.'],
  },
  {
    en: ['Temple Courtyard', 'A quiet courtyard where devotees pause, pray and walk around the shrine.'],
    ne: ['मन्दिरको चोक', 'भक्तजन रोकिएर प्रार्थना गर्ने र परिक्रमा गर्ने शान्त चोक।'],
    hi: ['मंदिर का प्रांगण', 'शांत प्रांगण जहाँ भक्त रुककर प्रार्थना और परिक्रमा करते हैं।'],
    zh: ['神庙庭院', '信众在此驻足祈祷、绕行神龛的宁静庭院。'],
    ta: ['கோவில் முற்றம்', 'பக்தர்கள் நின்று வழிபட்டுக் கருவறையைச் சுற்றி வரும் அமைதியான முற்றம்.'],
  },
  {
    en: ['Carved Stonework', 'Centuries-old carvings tell stories of gods and heroes.'],
    ne: ['कलात्मक ढुङ्गाको कुँदाइ', 'शताब्दीयौँ पुराना कुँदाइहरूले देवता र वीरहरूका कथा सुनाउँछन्।'],
    hi: ['नक्काशीदार पत्थर', 'सदियों पुरानी नक्काशियाँ देवताओं और वीरों की कथाएँ कहती हैं।'],
    zh: ['石雕艺术', '数百年历史的雕刻讲述着诸神与英雄的故事。'],
    ta: ['செதுக்கிய கற்சிற்பம்', 'பல நூற்றாண்டு பழமையான சிற்பங்கள் தெய்வங்கள், வீரர்களின் கதைகளைச் சொல்கின்றன.'],
  },
  {
    en: ['Darshan Day', 'Devotees queue patiently for darshan of the deities.'],
    ne: ['दर्शनको दिन', 'देवदर्शनका लागि भक्तजन धैर्यपूर्वक पङ्क्तिमा बस्छन्।'],
    hi: ['दर्शन का दिन', 'देव-दर्शन के लिए भक्त धैर्य से पंक्ति में खड़े होते हैं।'],
    zh: ['瞻礼日', '信众耐心排队瞻仰神像。'],
    ta: ['தரிசன நாள்', 'தெய்வ தரிசனத்திற்காகப் பக்தர்கள் பொறுமையாக வரிசையில் நிற்கின்றனர்.'],
  },
];

// Names that mean "no real title" (generic upload names).
const GENERIC = /^(gallery image|temple (photo|video|image)|image|photo|video|img[\s_-]?\d*|whatsapp (image|video).*|screenshot.*|untitled)$/i;

export const isGenericTitle = (title) => !title || GENERIC.test(String(title).trim());

/** { title, desc } placeholder for the photo at `index`, in `lang` (English fallback). */
export const placeholderCaption = (index, lang = 'en') => {
  const set = SETS[index % SETS.length];
  const [title, desc] = set[lang] || set.en;
  return { title, desc };
};
