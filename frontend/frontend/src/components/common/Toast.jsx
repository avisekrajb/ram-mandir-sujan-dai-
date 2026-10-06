import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const Toast = ({ message, type = 'success', visible, onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] animate-[toast-in_0.25s_ease]">
      <div className="bg-ink text-white px-5 py-3 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xl max-w-[90vw]">
        <Sparkles size={16} className="text-marigold flex-shrink-0" />
        {message}
      </div>
    </div>
  );
};

export default Toast;