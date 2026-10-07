import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, FileText, Users, CreditCard, Clock } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { formatDate as formatLocaleDate } from '../utils/formatDate';


const TermsPage = () => {
  const { lang } = useLanguage();

  const termsContent = {
    en: {
      title: 'Terms of Service',
      subtitle: 'Please read these terms carefully before using our services',
      lastUpdated: 'Last updated:',
      intro: 'Welcome to Shree Ramchandra Temple. By using our website and services, you agree to comply with and be bound by the following terms and conditions of use. Please read these terms carefully before using our services.',
      sections: [
        {
          icon: <Shield className="text-vermilion" size={24} />,
          title: 'Acceptance of Terms',
          content: 'By accessing this website, you accept these terms and conditions in full. If you disagree with any part of these terms, please do not use our website. We reserve the right to update or modify these terms at any time without prior notice.'
        },
        {
          icon: <Users className="text-vermilion" size={24} />,
          title: 'User Accounts',
          content: 'To access certain features of our website, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.'
        },
        {
          icon: <FileText className="text-vermilion" size={24} />,
          title: 'Use of Services',
          content: 'Our services include online puja booking, donations, and access to temple information. You agree to use these services only for lawful purposes and in a way that does not infringe the rights of others. You may not use our services for any illegal or unauthorized purpose.'
        },
        {
          icon: <CheckCircle className="text-vermilion" size={24} />,
          title: 'Booking Terms',
          content: 'All puja bookings are subject to availability. We reserve the right to cancel or reschedule bookings due to unforeseen circumstances. Refunds will be processed according to our refund policy. Please ensure all booking details are accurate before confirmation.'
        },
        {
          icon: <CreditCard className="text-vermilion" size={24} />,
          title: 'Donations & Payments',
          content: 'All donations are voluntary and non-refundable. We are committed to using your donations for the temple\'s maintenance, development, and community services. Payment processing is handled securely through our payment partners.'
        }
      ],
      agreementText: 'By using our services, you agree to these terms and conditions.',
      updatedText: 'These terms were last updated on'
    },
    ne: {
      title: 'सेवाका सर्तहरू',
      subtitle: 'हाम्रा सेवाहरू प्रयोग गर्नुअघि कृपया यी सर्तहरू ध्यानपूर्वक पढ्नुहोस्',
      lastUpdated: 'अन्तिम अपडेट:',
      intro: 'श्री रामचन्द्र मन्दिरमा स्वागत छ। हाम्रो वेबसाइट र सेवाहरू प्रयोग गरेर, तपाईं प्रयोगसम्बन्धी निम्न नियम तथा सर्तहरूको पालना गर्न सहमत हुनुहुन्छ। कृपया हाम्रा सेवाहरू प्रयोग गर्नुअघि यी सर्तहरू ध्यानपूर्वक पढ्नुहोस्।',
      sections: [
        {
          icon: <Shield className="text-vermilion" size={24} />,
          title: 'सर्तहरूको स्वीकृति',
          content: 'यस वेबसाइटमा पहुँच गरेर, तपाईं यी नियम तथा सर्तहरू पूर्ण रूपमा स्वीकार गर्नुहुन्छ। यदि तपाईं यी सर्तहरूको कुनै पनि भागसँग असहमत हुनुहुन्छ भने, कृपया हाम्रो वेबसाइट प्रयोग नगर्नुहोस्। हामी कुनै पनि समयमा पूर्व सूचना बिना यी सर्तहरू अद्यावधिक वा परिमार्जन गर्ने अधिकार सुरक्षित गर्दछौं।'
        },
        {
          icon: <Users className="text-vermilion" size={24} />,
          title: 'प्रयोगकर्ता खाताहरू',
          content: 'हाम्रो वेबसाइटका निश्चित सुविधाहरू पहुँच गर्न, तपाईंलाई खाता सिर्जना गर्न आवश्यक पर्न सक्छ। तपाईं आफ्नो खाता प्रमाणहरूको गोपनीयता कायम राख्न र तपाईंको खाता अन्तर्गत हुने सबै गतिविधिहरूको लागि जिम्मेवार हुनुहुन्छ। तपाईं आफ्नो खाताको कुनै पनि अनधिकृत प्रयोगको बारेमा तुरुन्त हामीलाई सूचित गर्न सहमत हुनुहुन्छ।'
        },
        {
          icon: <FileText className="text-vermilion" size={24} />,
          title: 'सेवाहरूको प्रयोग',
          content: 'हाम्रा सेवाहरूमा अनलाइन पूजा बुकिङ, दान, र मन्दिर जानकारी पहुँच समावेश छ। तपाईं यी सेवाहरू केवल कानुनी उद्देश्यका लागि र अरूको अधिकारलाई हनन नगर्ने तरिकामा प्रयोग गर्न सहमत हुनुहुन्छ। तपाईं कुनै पनि अवैध वा अनधिकृत उद्देश्यका लागि हाम्रा सेवाहरू प्रयोग गर्न सक्नुहुन्न।'
        },
        {
          icon: <CheckCircle className="text-vermilion" size={24} />,
          title: 'बुकिङका सर्तहरू',
          content: 'सबै पूजा बुकिङहरू उपलब्धताको अधीनमा छन्। अप्रत्याशित परिस्थितिहरूका कारण बुकिङ रद्द वा पुनःतालिका गर्ने अधिकार हामीले सुरक्षित गर्दछौं। हाम्रो रिफन्ड नीति अनुसार रिफन्डहरू प्रशोधन गरिनेछ। कृपया पुष्टि गर्नुअघि सबै बुकिङ विवरणहरू सही छन् भनी सुनिश्चित गर्नुहोस्।'
        },
        {
          icon: <CreditCard className="text-vermilion" size={24} />,
          title: 'दान र भुक्तानीहरू',
          content: 'सबै दानहरू स्वैच्छिक र गैर-रिफन्ड योग्य छन्। हामी मन्दिरको मर्मत, विकास, र सामुदायिक सेवाहरूका लागि तपाईंको दानहरू प्रयोग गर्न प्रतिबद्ध छौं। भुक्तानी प्रशोधन हाम्रा भुक्तानी साझेदारहरू मार्फत सुरक्षित रूपमा गरिन्छ।'
        }
      ],
      agreementText: 'हाम्रा सेवाहरू प्रयोग गरेर, तपाईं यी नियम तथा सर्तहरूमा सहमत हुनुहुन्छ।',
      updatedText: 'यी सर्तहरू अन्तिम पटक अपडेट गरिएको'
    },
    hi: {
      title: 'सेवा की शर्तें',
      subtitle: 'कृपया हमारी सेवाओं का उपयोग करने से पहले इन शर्तों को ध्यानपूर्वक पढ़ें',
      lastUpdated: 'अंतिम अपडेट:',
      intro: 'श्री रामचंद्र मंदिर में आपका स्वागत है। हमारी वेबसाइट और सेवाओं का उपयोग करके, आप निम्न उपयोग की शर्तों और नियमों का पालन करने के लिए सहमत होते हैं। कृपया हमारी सेवाओं का उपयोग करने से पहले इन शर्तों को ध्यानपूर्वक पढ़ें।',
      sections: [
        {
          icon: <Shield className="text-vermilion" size={24} />,
          title: 'शर्तों की स्वीकृति',
          content: 'इस वेबसाइट तक पहुंच करके, आप इन शर्तों और नियमों को पूर्ण रूप से स्वीकार करते हैं। यदि आप इन शर्तों के किसी भी भाग से असहमत हैं, तो कृपया हमारी वेबसाइट का उपयोग न करें। हम किसी भी समय बिना पूर्व सूचना के इन शर्तों को अद्यतन या संशोधित करने का अधिकार सुरक्षित रखते हैं।'
        },
        {
          icon: <Users className="text-vermilion" size={24} />,
          title: 'उपयोगकर्ता खाते',
          content: 'हमारी वेबसाइट की कुछ सुविधाओं तक पहुंचने के लिए, आपको एक खाता बनाने की आवश्यकता हो सकती है। आप अपने खाते के क्रेडेंशियल्स की गोपनीयता बनाए रखने और आपके खाते के तहत होने वाली सभी गतिविधियों के लिए जिम्मेदार हैं। आप अपने खाते के किसी भी अनधिकृत उपयोग के बारे में तुरंत हमें सूचित करने के लिए सहमत हैं।'
        },
        {
          icon: <FileText className="text-vermilion" size={24} />,
          title: 'सेवाओं का उपयोग',
          content: 'हमारी सेवाओं में ऑनलाइन पूजा बुकिंग, दान, और मंदिर की जानकारी तक पहुंच शामिल है। आप इन सेवाओं का उपयोग केवल कानूनी उद्देश्यों के लिए और दूसरों के अधिकारों का उल्लंघन न करने वाले तरीके से करने के लिए सहमत हैं। आप किसी भी अवैध या अनधिकृत उद्देश्य के लिए हमारी सेवाओं का उपयोग नहीं कर सकते।'
        },
        {
          icon: <CheckCircle className="text-vermilion" size={24} />,
          title: 'बुकिंग शर्तें',
          content: 'सभी पूजा बुकिंग उपलब्धता के अधीन हैं। अप्रत्याशित परिस्थितियों के कारण बुकिंग रद्द या पुनर्निर्धारित करने का अधिकार हम सुरक्षित रखते हैं। हमारी रिफंड नीति के अनुसार रिफंड संसाधित किए जाएंगे। कृपया पुष्टि करने से पहले सभी बुकिंग विवरण सही हैं सुनिश्चित करें।'
        },
        {
          icon: <CreditCard className="text-vermilion" size={24} />,
          title: 'दान और भुगतान',
          content: 'सभी दान स्वैच्छिक और गैर-रिफंड योग्य हैं। हम मंदिर के रखरखाव, विकास, और सामुदायिक सेवाओं के लिए आपके दान का उपयोग करने के लिए प्रतिबद्ध हैं। भुगतान प्रसंस्करण हमारे भुगतान भागीदारों के माध्यम से सुरक्षित रूप से किया जाता है।'
        }
      ],
      agreementText: 'हमारी सेवाओं का उपयोग करके, आप इन शर्तों और नियमों से सहमत होते हैं।',
      updatedText: 'ये शर्तें अंतिम बार अपडेट की गईं'
    },
    zh: {
      title: '服务条款',
      subtitle: '在使用我们的服务之前，请仔细阅读这些条款',
      lastUpdated: '最后更新：',
      intro: '欢迎来到什里·拉姆钱德拉神庙。使用我们的网站和服务即表示您同意遵守以下使用条款和条件。请在使用我们的服务之前仔细阅读这些条款。',
      sections: [
        {
          icon: <Shield className="text-vermilion" size={24} />,
          title: '接受条款',
          content: '访问本网站即表示您完全接受这些条款和条件。如果您不同意这些条款的任何部分，请不要使用我们的网站。我们保留随时更新或修改这些条款的权利，恕不另行通知。'
        },
        {
          icon: <Users className="text-vermilion" size={24} />,
          title: '用户账户',
          content: '要访问我们网站的某些功能，您可能需要创建一个账户。您有责任维护您的账户凭证的机密性，并对您账户下发生的所有活动负责。您同意立即通知我们任何未经授权使用您账户的情况。'
        },
        {
          icon: <FileText className="text-vermilion" size={24} />,
          title: '服务使用',
          content: '我们的服务包括在线法会预订、捐赠和神庙信息访问。您同意仅将这些服务用于合法目的，且不侵犯他人权利。您不得将我们的服务用于任何非法或未经授权的目的。'
        },
        {
          icon: <CheckCircle className="text-vermilion" size={24} />,
          title: '预订条款',
          content: '所有法会预订视名额情况而定。我们保留因不可预见情况取消或重新安排预订的权利。退款将根据我们的退款政策处理。请在确认前确保所有预订详情准确无误。'
        },
        {
          icon: <CreditCard className="text-vermilion" size={24} />,
          title: '捐赠与付款',
          content: '所有捐赠均为自愿且不可退款。我们致力于将您的捐赠用于神庙的维护、发展和社区服务。付款处理通过我们的支付合作伙伴安全进行。'
        }
      ],
      agreementText: '使用我们的服务即表示您同意这些条款和条件。',
      updatedText: '这些条款最后更新于'
    },
    ta: {
      title: 'சேவை விதிமுறைகள்',
      subtitle: 'எங்கள் சேவைகளைப் பயன்படுத்தும் முன் இந்த விதிமுறைகளை கவனமாக படிக்கவும்',
      lastUpdated: 'கடைசியாக புதுப்பிக்கப்பட்டது:',
      intro: 'ஸ்ரீ ராமச்சந்திர கோவிலுக்கு வரவேற்கிறோம். எங்கள் வலைத்தளம் மற்றும் சேவைகளைப் பயன்படுத்துவதன் மூலம், பின்வரும் பயன்பாட்டு விதிமுறைகள் மற்றும் நிபந்தனைகளுக்கு இணங்க நீங்கள் ஒப்புக்கொள்கிறீர்கள். எங்கள் சேவைகளைப் பயன்படுத்தும் முன் இந்த விதிமுறைகளை கவனமாக படிக்கவும்.',
      sections: [
        {
          icon: <Shield className="text-vermilion" size={24} />,
          title: 'விதிமுறைகளின் ஏற்பு',
          content: 'இந்த வலைத்தளத்தை அணுகுவதன் மூலம், இந்த விதிமுறைகள் மற்றும் நிபந்தனைகளை முழுமையாக ஏற்கிறீர்கள். இந்த விதிமுறைகளின் எந்தப் பகுதியுடனும் நீங்கள் உடன்படவில்லை என்றால், எங்கள் வலைத்தளத்தைப் பயன்படுத்த வேண்டாம். எந்த நேரத்திலும் முன்னறிவிப்பு இல்லாமல் இந்த விதிமுறைகளை புதுப்பிக்க அல்லது மாற்றியமைக்க நாங்கள் உரிமை கொண்டுள்ளோம்.'
        },
        {
          icon: <Users className="text-vermilion" size={24} />,
          title: 'பயனர் கணக்குகள்',
          content: 'எங்கள் வலைத்தளத்தின் சில அம்சங்களை அணுக, நீங்கள் ஒரு கணக்கை உருவாக்க வேண்டியிருக்கும். உங்கள் கணக்கு நற்சான்றிதழ்களின் ரகசியத்தன்மையை பராமரிப்பதற்கும், உங்கள் கணக்கின் கீழ் நடைபெறும் அனைத்து நடவடிக்கைகளுக்கும் நீங்கள் பொறுப்பாவீர்கள். உங்கள் கணக்கின் எந்தவொரு அங்கீகரிக்கப்படாத பயன்பாட்டையும் உடனடியாக எங்களுக்கு தெரிவிக்க நீங்கள் ஒப்புக்கொள்கிறீர்கள்.'
        },
        {
          icon: <FileText className="text-vermilion" size={24} />,
          title: 'சேவைகளின் பயன்பாடு',
          content: 'எங்கள் சேவைகளில் ஆன்லைன் பூஜை முன்பதிவு, நன்கொடை மற்றும் கோவில் தகவல்கள் அணுகல் ஆகியவை அடங்கும். இந்த சேவைகளை சட்டப்பூர்வ நோக்கங்களுக்காக மட்டுமே பயன்படுத்தவும், மற்றவர்களின் உரிமைகளை மீறாத வகையில் பயன்படுத்தவும் நீங்கள் ஒப்புக்கொள்கிறீர்கள். எந்தவொரு சட்டவிரோத அல்லது அங்கீகரிக்கப்படாத நோக்கத்திற்காக எங்கள் சேவைகளைப் பயன்படுத்தக்கூடாது.'
        },
        {
          icon: <CheckCircle className="text-vermilion" size={24} />,
          title: 'முன்பதிவு விதிமுறைகள்',
          content: 'அனைத்து பூஜை முன்பதிவுகளும் கிடைக்கும் தன்மைக்கு உட்பட்டவை. எதிர்பாராத சூழ்நிலைகள் காரணமாக முன்பதிவுகளை ரத்து செய்ய அல்லது மறுசீரமைக்க நாங்கள் உரிமை கொண்டுள்ளோம். எங்கள் பணத்தை திரும்பப் பெறும் கொள்கையின் படி பணத்தை திரும்பப் பெறுதல் செயலாக்கப்படும். உறுதிப்படுத்தும் முன் அனைத்து முன்பதிவு விவரங்களும் சரியானவை என்பதை உறுதிப்படுத்தவும்.'
        },
        {
          icon: <CreditCard className="text-vermilion" size={24} />,
          title: 'நன்கொடைகள் மற்றும் பணம் செலுத்துதல்',
          content: 'அனைத்து நன்கொடைகளும் தன்னார்வமானவை மற்றும் பணத்தை திரும்பப் பெற முடியாதவை. கோவிலின் பராமரிப்பு, மேம்பாடு மற்றும் சமூக சேவைகளுக்கு உங்கள் நன்கொடைகளைப் பயன்படுத்த நாங்கள் உறுதிபூண்டுள்ளோம். பணம் செலுத்தும் செயலாக்கம் எங்கள் பணம் செலுத்தும் கூட்டாளர்கள் மூலம் பாதுகாப்பாக கையாளப்படுகிறது.'
        }
      ],
      agreementText: 'எங்கள் சேவைகளைப் பயன்படுத்துவதன் மூலம், இந்த விதிமுறைகள் மற்றும் நிபந்தனைகளை நீங்கள் ஏற்கிறீர்கள்.',
      updatedText: 'இந்த விதிமுறைகள் கடைசியாக புதுப்பிக்கப்பட்டது'
    }
  };

  const content = termsContent[lang] || termsContent.en;

  return (
    <div className="min-h-screen bg-white pt-10 sm:pt-14 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-12">
          <PageHeader sub={content.subtitle}>{content.title}</PageHeader>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Last Updated */}
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Clock size={16} className="text-vermilion" />
            <span>{content.lastUpdated} {formatLocaleDate(new Date(), lang, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>

          {/* Intro */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-ink-soft leading-relaxed"
          >
            {content.intro}
          </motion.p>

          {/* Sections */}
          <div className="space-y-6">
            {content.sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 hover:border-line transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      {section.title}
                    </h3>
                    <p className="text-ink-soft leading-relaxed text-sm">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Agreement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center pt-6 border-t border-gray-200"
          >
            <p className="text-sm text-ink-soft flex items-center justify-center gap-2">
              <Shield size={16} className="text-vermilion" />
              {content.agreementText}
            </p>
            <p className="text-xs text-mute mt-2">
              {content.updatedText} {formatLocaleDate(new Date(), lang, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;