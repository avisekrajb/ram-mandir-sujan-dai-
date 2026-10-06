import { useEffect, useState } from 'react';
import api from '../services/api';

const ALL_CODES = ['en', 'ne', 'hi', 'zh', 'ta'];

// Loads the enabled languages from admin settings and returns only the codes
// that the super admin has turned on. Falls back to all languages.
export default function useEnabledLanguages() {
  const [enabled, setEnabled] = useState(ALL_CODES);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/admin/settings');
        const list = res.data?.enabledLanguages;
        const filtered = Array.isArray(list) && list.length > 0
          ? ALL_CODES.filter((c) => list.includes(c))
          : ALL_CODES;
        if (active) setEnabled(filtered);
      } catch {
        if (active) setEnabled(ALL_CODES);
      }
    })();
    return () => { active = false; };
  }, []);

  return enabled;
}
