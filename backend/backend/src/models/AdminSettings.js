const mongoose = require('mongoose');

// Reusable localized text object: { en, ne, hi, zh, ta }
const localizedStringSchema = new mongoose.Schema({
  en: { type: String, default: '' },
  ne: { type: String, default: '' },
  hi: { type: String, default: '' },
  zh: { type: String, default: '' },
  ta: { type: String, default: '' },
}, { _id: false });

const adminSettingsSchema = new mongoose.Schema({
  // ============================================
  // LANGUAGES (super-admin enabled/disabled)
  // Empty/undefined => all languages enabled.
  // ============================================
  enabledLanguages: [String],

  // ============================================
  // HERO SECTION
  // ============================================
  heroVideo: {
    type: String,
    default: null,
  },
  /*
   * Banner photo for the home page hero. It and heroVideo are alternatives, not
   * a pair: the hero shows the video when there is one and the photo otherwise,
   * so the admin never has to clear the other to make the banner change.
   */
  heroImage: {
    type: String,
    default: null,
  },
  heroPoster: {
    type: String,
    default: 'linear-gradient(160deg,#7A1F2B 0%,#5B1420 45%,#2B1810 100%)',
  },
  heroEnabled: {
    type: Boolean,
    default: true,
  },
  heroTitle: {
    en: { type: String, default: 'Shree Ramchandra Temple' },
    ne: { type: String, default: 'श्री रामचन्द्र मन्दिर' },
    hi: { type: String, default: 'श्री रामचंद्र मंदिर' },
    zh: { type: String, default: '什里·拉姆钱德拉神庙' },
    ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோவில்' },
  },
  heroTagline: {
    en: { type: String, default: 'Where devotion meets the sacred banks of Bagmati' },
    ne: { type: String, default: 'जहाँ भक्ति बागमतीको पवित्र किनारमा मिल्छ' },
    hi: { type: String, default: 'जहाँ भक्ति बागमती के पवित्र तटों से मिलती है' },
    zh: { type: String, default: '虔诚与巴格马蒂圣河相遇之处' },
    ta: { type: String, default: 'பக்தி பாக்மதியின் புனித கரையில் சந்திக்கும் இடம்' },
  },
  /*
   * The invocation and stuti shown over the home page hero banner. Edited from
   * Admin → Hero in all five languages. The verse is one string per language;
   * newlines split it into the separate lines the banner renders.
   */
  heroShloka: {
    enabled: { type: Boolean, default: true },
    invocation: {
      en: { type: String, default: 'Salutations to Lord Shri Ramachandra.' },
      ne: { type: String, default: 'श्रीरामचन्द्राय नमः' },
      hi: { type: String, default: 'श्रीरामचन्द्राय नमः' },
      zh: { type: String, default: '向 श्री罗摩旃陀罗致敬。' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திராய நமः' },
    },
    stutiLabel: {
      en: { type: String, default: 'Hymn to Shri Rama:' },
      ne: { type: String, default: 'श्रीरामस्तुति:' },
      hi: { type: String, default: 'श्रीराम स्तुति:' },
      zh: { type: String, default: 'श्री罗摩赞颂：' },
      ta: { type: String, default: 'ஸ்ரீ ராம ஸ்துதி:' },
    },
    verse: {
      en: { type: String, default: 'I seek refuge in Lord Shri Ramachandra, who is beloved of all, courageous on the battlefield, lotus-eyed, and the Lord of the Raghu dynasty; who embodies compassion and is the bestower of mercy.' },
      ne: { type: String, default: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥' },
      hi: { type: String, default: 'लोकाभिरामं रणरङ्गधीरं राजीवनेत्रं रघुवंशनाथम्।\nकारुण्यरूपं करुणाकरं तं श्रीरामचन्द्रं शरणं प्रपद्ये॥' },
      zh: { type: String, default: '我皈依于 श्री罗摩旃陀罗，他令人世间喜爱，战场上英勇无畏，拥有如莲花般的双眼，是拉古王朝之主；他是慈悲的化身，是施予慈悲与恩典之主。' },
      ta: { type: String, default: 'உலகத்தாரால் நேசிக்கப்படுபவரும், போர்க்களத்தில் வீரமும் துணிவும் கொண்டவரும், தாமரை போன்ற கண்களையுடையவரும், ரகு வம்சத்தின் தலைவருமான ஸ்ரீ ராமச்சந்திரரை நான் சரணடைகிறேன். அவர் கருணையின் வடிவமாகவும், அருளை வழங்குபவராகவும் விளங்குகிறார்.' },
    },
  },
  
  // ============================================
  // HISTORY BANNER
  // ============================================
  historyBanner: {
    type: String,
    default: '/aboutusherosection.jpeg',
  },
  
  // ============================================
  // DAILY QUOTES (Multi-language per date)
  // ============================================
  dailyQuotes: {
    type: Map,
    of: {
      en: { type: String, default: '' },
      ne: { type: String, default: '' },
      hi: { type: String, default: '' },
      zh: { type: String, default: '' },
      ta: { type: String, default: '' },
    },
    default: {},
    description: 'Daily quotes stored with date as key (YYYY-MM-DD) and 5 language translations',
  },
  
  // ============================================
  // LEGACY QUOTES (Kept for backward compatibility)
  // ============================================
  quotes: {
    en: { type: String, default: '' },
    ne: { type: String, default: 'जहाँ हृदयमा धार्मिकता हुन्छ, त्यहाँ चरित्रमा सुन्दरता हुन्छ।' },
    hi: { type: String, default: 'जहाँ हृदय में धार्मिकता है, वहाँ चरित्र में सुंदरता है।' },
    zh: { type: String, default: '心中有正义，性格便有美。' },
    ta: { type: String, default: 'இதயத்தில் நேர்மை இருந்தால், குணத்தில் அழகு இருக்கும்.' },
  },
  
  // ============================================
  // TEMPLE TIMINGS (Multi-language)
  // ============================================
  timings: {
    open: { type: String, default: '05:00 AM' },
    close: { type: String, default: '08:00 PM' },
    openLabel: {
      en: { type: String, default: 'Opening Time' },
      ne: { type: String, default: 'खुल्ने समय' },
      hi: { type: String, default: 'खुलने का समय' },
      zh: { type: String, default: '开放时间' },
      ta: { type: String, default: 'திறக்கும் நேரம்' },
    },
    closeLabel: {
      en: { type: String, default: 'Closing Time' },
      ne: { type: String, default: 'बन्द हुने समय' },
      hi: { type: String, default: 'बन्द होने का समय' },
      zh: { type: String, default: '关闭时间' },
      ta: { type: String, default: 'மூடும் நேரம்' },
    },
    dailyAarti: {
      en: { type: String, default: 'Daily Aarti' },
      ne: { type: String, default: 'दैनिक आरती' },
      hi: { type: String, default: 'दैनिक आरती' },
      zh: { type: String, default: '每日祈祷' },
      ta: { type: String, default: 'தினசரி ஆரத்தி' },
    },
  },
  
  // ============================================
  // ABOUT SECTION (Multi-language)
  // ============================================
about: {
    photo: { type: String, default: null },
    title: {
      en: { type: String, default: 'Introduction to the Temple' },
      ne: { type: String, default: 'श्री रामचन्द्र मन्दिरको परिचय' },
      hi: { type: String, default: 'श्री रामचन्द्र मन्दिर का परिचय' },
      zh: { type: String, default: '什里·拉姆钱德拉神庙简介' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோயில் அறிமுகம்' },
    },
    text: {
      en: { type: String, default: 'Nestled in the heart of Gaushala, Shree Ramchandra Temple has stood as a beacon of devotion for generations, welcoming devotees of Lord Ram with open doors and open hearts.' },
      ne: { type: String, default: 'गौशालाको हृदयमा अवस्थित श्री रामचन्द्र मन्दिर पुस्तौंदेखि भक्तिको प्रतीकको रूपमा उभिएको छ, भगवान रामका भक्तहरूलाई खुला मन र खुला ढोकाले स्वागत गर्दै।' },
      hi: { type: String, default: 'गौशाला के हृदय में स्थित श्री रामचन्द्र मंदिर पीढ़ियों से भक्ति का प्रतीक बना हुआ है, भगवान राम के भक्तों का खुले दिल और खुले द्वार से स्वागत करते हुए।' },
      zh: { type: String, default: '室利罗摩钱德拉神庙坐落于高沙拉的中心，世代以来一直是信仰的象征，以开放的大门和心怀敬意的态度欢迎罗摩神的信众。' },
      ta: { type: String, default: 'கௌஷாலாவின் இதயத்தில் அமைந்துள்ள ஸ்ரீ ராமச்சந்திர கோயில், தலைமுறை தலைமுறையாக பக்தியின் ஒளிவிளக்காக நின்று, ராமர் பக்தர்களை திறந்த மனதுடன் வரவேற்கிறது.' },
    },
    images: {
      type: [{
        id: { type: String },
        src: { type: String },
        alt: {
          en: { type: String, default: '' },
          ne: { type: String, default: '' },
          hi: { type: String, default: '' },
          zh: { type: String, default: '' },
          ta: { type: String, default: '' },
        },
        order: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true },
      }],
      default: [],
    },
  },
  
  // ============================================
  // ABOUT PREVIEW (Homepage Only)
  // ============================================
aboutPreview: {
    enabled: { type: Boolean, default: true },
    title: {
      en: { type: String, default: 'Introduction to the Temple' },
      ne: { type: String, default: 'श्री रामचन्द्र मन्दिरको परिचय' },
      hi: { type: String, default: 'श्री रामचन्द्र मन्दिर का परिचय' },
      zh: { type: String, default: '什里·拉姆钱德拉神庙简介' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோயில் அறிமுகம்' },
    },
    text: {
      en: { type: String, default: 'Nestled in the heart of Gaushala, Shree Ramchandra Temple has stood as a beacon of devotion for generations, welcoming devotees of Lord Ram with open doors and open hearts.' },
      ne: { type: String, default: 'गौशालाको हृदयमा अवस्थित श्री रामचन्द्र मन्दिर पुस्तौंदेखि भक्तिको प्रतीकको रूपमा उभिएको छ, भगवान रामका भक्तहरूलाई खुला मन र खुला ढोकाले स्वागत गर्दै।' },
      hi: { type: String, default: 'गौशाला के हृदय में स्थित श्री रामचन्द्र मंदिर पीढ़ियों से भक्ति का प्रतीक बना हुआ है, भगवान राम के भक्तों का खुले दिल और खुले द्वार से स्वागत करते हुए।' },
      zh: { type: String, default: '室利罗摩钱德拉神庙坐落于高沙拉的中心，世代以来一直是信仰的象征，以开放的大门和心怀敬意的态度欢迎罗摩神的信众。' },
      ta: { type: String, default: 'கௌஷாலாவின் இதயத்தில் அமைந்துள்ள ஸ்ரீ ராமச்சந்திர கோயில், தலைமுறை தலைமுறையாக பக்தியின் ஒளிவிளக்காக நின்று, ராமர் பக்தர்களை திறந்த மனதுடன் வரவேற்கிறது.' },
    },
    images: {
      type: [{
        id: { type: String },
        src: { type: String },
        alt: {
          en: { type: String, default: '' },
          ne: { type: String, default: '' },
          hi: { type: String, default: '' },
          zh: { type: String, default: '' },
          ta: { type: String, default: '' },
        },
        order: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true },
      }],
      default: [],
    },
  },
  
  // ============================================
  // SOCIAL LINKS (NEW - For floating social bar)
  // ============================================
  socialLinks: {
    type: [{
      id: { type: String },
      platform: { 
        type: String, 
        required: true,
        enum: ['facebook', 'instagram', 'youtube', 'twitter', 'linkedin', 'whatsapp', 'email', 'phone', 'tiktok', 'pinterest', 'snapchat', 'telegram', 'discord', 'reddit', 'tumblr'],
        default: 'facebook'
      },
      icon: { 
        type: String,
        required: true,
        enum: ['Facebook', 'Instagram', 'Youtube', 'Twitter', 'Linkedin', 'MessageCircle', 'WhatsApp', 'Mail', 'Email', 'Phone', 'Globe', 'Share2', 'TikTok', 'Pinterest', 'Snapchat', 'Telegram', 'Discord', 'Reddit', 'Tumblr'],
        default: 'Facebook'
      },
      label: { type: String, required: true },
      url: { type: String, required: true },
      color: { type: String },
      enabled: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    }],
    default: [
      {
        id: '1',
        platform: 'facebook',
        icon: 'Facebook',
        label: 'Facebook',
        url: 'https://www.facebook.com',
        enabled: true,
        order: 0
      },
      {
        id: '2',
        platform: 'instagram',
        icon: 'Instagram',
        label: 'Instagram',
        url: 'https://www.instagram.com',
        enabled: true,
        order: 1
      },
      {
        id: '3',
        platform: 'youtube',
        icon: 'Youtube',
        label: 'YouTube',
        url: 'https://www.youtube.com',
        enabled: true,
        order: 2
      },
      {
        id: '4',
        platform: 'twitter',
        icon: 'Twitter',
        label: 'Twitter',
        url: 'https://twitter.com',
        enabled: true,
        order: 3
      }
    ]
  },

  // ============================================
  // FACEBOOK VIDEO EMBEDS (Gallery Videos tab + Home page)
  // ============================================
  facebookVideo: {
    enabled: { type: Boolean, default: true },
  },
  facebookVideos: {
    type: [{
      url: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    }],
    default: [],
  },
  facebookReels: {
    type: [{
      url: { type: String, required: true },
      enabled: { type: Boolean, default: true },
    }],
    default: [],
  },

  // ============================================
  // FOUNDER SECTION
  // ============================================
  founder: {
    photo: { type: String, default: '/2.jpg' },
    name: {
      en: { type: String, default: 'Pandit Ram Prasad Acharya' },
      ne: { type: String, default: 'पण्डित रामप्रसाद आचार्य' },
      hi: { type: String, default: 'पंडित रामप्रसाद आचार्य' },
      zh: { type: String, default: '潘迪特·拉姆·普拉萨德·阿查里亚' },
      ta: { type: String, default: 'பண்டிட் ராம் பிரசாத் ஆச்சார்யா' },
    },
    title: {
      en: { type: String, default: 'The Visionary Founder' },
      ne: { type: String, default: 'दूरदर्शी संस्थापक' },
      hi: { type: String, default: 'दूरदर्शी संस्थापक' },
      zh: { type: String, default: '有远见的创始人' },
      ta: { type: String, default: 'தூரநோக்கு நிறுவனர்' },
    },
    intro: {
      en: { type: String, default: 'The temple\'s rich history is woven with stories of devotion, community service, and unwavering faith. Generation after generation, this sacred place has been a beacon of hope and spiritual solace for countless devotees.' },
      ne: { type: String, default: 'मन्दिरको समृद्ध इतिहास भक्ति, समुदाय सेवा र अटल विश्वासका कथाहरूले बुनेको छ। पुस्ता पछि पुस्ता, यो पवित्र स्थान अनगिन्ती भक्तहरूको लागि आशा र आध्यात्मिक सान्त्वनाको प्रकाशस्तम्भ भएको छ।' },
      hi: { type: String, default: 'मंदिर का समृद्ध इतिहास भक्ति, सामुदायिक सेवा और अटूट विश्वास की कहानियों से बुना गया है। पीढ़ी दर पीढ़ी, यह पवित्र स्थान अनगिनत भक्तों के लिए आशा और आध्यात्मिक सांत्वना का प्रकाशस्तंभ रहा है।' },
      zh: { type: String, default: '寺庙丰富的历史由奉献、社区服务和坚定信仰的故事编织而成。一代又一代，这个神圣的地方一直是无数信徒希望和精神慰藉的灯塔。' },
      ta: { type: String, default: 'கோயிலின் வளமான வரலாறு பக்தி, சமூக சேவை மற்றும் உறுதியான நம்பிக்கையின் கதைகளால் பின்னப்பட்டுள்ளது. தலைமுறை தலைமுறையாக, இந்த புனித இடம் எண்ணற்ற பக்தர்களுக்கு நம்பிக்கை மற்றும் ஆன்மீக ஆறுதலின் ஒளிவிளக்காக இருந்து வருகிறது.' },
    },
    subtitle: {
      en: { type: String, default: 'Head Priest & Spiritual Leader' },
      ne: { type: String, default: 'मुख्य पुजारी र आध्यात्मिक नेता' },
      hi: { type: String, default: 'मुख्य पुजारी और आध्यात्मिक नेता' },
      zh: { type: String, default: '首席祭司和精神领袖' },
      ta: { type: String, default: 'தலைமை பூசாரி மற்றும் ஆன்மீகத் தலைவர்' },
    },
    para1: {
      en: { type: String, default: 'The temple\'s rich history is woven with stories of devotion, community service, and unwavering faith. Generation after generation, this sacred place has been a beacon of hope and spiritual solace for countless devotees.' },
      ne: { type: String, default: 'मन्दिरको समृद्ध इतिहास भक्ति, समुदाय सेवा र अटल विश्वासका कथाहरूले बुनेको छ। पुस्ता पछि पुस्ता, यो पवित्र स्थान अनगिन्ती भक्तहरूको लागि आशा र आध्यात्मिक सान्त्वनाको प्रकाशस्तम्भ भएको छ।' },
      hi: { type: String, default: 'मंदिर का समृद्ध इतिहास भक्ति, सामुदायिक सेवा और अटूट विश्वास की कहानियों से बुना गया है। पीढ़ी दर पीढ़ी, यह पवित्र स्थान अनगिनत भक्तों के लिए आशा और आध्यात्मिक सांत्वना का प्रकाशस्तंभ रहा है।' },
      zh: { type: String, default: '寺庙丰富的历史由奉献、社区服务和坚定信仰的故事编织而成。一代又一代，这个神圣的地方一直是无数信徒希望和精神慰藉的灯塔。' },
      ta: { type: String, default: 'கோயிலின் வளமான வரலாறு பக்தி, சமூக சேவை மற்றும் உறுதியான நம்பிக்கையின் கதைகளால் பின்னப்பட்டுள்ளது. தலைமுறை தலைமுறையாக, இந்த புனித இடம் எண்ணற்ற பக்தர்களுக்கு நம்பிக்கை மற்றும் ஆன்மீக ஆறுதலின் ஒளிவிளக்காக இருந்து வருகிறது.' },
    },
    para2: {
      en: { type: String, default: '' },
      ne: { type: String, default: '' },
      hi: { type: String, default: '' },
      zh: { type: String, default: '' },
      ta: { type: String, default: '' },
    },
    para3: {
      en: { type: String, default: '' },
      ne: { type: String, default: '' },
      hi: { type: String, default: '' },
      zh: { type: String, default: '' },
      ta: { type: String, default: '' },
    },
    para4: {
      en: { type: String, default: '' },
      ne: { type: String, default: '' },
      hi: { type: String, default: '' },
      zh: { type: String, default: '' },
      ta: { type: String, default: '' },
    },
    quote: {
      en: { type: String, default: 'Where there is righteousness in the heart, there is beauty in the character. Where there is beauty in the character, there is harmony in the home. Where there is harmony in the home, there is order in the nation. Where there is order in the nation, there is peace in the world.' },
      ne: { type: String, default: 'जहाँ हृदयमा धार्मिकता हुन्छ, त्यहाँ चरित्रमा सुन्दरता हुन्छ। जहाँ चरित्रमा सुन्दरता हुन्छ, त्यहाँ घरमा सद्भाव हुन्छ। जहाँ घरमा सद्भाव हुन्छ, त्यहाँ राष्ट्रमा व्यवस्था हुन्छ। जहाँ राष्ट्रमा व्यवस्था हुन्छ, त्यहाँ विश्वमा शान्ति हुन्छ।' },
      hi: { type: String, default: 'जहाँ हृदय में धार्मिकता है, वहाँ चरित्र में सुंदरता है। जहाँ चरित्र में सुंदरता है, वहाँ घर में सद्भाव है। जहाँ घर में सद्भाव है, वहाँ राष्ट्र में व्यवस्था है। जहाँ राष्ट्र में व्यवस्था है, वहाँ विश्व में शांति है।' },
      zh: { type: String, default: '心中有正义，性格便有美；性格有美，家庭便和谐；家庭和谐，国家便有秩序；国家有秩序，世界便和平。' },
      ta: { type: String, default: 'இதயத்தில் நேர்மை இருந்தால், குணத்தில் அழகு இருக்கும். குணத்தில் அழகு இருந்தால், வீட்டில் ஒற்றுமை இருக்கும். வீட்டில் ஒற்றுமை இருந்தால், நாட்டில் ஒழுங்கு இருக்கும். நாட்டில் ஒழுங்கு இருந்தால், உலகில் அமைதி இருக்கும்.' },
    },
  },
  
  // ============================================
  // LOGO SETTINGS
  // ============================================
  logo: {
    photo: { type: String, default: null },
    text: {
      en: { type: String, default: 'Shree Ramchandra' },
      ne: { type: String, default: 'श्री रामचन्द्र' },
      hi: { type: String, default: 'श्री रामचन्द्र' },
      zh: { type: String, default: '室利罗摩钱德拉' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர' },
    },
    size: { type: String, default: 'w-12 h-12' },
    shape: { type: String, default: 'rounded-full' },
    bgColor: { type: String, default: 'from-vermilion to-maroon-deep' },
    showText: { type: Boolean, default: true },
    textColor: { type: String, default: 'text-maroon' },
    textSize: { type: String, default: 'text-sm md:text-base' },
    fontWeight: { type: String, default: 'font-bold' },
    showLocation: { type: Boolean, default: true },
    maxWidth: { type: String, default: 'max-w-[48px]' },
  },
  
  // ============================================
  // DONATION SETTINGS
  // ============================================
  donate: {
    qrPhoto: { type: String, default: null },
    baseCount: { type: Number, default: 1248 },
    bankNumber: { type: String, default: 'eSewa / COD — 98XXXXXXXX' },
    bankName: { type: String, default: 'Nepal Investment Bank' },
    accountHolder: { type: String, default: 'Temple Trust Fund' },
    // ---- Feature switches (toggled by the super admin) ----
    // Each payment gateway can be hidden independently from /donate.
    esewaEnabled: { type: Boolean, default: true },
    khaltiEnabled: { type: Boolean, default: true },
    ipsEnabled: { type: Boolean, default: true },
    // When false the QR image is hidden everywhere on the public donate page.
    qrEnabled: { type: Boolean, default: true },
    // When false the bank account numbers are hidden.
    showBankDetails: { type: Boolean, default: true },
  },
  
  // ============================================
  // GALLERY IMAGES (for homepage)
  // ============================================
  galleryImages: {
    type: [{
      id: { type: String },
      src: { type: String },
      alt: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      order: { type: Number, default: 0 },
      enabled: { type: Boolean, default: true },
    }],
    default: [],
  },
  
  // ============================================
  // YOUTUBE LIVE VIDEO
  // ============================================
  liveVideo: {
    enabled: { type: Boolean, default: true },
    url: { type: String, default: 'https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&autoplay=1&mute=1' },
    title: {
      en: { type: String, default: 'Live Darshan' },
      ne: { type: String, default: 'लाइभ दर्शन' },
      hi: { type: String, default: 'लाइव दर्शन' },
      zh: { type: String, default: '现场朝拜' },
      ta: { type: String, default: 'நேரடி தரிசனம்' },
    },
    description: {
      en: { type: String, default: 'Experience the divine presence of Lord Ram from anywhere in the world' },
      ne: { type: String, default: 'संसारको कुनै पनि स्थानबाट भगवान रामको दिव्य उपस्थिति अनुभव गर्नुहोस्' },
      hi: { type: String, default: 'दुनिया में कहीं से भी भगवान राम की दिव्य उपस्थिति का अनुभव करें' },
      zh: { type: String, default: '从世界任何地方体验罗摩神的神圣存在' },
      ta: { type: String, default: 'உலகில் எங்கிருந்தும் ராமரின் தெய்வீக இருப்பை அனுபவியுங்கள்' },
    },
  },
  
  // ============================================
  // NOTICE MODAL SETTINGS
  // ============================================
  notice: {
    enabled: { type: Boolean, default: true },
    photo: { type: String, default: '' },
    title: { 
      en: { type: String, default: 'Heartfelt Request' },
      ne: { type: String, default: 'हार्दिक अनुरोध' },
      hi: { type: String, default: 'हार्दिक अनुरोध' },
      zh: { type: String, default: '诚挚请求' },
      ta: { type: String, default: 'மனமார்ந்த வேண்டுகோள்' },
    },
    banner: { 
      en: { type: String, default: "Let's participate in installing the 'Lift'." },
      ne: { type: String, default: "'लिफ्ट' राख्ने कार्यमा सहभागी बनौं ।" },
      hi: { type: String, default: "'लिफ्ट' रखने कार्य में सहभागी बनें ।" },
      zh: { type: String, default: "让我们参与安装'电梯'。" },
      ta: { type: String, default: "'லிஃப்ட்' அமைப்பதில் பங்கேற்போம்." },
    },
    body: {
      en: { type: String, default: 'To make it easier for the elderly and differently-abled to visit and move around at the Shree Ramchandra Temple, we are installing a lift on the eastern side of the temple that can accommodate up to 8 people. The work is expected to be completed within 6 months.' },
      ne: { type: String, default: 'भगवान् श्रीरामचन्द्रको मन्दिरमा वृद्ध-वृद्धा एवं विकलाङ्गहरूलाई दर्शन एवं आउ-जाउ गर्न सजिलो होस् भनी मन्दिरको ठिक पूर्वपट्टि ८ जनासम्म अटाउने लिफ्टको स्थापना ६ महीनाभित्र सक्ने गरी कार्य अगाडि बढिरहेको सन्दर्भमा यहाँहरूको सहयोगको अपेक्षासाथ यो सूचना जनसमक्ष जारी गरिएको छ ।' },
      hi: { type: String, default: 'श्रीरामचन्द्र मंदिर में बुजुर्गों और दिव्यांगों को दर्शन और आने-जाने में सुविधा हो, इसके लिए मंदिर के ठीक पूर्व की ओर 8 लोगों तक की क्षमता वाली लिफ्ट स्थापित की जा रही है, जो 6 महीने के भीतर पूरी हो जाएगी।' },
      zh: { type: String, default: '为了方便老年人和残障人士在室利罗摩钱德拉神庙参观和活动，我们正在神庙东侧安装一部可容纳8人的电梯，预计在6个月内完工。' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோயிலில் முதியவர்கள் மற்றும் ஊனமுற்றோர் எளிதில் வந்து செல்லும் வகையில், கோயிலின் கிழக்குப் பக்கத்தில் 8 பேர் பயணிக்கும் வகையில் உள்ள லிஃப்ட் அமைக்கும் பணி 6 மாதங்களில் முடிக்க திட்டமிடப்பட்டுள்ளது.' },
    },
    cost: {
      en: { type: String, default: 'The estimated cost for the lift structure is approximately Rs. 55,00,000/- (Fifty-five lakh).' },
      ne: { type: String, default: 'लिफ्टसहितको संरचनाको लागि करिब रु. ५५,००,०००/- (पचपन्न लाख) पर्ने अनुमान गरिएको छ ।' },
      hi: { type: String, default: 'लिफ्ट सहित की संरचना के लिए लगभग रु. ५५,००,०००/- (पचपन्न लाख) खर्च होने का अनुमान है।' },
      zh: { type: String, default: '电梯结构的估计成本约为550万卢比。' },
      ta: { type: String, default: 'லிஃப்ட் கட்டமைப்பிற்கான மதிப்பீடு ரூ. 55,00,000/- (ஐம்பத்தி ஐந்து லட்சம்) ஆகும்.' },
    },
    donors: {
      en: { type: String, default: 'The names of generous donors contributing Rs. 15,000/- (Fifteen thousand) and above will be prominently engraved on a stone plaque on the left side of the lift entrance.' },
      ne: { type: String, default: 'यस कार्यमा रु. १५,०००/- (पन्ध्र हजार) देखि माथि सहयोग गर्ने उदारमना दाताहरूको नाम लिफ्टको प्रवेशद्वारको वायाँपट्टि आकर्षक रूपले शिलापत्रमा उत्कीर्ण गरी राखिने जानकारी गराउँदछौं ।' },
      hi: { type: String, default: 'इस कार्य में रु. १५,०००/- (पंद्रह हजार) से अधिक सहयोग करने वाले उदार दाताओं के नाम लिफ्ट के प्रवेश द्वार के बाईं ओर आकर्षक रूप से शिलापत्र पर उत्कीर्ण किए जाएंगे।' },
      zh: { type: String, default: '捐赠15,000卢比及以上的慷慨捐助者姓名将刻在电梯入口左侧的石碑上。' },
      ta: { type: String, default: 'ரூ. 15,000/- (பதினைந்து ஆயிரம்) மற்றும் அதற்கு மேல் நன்கொடை அளிக்கும் தாராள மனம் கொண்ட தானியர்களின் பெயர்கள் லிஃப்ட் நுழைவாயிலின் இடது பக்கத்தில் கல்வெட்டில் பொறிக்கப்படும்.' },
    },
    applicant: {
      en: { type: String, default: 'Applicant' },
      ne: { type: String, default: 'प्रार्थी' },
      hi: { type: String, default: 'प्रार्थी' },
      zh: { type: String, default: '申请人' },
      ta: { type: String, default: 'விண்ணப்பதாரர்' },
    },
    committee: {
      en: { type: String, default: 'Shree Ramchandra Temple Renovation & Development Committee' },
      ne: { type: String, default: 'श्रीरामचन्द्रमन्दिर जीर्णोद्धार एवं संवर्द्धन समिति' },
      hi: { type: String, default: 'श्रीरामचन्द्र मंदिर जीर्णोद्धार एवं संवर्द्धन समिति' },
      zh: { type: String, default: '室利罗摩钱德拉神庙修缮与发展委员会' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோயில் புனரமைப்பு மற்றும் மேம்பாட்டுக் குழு' },
    },
    location: {
      en: { type: String, default: 'Battisputali, Kathmandu, Nepal' },
      ne: { type: String, default: 'बत्तीसपुतली, काठमाडौं, नेपाल' },
      hi: { type: String, default: 'बत्तीसपुतली, काठमाडौं, नेपाल' },
      zh: { type: String, default: '尼泊尔加德满都巴提斯普塔利' },
      ta: { type: String, default: 'பட்டீஸ்புதாலி, காத்மாண்டு, நேபாளம்' },
    },
    contactNo: {
      en: { type: String, default: 'Contact No.' },
      ne: { type: String, default: 'सम्पर्क नं.' },
      hi: { type: String, default: 'सम्पर्क नं.' },
      zh: { type: String, default: '联系电话' },
      ta: { type: String, default: 'தொடர்பு எண்' },
    },
    contactDetails: {
      en: { type: String, default: '01-4598526, 9851154432' },
      ne: { type: String, default: '01-4598526, 9851154432' },
      hi: { type: String, default: '01-4598526, 9851154432' },
      zh: { type: String, default: '01-4598526, 9851154432' },
      ta: { type: String, default: '01-4598526, 9851154432' },
    },
    qrLabel: {
      en: { type: String, default: 'QR Code' },
      ne: { type: String, default: 'क्यू आर कोड' },
      hi: { type: String, default: 'क्यू आर कोड' },
      zh: { type: String, default: '二维码' },
      ta: { type: String, default: 'கியூ ஆர் குறியீடு' },
    },
    donateBtn: {
      en: { type: String, default: 'Donate Now' },
      ne: { type: String, default: 'सहयोग गर्नुहोस्' },
      hi: { type: String, default: 'सहयोग करें' },
      zh: { type: String, default: '立即捐赠' },
      ta: { type: String, default: 'தானம் செய்யுங்கள்' },
    },
  },

  // ============================================
  // NOTICES (multiple - displayed in order in the notice modal)
  // ============================================
  notices: {
    type: [{
      id: { type: String, default: '' },
      enabled: { type: Boolean, default: true },
      photo: { type: String, default: '' },
      title: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      banner: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      body: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      cost: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      donors: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      applicant: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      committee: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      location: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      contactNo: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      contactDetails: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      qrLabel: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
      donateBtn: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
    }],
    default: [],
  },
  
  // ============================================
  // BOOKING MANAGEMENT SETTINGS
  // ============================================
  // Includes the ceremonies the temple complex can host:
  // "मन्दिर परिसरमा आयोजना गर्न सकिने कार्यक्रम"
  pujaTypes: {
    type: [String],
    default: [
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
      'Film & Music Video Shooting',
    ],
  },
  dateLimits: {
    type: Map,
    of: Number,
    default: {},
    description: 'Date limits for bookings (date string -> max bookings)',
  },
  bookingAvailable: {
    type: Boolean,
    default: true,
  },
  availabilityMessage: {
    type: String,
    default: 'Bookings are currently unavailable. Please check back later.',
  },
  bookingStats: {
    pujaTypes: { type: Number, default: 15 },
    secureBooking: { type: String, default: '100%' },
    support: { type: String, default: '24/7' },
  },
  bookingBgPhoto: {
    type: String,
    default: '/4.jpg',
  },
  bookingContent: {
    type: [{
      key: { type: String, default: '' },
      title: { type: localizedStringSchema, default: () => ({}) },
      paragraphs: {
        p1: { type: localizedStringSchema, default: () => ({}) },
        p2: { type: localizedStringSchema, default: () => ({}) },
        p3: { type: localizedStringSchema, default: () => ({}) },
        p4: { type: localizedStringSchema, default: () => ({}) },
      },
      listTitle: { type: localizedStringSchema, default: () => ({}) },
      points: { type: [localizedStringSchema], default: () => [] },
      group: { type: localizedStringSchema, default: () => ({}) },
      showForm: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      enabled: { type: Boolean, default: true },
    }],
    default: () => [],
  },
  
  // ============================================
  // TEAM / COMMITTEE SETTINGS
  // ============================================
  // Page heading for /templeteams
  teamPageTitle: { type: localizedStringSchema, default: () => ({}) },
  // "कार्यसमिति तथा सदस्यहरू" content. `showMembers: true` renders the
  // committee member list at that position.
  teamContent: {
    type: [{
      key: { type: String, default: '' },
      title: { type: localizedStringSchema, default: () => ({}) },
      paragraphs: {
        p1: { type: localizedStringSchema, default: () => ({}) },
        p2: { type: localizedStringSchema, default: () => ({}) },
        p3: { type: localizedStringSchema, default: () => ({}) },
        p4: { type: localizedStringSchema, default: () => ({}) },
      },
      listTitle: { type: localizedStringSchema, default: () => ({}) },
      points: { type: [localizedStringSchema], default: () => [] },
      showMembers: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      enabled: { type: Boolean, default: true },
    }],
    default: () => [],
  },
  
  // ============================================
  // DONATE PAGE CONTENT
  // ============================================
  // Published prose shown at the bottom of /donate, below the donation form.
  donatePageTitle: { type: localizedStringSchema, default: () => ({}) },
  donateIntro: { type: localizedStringSchema, default: () => ({}) },
  donateContent: {
    type: [{
      key: { type: String, default: '' },
      title: { type: localizedStringSchema, default: () => ({}) },
      // short lead paragraph, printed directly under the title
      desc: { type: localizedStringSchema, default: () => ({}) },
      // free-length body list; older records stored a fixed { p1..p4 } object
      paragraphs: { type: mongoose.Schema.Types.Mixed, default: () => [] },
      listTitle: { type: localizedStringSchema, default: () => ({}) },
      points: { type: [localizedStringSchema], default: () => [] },
      order: { type: Number, default: 0 },
      enabled: { type: Boolean, default: true },
    }],
    default: () => [],
  },

  // ============================================
  // EVENTS PAGE HEADINGS
  // ============================================
  // Every line of chrome on /events, as rows so the admin can add their own.
  eventsPageText: {
    type: [{
      key: { type: String, default: '' },
      // English hint naming the slot, e.g. "Page title"
      label: { type: String, default: '' },
      text: { type: localizedStringSchema, default: () => ({}) },
      order: { type: Number, default: 0 },
      enabled: { type: Boolean, default: true },
    }],
    default: () => [],
  },

  // ============================================
  // FOOTER SETTINGS
  // ============================================
  footer: {
    enabled: { type: Boolean, default: true },
    bgType: { type: String, enum: ['color', 'image', 'video'], default: 'color' },
    bgColor: { type: String, default: '#f8f5f0' },
    bgImage: { type: String, default: null },
    bgVideo: { type: String, default: null },
    logoShape: { type: String, enum: ['circle', 'square', 'rectangle'], default: 'circle' },
    logoSize: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    showSocial: { type: Boolean, default: true },
    showQuickLinks: { type: Boolean, default: true },
    showContact: { type: Boolean, default: true },
    showSupport: { type: Boolean, default: true },
    showMap: { type: Boolean, default: true },
    showMadeBy: { type: Boolean, default: true },
    mapUrl: { type: String, default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.245849736379!2d85.3221176!3d27.7170489!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb190c9f5c8d7b%3A0x4f8b3f8b3f8b3f8b!2sGaushala%2C%20Kathmandu%2044600!5e0!3m2!1sen!2snp!4v1700000000000' },
    socialLinks: {
      facebook: { enabled: { type: Boolean, default: true }, url: { type: String, default: 'https://facebook.com' } },
      youtube: { enabled: { type: Boolean, default: true }, url: { type: String, default: 'https://youtube.com' } },
      instagram: { enabled: { type: Boolean, default: true }, url: { type: String, default: 'https://instagram.com' } },
      twitter: { enabled: { type: Boolean, default: true }, url: { type: String, default: 'https://twitter.com' } },
    },
    quickLinks: [{
      path: { type: String, default: '' },
      label: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      }
    }],
    contactInfo: {
      phone: { type: String, default: '+977-1-4XXXXXX' },
      email: { type: String, default: 'info@ramchandratemple.org.np' },
      address: {
        en: { type: String, default: 'Battisputali, Gaushala, Kathmandu, Nepal' },
        ne: { type: String, default: 'बत्तिसपुतली, गौशाला, काठमाडौं, नेपाल' },
        hi: { type: String, default: 'बत्तीसपुतली, गौशाला, काठमाडौं, नेपाल' },
        zh: { type: String, default: '尼泊尔加德满都巴提斯普塔利' },
        ta: { type: String, default: 'பட்டீஸ்புதாலி, கௌஷாலா, காத்மாண்டு, நேபாளம்' },
      }
    },
    footerText: {
      rights: {
        en: { type: String, default: 'All rights reserved.' },
        ne: { type: String, default: 'सबै अधिकार सुरक्षित।' },
        hi: { type: String, default: 'सभी अधिकार सुरक्षित।' },
        zh: { type: String, default: '版权所有。' },
        ta: { type: String, default: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.' },
      },
      blessing: {
        en: { type: String, default: 'Jai Shree Ram' },
        ne: { type: String, default: 'जय श्री राम' },
        hi: { type: String, default: 'जय श्री राम' },
        zh: { type: String, default: '斋·什里·拉姆' },
        ta: { type: String, default: 'ஜெய் ஸ்ரீ ராம்' },
      }
    },
    madeBy: {
      text: {
        en: { type: String, default: 'Made by ZeroInfinity Technology' },
        ne: { type: String, default: 'जिरोइन्फिनिटी टेक्नोलोजीद्वारा निर्मित' },
        hi: { type: String, default: 'जीरोइन्फिनिटी टेक्नोलोजी द्वारा निर्मित' },
        zh: { type: String, default: '由零无限科技制作' },
        ta: { type: String, default: 'ஜீரோஇன்ஃபினிட்டி டெக்னாலஜி மூலம் உருவாக்கப்பட்டது' },
      },
      url: { type: String, default: 'https://www.zeroinfinitytechnologies.com/' },
      logo: { type: String, default: 'https://zeroinfinitytechnologies.com/images/logo-1771865164119.webp?t=1784551924378' },
    },
  },
  
  // ============================================
  // DAILY AARTI & TEMPLE INFORMATION SETTINGS
  // ============================================
  dailyAarti: {
    enabled: { type: Boolean, default: true },
    title: {
      en: { type: String, default: 'Daily Aarti & Darshan Times' },
      ne: { type: String, default: 'दैनिक आरती र दर्शन समय' },
      hi: { type: String, default: 'दैनिक आरती और दर्शन समय' },
      zh: { type: String, default: '每日法会与朝拜时间' },
      ta: { type: String, default: 'தினசரி ஆரத்தி மற்றும் தரிசன நேரங்கள்' },
    },
    subtitle: {
      en: { type: String, default: 'Join us for the daily divine aarti at Shree Ramchandra Temple' },
      ne: { type: String, default: 'श्री रामचन्द्र मन्दिरमा दैनिक दिव्य आरतीमा सहभागी हुनुहोस्' },
      hi: { type: String, default: 'श्री रामचंद्र मंदिर में दैनिक दिव्य आरती में शामिल हों' },
      zh: { type: String, default: '请加入我们在什里·拉姆钱德拉神庙的每日神圣法会' },
      ta: { type: String, default: 'ஸ்ரீ ராமச்சந்திர கோவிலில் தினசரி தெய்வீக ஆரத்தியில் கலந்துகொள்ளுங்கள்' },
    },
    aartis: [{
      name: {
        en: { type: String, default: 'Morning Aarti' },
        ne: { type: String, default: 'बिहानको आरती' },
        hi: { type: String, default: 'सुबह की आरती' },
        zh: { type: String, default: '晨间法会' },
        ta: { type: String, default: 'காலை ஆரத்தி' },
      },
      time: { type: String, default: '05:30 AM' },
    }],
    templeInfo: {
      enabled: { type: Boolean, default: true },
      title: {
        en: { type: String, default: 'Temple Information' },
        ne: { type: String, default: 'मन्दिर जानकारी' },
        hi: { type: String, default: 'मंदिर की जानकारी' },
        zh: { type: String, default: '寺庙信息' },
        ta: { type: String, default: 'கோவில் தகவல்' },
      },
      openingHours: {
        en: { type: String, default: '5:00 AM – 8:00 PM' },
        ne: { type: String, default: 'बिहान ५:०० – राति ८:००' },
        hi: { type: String, default: 'सुबह 5:00 – रात 8:00' },
        zh: { type: String, default: '上午5:00 – 晚上8:00' },
        ta: { type: String, default: 'காலை 5:00 – இரவு 8:00' },
      },
      location: {
        en: { type: String, default: 'Battisputali, Gaushala, Kathmandu, Nepal' },
        ne: { type: String, default: 'बत्तीसपुतली, गौशाला, काठमाडौं, नेपाल' },
        hi: { type: String, default: 'बत्तीसपुतली, गौशाला, काठमाडौं, नेपाल' },
        zh: { type: String, default: '尼泊尔加德满都巴提斯普塔利' },
        ta: { type: String, default: 'பட்டீஸ்புதாலி, கௌஷாலா, காத்மாண்டு, நேபாளம்' },
      },
      specialAartis: {
        en: { type: String, default: 'Special aartis on festivals and Ekadashi' },
        ne: { type: String, default: 'पर्वहरू र एकादशीमा विशेष आरती' },
        hi: { type: String, default: 'त्योहारों और एकादशी पर विशेष आरती' },
        zh: { type: String, default: '节日和 Ekadashi 有特别法会' },
        ta: { type: String, default: 'திருவிழாக்கள் மற்றும் ஏகாதசியில் சிறப்பு ஆரத்தி' },
      },
    },
  },

  // ============================================
  // LIVE PUJA (YouTube)
  // ============================================
  // The "Live Puja" block on the home page. The channel details let the server
  // work out on its own whether a broadcast is running; the offline video is what
  // visitors see instead when nothing is live, so the block is never empty.
  livePuja: {
    enabled: { type: Boolean, default: false },
    // Start playing on its own with the sound off. Browsers only allow this when
    // the video is muted, so the visitor unmutes from YouTube's own controls.
    autoPlay: { type: Boolean, default: true },
    // Shown above the player, e.g. "Shree Ram Chandra Mandir".
    channelName: { type: String, default: '' },
    // Channel page address, used for the "Watch on YouTube" link.
    channelUrl: { type: String, default: '' },
    // The UC... id. This is what the live check actually queries.
    channelId: { type: String, default: '' },
    // Used when no YouTube API key is configured: the admin says whether a
    // broadcast is running. Without it the block falls back to the offline video.
    manualLiveVideoId: { type: String, default: '' },
    // Shown when nothing is live. Accepts a YouTube watch / youtu.be / embed URL
    // or a direct video file URL.
    offlineVideo: {
      url: { type: String, default: '' },
      title: { type: String, default: '' },
    },
  },

  // ============================================
  // NOTIFICATION BELL SOUND
  // ============================================
  // An .mp3 the admin uploads for the admin-panel notification bell, played
  // when a new notification arrives. When no file is set the panel stays silent
  // rather than falling back to a synthesised tone, because an unexpected noise
  // in a working office is worse than no sound.
  bellSound: {
    url: { type: String, default: null },
    enabled: { type: Boolean, default: true },
    // Shown in the admin panel so nobody has to download the file to check it.
    label: { type: String, default: '' },
  },

// ============================================
  // HEADER
  // ============================================
  // Every part of the header can be switched off on its own from
  // Admin -> Header. Each switch defaults to true, so a group that has never
  // been saved leaves the header exactly as it is today.
  //
  // `topBar` is the whole thin strip above the navbar; `panchang` and `tools`
  // are its two halves, which can be hidden individually so the strip can be
  // left half-empty rather than all or nothing.
  //
  // The marquee is a scrolling line of the admin's own text, which is off by
  // default: a moving line above the navbar draws the eye away from the page
  // and should only appear once there is something worth reading there.
  header: {
    topBar: { enabled: { type: Boolean, default: true } },
    panchang: { enabled: { type: Boolean, default: true } },
    tools: { enabled: { type: Boolean, default: true } },
    logo: { enabled: { type: Boolean, default: true } },
    mainNav: { enabled: { type: Boolean, default: true } },
    sound: { enabled: { type: Boolean, default: true } },
    language: { enabled: { type: Boolean, default: true } },
    account: { enabled: { type: Boolean, default: true } },
    marquee: {
      enabled: { type: Boolean, default: false },
      // Seconds for one full pass. Longer is slower, which is easier to read.
      speed: { type: Number, default: 40, min: 10, max: 180 },
      // Where the line leads to, if anywhere. Empty means the text is not a link.
      link: { type: String, default: '' },
      text: {
        en: { type: String, default: '' },
        ne: { type: String, default: '' },
        hi: { type: String, default: '' },
        zh: { type: String, default: '' },
        ta: { type: String, default: '' },
      },
    },
  },

  // ============================================
  // MAINTENANCE MODE (super-admin only)
  // ============================================
  maintenanceMode: {
    enabled: { type: Boolean, default: false },
    title: {
      en: { type: String, default: 'Under Development' },
      ne: { type: String, default: 'विकास अन्तर्गत' },
      hi: { type: String, default: 'विकास कार्य जारी है' },
      zh: { type: String, default: '网站建设中' },
      ta: { type: String, default: 'வேலை நடைபெறுகிறது' },
    },
    message: {
      en: { type: String, default: 'We are working hard to improve your experience. Please visit us again soon.' },
      ne: { type: String, default: 'हामी तपाईंको अनुभव सुधार्न कडा मेहनत गरिरहेका छौं। कृपया चाँडै फेरि भेट्नुहोस्।' },
      hi: { type: String, default: 'हम आपके अनुभव को बेहतर बनाने के लिए कड़ी मेहनत कर रहे हैं। कृपया जल्द ही फिर से आएं।' },
      zh: { type: String, default: '我们正在努力改善您的体验。请尽快再次访问。' },
      ta: { type: String, default: 'உங்கள் அனுபவத்தை மேம்படுத்த நாங்கள் கடுமையாக உழைத்து வருகிறோம். விரைவில் மீண்டும் வாருங்கள்.' },
    },
  },

  // ============================================
  // TIMESTAMP
  // ============================================
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// STATIC METHODS
// ============================================
adminSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  // Repaired in memory rather than saved here: every caller already saves (or
  // only reads) the document it gets back, and a read must not write.
  settings.repairLegacyArrays();
  return settings;
};

/*
 * Older records hold a group of translated strings as a one-element array
 * (`heroShloka.verse: [{ en, ne, ... }]`) where the schema declares an object.
 * Mongoose turns a replacement object into dotted `$set` paths such as
 * `heroShloka.verse.en`, and MongoDB refuses those on an array:
 * "Cannot create field 'en' in element" (code 28). Every save of such a record
 * failed, so Admin → Hero could not be saved at all. Each mismatched array is
 * unwrapped to its first object here, on the way out of getSettings().
 *
 * The schema is walked through `schema.tree` rather than `eachPath()`: nested
 * objects are not paths of their own, Mongoose only exposes their flattened
 * leaves (`heroShloka.verse.en`), which is exactly what cannot be assigned.
 */
adminSettingsSchema.methods.repairLegacyArrays = function() {
  const isGroup = (declared) =>
    declared && typeof declared === 'object' && !Array.isArray(declared) && !declared.type && !declared.of;

  const walk = (declared, stored, prefix) => {
    if (!stored || typeof stored !== 'object') return;

    for (const [key, child] of Object.entries(declared)) {
      if (key === '_id' || key === '__v') continue;
      const value = stored[key];
      if (value === undefined || value === null) continue;
      const path = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        // Arrays are only wrong where the schema declares a plain object group.
        if (!isGroup(child)) continue;
        const first = value.find((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
        // Assigning the whole path (not its leaves) keeps Mongoose from
        // re-flattening it into the dotted paths MongoDB just rejected.
        this.set(path, first || {});
      } else if (isGroup(child)) {
        walk(child, value, path);
      }
    }
  };

  walk(this.schema.tree, this.toObject(), '');

  return this;
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
adminSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ============================================
// INDEXES
// ============================================
adminSettingsSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);