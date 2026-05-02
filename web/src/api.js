/**
 * QuadroSense — Live Weather API (Open-Meteo)
 *
 * Fetches real 14-day temperature & humidity forecasts.
 * Soil moisture remains simulated (from XGBoost mock) since the
 * real predictions require the Python ML pipeline.
 *
 * Open-Meteo is free, no API key required — same source used
 * by the Python pipeline in src/config.py.
 */

import { CITY_PROFILES } from './mockData';

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch 14-day daily forecast from Open-Meteo for a given city.
 *
 * @param {string} cityKey — Key from CITY_PROFILES
 * @returns {Promise<{ daily: { time: string[], temperature_2m_mean: number[], relative_humidity_2m_mean: number[], precipitation_sum: number[] } } | null>}
 */
export async function fetchCityForecast(cityKey) {
  const profile = CITY_PROFILES[cityKey];
  if (!profile) return null;

  const params = new URLSearchParams({
    latitude: profile.lat,
    longitude: profile.lon,
    daily: [
      'temperature_2m_mean',
      'relative_humidity_2m_mean',
      'precipitation_sum',
    ].join(','),
    timezone: 'Asia/Baku',
    forecast_days: '14',
  });

  try {
    const res = await fetch(`${FORECAST_API}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[QuadroSense] Open-Meteo fetch failed for ${cityKey}:`, err.message);
    return null;
  }
}

/**
 * Parse the Open-Meteo response into the same shape used by the dashboard.
 *
 * @param {object} apiData — Raw Open-Meteo JSON
 * @returns {{ temperature: number[], humidity: number[], precipitation: number[], dates: string[], dateLabels: string[] }}
 */
export function parseApiResponse(apiData) {
  const d = apiData.daily;
  const dates = d.time;
  const dateLabels = dates.map((iso) => {
    const dt = new Date(iso + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return {
    dates,
    dateLabels,
    temperature: d.temperature_2m_mean,
    humidity: d.relative_humidity_2m_mean,
    precipitation: d.precipitation_sum,
  };
}
