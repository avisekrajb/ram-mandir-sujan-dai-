// frontend/src/components/modals/AuthModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import {
  Mail, Lock, Eye, EyeOff, MapPin, Phone, User, X,
  ArrowLeft, Check
} from 'lucide-react';
import EmailCodeSignIn from './EmailCodeSignIn';

// The way in when Google does not work: a code emailed to the person (EmailCodeSignIn).
// `highlight` marks it as the thing to try after a Google failure.
const EmailCodeEntry = ({ label, hint, highlight, onClick }) => (
  <>
    {hint && (
      <div role="status" className="bg-amber-50 text-amber-900 px-4 py-2.5 rounded-lg text-sm">
        {hint}
      </div>
    )}
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2.5 sm:py-3 rounded-lg border bg-white font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 ${
        highlight ? 'border-vermilion text-vermilion' : 'border-gray-300 text-gray-700'
      }`}
    >
      <Mail size={18} aria-hidden="true" />
      {label}
    </button>
  </>
);

// Google Sign-In Component
const GoogleSignIn = ({ onSuccess, onError }) => {
  useLanguage();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        onError('Google Sign-In is not configured');
        setLoading(false);
        return;
      }

      const loadGoogleScript = () => {
        return new Promise((resolve) => {
          if (window.google) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = resolve;
          script.onerror = () => {
            onError('Failed to load Google Sign-In library');
            setLoading(false);
          };
          document.body.appendChild(script);
        });
      };

      await loadGoogleScript();

      const google = window.google;
      if (!google) {
        onError('Google Sign-In library not loaded');
        setLoading(false);
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile',
        callback: async (response) => {
          try {
            if (response.error) {
              onError(response.error_description || 'Google Sign-In failed');
              setLoading(false);
              return;
            }
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            });
            if (!userInfoResponse.ok) {
              throw new Error('Failed to fetch user info');
            }
            const userInfo = await userInfoResponse.json();
            onSuccess({
              email: userInfo.email,
              name: userInfo.name,
              profilePhoto: userInfo.picture,
              googleId: userInfo.sub,
              // The backend re-verifies this token with Google; the fields above are display hints only.
              accessToken: response.access_token,
            });
          } catch (error) {
            onError(error.message || 'Failed to fetch Google user info');
          }
          setLoading(false);
        },
        error_callback: (error) => {
          console.error('Google OAuth error:', error);
          onError(error?.error_description || 'Google Sign-In cancelled or failed');
          setLoading(false);
        },
      });

      client.requestAccessToken();
    } catch (error) {
      console.error('Google Sign-In error:', error);
      onError(error.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full py-2.5 sm:py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
      </svg>
      {loading ? 'Loading...' : 'Sign in with Google'}
    </button>
  );
};

// OTP Modal Component (for password reset inside auth modal)
const OtpModal = ({ email, onBack, onVerify, onResetPassword, isOpen }) => {
  useLanguage();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('otp');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onVerify(email, otpString);
      setStep('reset');
    } catch (error) {
      setError(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onResetPassword(newPassword);
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'otp' ? (
        <>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              aria-label="Back"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h4 className="text-lg font-serif font-semibold text-ink">Enter OTP</h4>
          </div>
          <p className="text-sm text-ink-soft">
            Enter the 4-digit OTP sent to <strong>{email}</strong>
          </p>

          <div className="flex justify-center gap-2 sm:gap-3 my-4">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                id={`otp-${index}`}
                aria-label={`OTP digit ${index + 1}`}
                type="text"
                maxLength={1}
                value={otp[index]}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-vermilion focus:outline-none transition-colors bg-gray-50"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="w-full py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify OTP'
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <Check size={20} className="text-green-500" />
            <h4 className="text-lg font-serif font-semibold text-ink">Reset Password</h4>
          </div>
          <p className="text-sm text-ink-soft">Enter your new password</p>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">New Password</label>
            <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
              <Lock size={16} className="text-ink-soft flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                aria-label="New password"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••• (min 8 characters)"
                className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-ink-soft hover:text-ink"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">Confirm Password</label>
            <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
              <Lock size={16} className="text-ink-soft flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                aria-label="Confirm password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </>
      )}
    </div>
  );
};

// Main Auth Modal
const AuthModal = ({ open, onClose, onSuccess, setForgotModal }) => {
  const { t } = useLanguage();
  const { login, signup, googleAuth } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'code'
  // Set when the Google button fails, so the email-code option is pointed out.
  const [googleFailed, setGoogleFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [logoPhoto, setLogoPhoto] = useState(null);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  // Fetch logo from settings
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await api.get('/admin/settings');
        if (response.data?.logo?.photo) {
          setLogoPhoto(response.data.logo.photo);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    if (open) {
      setError('');
      setLoginData({ email: '', password: '' });
      setSignupData({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
      });
      setShowOtpModal(false);
      setGoogleFailed(false);
      setMode((m) => (m === 'code' ? 'login' : m));
    }
  }, [open]);

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        showToast(`Welcome back, ${result.user.name}!`, 'success');
        onSuccess();
        onClose();
      } else {
        setError(result.error || t.invalidLogin);
        showToast(result.error || t.invalidLogin, 'error');
      }
    } catch (err) {
      setError(t.invalidLogin);
      showToast(t.invalidLogin, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signup(signupData);
      if (result.success) {
        showToast(`Welcome, ${result.user.name}!`, 'success');
        onSuccess();
        onClose();
      } else {
        setError(result.error || t.fillAll);
        showToast(result.error || t.fillAll, 'error');
      }
    } catch (err) {
      setError(t.fillAll);
      showToast(t.fillAll, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (userData) => {
    try {
      const result = await googleAuth(userData);
      if (result.success) {
        showToast(`Welcome, ${result.user.name}!`, 'success');
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Google sign-in failed');
        showToast(result.error || 'Google sign-in failed', 'error');
      }
    } catch (error) {
      setError('Google sign-in failed');
      showToast('Google sign-in failed', 'error');
    }
  };

  const handleGoogleError = (errorMsg) => {
    setError(errorMsg);
    setGoogleFailed(true);
    showToast(errorMsg, 'error');
  };

  const openEmailCode = () => {
    setError('');
    setMode('code');
  };

  // Handle Forgot Password - Open the forgot password modal
  const handleForgotPassword = () => {
    // Close auth modal and open forgot password modal
    onClose();
    if (setForgotModal) {
      setForgotModal(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-end md:items-center justify-center p-0 md:p-4 rt-modal-backdrop">
      <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl rt-modal-sheet md:max-w-[440px]">
        {/* Header with Logo */}
        <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vermilion to-maroon-deep text-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logoPhoto ? (
                <img src={logoPhoto} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">🕉</span>
              )}
            </div>
            <span className="font-serif font-bold text-sm text-maroon">Shree Ramchandra</span>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close"
            className="p-2 rounded-full hover:bg-panel transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {showOtpModal ? (
            <OtpModal
              email={otpEmail}
              onBack={() => setShowOtpModal(false)}
              onVerify={async (email, otp) => {
                try {
                  const response = await api.post('/auth/verify-otp', { email, otp });
                  if (response.data.success) {
                    setResetToken(response.data.resetToken);
                    return true;
                  }
                } catch (error) {
                  throw new Error(error.response?.data?.message || 'Invalid OTP');
                }
              }}
              onResetPassword={async (password) => {
                try {
                  const response = await api.post('/auth/reset-password-otp', {
                    resetToken,
                    password,
                  });
                  if (response.data.success) {
                    showToast('Password reset successfully!', 'success');
                    const loginResult = await login(otpEmail, password);
                    if (loginResult.success) {
                      onSuccess();
                      onClose();
                      setShowOtpModal(false);
                    }
                    return true;
                  }
                } catch (error) {
                  throw new Error(error.response?.data?.message || 'Failed to reset password');
                }
              }}
              isOpen={showOtpModal}
            />
          ) : (
            <>
              {error && mode !== 'code' && (
                <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold mb-4">
                  {error}
                </div>
              )}

              {mode === 'code' ? (
                <EmailCodeSignIn
                  initialEmail={loginData.email}
                  onBack={() => { setMode('login'); setError(''); }}
                  onDone={() => { onSuccess(); onClose(); }}
                />
              ) : mode === 'login' ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.email}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <Mail size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type="email"
                        value={loginData.email}
                        aria-label="Email"
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.password}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <Lock size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        aria-label="Password"
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="text-ink-soft hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-bold text-vermilion text-right hover:underline bg-transparent border-0"
                  >
                    {t.forgotPw || 'Forgot Password?'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      t.login
                    )}
                  </button>

                  <GoogleSignIn onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

                  <EmailCodeEntry
                    label={t.lc_start || 'Email me a sign-in code'}
                    hint={googleFailed ? (t.lc_googleFailed || 'Google sign-in did not work. You can sign in with a code we email you instead.') : ''}
                    highlight={googleFailed}
                    onClick={openEmailCode}
                  />

                  <p className="text-sm text-ink-soft text-center">
                    {t.noAccount}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(''); }}
                      className="text-vermilion font-bold hover:underline bg-transparent border-0"
                    >
                      {t.signup}
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.fullName}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <User size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type="text"
                        value={signupData.name}
                        aria-label="Full name"
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        placeholder="Your Name"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.email}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <Mail size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type="email"
                        value={signupData.email}
                        aria-label="Email"
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.password}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <Lock size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={signupData.password}
                        aria-label="Password"
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        placeholder="•••••••• (min 8 characters)"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                        required
                        minLength="6"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="text-ink-soft hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.phone}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <Phone size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type="tel"
                        value={signupData.phone}
                        aria-label="Phone"
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        placeholder="98XXXXXXXX"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1.5">{t.address}</label>
                    <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
                      <MapPin size={16} className="text-ink-soft flex-shrink-0" />
                      <input
                        type="text"
                        value={signupData.address}
                        aria-label="Address"
                        onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                        placeholder="Your Address"
                        className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      t.createAcc
                    )}
                  </button>

                  <GoogleSignIn onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

                  <EmailCodeEntry
                    label={t.lc_start || 'Email me a sign-in code'}
                    hint={googleFailed ? (t.lc_googleFailed || 'Google sign-in did not work. You can sign in with a code we email you instead.') : ''}
                    highlight={googleFailed}
                    onClick={openEmailCode}
                  />

                  <p className="text-sm text-ink-soft text-center">
                    {t.haveAccount}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); }}
                      className="text-vermilion font-bold hover:underline bg-transparent border-0"
                    >
                      {t.login}
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;