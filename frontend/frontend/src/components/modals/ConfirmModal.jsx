import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertCircle, X } from 'lucide-react';

const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel, 
  danger = false 
}) => {
  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-end md:items-center justify-center p-4 rt-modal-backdrop">
      <div className="bg-white rounded-2xl md:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl rt-modal-sheet md:max-w-[400px]">
        <div className="flex items-center justify-between p-4 border-b border-line sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 className="text-lg font-serif font-bold">{title || t.close}</h3>
          <button onClick={onClose} aria-label={t.close} className="p-2 rounded-full hover:bg-panel transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            danger ? 'bg-red-50 text-red-500' : 'bg-marigold/20 text-marigold'
          }`}>
            <AlertCircle size={26} />
          </div>
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="text-sm text-ink-soft mt-2 max-w-sm mx-auto">{message}</p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-line font-semibold text-sm hover:bg-panel transition-colors"
            >
              {cancelLabel || t.notNow}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-full font-semibold text-sm text-white transition-all ${
                danger ? 'bg-red-500 hover:bg-red-600' : 'bg-vermilion hover:bg-[#820606]'
              }`}
            >
              {confirmLabel || t.yesLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;