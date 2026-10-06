import React, { useState, useEffect } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MaintenanceModal = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await api.get('/maintenance');
        if (!cancelled) setMaintenance(res.data.data || { enabled: false });
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Skip the maintenance block for logged-in users (including admin & superadmin)
  if (user) return null;
  if (loading || !maintenance || !maintenance.enabled) return null;

  const title = maintenance.title?.[lang] || maintenance.title?.en || 'Under Development';
  const message = maintenance.message?.[lang] || maintenance.message?.en || 'The website is under development. Please visit again soon.';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-maroon-deep/90 backdrop-blur-sm" />

      <div className="relative bg-gradient-to-br from-maroon-deep via-[#A80808] to-vermilion text-white rounded-3xl w-full max-w-md shadow-2xl border border-white/20 overflow-hidden anim-modal">
        {/* Decorative top glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-marigold/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-vermilion/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-white/10 border-2 border-marigold/40 flex items-center justify-center mb-5 shadow-lg">
            <Wrench size={34} className="text-marigold" />
          </div>

          <h2 className="font-serif text-3xl font-bold tracking-wide text-white">{title}</h2>

          <div className="w-16 h-0.5 bg-marigold mx-auto my-4" />

          <p className="text-white/80 text-sm leading-relaxed">{message}</p>

          <div className="mt-7 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs text-white/70">
            <Loader2 size={13} className="animate-spin text-marigold" />
            Please check back later
          </div>

          <div className="mt-6 text-xs uppercase tracking-[0.3em] text-white/65">
            Shree Ramchandra Temple
          </div>
        </div>
      </div>

      <style>{`
        .anim-modal {
          animation: modal-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceModal;