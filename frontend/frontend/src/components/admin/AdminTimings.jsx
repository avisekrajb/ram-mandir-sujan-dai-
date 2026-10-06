import React, { useState } from 'react';
import { Save, Clock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AdminTimings = ({ settings, updateSettings, t }) => {
  const { showToast } = useToast();
  const [open, setOpen] = useState(settings?.timings?.open || '05:00 AM');
  const [close, setClose] = useState(settings?.timings?.close || '08:00 PM');

  const handleSave = async () => {
    try {
      await updateSettings({ timings: { open, close } });
      showToast((t.a3_timings_saved || 'Timings saved successfully'), 'success');
    } catch (error) {
      console.error('Save timings error:', error);
      showToast(error.response?.data?.message || (t.a3_timings_saveFailed || 'Failed to save timings'), 'error');
    }
  };

  return (
    <div className="bg-white border border-line rounded-rt p-4 shadow-rt">
      <h4 className="text-sm font-serif font-semibold mb-1">{t.templeTimings || 'Temple Timings'}</h4>
      <p className="text-xs text-ink-soft mb-4">{t.openHours || 'Darshan Hours'}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_timings_open || 'Open'}</label>
          <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel">
            <Clock size={16} className="text-ink-soft" />
            <input
              type="text"
              aria-label={(t.a3_timings_open || 'Open')} value={open}
              onChange={(e) => setOpen(e.target.value)}
              className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
              placeholder="05:00 AM"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-ink block mb-1.5">{t.a3_timings_close || 'Close'}</label>
          <div className="flex items-center gap-2 border border-line rounded-lg px-3 bg-panel">
            <Clock size={16} className="text-ink-soft" />
            <input
              type="text"
              aria-label={(t.a3_timings_close || 'Close')} value={close}
              onChange={(e) => setClose(e.target.value)}
              className="w-full py-2.5 bg-transparent border-0 focus:outline-none text-sm"
              placeholder="08:00 PM"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vermilion text-white font-semibold text-sm hover:bg-[#820606] transition-all"
      >
        <Save size={15} /> {t.save || 'Save Changes'}
      </button>
    </div>
  );
};

export default AdminTimings;