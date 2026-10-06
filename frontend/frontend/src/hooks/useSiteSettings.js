import { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Site settings (logo, footer, social links...) from `/admin/settings`.
 * The api layer de-duplicates concurrent reads of this endpoint, so the
 * header, footer and pages can all call this hook without extra requests.
 */
const useSiteSettings = () => {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/admin/settings')
      .then((res) => {
        if (active) setSettings(res.data || {});
      })
      .catch((error) => {
        console.error('Error fetching site settings:', error);
        if (active) setSettings({});
      });
    return () => {
      active = false;
    };
  }, []);

  return settings;
};

export default useSiteSettings;
