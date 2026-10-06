import { useToast as useToastContext } from '../context/ToastContext';

// This is a wrapper for backward compatibility
export const useToast = () => {
  const { showToast, removeToast, clearAllToasts } = useToastContext();
  
  return {
    showToast,
    removeToast,
    clearAllToasts,
    // For backward compatibility with old code
    toast: { message: '', type: 'success', visible: false },
    hideToast: () => {},
  };
};