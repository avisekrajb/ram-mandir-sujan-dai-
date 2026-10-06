import React, { createContext, useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { buildReply, startChips } from '../components/chatbot/chatEngine';
import { ktmNow, dayPart, firstName, pageContext } from '../components/chatbot/chatAware';

// Translations for chatbot
const translations = {
  en: {
    greeting: "🕉 Jai Shree Ram! How can I help you today?",
    placeholder: "Ask about temple, events, team...",
    online: "Online",
    suggestions: "Suggested questions:",
    welcome: "Welcome to Shree Ramchandra Temple",
    templeAssistant: "Temple Assistant",
    typing: "Typing...",
    send: "Send",
    close: "Close",
    clearAll: "Clear all messages",
    clearConfirm: "Are you sure you want to clear all messages?",
    noResults: "I'm not sure about",
    hereAreTopics: "Here are some topics I can help with:",
    foundInfo: "I found this about",
    contactInfo: "Contact Information",
    donationInfo: "Donation Information",
    bookingInfo: "Booking Information",
    teamMembers: "Team Members",
    ourTeam: "Our Team Members",
    upcomingEvents: "Upcoming Events",
    templeHours: "Temple Darshan Hours",
    location: "Location",
    address: "Address",
    phone: "Phone",
    email: "Email",
    founder: "Founder",
    aboutTemple: "About Temple",
    askMe: "Ask about temple, events, team...",
    methods: "Methods",
    contact: "Contact",
    typeMessage: "Type a message...",
    loginRequired: "Please login to use the temple assistant",
    loginToChat: "Login to chat with the assistant",
    developer: "This website and the temple assistant were developed by Abhishek Rajbanshi of zeroinfinitytechnology.",
    aartiInfo: "Aarti Schedule",
    galleryInfo: "Gallery & Videos",
    calendarInfo: "Festival Calendar",
    historyInfo: "Temple History",
    visitingInfo: "Visiting Guide",
    blogsInfo: "News & Blogs",
    privacyInfo: "Privacy Policy",
    termsInfo: "Terms & Conditions",
    related: "Related questions",
  },
  ne: {
    greeting: "🕉 जय श्री राम! आज म कसरी सहायता गर्न सक्छु?",
    placeholder: "मन्दिर, कार्यक्रम, टिमको बारेमा सोध्नुहोस्...",
    online: "अनलाइन",
    suggestions: "सुझाव प्रश्नहरू:",
    welcome: "श्री रामचन्द्र मन्दिरमा स्वागत छ",
    templeAssistant: "मन्दिर सहायक",
    typing: "टाइप गर्दै...",
    send: "पठाउनुहोस्",
    close: "बन्द गर्नुहोस्",
    clearAll: "सबै सन्देश मेटाउनुहोस्",
    clearConfirm: "के तपाईं सबै सन्देश मेटाउन निश्चित हुनुहुन्छ?",
    noResults: "मलाई थाहा छैन",
    hereAreTopics: "यहाँ केही विषयहरू छन् जसमा म सहायता गर्न सक्छु:",
    foundInfo: "मैले यो बारेमा फेला पारे",
    contactInfo: "सम्पर्क जानकारी",
    donationInfo: "दान जानकारी",
    bookingInfo: "बुकिङ जानकारी",
    teamMembers: "टिम सदस्यहरू",
    ourTeam: "हाम्रा टिम सदस्यहरू",
    upcomingEvents: "आगामी कार्यक्रमहरू",
    templeHours: "मन्दिर दर्शन समय",
    location: "स्थान",
    address: "ठेगाना",
    phone: "फोन",
    email: "इमेल",
    founder: "संस्थापक",
    aboutTemple: "मन्दिरको बारेमा",
    askMe: "मन्दिर, कार्यक्रम, टिमको बारेमा सोध्नुहोस्...",
    methods: "विधिहरू",
    contact: "सम्पर्क",
    typeMessage: "सन्देश टाइप गर्नुहोस्...",
    loginRequired: "मन्दिर सहायक प्रयोग गर्न कृपया लगइन गर्नुहोस्",
    loginToChat: "सहायकसँग कुरा गर्न लगइन गर्नुहोस्",
    developer: "यो वेबसाइट र मन्दिर सहायक Abhishek Rajbanshi (zeroinfinitytechnology) द्वारा विकास गरिएको हो।",
    aartiInfo: "आरती तालिका",
    galleryInfo: "ग्यालरी र भिडियोहरू",
    calendarInfo: "चाडपर्व पात्रो",
    historyInfo: "मन्दिरको इतिहास",
    visitingInfo: "भ्रमण गाइड",
    blogsInfo: "समाचार र ब्लगहरू",
    privacyInfo: "गोपनीयता नीति",
    termsInfo: "नियम तथा सर्तहरू",
    related: "सम्बन्धित प्रश्नहरू",
  },
  hi: {
    greeting: "🕉 जय श्री राम! आज मैं कैसे सहायता कर सकता हूँ?",
    placeholder: "मंदिर, कार्यक्रम, टीम के बारे में पूछें...",
    online: "ऑनलाइन",
    suggestions: "सुझाव प्रश्न:",
    welcome: "श्री रामचंद्र मंदिर में आपका स्वागत है",
    templeAssistant: "मंदिर सहायक",
    typing: "टाइप कर रहे हैं...",
    send: "भेजें",
    close: "बंद करें",
    clearAll: "सभी संदेश हटाएं",
    clearConfirm: "क्या आप सभी संदेश हटाना चाहते हैं?",
    noResults: "मुझे नहीं पता",
    hereAreTopics: "यहाँ कुछ विषय हैं जिनमें मैं सहायता कर सकता हूँ:",
    foundInfo: "मुझे इसके बारे में मिला",
    contactInfo: "संपर्क जानकारी",
    donationInfo: "दान जानकारी",
    bookingInfo: "बुकिंग जानकारी",
    teamMembers: "टीम सदस्य",
    ourTeam: "हमारी टीम के सदस्य",
    upcomingEvents: "आगामी कार्यक्रम",
    templeHours: "मंदिर दर्शन समय",
    location: "स्थान",
    address: "पता",
    phone: "फोन",
    email: "ईमेल",
    founder: "संस्थापक",
    aboutTemple: "मंदिर के बारे में",
    askMe: "मंदिर, कार्यक्रम, टीम के बारे में पूछें...",
    methods: "तरीके",
    contact: "संपर्क",
    typeMessage: "संदेश टाइप करें...",
    loginRequired: "मंदिर सहायक का उपयोग करने के लिए कृपया लॉगिन करें",
    loginToChat: "सहायक से बात करने के लिए लॉगिन करें",
    developer: "इस वेबसाइट और मंदिर सहायक को Abhishek Rajbanshi (zeroinfinitytechnology) ने विकसित किया है।",
    aartiInfo: "आरती समय सारणी",
    galleryInfo: "गैलरी और वीडियो",
    calendarInfo: "त्योहार कैलेंडर",
    historyInfo: "मंदिर का इतिहास",
    visitingInfo: "दर्शन गाइड",
    blogsInfo: "समाचार और ब्लॉग",
    privacyInfo: "गोपनीयता नीति",
    termsInfo: "नियम और शर्तें",
    related: "संबंधित प्रश्न",
  },
  zh: {
    greeting: "🕉 贾伊·什里·拉姆！今天我能如何帮助您？",
    placeholder: "询问有关神庙、活动、团队的信息...",
    online: "在线",
    suggestions: "建议问题：",
    welcome: "欢迎来到什里·拉姆钱德拉神庙",
    templeAssistant: "神庙助手",
    typing: "正在输入...",
    send: "发送",
    close: "关闭",
    clearAll: "清除所有消息",
    clearConfirm: "您确定要清除所有消息吗？",
    noResults: "我不确定",
    hereAreTopics: "以下是我可以帮助您的一些主题：",
    foundInfo: "我找到了关于",
    contactInfo: "联系信息",
    donationInfo: "捐赠信息",
    bookingInfo: "预订信息",
    teamMembers: "团队成员",
    ourTeam: "我们的团队成员",
    upcomingEvents: "即将举行的活动",
    templeHours: "神庙朝拜时间",
    location: "位置",
    address: "地址",
    phone: "电话",
    email: "电子邮件",
    founder: "创始人",
    aboutTemple: "关于神庙",
    askMe: "询问有关神庙、活动、团队的信息...",
    methods: "方法",
    contact: "联系",
    typeMessage: "输入消息...",
    loginRequired: "请登录以使用神庙助手",
    loginToChat: "登录后与助手聊天",
    developer: "此网站和神庙助手由 Abhishek Rajbanshi（zeroinfinitytechnology）开发。",
    aartiInfo: "灯供时间表",
    galleryInfo: "图库和视频",
    calendarInfo: "节日日历",
    historyInfo: "神庙历史",
    visitingInfo: "参观指南",
    blogsInfo: "新闻和博客",
    privacyInfo: "隐私政策",
    termsInfo: "条款和条件",
    related: "相关问题",
  },
  ta: {
    greeting: "🕉 ஜெய் ஸ்ரீ ராம்! இன்று நான் எவ்வாறு உதவ முடியும்?",
    placeholder: "கோவில், நிகழ்வுகள், குழு பற்றி கேளுங்கள்...",
    online: "இணைப்பில்",
    suggestions: "பரிந்துரைக்கப்பட்ட கேள்விகள்:",
    welcome: "ஸ்ரீ ராமச்சந்திர கோவிலுக்கு வரவேற்கிறோம்",
    templeAssistant: "கோவில் உதவியாளர்",
    typing: "தட்டச்சு செய்கிறது...",
    send: "அனுப்பு",
    close: "மூடு",
    clearAll: "அனைத்து செய்திகளையும் நீக்கு",
    clearConfirm: "அனைத்து செய்திகளையும் நீக்க விரும்புகிறீர்களா?",
    noResults: "எனக்கு தெரியவில்லை",
    hereAreTopics: "நான் உதவக்கூடிய சில தலைப்புகள் இங்கே:",
    foundInfo: "இதைப் பற்றி நான் கண்டுபிடித்தேன்",
    contactInfo: "தொடர்பு தகவல்",
    donationInfo: "நன்கொடை தகவல்",
    bookingInfo: "முன்பதிவு தகவல்",
    teamMembers: "குழு உறுப்பினர்கள்",
    ourTeam: "எங்கள் குழு உறுப்பினர்கள்",
    upcomingEvents: "வரவிருக்கும் நிகழ்வுகள்",
    templeHours: "கோவில் தரிசன நேரம்",
    location: "இருப்பிடம்",
    address: "முகவரி",
    phone: "தொலைபேசி",
    email: "மின்னஞ்சல்",
    founder: "நிறுவனர்",
    aboutTemple: "கோவில் பற்றி",
    askMe: "கோவில், நிகழ்வுகள், குழு பற்றி கேளுங்கள்...",
    methods: "முறைகள்",
    contact: "தொடர்பு",
    typeMessage: "செய்தியை தட்டச்சு செய்க...",
    loginRequired: "கோவில் உதவியாளரைப் பயன்படுத்த தயவுசெய்து உள்நுழையவும்",
    loginToChat: "உதவியாளருடன் அரட்டையடிக்க உள்நுழையவும்",
    developer: "இந்த இணையதளம் மற்றும் கோவில் உதவியாளரை Abhishek Rajbanshi (zeroinfinitytechnology) உருவாக்கினார்.",
    aartiInfo: "ஆரத்தி அட்டவணை",
    galleryInfo: "காட்சியகம் மற்றும் வீடியோக்கள்",
    calendarInfo: "பண்டிகை நாட்காட்டி",
    historyInfo: "கோவில் வரலாறு",
    visitingInfo: "பார்வையாளர் வழிகாட்டி",
    blogsInfo: "செய்திகள் மற்றும் வலைப்பதிவுகள்",
    privacyInfo: "தனியுரிமைக் கொள்கை",
    termsInfo: "விதிமுறைகள் மற்றும் நிபந்தனைகள்",
    related: "தொடர்புடைய கேள்விகள்",
  }
};

// Create the context
const ChatbotContext = createContext();

// Custom hook to use the chatbot context
export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};

