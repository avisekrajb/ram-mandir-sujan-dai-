import React from 'react';
import { Cloud, Droplets, MapPin, Thermometer, Umbrella, Wind } from 'lucide-react';
import useKtmClock, { conditionLabel } from './useKtmClock';

/**
 * Kathmandu time, date (BS and AD) and weather.
 *  - default: a compact card, used in the mobile menu
 *  - `detailed`: the Tools page version, with feels-like, humidity, wind, chance of
 *    rain and a five-day forecast
 */
const TimeWeather = ({ t, lang, detailed = false }) => {
  const { time, weekday, bsText, adText, weather, failed } = useKtmClock(lang);
  const Icon = weather ? weather.cond.Icon : Cloud;
  const label = weather ? conditionLabel(t, weather.cond.key) : '';
  const today = weather?.forecast?.[0];

  if (!detailed) {
    return (
      <div className="rounded-xl border border-line bg-panel p-3.5" lang={lang}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-mute">
          <MapPin size={12} className="text-vermilion" aria-hidden="true" />
          {t.tb_nepalTime || t.a5_ktmTime || 'Nepal time'}
        </p>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-none text-ink">{time}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{weekday}</p>
            {bsText && <p className="text-sm text-ink-soft">{bsText}</p>}
          </div>
          <div className="shrink-0 text-right" aria-live="polite">
            {weather ? (
              <>
                <Icon size={28} className="ml-auto text-vermilion" aria-hidden="true" />
                <p className="mt-1 text-lg font-semibold leading-none text-ink">{weather.tempText}°C</p>
                <p className="mt-1 text-xs text-ink-soft">{label}</p>
              </>
            ) : (
              <p className="text-xs text-mute">{failed ? (t.a5_wxUnavailable || 'Weather unavailable') : (t.tb_loading || 'Loading…')}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stat = (StatIcon, name, value) => (
    <div className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 ring-1 ring-line">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-vermilion">
        <StatIcon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-xs text-mute">{name}</span>
        <span className="block text-base font-semibold text-ink">{value}</span>
      </span>
    </div>
  );

  return (
    <div className="space-y-5" lang={lang}>
      {/* time and date */}
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-mute">
          <MapPin size={13} className="text-vermilion" aria-hidden="true" />
          {t.tb_nepalTime || 'Nepal time'}
        </p>
        <p className="mt-2 text-4xl font-semibold leading-none text-ink sm:text-5xl">{time}</p>
        <p className="mt-3 text-lg text-ink">{weekday}{bsText ? ` · ${bsText}` : ''}</p>
        <p className="text-base text-ink-soft">{adText}</p>
      </div>

      {/* weather now */}
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-widest text-mute">{t.tb_weatherAt || 'Kathmandu weather'}</p>
        {weather ? (
          <>
            <div className="mt-3 flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-vermilion ring-1 ring-line">
                <Icon size={36} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-4xl font-semibold leading-none text-ink">{weather.tempText}°C</p>
                <p className="mt-1.5 text-lg text-ink-soft">{label}</p>
              </div>
              {today && (
                <p className="ml-auto text-right text-sm text-ink-soft">
                  {t.tb_high || 'High'} <span className="font-semibold text-ink">{today.maxText}°</span>
                  <br />
                  {t.tb_low || 'Low'} <span className="font-semibold text-ink">{today.minText}°</span>
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {stat(Thermometer, t.tb_feels || 'Feels like', `${weather.feelsText}°C`)}
              {stat(Droplets, t.tb_humidity || 'Humidity', `${weather.humidityText}%`)}
              {stat(Wind, t.tb_wind || 'Wind', `${weather.windText} km/h`)}
              {stat(Umbrella, t.tb_rainChance || 'Chance of rain', today && today.popText !== '' ? `${today.popText}%` : '—')}
            </div>

            {weather.forecast.length > 1 && (
              <>
                <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-mute">{t.tb_forecast || 'Next 5 days'}</p>
                <ul className="grid grid-cols-5 gap-2">
                  {weather.forecast.map((f, i) => {
                    const FIcon = f.cond.Icon;
                    return (
                      <li key={f.date} className="rounded-xl bg-white px-1.5 py-3 text-center ring-1 ring-line" title={conditionLabel(t, f.cond.key)}>
                        <p className="truncate text-xs font-semibold text-ink-soft">{i === 0 ? (t.tb_today || 'Today') : f.weekday}</p>
                        <FIcon size={24} className="mx-auto my-2 text-vermilion" aria-hidden="true" />
                        <p className="text-sm font-semibold text-ink">{f.maxText}°</p>
                        <p className="text-xs text-mute">{f.minText}°</p>
                        {f.popText !== '' && Number(f.pop) >= 20 ? (
                          <p className="mt-1 flex items-center justify-center gap-0.5 text-xs text-ink-soft">
                            <Droplets size={11} aria-hidden="true" />{f.popText}%
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        ) : (
          <p className="mt-3 text-base text-mute">{failed ? (t.a5_wxUnavailable || 'Weather unavailable') : (t.tb_loading || 'Loading…')}</p>
        )}
      </div>
    </div>
  );
};

export default TimeWeather;
