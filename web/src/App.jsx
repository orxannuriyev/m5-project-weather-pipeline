import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line,
} from 'recharts';
import {
  Droplets, Thermometer, CloudRain, Leaf, MapPin, Activity,
  ChevronDown, TrendingUp, Sprout, Sun, Wind, Wifi, WifiOff,
} from 'lucide-react';
import {
  CITY_PROFILES, CITY_KEYS, getSoilHealthStatus, simulateModelPrediction,
} from './mockData';
import { fetchCityForecast, parseApiResponse } from './api';


// ── Tooltip Formatter ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-agro-800/30 bg-surface-card/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-1.5 text-xs font-medium text-agro-400">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="font-semibold text-white">{entry.value}{entry.unit || ''}</span>
        </div>
      ))}
    </div>
  );
}

// ── Status Card ───────────────────────────────────────────────────
function StatusCard({ icon: Icon, label, value, unit, trend, color, delay }) {
  return (
    <div className={`glass-card group relative overflow-hidden p-5 ${delay}`}>
      {/* Glow accent */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5">
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-agro-400">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-white">
        {value}
        <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

// ── Soil Health Indicator ─────────────────────────────────────────
function SoilHealthIndicator({ status }) {
  const colors = {
    green: { bg: 'rgba(16,185,95,0.08)', border: 'rgba(16,185,95,0.2)', text: '#34d37f', dot: '#10b95f' },
    yellow: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)', text: '#facc15', dot: '#eab308' },
    red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#f87171', dot: '#ef4444' },
  };
  const c = colors[status.color];

  return (
    <div
      className="glass-card animate-fade-in-up-delay-4 flex items-start gap-4 p-5"
      style={{ borderColor: c.border }}
    >
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <Activity className="h-5 w-5" style={{ color: c.text }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-sm font-semibold text-white">Soil Health Status</p>
          <span
            className="status-badge"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
          >
            <span className="animate-breathe inline-block h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
            {status.level}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-400">{status.message}</p>
      </div>
    </div>
  );
}

// ── City Selector ─────────────────────────────────────────────────
function CitySelector({ selectedCity, onChange }) {
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-agro-400" />
      <select
        id="city-selector"
        value={selectedCity}
        onChange={(e) => onChange(e.target.value)}
        className="custom-select w-full cursor-pointer rounded-xl border border-agro-800/30 bg-surface-card py-3 pl-11 pr-10 text-sm font-medium text-white outline-none transition-all hover:border-agro-600/40 focus:border-agro-500 focus:ring-1 focus:ring-agro-500/30 md:w-56"
      >
        {CITY_KEYS.map((key) => (
          <option key={key} value={key} className="bg-surface-card text-white">
            {CITY_PROFILES[key].label} — {CITY_PROFILES[key].climate}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── City Info Banner ──────────────────────────────────────────────
function CityInfoBanner({ profile }) {
  return (
    <div className="glass-card animate-fade-in-up flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-agro-500/10 ring-1 ring-agro-500/20">
          <Sprout className="h-5 w-5 text-agro-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{profile.label}</h2>
          <p className="text-xs text-gray-400">{profile.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg border border-agro-800/30 bg-agro-950/50 px-3 py-1.5 text-agro-300">
          <Sun className="mr-1 inline h-3 w-3" />{profile.climate}
        </span>
        <span className="rounded-lg border border-earth-700/30 bg-earth-900/50 px-3 py-1.5 text-earth-300">
          <Leaf className="mr-1 inline h-3 w-3" />{profile.cropFocus}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-gray-400">
          <MapPin className="mr-1 inline h-3 w-3" />{profile.lat.toFixed(2)}°N, {profile.lon.toFixed(2)}°E
        </span>
      </div>
    </div>
  );
}

// ── Forecast Table ────────────────────────────────────────────────
function ForecastTable({ forecast }) {
  return (
    <div className="glass-card animate-fade-in-up-delay-3 overflow-hidden">
      <div className="border-b border-white/5 px-5 py-4">
        <h3 className="text-sm font-semibold text-white">14-Day Detailed Forecast</h3>
        <p className="mt-0.5 text-xs text-gray-500">Model: XGBoost (soil_moisture_0_to_7cm)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3 font-medium">Day</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Temp (°C)</th>
              <th className="px-5 py-3 font-medium">Moisture (%)</th>
              <th className="px-5 py-3 font-medium">Humidity (%)</th>
              <th className="px-5 py-3 font-medium">Rain (mm)</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((row) => {
              const s = getSoilHealthStatus(row.soilMoisturePercent);
              const dotColor = s.color === 'green' ? '#10b95f' : s.color === 'yellow' ? '#eab308' : '#ef4444';
              return (
                <tr key={row.day} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-2.5 font-mono text-gray-400">{String(row.day).padStart(2, '0')}</td>
                  <td className="px-5 py-2.5 text-white">{row.dateLabel}</td>
                  <td className="px-5 py-2.5 text-orange-300">{row.temperature}°</td>
                  <td className="px-5 py-2.5 font-semibold text-agro-300">{row.soilMoisturePercent}%</td>
                  <td className="px-5 py-2.5 text-sky-300">{row.humidity}%</td>
                  <td className="px-5 py-2.5 text-blue-300">{row.precipitation}</td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
                      <span className="text-xs text-gray-400">{s.level}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [selectedCity, setSelectedCity] = useState('Baku');
  const [time, setTime] = useState(new Date());
  const [liveData, setLiveData] = useState(null);   // Live API response
  const [isLive, setIsLive] = useState(false);       // Whether using live data
  const [loading, setLoading] = useState(true);
  const [dynamicPredictions, setDynamicPredictions] = useState(null);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch live API weather data
  useEffect(() => {
    fetch('/predictions.json')
      .then((res) => {
        if (!res.ok) throw new Error('No predictions.json found');
        return res.json();
      })
      .then((data) => setDynamicPredictions(data))
      .catch(() => console.log('Using hardcoded fallback predictions.'));
  }, []);

  // Fetch live data from Open-Meteo when city changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCityForecast(selectedCity).then((apiData) => {
      if (cancelled) return;
      if (apiData && apiData.daily) {
        setLiveData(parseApiResponse(apiData));
        setIsLive(true);
      } else {
        setLiveData(null);
        setIsLive(false);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedCity]);

  // Simulated soil moisture (always from mock — XGBoost simulation)
  const { forecast: mockForecast, current: mockCurrent, modelName, profile } = useMemo(
    () => simulateModelPrediction(selectedCity, dynamicPredictions),
    [selectedCity, dynamicPredictions],
  );

  // Merge: real temp/humidity/precip from API + simulated soil moisture from mock
  const forecast = useMemo(() => {
    if (!liveData) return mockForecast;

    return mockForecast.map((row, i) => {
      if (i >= liveData.temperature.length) return row;
      return {
        ...row,
        temperature: Math.round(liveData.temperature[i] * 10) / 10,
        humidity: Math.round(liveData.humidity[i] * 10) / 10,
        precipitation: Math.round((liveData.precipitation[i] || 0) * 10) / 10,
        dateLabel: liveData.dateLabels[i] || row.dateLabel,
        date: liveData.dates[i] || row.date,
        // soil moisture stays from XGBoost simulation
      };
    });
  }, [mockForecast, liveData]);

  // Current values = day 0 (with safety for empty forecast)
  const current = useMemo(() => {
    const day0 = forecast[0] || {};
    return {
      temperature: day0.temperature ?? 0,
      humidity: day0.humidity ?? 0,
      precipitation: day0.precipitation ?? 0,
      soilMoisture: day0.soilMoisture ?? 0,
      soilMoisturePercent: day0.soilMoisturePercent ?? 0,
    };
  }, [forecast]);

  const healthStatus = useMemo(
    () => getSoilHealthStatus(current.soilMoisturePercent),
    [current.soilMoisturePercent],
  );

  // Average 14-day moisture for trend label
  const avgMoisture = useMemo(
    () => (forecast.reduce((s, d) => s + d.soilMoisturePercent, 0) / forecast.length).toFixed(1),
    [forecast],
  );

  return (
    <div className="min-h-screen pb-12">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-surface-primary/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-agro-500/15 ring-1 ring-agro-500/25 animate-pulse-glow">
              <Leaf className="h-5 w-5 text-agro-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Soil<span className="text-agro-400">Sense</span>
              </h1>
              <p className="text-[11px] text-gray-500">Agricultural Monitoring · Azerbaijan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CitySelector selectedCity={selectedCity} onChange={setSelectedCity} />
            <div className="hidden items-center gap-2 rounded-xl border border-white/5 bg-surface-card px-3 py-2 text-xs text-gray-500 md:flex">
              {isLive ? (
                <Wifi className="h-3 w-3 text-agro-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-yellow-500" />
              )}
              <span className={isLive ? 'text-agro-400' : 'text-yellow-500'}>
                {isLive ? 'Live' : 'Offline'}
              </span>
              <span className="text-gray-600">·</span>
              <span className="font-mono text-agro-400">{modelName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-6 sm:px-6">
        {/* City Info */}
        <CityInfoBanner profile={profile} />

        {/* Status Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            icon={Thermometer}
            label="Temperature"
            value={current.temperature}
            unit="°C"
            color="#fb923c"
            trend={current.temperature > 25 ? 'Warm' : 'Moderate'}
            delay="animate-fade-in-up-delay-1"
          />
          <StatusCard
            icon={Droplets}
            label="Soil Moisture"
            value={current.soilMoisturePercent}
            unit="%"
            color="#34d37f"
            trend={`Avg ${avgMoisture}%`}
            delay="animate-fade-in-up-delay-2"
          />
          <StatusCard
            icon={Wind}
            label="Humidity"
            value={current.humidity}
            unit="%"
            color="#60a5fa"
            trend={current.humidity > 70 ? 'Humid' : 'Normal'}
            delay="animate-fade-in-up-delay-3"
          />
          <StatusCard
            icon={CloudRain}
            label="Precipitation"
            value={current.precipitation}
            unit="mm"
            color="#a78bfa"
            trend={current.precipitation > 0 ? 'Rain' : 'Dry'}
            delay="animate-fade-in-up-delay-4"
          />
        </div>

        {/* Soil Health */}
        <SoilHealthIndicator status={healthStatus} />

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Moisture Forecast */}
          <div className="glass-card animate-fade-in-up-delay-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Soil Moisture Forecast</h3>
                <p className="text-xs text-gray-500">14-day prediction · {modelName}</p>
              </div>
              <div className="rounded-lg border border-agro-800/30 bg-agro-950/40 px-2.5 py-1 text-xs font-medium text-agro-400">
                m³/m³
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b95f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b95f" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="soilMoisturePercent"
                  name="Moisture"
                  stroke="#10b95f"
                  strokeWidth={2.5}
                  fill="url(#moistureGrad)"
                  dot={{ fill: '#10b95f', stroke: '#0a0f0d', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#34d37f', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature + Humidity Combo */}
          <div className="glass-card animate-fade-in-up-delay-3 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Temperature & Humidity</h3>
                <p className="text-xs text-gray-500">14-day trend comparison</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#9ca3af', paddingTop: '8px' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#fb923c"
                  strokeWidth={2}
                  fill="url(#tempGrad)"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: '#60a5fa', stroke: '#0a0f0d', strokeWidth: 2, r: 2.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Precipitation Bar Chart */}
        <div className="glass-card animate-fade-in-up-delay-3 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Precipitation Forecast</h3>
            <p className="text-xs text-gray-500">Expected rainfall over the next 14 days</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="dateLabel" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="precipitation"
                name="Rain (mm)"
                fill="#a78bfa"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast Table */}
        <ForecastTable forecast={forecast} />

        {/* Footer */}
        <footer className="border-t border-white/5 pt-6 text-center text-xs text-gray-600">
          <p>
            <span className="font-semibold text-agro-500">SoilSense</span> — Developed by Team{' '}
            <span className="font-semibold text-earth-400">QUADRA COSMOS</span>
          </p>
          <p className="mt-1">
            Soil moisture predictions powered by XGBoost models · Data from Open-Meteo API
          </p>
          <p className="mt-1 text-gray-700">
            {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </footer>
      </main>
    </div>
  );
}
