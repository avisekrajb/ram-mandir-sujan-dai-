const About = require('../models/About');
const { INTRO_TEXT, DEFAULT_SECTIONS, LEGACY_SECTION_KEYS } = require('../data/templeContent');

/*
 * Hero banner title. Kept in one place because it is used both as the seed for
 * a brand-new About document and as the backfill for documents that still hold
 * one of the old generic placeholders ("About Us" / "हाम्रो बारेमा" / ...).
 */
const DEFAULT_HERO_TITLE = {
  en: 'Shree Ramchandra Temple — An Introduction',
  ne: 'श्री रामचन्द्र मन्दिरको परिचय',
  hi: 'श्री रामचन्द्र मन्दिर का परिचय',
  zh: '什里·拉姆钱德拉神庙简介',
  ta: 'ஸ்ரீ ராமச்சந்திர கோயில் அறிமுகம்',
};

// Placeholder titles written before the hero was renamed. Rows still holding
// one of these are placeholders, not admin edits, so they get backfilled.
//
// Matched loosely rather than exactly: the wording drifted across releases
// ("About Us" → "About the Temple" → "श्री रामचन्द्र मन्दिरको बारेमा"), and an
// exact list kept missing whichever variant a given install happened to save.
// Only the generic shapes are listed — a custom title a human wrote will not
// match any of them.
const LEGACY_HERO_TITLE_PATTERNS = [
  /^about\s+(us|the\s+temple)$/i,
  /^introduction\s+to\s+the\s+temple$/i,
  /हाम्रो\s+बारेमा$/,
  /मन्दिरको\s+बारेमा$/,
  /मन्दिर\s+के\s+बारे\s+में$/,
  /^关于我们$/,
  /^关于神庙$/,
  /^எங்களைப்\s+பற்றி$/,
  /^கோவிலைப்\s+பற்றி$/,
];

const isLegacyHeroTitle = (value) => {
  const text = String(value || '').trim();
  if (!text) return false;
  return LEGACY_HERO_TITLE_PATTERNS.some((re) => re.test(text));
};

