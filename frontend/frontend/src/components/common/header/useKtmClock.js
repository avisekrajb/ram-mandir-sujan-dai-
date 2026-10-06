import { useEffect, useState } from 'react';
import {
  Cloud, CloudDrizzle, CloudFog, CloudHail, CloudLightning, CloudMoon, CloudRain, CloudRainWind,
  CloudSnow, CloudSun, Moon, Snowflake, Sun,
} from 'lucide-react';
import { adToBs, formatAdDate, formatBsDate, localDigits, WEEKDAYS } from '../../../utils/nepaliCalendar';
import usePatroToday from './usePatroToday';

// Kathmandu. Weather comes from Open-Meteo (free, no key, no personal data sent).
const KTM = { lat: 27.7172, lon: 85.324, tz: 'Asia/Kathmandu' };
const CACHE_KEY = 'rcmt:ktm-weather-v2';
const CACHE_MS = 20 * 60 * 1000;

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${KTM.lat}&longitude=${KTM.lon}` +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  `&forecast_days=5&timezone=${encodeURIComponent(KTM.tz)}`;

/**
 * WMO weather code -> { key, Icon }. `key` is the suffix of the tb_wx_* string.
 * At night a clear or mostly clear sky gets the moon; rain that is falling right
 * now (`precip` mm) wins over a "cloudy" code, which is what Open-Meteo reports
 * for the first minutes of a shower.
 */
export const conditionFor = (code, { isDay = true, precip = 0 } = {}) => {
  const wet = precip >= 0.1;
  if (code === 0) return wet ? { key: 'lightRain', Icon: CloudRain } : isDay ? { key: 'clear', Icon: Sun } : { key: 'clearNight', Icon: Moon };
  if (code === 1) return wet ? { key: 'lightRain', Icon: CloudRain } : isDay ? { key: 'mainly', Icon: CloudSun } : { key: 'mainlyNight', Icon: CloudMoon };
  if (code === 2) return wet ? { key: 'lightRain', Icon: CloudRain } : { key: 'partly', Icon: isDay ? CloudSun : CloudMoon };
  if (code === 3) return wet ? { key: 'lightRain', Icon: CloudRain } : { key: 'overcast', Icon: Cloud };
  if (code === 45 || code === 48) return { key: 'fog', Icon: CloudFog };
  if (code >= 51 && code <= 55) return { key: 'drizzle', Icon: CloudDrizzle };
  if (code === 56 || code === 57 || code === 66 || code === 67) return { key: 'freezing', Icon: CloudSnow };
  if (code === 61) return { key: 'lightRain', Icon: CloudRain };
  if (code === 63) return { key: 'rain', Icon: CloudRain };
  if (code === 65) return { key: 'heavyRain', Icon: CloudRainWind };
  if (code >= 71 && code <= 77) return { key: 'snow', Icon: Snowflake };
  if (code === 80 || code === 81) return { key: 'showers', Icon: CloudRain };
  if (code === 82) return { key: 'heavyRain', Icon: CloudRainWind };
  if (code === 85 || code === 86) return { key: 'snowShowers', Icon: CloudSnow };
  if (code === 96 || code === 99) return { key: 'hail', Icon: CloudHail };
  return { key: 'storm', Icon: CloudLightning };
};

/** The label for a condition, in the visitor's language. */
export const conditionLabel = (t, key) => t[`tb_wx_${key}`] || t[`a5_wx_${key}`] || key;

// ---------------------------------------------------------------------------
// weather: one request shared by every component that asks (top bar, menu, tools page)
// ---------------------------------------------------------------------------

const readCache = () => {
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
  } catch {
    return null;
  }
};

let pending = null;

const loadWeather = () => {
  if (pending) return pending;
  pending = fetch(WEATHER_URL)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather'))))
    .then((j) => {
      const c = j.current;
      const d = j.daily || {};
      const data = {
        temp: Math.round(c.temperature_2m),
        feels: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m),
        wind: Math.round(c.wind_speed_10m),
        isDay: c.is_day === 1,
        precip: Number(c.precipitation) || 0,
        code: c.weather_code,
        forecast: (d.time || []).map((date, i) => ({
          date,
          code: d.weather_code[i],
          max: Math.round(d.temperature_2m_max[i]),
          min: Math.round(d.temperature_2m_min[i]),
          pop: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
        })),
      };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch { /* storage blocked */ }
      return data;
    })
    .finally(() => { pending = null; });
  return pending;
};

// ---------------------------------------------------------------------------
// local words
// ---------------------------------------------------------------------------

// Nepali and Hindi say the part of the day before the hour ("साँझ ६:४०").
const PART_OF_DAY = {
  ne: ['राति', 'बिहान', 'दिउँसो', 'साँझ'],
  hi: ['रात', 'सुबह', 'दोपहर', 'शाम'],
};
const partOfDay = (hour) => (hour < 4 ? 0 : hour < 12 ? 1 : hour < 16 ? 2 : hour < 19 ? 3 : 0);

/**
 * Nepal time, today's date (weekday, BS and AD) and the current Kathmandu weather
 * with a five-day forecast, all localised to `lang`.
 */
const useKtmClock = (lang) => {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(() => readCache());
  const [failed, setFailed] = useState(false);
  // Today's published patro (BS date, tithi, sunrise, festivals); null until it loads.
  const patro = usePatroToday();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // Load once, and look again every 20 minutes while the page stays open.
  useEffect(() => {
    let alive = true;
    const load = () => loadWeather()
      .then((data) => { if (alive) { setWeather(data); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    if (!readCache()) load();
    const id = setInterval(load, CACHE_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const devanagari = lang === 'ne' || lang === 'hi';
  const digits = (v) => localDigits(v, lang);

  const fmt = (opts) => Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: KTM.tz, hourCycle: 'h23', ...opts }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const day = fmt({ year: 'numeric', month: 'numeric', day: 'numeric' });
  const clock = fmt({ hour: 'numeric', minute: '2-digit' });
  const hour24 = Number(clock.hour) % 24;
  const minute = clock.minute;

  const nepalDay = new Date(Number(day.year), Number(day.month) - 1, Number(day.day));
  // The patro's own BS date wins: the bundled table is a day out for the newest years.
  const todayKey = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
  const bs = patro && patro.key === todayKey ? patro.bs : adToBs(nepalDay);

  // time
  const hour12 = hour24 % 12 || 12;
  const time = devanagari
    ? `${PART_OF_DAY[lang][partOfDay(hour24)]} ${digits(hour12)}:${digits(minute)}`
    : `${hour12}:${minute} ${hour24 >= 12 ? 'PM' : 'AM'}`;

  // weekday and dates
  const weekday = (WEEKDAYS[lang] || WEEKDAYS.en)[nepalDay.getDay()];
  const bsText = formatBsDate(bs, lang);
  const bsShort = formatBsDate(bs, lang, true);
  const adText = formatAdDate({ year: Number(day.year), month: Number(day.month), day: Number(day.day) }, lang, true);

  const view = weather && {
    ...weather,
    tempText: digits(weather.temp),
    feelsText: digits(weather.feels),
    humidityText: digits(weather.humidity),
    windText: digits(weather.wind),
    cond: conditionFor(weather.code, { isDay: weather.isDay, precip: weather.precip }),
    forecast: (weather.forecast || []).map((f, i) => ({
      ...f,
      cond: conditionFor(f.code),
      maxText: digits(f.max),
      minText: digits(f.min),
      popText: f.pop == null ? '' : digits(f.pop),
      // the day name: null for today (the caller says "Today"), then the weekday of that date
      weekday: i === 0 ? null : (WEEKDAYS[lang] || WEEKDAYS.en)[new Date(`${f.date}T12:00:00`).getDay()],
    })),
  };

  return { time, weekday, bsText, bsShort, adText, weather: view, failed, digits, patro };
};

export default useKtmClock;
