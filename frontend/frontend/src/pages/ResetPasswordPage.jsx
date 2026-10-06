import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import { Lock, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  useLanguage();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password: form.password });
      setSuccess(true);
      showToast('Password reset successfully!');
      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white border border-line rounded-rt p-8 text-center max-w-md w-full shadow-rt">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-4">
            <Check size={32} />
          </div>
          <h3 className="text-lg font-serif font-semibold">Password Reset Successful</h3>
          <p className="text-sm text-ink-soft mt-2">You can now login with your new password.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white border border-line rounded-rt p-6 max-w-md w-full shadow-rt">
        <h3 className="text-lg font-serif font-semibold text-center mb-2">Reset Password</h3>
        <p className="text-sm text-ink-soft text-center mb-6">Enter your new password below</p>

        {error && (
          <div className="bg-red-50 text-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-ink block mb-1.5">New Password</label>
            <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel focus-within:border-vermilion transition-colors">
              <Lock size={16} className="text-ink-soft flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                aria-label="New Password"
                placeholder="••••••••"
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
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                aria-label="Confirm Password"
                placeholder="••••••••"
                className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
                required
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
                Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-ink-soft font-medium hover:text-vermilion transition-colors bg-transparent border-0 flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;