// Get About content
exports.getAbout = async (req, res) => {
  try {
    let about = await About.findOne();
    
    if (!about) {
      // Create default about data
      about = await About.create({
        hero: {
          image: '/aboutusphoto.jpeg',
          title: { ...DEFAULT_HERO_TITLE },
          // Removed intro from hero - it will be separate
        },
        // Intro text field - below hero banner ("हाम्रो परिचय")
        introText: INTRO_TEXT,
        sections: DEFAULT_SECTIONS,
        activities: [
          {
            key: 'daily',
            title: {
              en: 'Daily Puja (Nitya Puja)',
              ne: 'दैनिक पूजा (नित्य पूजा)',
              hi: 'दैनिक पूजा (नित्य पूजा)',
              zh: '日常礼拜',
              ta: 'தினசரி பூஜை'
            },
            desc: {
              en: 'The daily rituals and worship ceremonies at the temple',
              ne: 'मन्दिरमा दैनिक अनुष्ठान र पूजा समारोहहरू',
              hi: 'मंदिर में दैनिक अनुष्ठान और पूजा समारोह',
              zh: '寺庙的日常仪式和礼拜',
              ta: 'கோயிலில் தினசரி சடங்குகள் மற்றும் வழிபாட்டு விழாக்கள்'
            },
            paragraphs: {
              p1: {
                en: 'The daily activities at Shree Ramchandra Temple begin at 5:00 AM with the morning aarti and Mangal Dhun. The temple echoes with the sounds of bells, conch shells, and devotional hymns.',
                ne: 'श्री रामचन्द्र मन्दिरका दैनिक कार्यक्रमहरू बिहान ५ बजे बिहानको आरती र मंगल धुनको साथ शुरु हुन्छन्। मन्दिर घण्टी, शंख, र भक्तिमय भजनका ध्वनिहरूले प्रतिध्वनित हुन्छ।',
                hi: 'श्री रामचन्द्र मंदिर की दैनिक गतिविधियाँ सुबह 5:00 बजे सुबह की आरती और मंगल धुन के साथ शुरू होती हैं। मंदिर घंटियों, शंख और भक्ति भजनों की आवाज़ से गूंजता है।',
                zh: '室利罗摩钱德拉神庙的日常活动从早上5点开始，清晨的祈祷和吉祥旋律。寺庙回荡着钟声、海螺声和虔诚的赞美诗。',
                ta: 'ஸ்ரீ ராமச்சந்திர கோயிலில் தினசரி நடவடிக்கைகள் அதிகாலை 5:00 மணிக்கு காலை ஆரத்தி மற்றும் மங்கள துன் உடன் தொடங்கும். கோயில் மணிகள், சங்குகள் மற்றும் பக்தி பாடல்களின் ஒலிகளுடன் எதிரொலிக்கிறது.'
              },
              p2: {
                en: 'Multiple rituals are performed throughout the day including Abhishek, Shringar, and Bhog. Devotees can participate in these rituals and receive blessings.',
                ne: 'दिनभरि अभिषेक, शृंगार, र भोग सहित धेरै अनुष्ठानहरू गरिन्छन्। भक्तजनहरूले यी अनुष्ठानहरूमा सहभागी हुन सक्छन् र आशीर्वाद प्राप्त गर्न सक्छन्।',
                hi: 'दिन भर अभिषेक, श्रृंगार और भोग सहित कई अनुष्ठान किए जाते हैं। भक्त इन अनुष्ठानों में भाग ले सकते हैं और आशीर्वाद प्राप्त कर सकते हैं।',
                zh: '全天进行多项仪式，包括灌顶、装饰和供奉。信徒可以参与这些仪式并接受祝福。',
                ta: 'அபிஷேகம், ஸ்ரிங்காரம் மற்றும் போக் உள்ளிட்ட பல சடங்குகள் நாள் முழுவதும் நடத்தப்படுகின்றன. பக்தர்கள் இந்த சடங்குகளில் பங்கேற்று ஆசீர்வாதங்களைப் பெறலாம்.'
              }
            },
            order: 0,
            enabled: true
          },
          {
            key: 'festivals',
            title: {
              en: 'Festivals & Celebrations',
              ne: 'चाडपर्व र उत्सवहरू',
              hi: 'त्योहार और उत्सव',
              zh: '节日与庆典',
              ta: 'திருவிழாக்கள் மற்றும் கொண்டாட்டங்கள்'
            },
            desc: {
              en: 'Special celebrations during major Hindu festivals',
              ne: 'प्रमुख हिन्दू चाडपर्वहरूमा विशेष उत्सवहरू',
              hi: 'प्रमुख हिंदू त्योहारों के दौरान विशेष उत्सव',
              zh: '主要印度教节日期间的特别庆祝活动',
              ta: 'பெரிய இந்து திருவிழாக்களின் போது சிறப்பு கொண்டாட்டங்கள்'
            },
            paragraphs: {
              p1: {
                en: 'The temple celebrates all major Hindu festivals with great enthusiasm. During Ram Navami, the birth anniversary of Lord Ram, special processions and cultural programs are organized.',
                ne: 'मन्दिरले सबै प्रमुख हिन्दू चाडपर्वहरू ठूलो उत्साहका साथ मनाउँछ। राम नवमीको अवसरमा, भगवान रामको जन्म जयन्तीमा, विशेष शोभायात्रा र सांस्कृतिक कार्यक्रमहरू आयोजना गरिन्छन्।',
                hi: 'मंदिर सभी प्रमुख हिंदू त्योहारों को बड़े उत्साह के साथ मनाता है। राम नवमी के दौरान, भगवान राम की जयंती पर, विशेष जुलूस और सांस्कृतिक कार्यक्रम आयोजित किए जाते हैं।',
                zh: '寺庙以极大的热情庆祝所有主要的印度教节日。在罗摩诞辰节期间，罗摩神的诞辰纪念日，会组织特别的游行和文化活动。',
                ta: 'கோயில் அனைத்து பெரிய இந்து திருவிழாக்களையும் மிகுந்த உற்சாகத்துடன் கொண்டாடுகிறது. ராம் நவமியின் போது, ராமரின் பிறந்த நாளில், சிறப்பு ஊர்வலங்கள் மற்றும் கலாச்சார நிகழ்ச்சிகள் ஏற்பாடு செய்யப்படுகின்றன.'
              },
              p2: {
                en: 'Other major festivals like Dashain, Tihar, and Shivaratri are also celebrated with traditional rituals, prayers, and community feasts.',
                ne: 'दशैं, तिहार, र शिवरात्रि जस्ता अन्य प्रमुख चाडपर्वहरू पनि परम्परागत अनुष्ठान, पूजा, र सामुदायिक भोजको साथ मनाइन्छन्।',
                hi: 'दशैं, तिहार और शिवरात्रि जैसे अन्य प्रमुख त्योहार भी पारंपरिक अनुष्ठानों, पूजा और सामुदायिक भोज के साथ मनाए जाते हैं।',
                zh: '其他主要节日如达赛节、提哈尔节和湿婆节也以传统仪式、祈祷和社区盛宴庆祝。',
                ta: 'தசை, திஹார் மற்றும் சிவராத்திரி போன்ற பிற பெரிய திருவிழாக்களும் பாரம்பரிய சடங்குகள், பிரார்த்தனைகள் மற்றும் சமூக விருந்துகளுடன் கொண்டாடப்படுகின்றன.'
              }
            },
            order: 1,
            enabled: true
          }
        ]
      });
    }

    /*
     * One-time backfill: when the stored intro/sections are still the original
     * placeholders, publish the real temple content instead. Anything that has
     * been edited from Admin → About Page is left alone.
     */
    let touched = false;
    const storedSections = Array.isArray(about.sections) ? about.sections : [];

    if (
      storedSections.length === 0 ||
      storedSections.every((s) => LEGACY_SECTION_KEYS.includes(s.key))
    ) {
      about.sections = DEFAULT_SECTIONS;
      touched = true;
    }

    const introText = about.introText || {};
    if (!introText.ne && !introText.en) {
      about.introText = INTRO_TEXT;
      touched = true;
    }

    // Hero banner: an empty value, or one of the old generic placeholders, is
    // not a real admin edit. Republish the temple introduction title so the
    // banner names the temple instead of saying "About Us". A title the admin
    // has actually typed is preserved untouched.
    const heroTitle = about.hero?.title || {};
    const storedTitles = Object.values(heroTitle).filter(Boolean);
    const isPlaceholder =
      storedTitles.length === 0 ||
      storedTitles.every(isLegacyHeroTitle);

    if (isPlaceholder) {
      about.hero = { ...about.hero, title: { ...DEFAULT_HERO_TITLE } };
      touched = true;
    }

    if (touched) {
      await about.save();
      console.log('About: published temple content');
    }

    res.json({ success: true, data: about });
  } catch (error) {
    console.error('Error fetching about:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update About content
exports.updateAbout = async (req, res) => {
  try {
    const { hero, introText, sections, activities } = req.body;
    
    console.log('Received update data:', req.body); // Debug log
    
    let about = await About.findOne();
    
    if (!about) {
      about = new About();
    }
    
    // Update fields if they exist in request
    if (hero) {
      // An empty title from the form must not wipe a real one: fall back to the
      // stored value, and to the default title if nothing is stored yet.
      const nextTitle =
        hero.title && Object.values(hero.title).some(Boolean)
          ? hero.title
          : (about.hero?.title && Object.values(about.hero.title).some(Boolean)
              ? about.hero.title
              : { ...DEFAULT_HERO_TITLE });

      about.hero = {
        title: nextTitle,
        image: hero.image || about.hero?.image || ''
      };
    }
    
    // IMPORTANT: Handle introText field
    if (introText !== undefined) {
      about.introText = introText;
    }
    
    if (sections) {
      about.sections = sections;
    }
    
    if (activities) {
      about.activities = activities;
    }
    
    await about.save();
    console.log('Saved about data:', about); // Debug log
    
    res.json({ 
      success: true, 
      data: about, 
      message: 'About page updated successfully' 
    });
  } catch (error) {
    console.error('Error updating about:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};
