/**
 * Sunrise and sunset for a calendar day, worked out from the date and the place
 * (NOAA "general solar position" equations, sunrise when the sun's top edge meets
 * the horizon). Checked against Open-Meteo's astronomy data for Kathmandu across
 * the year: within two minutes.
 *
 * Used instead of the sunrise/sunset the published patro lists, which drift by
 * 20-35 minutes in the autumn (for 5 Oct 2026 it says 05:38 / 18:19; the sun
 * rises at about 05:58 and sets at about 17:45).
 *
 * Returns { sunrise: 'HH:MM', sunset: 'HH:MM' } in local clock time, or null where the
 * sun does not rise or set that day. Defaults are Kathmandu (UTC+5:45, no daylight saving).
 */

const RAD = Math.PI / 180;
export const KATHMANDU = { lat: 27.7172, lon: 85.324, tz: 5.75 };

const clock = (minutes) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const sunTimes = (year, month, day, { lat, lon, tz } = KATHMANDU) => {
  const dayOfYear = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const yearLength = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  const g = ((2 * Math.PI) / yearLength) * (dayOfYear - 1); // fractional year, taken at local noon

  const equationOfTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const declination =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);

  const cosHourAngle =
    Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(declination)) - Math.tan(lat * RAD) * Math.tan(declination);
  if (!Number.isFinite(cosHourAngle) || cosHourAngle > 1 || cosHourAngle < -1) return null;

  const hourAngle = Math.acos(cosHourAngle) / RAD;
  const offset = tz * 60;
  return {
    sunrise: clock(720 - 4 * (lon + hourAngle) - equationOfTime + offset),
    sunset: clock(720 - 4 * (lon - hourAngle) - equationOfTime + offset),
  };
};