// ---------------------------------------------------------------------------
// Cards and buttons are not stored by the server (it keeps text only). They are
// remembered for this browser tab so a refresh keeps the conversation intact;
// older or other-device messages simply show their text.
// ---------------------------------------------------------------------------
const RICH_KEY = 'c1_chat_rich_v1';
const RICH_LIMIT = 40;

const readRich = () => {
  try {
    return JSON.parse(sessionStorage.getItem(RICH_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const writeRich = (map) => {
  try {
    const keys = Object.keys(map);
    const trimmed = keys.length > RICH_LIMIT ? keys.slice(-RICH_LIMIT).reduce((acc, k) => ({ ...acc, [k]: map[k] }), {}) : map;
    sessionStorage.setItem(RICH_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable: cards just won't survive a refresh */
  }
};

const richStore = {
  get: () => readRich(),
  set: (id, rich) => {
    if (!id || (!rich?.cards?.length && !rich?.actions?.length)) return;
    writeRich({ ...readRich(), [id]: { cards: rich.cards || [], actions: rich.actions || [] } });
  },
  rename: (from, to) => {
    const map = readRich();
    if (!map[from]) return;
    const { [from]: moved, ...rest } = map;
    writeRich({ ...rest, [to]: moved });
  },
  clear: () => {
    try { sessionStorage.removeItem(RICH_KEY); } catch { /* ignore */ }
  },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isPhoneScreen = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 639px)').matches;

// Provider component
export const ChatbotProvider = ({ children }) => {
  const { lang, t } = useLanguage();
  const { isAuthenticated, getDisplayName } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  // Once a question has been asked, follow-up chips stay put when the visitor changes page.
  const startedRef = useRef(false);

  // Get current language translations (older keys of this file)
  const getTranslation = useCallback((key) => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);

  // New strings live in the shared dictionary under c1_*, with an English fallback.
  const c1 = useCallback((key, fallback) => (t && t[key]) || fallback, [t]);

  // The first message knows the hour in Kathmandu and, when signed in, the visitor's first name.
  const userName = firstName(getDisplayName());
  const greetingMessage = useCallback(() => {
    const part = dayPart(ktmNow().hour);
    const greet = {
      Morning: c1('c2_goodMorning', 'Good morning'),
      Afternoon: c1('c2_goodAfternoon', 'Good afternoon'),
      Evening: c1('c2_goodEvening', 'Good evening'),
      Night: c1('c2_hello', 'Namaste'),
    }[part];
    const template = userName
      ? c1('c2_greetNamed', '{greet}, {name}! 🙏 Jai Shree Ram. How can I help you today?')
      : c1('c2_greetPlain', '{greet}! 🙏 Jai Shree Ram. How can I help you today?');
    return {
      id: 'greeting',
      text: template.replace('{greet}', greet).replace('{name}', userName),
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
  }, [c1, userName]);

  // Where the visitor is decides which questions are offered first.
  const startSuggestions = useMemo(() => startChips(c1, pathname), [c1, pathname]);
  const pageKey = useMemo(() => pageContext(pathname).key, [pathname]);

  // Initialize with greeting only when there are no messages yet
  useEffect(() => {
    setMessages(prev => (prev.length > 0 ? prev : [greetingMessage()]));
    if (!startedRef.current) setSuggestions(startSuggestions);
  }, [lang, greetingMessage, startSuggestions]);

  // A greeting that is still the only message is refreshed when the panel opens,
  // so "good morning" never greets someone in the evening.
  useEffect(() => {
    if (isOpen) setMessages(prev => (prev.length === 1 && prev[0].id === 'greeting' ? [greetingMessage()] : prev));
  }, [isOpen, greetingMessage]);

  // Load persisted messages from the database for the logged-in user
  useEffect(() => {
    if (!isAuthenticated()) {
      // Signed out: don't keep showing the previous user's conversation
      // (shared devices). Fall back to just the greeting.
      richStore.clear();
      setMessages([greetingMessage()]);
      return undefined;
    }
    let mounted = true;
    const loadMessages = async () => {
      try {
        const res = await api.get('/chatbot/messages');
        if (!mounted) return;
        const stored = res.data?.data || [];
        if (stored.length > 0) {
          const rich = richStore.get();
          setMessages(stored.map(m => ({
            id: m._id,
            text: m.text,
            sender: m.sender,
            timestamp: m.createdAt,
            ...(m.sender === 'bot' && rich[m._id] ? { cards: rich[m._id].cards, actions: rich[m._id].actions } : {}),
          })));
        } else {
          // No saved messages - show the localized greeting
          setMessages([greetingMessage()]);
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
        if (mounted) setMessages([greetingMessage()]);
      }
    };
    loadMessages();
    return () => { mounted = false; };
  }, [isAuthenticated, lang, greetingMessage]);

  // Scroll to the newest message (instantly for people who prefer reduced motion)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    startedRef.current = true;
    const userTempId = `temp-user-${Date.now()}`;

    const userMessage = {
      id: userTempId,
      text: trimmed,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Persist user message to the database (in the background)
    const userSaved = isAuthenticated()
      ? api.post('/chatbot/messages', { sender: 'user', text: trimmed, language: lang })
        .then((res) => {
          const saved = res.data?.data;
          if (saved?._id) {
            setMessages(prev => prev.map(m => m.id === userTempId
              ? { ...m, id: saved._id, timestamp: saved.createdAt || m.timestamp }
              : m));
          }
        })
        .catch((error) => console.error('Error saving user message:', error))
      : Promise.resolve();

    // Build the answer while the typing dots show (never faster than a natural pause).
    let response;
    try {
      [response] = await Promise.all([
        buildReply({ query: trimmed, lang, c1, trans: getTranslation }),
        wait(450 + Math.random() * 350),
      ]);
    } catch (error) {
      console.error('Error building chat reply:', error);
      response = { text: c1('c1_loadError', 'I could not load that just now. Please try again, or open the page directly:'), suggestions: startSuggestions };
    }

    const botTempId = `temp-bot-${Date.now()}`;
    const rich = { cards: response.cards || [], actions: response.actions || [] };
    setMessages(prev => [...prev, {
      id: botTempId,
      text: response.text,
      sender: 'bot',
      timestamp: new Date().toISOString(),
      ...(rich.cards.length ? { cards: rich.cards } : {}),
      ...(rich.actions.length ? { actions: rich.actions } : {}),
    }]);
    setIsTyping(false);
    if (response.suggestions) setSuggestions(response.suggestions);
    richStore.set(botTempId, rich);

    // Persist bot message (text only) to the database
    if (isAuthenticated()) {
      try {
        await userSaved; // keep the stored order: question first, then answer
        const res = await api.post('/chatbot/messages', { sender: 'bot', text: response.text, language: lang });
        const saved = res.data?.data;
        if (saved?._id) {
          richStore.rename(botTempId, saved._id);
          setMessages(prev => prev.map(m => m.id === botTempId
            ? { ...m, id: saved._id, timestamp: saved.createdAt || m.timestamp }
            : m));
        }
      } catch (error) {
        console.error('Error saving bot message:', error);
      }
    }
  };

  // Clear all messages function
  const clearAllMessages = useCallback(() => {
    startedRef.current = false;
    setMessages([greetingMessage()]);
    setSuggestions(startSuggestions);
    richStore.clear();
    if (isAuthenticated()) {
      api.delete('/chatbot/messages').catch((error) => {
        console.error('Error clearing chat messages:', error);
      });
    }
  }, [greetingMessage, startSuggestions, isAuthenticated]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Open a page from a card or button. Pages that need an account ask for
   * sign-in instead. On phones the panel covers the page, so it closes; on
   * larger screens it stays open beside the page so the answer remains readable.
   */
  const navigateTo = useCallback((to, { auth = false } = {}) => {
    if (!to) return;
    if (/^https?:\/\//i.test(to)) {
      window.open(to, '_blank', 'noopener,noreferrer');
      return;
    }
    if (/^(tel|mailto):/i.test(to)) {
      window.location.href = to;
      return;
    }
    if (auth && !isAuthenticated()) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
      return;
    }
    navigate(to);
    if (isPhoneScreen()) setIsOpen(false);
  }, [navigate, isAuthenticated]);

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    sendMessage(suggestion);
  };

  const value = {
    isOpen,
    toggleChat,
    closeChat,
    messages,
    sendMessage,
    isTyping,
    inputValue,
    setInputValue,
    suggestions,
    startSuggestions,
    pageKey,
    userName,
    handleSuggestionClick,
    messagesEndRef,
    getTranslation,
    c1,
    lang,
    clearAllMessages,
    navigateTo,
  };

  return (
    <ChatbotContext.Provider value={value}>
      {children}
    </ChatbotContext.Provider>
  );
};

export default ChatbotContext;
