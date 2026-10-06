import React, { useState, useEffect } from 'react';
import SubTitle from '../components/common/SubTitle';
import { motion } from "framer-motion";
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatDate as formatLocaleDate } from '../utils/formatDate';
import OmLoader from '../components/common/OmLoader';
import PageHero from '../components/common/PageHero';
import DonationReceipt from '../components/common/DonationReceipt';
import { 
  QrCode,
  AlertCircle,
  Check,
  Hand,
  User,
  Loader2,
  Shield,
  Lock,
  Banknote
} from 'lucide-react';

// The sandbox logins for the payment gateways are only shown while testing, never on the live site.
const SHOW_SANDBOX_HINTS = process.env.REACT_APP_ENV !== 'production';

// Real payment icons as inline SVG or image URLs
const PaymentIcons = {
  esewa: '/esewa.jpeg',
  khalti: '/khalti.jpeg',
  ips: '/ips.jpeg',
  bank: 'https://cdn-icons-png.flaticon.com/512/1011/1011876.png',
};

const DonatePage = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [settings, setSettings] = useState(null);
  const [, setDonationCount] = useState(0);
  const [realDonors, setRealDonors] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [amount, setAmount] = useState(501);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);

  const tiers = [108, 501, 1100, 2100, 5100, 11000];

  const gatewayColors = {
    esewa: { base: '#60BB46', hover: '#4CAF50' },
    khalti: { base: '#5C2D91', hover: '#482270' },
    ips: { base: '#1a56db', hover: '#1245a8' },
    bank: { base: '#A80808', hover: '#660505' },
  };

  const gatewayLabels = {
    esewa: 'Pay with eSewa',
    khalti: 'Pay with Khalti',
    ips: 'Pay with IPS',
    bank: t.donateBtn || 'Donate Now',
  };

  const gatewayNames = {
    esewa: 'eSewa',
    khalti: 'Khalti',
    ips: 'IPS',
    bank: 'Bank Transfer',
  };

  const redirectViaForm = (url, data) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    Object.entries(data).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const savePendingPayment = (donationId, method) => {
    localStorage.setItem('pendingDonationId', donationId);
    localStorage.setItem('pendingDonationAmount', amount);
    localStorage.setItem('pendingMethod', method);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await api.get('/admin/settings');
        setSettings(settingsRes.data);

        // The donations list is admin-only. Requesting it as a visitor returned
        // 401, which the api interceptor turns into a redirect to Home, so the
        // public page could never be viewed. Only admins fetch it.
        let donations = [];
        if (['admin', 'superadmin'].includes(user?.role)) {
          const donationsRes = await api.get('/admin/donations').catch(() => ({ data: [] }));
          donations = Array.isArray(donationsRes.data) ? donationsRes.data : [];
        }

        // Get real donors (completed donations)
        const completedDonations = donations.filter(d => d.status === 'completed');
        setRealDonors(completedDonations.slice(0, 10));
        setDonationCount((settingsRes.data?.donate?.baseCount || 0) + donations.length);
      } catch (error) {
        console.error('Error fetching donate data:', error);
      }
    };
    fetchData();
  }, [user?.role]);

  // Get qrPhoto and signature from settings.
  // The super admin can switch the donation QR off from Admin → Donation Account.
  const qrEnabled = settings?.donate?.qrEnabled !== false;
  const qrPhoto = qrEnabled ? settings?.donate?.qrPhoto : null;

  const handleEsewaPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/esewa/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, url, donationId } = response.data;

      savePendingPayment(donationId, 'esewa');

      setTimeout(() => {
        redirectViaForm(url, data);
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 3000);

    } catch (error) {
      console.error('Payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleKhaltiPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/khalti/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, donationId } = response.data;

      savePendingPayment(donationId, 'khalti');

      setTimeout(() => {
        window.location.href = data.paymentUrl;
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 2500);

    } catch (error) {
      console.error('Khalti payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleIpsPayment = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setPaymentProcessing(true);
    setShowRedirect(true);

    try {
      const response = await api.post('/payment/ips/initiate', {
        amount: Number(amount),
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        message: message || '',
      });

      if (!response.data.success) {
        showToast(response.data.message || 'Payment initiation failed', 'error');
        setPaymentProcessing(false);
        setShowRedirect(false);
        return;
      }

      const { data, url, donationId } = response.data;

      savePendingPayment(donationId, 'ips');

      setTimeout(() => {
        redirectViaForm(url, data);
        setPaymentProcessing(false);
        setShowRedirect(false);
      }, 3000);

    } catch (error) {
      console.error('IPS payment initiation error:', error);
      showToast(error.response?.data?.message || 'Payment initiation failed', 'error');
      setPaymentProcessing(false);
      setShowRedirect(false);
    }
  };

  const handleDonate = async () => {
    if (!user) {
      showToast(t.loginRequiredDonate || 'Please login to donate', 'warning');
      navigate('/');
      return;
    }

    if (selectedMethod === 'esewa') {
      await handleEsewaPayment();
      return;
    }

    if (selectedMethod === 'khalti') {
      await handleKhaltiPayment();
      return;
    }

    if (selectedMethod === 'ips') {
      await handleIpsPayment();
      return;
    }

    if (!amount || Number(amount) < 1) {
      showToast(t.validAmount || 'Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/donations', { 
        amount: Number(amount),
        paymentMethod: selectedMethod,
        name: name || user?.name || 'Anonymous',
        email: email || user?.email || '',
        phone: phone || user?.phone || '',
        message: message || '',
      });
      
      setDone(true);
      setDonationCount(prev => prev + 1);
      
      // Set current donation for receipt
      setCurrentDonation(response.data);
      setShowReceipt(true);
      
      // Add to real donors list
      setRealDonors(prev => [{
        name: name || user?.name || 'Anonymous',
        amount: Number(amount),
        date: new Date().toISOString(),
        message: message || '🙏 Blessed',
        _id: response.data._id
      }, ...prev].slice(0, 10));
      
      showToast(t.donateThanks || `NPR ${amount} — Thank you for your generous donation!`, 'success');
      
      // Send email
      try {
        await api.post('/donations/send-email', {
          donationId: response.data._id,
          email: email || user?.email,
          name: name || user?.name,
          amount: Number(amount)
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
      
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error('Donation error:', error);
      showToast(error.response?.data?.message || 'Donation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'esewa',
      name: 'eSewa',
      icon: <img loading="lazy" src={PaymentIcons.esewa} alt="eSewa" className="w-8 h-8 object-contain" />,
      color: '#60BB46',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      description: 'Pay with eSewa wallet',
      available: true
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: <img loading="lazy" src={PaymentIcons.khalti} alt="Khalti" className="w-8 h-8 object-contain" />,
      color: '#5C2D91',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      description: 'Pay with Khalti wallet',
      available: true
    },
    {
      id: 'ips',
      name: 'IPS',
      icon: <img loading="lazy" src={PaymentIcons.ips} alt="IPS" className="w-8 h-8 object-contain" />,
      color: '#1a56db',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      description: 'Pay with ConnectIPS via your bank',
      available: true
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: <Banknote size={24} className="text-gray-600" />,
      color: '#059669',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
      description: 'Direct bank transfer',
      available: true
    }
  ];

  // Redirect overlay
  if (showRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #FBF8F8 0%, #ffffff 50%, #FBF8F8 100%)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <OmLoader size="lg" color="green" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink mb-2">Redirecting to {gatewayNames[selectedMethod]}...</h2>
          <p className="text-ink-soft">Please wait while we redirect you to the payment gateway.</p>
          <div className="mt-4 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-[progress_3s_ease-in-out]" />
          </div>
          <p className="text-xs text-mute mt-3">You will be redirected in a moment...</p>
        </div>
        <style>{`
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      
      <PageHero 
        title={t.donateTitle || 'Support the Temple'} 
        sub={t.donateIntro || 'Your contribution helps preserve this sacred place'} 
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid lg:grid-cols-5 gap-8 items-start">

          {/* Left Column - Donation Form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10"
          >
            {done && (
              <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mb-6 border border-green-200">
                <Check size={16} /> {t.donateThanks || 'Thank you for your generous donation!'}
              </div>
            )}

            <SubTitle className="mb-6">{t.donateTitle || 'Make a Donation'}</SubTitle>

            {/* eSewa Secure Badge */}
            {selectedMethod === 'esewa' && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <Lock size={14} className="text-green-600" />
                <span className="text-xs text-green-700 font-medium">Secured by eSewa</span>
                <span className="text-xs text-green-600 ml-auto">Test Mode</span>
              </div>
            )}

            <p className="text-xs font-medium text-mute mb-3 uppercase tracking-wider">
              {t.quickAmounts || 'Quick Amounts'}
            </p>
            
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {tiers.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="py-3 px-2 rounded-lg border text-sm font-semibold transition-all duration-200 hover:shadow-md"
                  style={{
                    background: amount === v ? "#A80808" : "#fff",
                    color: amount === v ? "#fff" : "#333",
                    borderColor: amount === v ? "#A80808" : "#e5e5e5",
                  }}
                >
                  NPR {v.toLocaleString()}
                </button>
              ))}
            </div>

            <p className="text-xs text-mute text-center mb-4">{t.or || 'or'}</p>

            <div className="mb-6">
              <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                {t.customAmount || 'Custom Amount'} (NPR)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                placeholder="Enter amount"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.yourName || 'Your Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="Your Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.yourEmail || 'Your Email'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  {t.phoneNumber || 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="98XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mute mb-1.5 uppercase tracking-wider">
                  Message (Optional)
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#A80808] focus:ring-2 focus:ring-[#A80808]/20 outline-none transition-all"
                  placeholder="Your message..."
                />
              </div>
            </div>

            <button
              onClick={handleDonate}
              disabled={loading || done || paymentProcessing}
              className="w-full px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: gatewayColors[selectedMethod].base }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = gatewayColors[selectedMethod].hover; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = gatewayColors[selectedMethod].base; 
              }}
            >
              {loading || paymentProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.processing || 'Processing...'}
                </>
              ) : (
                <>
                  {selectedMethod === 'esewa' && <img loading="lazy" src={PaymentIcons.esewa} alt="eSewa" className="w-5 h-5 object-contain" />}
                  {selectedMethod === 'khalti' && <img loading="lazy" src={PaymentIcons.khalti} alt="Khalti" className="w-5 h-5 object-contain" />}
                  {selectedMethod === 'ips' && <img loading="lazy" src={PaymentIcons.ips} alt="IPS" className="w-5 h-5 object-contain" />}
                  {selectedMethod === 'bank' && <Banknote size={16} />}
                  {gatewayLabels[selectedMethod]}
                </>
              )}
            </button>
            
            {!user && (
              <p className="text-xs text-ink-soft mt-3 text-center">
                <AlertCircle size={12} className="inline mr-1" />
                {t.loginRequiredDonate || 'Please login to record your donation'}
              </p>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'esewa' && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  Test eSewa: 9806800001 / Nepal@123 / MPIN: 1122
                </p>
                <p className="text-xs text-amber-600 text-center mt-1">
                  Use these credentials to test the payment (OTP: 123456)
                </p>
              </div>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'khalti' && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  Test Khalti: 9800000005 / PIN: 1111 / OTP: 987654
                </p>
                <p className="text-xs text-purple-600 text-center mt-1">
                  If MPIN is locked, use another number (9800000000 – 9800000005)
                </p>
              </div>
            )}

            {SHOW_SANDBOX_HINTS && selectedMethod === 'ips' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  <Shield size={12} className="inline mr-1" />
                  IPS Test Mode – you will complete payment through the ConnectIPS UAT gateway
                </p>
                <p className="text-xs text-blue-600 text-center mt-1">
                  Payment is verified using your bank log-in + OTP
                </p>
              </div>
            )}
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Payment Methods */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <h3 className="font-serif text-lg mb-4" style={{ color: "#A80808" }}>
                {t.paymentMethods || 'Payment Methods'}
              </h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => method.available && setSelectedMethod(method.id)}
                    className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? `${method.bgColor} ${method.borderColor} border-2` 
                        : method.available ? 'border-gray-100 hover:border-gray-300' : 'border-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{method.name}</span>
                        {selectedMethod === method.id && (
                          <Check size={16} className="text-green-500" />
                        )}
                        {!method.available && (
                          <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Soon</span>
                        )}
                      </div>
                      <p className="text-xs text-mute truncate">{method.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code - only while the super admin has it switched on */}
            {qrEnabled && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-center">
              <h3 className="font-serif text-lg mb-4" style={{ color: "#A80808" }}>
                {t.scanQR || 'Scan to Pay'}
              </h3>
              <div className="mx-auto w-44 h-44 bg-gray-50 rounded-xl grid place-items-center border border-gray-200 overflow-hidden">
                {qrPhoto ? (
                  <img loading="lazy" src={qrPhoto} alt="QR Code" className="w-full h-full object-cover" />
                ) : (
                  <QrCode size={80} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-mute mt-3">eSewa / Khalti / IPS / FonePay</p>
            </div>
            )}

            {/* Real Donors - No scrollbar */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Hand size={20} className="text-vermilion" />
                <h3 className="font-serif text-lg" style={{ color: "#A80808" }}>
                  {t.recentDonors || 'Recent Devotees'}
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">
                  {realDonors.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {realDonors.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No donations yet. Be the first!</p>
                ) : (
                  realDonors.map((donor, index) => (
                    <div 
                      key={donor._id || index} 
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#A80808]/10 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-[#A80808]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{donor.name}</p>
                          <span className="text-xs font-bold text-[#A80808]">Rs. {donor.amount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-mute">
                          <span>{(donor.date && formatLocaleDate(donor.date, lang)) || t.today || 'Today'}</span>
                          {donor.message && (
                            <span className="text-gray-400">• "{donor.message}"</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Donation Receipt Modal */}
      {showReceipt && currentDonation && (
        <DonationReceipt
          donation={currentDonation}
          onClose={() => {
            setShowReceipt(false);
            setCurrentDonation(null);
          }}
          settings={settings}
        />
      )}

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          width: 0;
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default DonatePage;