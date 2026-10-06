import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const LEADING_EMOJI = /^\s*(?:[☀-➿\u{1F300}-\u{1FAFF}]️?\s*)+/u;

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    // Auto remove toast after duration
    if (timerRef.current[id]) {
      clearTimeout(timerRef.current[id]);
    }
    
    timerRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timerRef.current[id];
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timerRef.current[id]) {
      clearTimeout(timerRef.current[id]);
      delete timerRef.current[id];
    }
  }, []);

  const clearAllToasts = useCallback(() => {
    Object.values(timerRef.current).forEach(timer => clearTimeout(timer));
    timerRef.current = {};
    setToasts([]);
  }, []);

  // Toast component
  const ToastContainer = () => {
    if (toasts.length === 0) return null;

    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => {
          // Status colours stay semantic (green/red/amber); info uses the ink neutral.
          const bgColor = toast.type === 'success' ? 'bg-green-700' :
                          toast.type === 'error' ? 'bg-red-700' :
                          toast.type === 'warning' ? 'bg-amber-700' :
                          'bg-ink';

          const Icon = toast.type === 'success' ? CheckCircle2 :
                       toast.type === 'error' ? XCircle :
                       toast.type === 'warning' ? AlertTriangle :
                       Info;

          // Some callers prefix their message with an emoji; the toast already
          // shows a status icon, so drop it to avoid two icons.
          const message = typeof toast.message === 'string'
            ? toast.message.replace(LEADING_EMOJI, '')
            : toast.message;

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={`${bgColor} text-white pl-4 pr-1.5 py-1.5 rounded-full shadow-xl flex items-center gap-2 text-sm font-semibold pointer-events-auto animate-toast-in max-w-[90vw]`}
              onClick={() => removeToast(toast.id)}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              <span className="py-1.5">{message}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                aria-label="Dismiss"
                className="ml-1 w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/75 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};