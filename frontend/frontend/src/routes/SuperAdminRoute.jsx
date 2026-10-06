import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SuperAdminLogin = () => {
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrongRole, setWrongRole] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setWrongRole(false);
    setBusy(true);
    const result = await login(email, password);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Login failed');
      return;
    }
    if (result.user.role !== 'superadmin') {
      setWrongRole(true);
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-maroon text-white flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-maroon">Super Admin</h1>
            <p className="text-xs text-ink-soft">Restricted area</p>
          </div>
        </div>

        {wrongRole ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-3">This account is not a super administrator.</p>
            <p className="text-xs text-ink-soft mb-4">Signed in as {user?.email || email}</p>
            <Link to="/" className="text-xs font-semibold text-maroon underline">
              Continue to main website
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="super@gmail.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-line"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-maroon text-white text-sm font-semibold hover:bg-maroon-deep transition-colors disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Login as Super Admin'}
            </button>

            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 text-xs text-ink-soft hover:text-maroon"
            >
              <ArrowLeft size={14} /> Back to website
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-2 border-maroon border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'superadmin') {
    return <SuperAdminLogin />;
  }

  return children;
};

export default SuperAdminRoute;