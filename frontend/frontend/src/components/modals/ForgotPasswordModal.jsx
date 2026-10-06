// frontend/src/components/modals/ForgotPasswordModal.jsx
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Mail, X, Check, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';

// The reset code e-mailed to the account owner (6 digits: a 4-digit code is too easy to guess).
const OTP_LENGTH = 6;

const ForgotPasswordModal = ({ open, onClose }) => {
  useLanguage();
  const { showToast } = useToast();
  const { login } = useAuth();
  
  // Step management: 'email' | 'otp' | 'reset' | 'success'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [, setOtpSent] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setResetToken('');
      setResendCooldown(0);
      setOtpSent(false);
    }
  }, [open]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!open) return null;

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    let digits = value.replace(/\D/g, '');
    // Typing into a box that already holds a digit: keep only the newly typed one.
    if (digits.length === 2 && otp[index]) digits = digits.replace(otp[index], '');
    const newOtp = [...otp];
    if (digits.length > 1) {
      // A pasted or auto-filled code: spread it over the boxes from this one.
      digits.slice(0, OTP_LENGTH - index).split('').forEach((d, i) => { newOtp[index + i] = d; });
      setOtp(newOtp);
      const focusAt = Math.min(index + digits.length, OTP_LENGTH - 1);
      const target = document.getElementById(`otp-${focusAt}`);
      if (target) target.focus();
      return;
    }
    newOtp[index] = digits;
    setOtp(newOtp);
    if (digits && index < OTP_LENGTH - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle OTP keydown (backspace to previous)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { email });
      if (response.data.success) {
        setOtpSent(true);
        setStep('otp');
        setResendCooldown(60);
        showToast('OTP sent to your email', 'success');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP. Please check your email and try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setResendCooldown(60);
      showToast('OTP resent to your email', 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
      showToast(err.response?.data?.message || 'Failed to resend OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP`);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp: otpString });
      if (response.data.success) {
        setResetToken(response.data.resetToken);
        setStep('reset');
        showToast('OTP verified successfully', 'success');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      showToast(err.response?.data?.message || 'Invalid OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password & Auto Login
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Reset password
      const response = await api.post('/auth/reset-password-otp', {
        resetToken,
        password: newPassword,
      });

      if (response.data.success) {
        // Auto login after password reset
        const loginResult = await login(email, newPassword);
        if (loginResult.success) {
          showToast('Password reset successfully! You are now logged in.', 'success');
          setStep('success');
          // Close modal after success
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          // If auto-login fails, show success but let user login manually
          showToast('Password reset successfully! Please login.', 'success');
          setStep('success');
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render Email Step
  const renderEmailStep = () => (
    <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Enter your email address and we'll send you an OTP to reset your password.
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-ink block mb-1.5">Email Address</label>
        <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
          <Mail size={16} className="text-ink-soft flex-shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email Address"
            placeholder="you@example.com"
            className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
            required
            autoFocus
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </span>
        ) : (
          'Send OTP'
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="text-sm text-ink-soft font-medium hover:text-vermilion transition-colors bg-transparent border-0 flex items-center justify-center gap-1"
      >
        <ArrowLeft size={14} /> Back to Login
      </button>
    </form>
  );

  // Render OTP Step
  const renderOtpStep = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep('email')}
          aria-label="Back"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h4 className="text-lg font-serif font-semibold text-ink">Enter OTP</h4>
      </div>
      <p className="text-sm text-ink-soft">
        Enter the {OTP_LENGTH}-digit OTP sent to <strong>{email}</strong>
      </p>

      {error && (
        <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-2 sm:gap-3 my-4">
        {Array.from({ length: OTP_LENGTH }, (_, index) => index).map((index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            maxLength={OTP_LENGTH}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={otp[index]}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            aria-label={`OTP digit ${index + 1}`}
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-vermilion focus:outline-none transition-colors bg-gray-50"
            autoFocus={index === 0}
          />
        ))}
      </div>

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

      <div className="text-center">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendCooldown > 0 || loading}
          className={`text-sm font-medium transition-colors bg-transparent border-0 ${
            resendCooldown > 0 ? 'text-ink-soft cursor-not-allowed' : 'text-vermilion hover:underline'
          }`}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </div>
  );

  // Render Reset Password Step
  const renderResetStep = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Check size={20} className="text-green-500" />
        <h4 className="text-lg font-serif font-semibold text-ink">Reset Password</h4>
      </div>
      <p className="text-sm text-ink-soft">Enter your new password</p>

      {error && (
        <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-ink block mb-1.5">New Password</label>
        <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
          <Lock size={16} className="text-ink-soft flex-shrink-0" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-label="New Password"
            placeholder="•••••••• (min 8 characters)"
            className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
            required
            minLength="6"
            autoFocus
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
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-label="Confirm Password"
            placeholder="••••••••"
            className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
            required
          />
        </div>
      </div>

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
          'Reset Password & Login'
        )}
      </button>
    </div>
  );

  // Render Success Step
  const renderSuccessStep = () => (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
        <Check size={32} />
      </div>
      <h4 className="text-lg font-semibold">Password Reset Successful!</h4>
      <p className="text-sm text-ink-soft mt-2">
        Your password has been reset and you are now logged in.
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-end md:items-center justify-center p-0 md:p-4 rt-modal-backdrop">
      <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl md:max-w-[400px] rt-modal-sheet">
        <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 className="text-lg font-serif font-bold">
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Reset Password'}
            {step === 'success' && 'Success!'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-panel transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {step === 'email' && renderEmailStep()}
          {step === 'otp' && renderOtpStep()}
          {step === 'reset' && renderResetStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;