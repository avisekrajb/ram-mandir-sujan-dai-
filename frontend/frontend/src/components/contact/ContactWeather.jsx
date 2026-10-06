import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import useKtmClock, { conditionLabel } from '../common/header/useKtmClock';

/**
 * The live Kathmandu weather as one quiet, centred line at the bottom of the Contact page (it used to sit in
 * the top strip). Everything wraps onto the next line on a narrow screen. The request is the same one the
 * Time & Weather tool and the menu share (cached for 20 minutes), and when it cannot be reached the line is
 * left out rather than showing an empty gap.
 */
const ContactWeather = () => {
  const { t, lang } = useLanguage();
  const { weather } = useKtmClock(lang);
  if (!weather) return null;

  const { Icon } = weather.cond;
  const feelsDiffers = weather.feelsText !== weather.tempText;

  return (
    <section
      aria-label={t.tb_weatherAt || 'Kathmandu weather'}
      className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line pt-6 text-center text-sm text-ink-soft"
    >
      <Icon size={18} className="shrink-0 text-vermilion" aria-hidden="true" />
      <span>{t.tb_weatherAt || 'Kathmandu weather'}</span>
      <span className="font-semibold text-ink">{weather.tempText}°C</span>
      <span>{conditionLabel(t, weather.cond.key)}</span>
      {feelsDiffers && (
        <span>
          {t.tb_feels || 'Feels like'} {weather.feelsText}°C
        </span>
      )}
    </section>
  );
};

export default ContactWeather;
