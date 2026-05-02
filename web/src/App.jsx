import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line,
  ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  Droplets, Thermometer, CloudRain, Leaf, MapPin,
  TrendingUp, Sprout, Sun, Wind, Wifi, WifiOff,
  Wheat, Layers, AlertTriangle, CheckCircle, XCircle,
  Moon, Calendar, Mail, Send
} from 'lucide-react';
import {
  CITY_PROFILES, CITY_KEYS, simulateModelPrediction,
} from './mockData';
import { fetchCityForecast, parseApiResponse } from './api';
import {
  CITY_CROPS, CITY_SOILS, getMoistureThreshold, getIrrigationAdvice,
} from './cropData';

/* ── Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border shadow-xl p-3" style={{ backgroundColor: 'var(--tooltip-bg)', borderColor: 'var(--tooltip-border)' }}>
      <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{e.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{typeof e.value === 'number' ? e.value.toFixed(1) : e.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Status Card ── */
function StatusCard({ icon: Icon, label, value, unit, trend, color, delay, highlighted }) {
  return (
    <div className={`glass-card group relative overflow-hidden p-5 ${delay} ${highlighted ? 'border-[var(--accent)] shadow-[0_0_15px_var(--accent-light)]' : ''}`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]" style={{ background: color }} />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            <TrendingUp className="h-3 w-3" /><span>{trend}</span>
          </div>
        )}
      </div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className={`font-bold tracking-tight ${highlighted ? 'text-5xl my-2' : 'text-2xl'}`} style={{ color: 'var(--text-primary)' }}>
        {value}<span className="ml-1 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{unit}</span>
      </p>
    </div>
  );
}

/* ── Selector Component ── */
function Selector({ icon: Icon, label, value, onChange, options }) {
  return (
    <div className="glass-card p-4 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--accent)10', border: '1px solid var(--accent)20' }}>
          <Icon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="custom-select w-full cursor-pointer rounded-xl border py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition-all focus:ring-1"
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Irrigation Advice Card ── */
function IrrigationCard({ advice, threshold, moisturePercent }) {
  const colors = {
    green:  { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', text: '#16a34a', bar: '#22c55e' },
    yellow: { bg: 'rgba(202,138,4,0.08)', border: 'rgba(202,138,4,0.2)', text: '#b45309', bar: '#eab308' },
    red:    { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', text: '#dc2626', bar: '#ef4444' },
  };
  const c = colors[advice.color];
  const Icon = advice.color === 'green' ? CheckCircle : advice.color === 'red' ? XCircle : AlertTriangle;

  const range = threshold.max - threshold.min;
  const pos = Math.max(0, Math.min(100, ((moisturePercent - threshold.min) / range) * 100));
  const optLowPos = ((threshold.optLow - threshold.min) / range) * 100;
  const optHighPos = ((threshold.optHigh - threshold.min) / range) * 100;

  return (
    <div className="glass-card animate-fade-in-up-delay-3 p-6" style={{ borderColor: c.border }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className="h-6 w-6" style={{ color: c.text }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{advice.title}</h3>
            <span className="text-lg">{advice.icon}</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{advice.message}</p>
        </div>
      </div>

      {/* Moisture Gauge */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span>Dry ({threshold.min}%)</span>
          <span className="font-medium" style={{ color: 'var(--accent)' }}>Optimal ({threshold.optLow}–{threshold.optHigh}%)</span>
          <span>Wet ({threshold.max}%)</span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--gauge-bg)', borderColor: 'var(--gauge-border)' }}>
          <div className="absolute h-full bg-red-500/20" style={{ left: 0, width: `${optLowPos}%` }} />
          <div className="absolute h-full bg-green-500/30" style={{ left: `${optLowPos}%`, width: `${optHighPos - optLowPos}%` }} />
          <div className="absolute h-full bg-yellow-500/20" style={{ left: `${optHighPos}%`, width: `${100 - optHighPos}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-1.5 rounded-full shadow-lg transition-all duration-700"
            style={{ left: `${pos}%`, background: c.bar, boxShadow: `0 0 8px ${c.bar}` }}
          />
        </div>
        <div className="mt-1.5 text-center">
          <span className="text-xs font-mono font-bold" style={{ color: c.text }}>
            Current: {moisturePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Email Alerts Card ── */
function EmailAlerts({ crop, city, soil, current, advice, forecast }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const forecastHtml = forecast.map(f => {
        const adv = getIrrigationAdvice(f.soilMoisturePercent, crop, soil);
        const dotColor = adv.color === 'green' ? '#10b95f' : adv.color === 'yellow' ? '#eab308' : '#ef4444';
        const statusText = adv.title.split(' — ')[0].split(' ').slice(0,2).join(' ');
        
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; color: #374151;">${f.dateLabel}</td>
            <td style="padding: 10px; font-weight: bold; color: #059669;">${f.soilMoisturePercent}%</td>
            <td style="padding: 10px; color: #374151;"><span style="color: ${dotColor};">●</span> ${statusText}</td>
          </tr>
        `;
      }).join('');

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: 'service_5eqrusg',
          template_id: 'template_53f5zxe',
          user_id: 'POaEN85nMzzbga4vA',
          template_params: {
            user_email: email,
            city: city,
            crop: crop,
            moisture: current?.soilMoisturePercent || 0,
            temp: current?.temperature || 0,
            advice: advice?.message || 'Check dashboard for details.',
            forecast_html: forecastHtml
          }
        })
      });

      if (response.ok) {
        setLoading(false);
        setSubscribed(true);
        setTimeout(() => setSubscribed(false), 5000); // Reset UI after 5s
        setEmail('');
      } else {
        const errText = await response.text();
        throw new Error(errText);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      setLoading(false);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="glass-card animate-fade-in-up-delay-4 p-6 flex flex-col justify-center h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent)10', border: '1px solid var(--accent)20' }}>
          <Mail className="h-6 w-6" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Irrigation Alerts</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Get notified when {crop} in {city} needs water.</p>
        </div>
      </div>
      
      {subscribed ? (
        <div className="rounded-xl p-4 flex items-center gap-3 animate-fade-in-up" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Alerts enabled! We'll email you when irrigation is needed.</span>
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
          <input 
            type="email" 
            placeholder="Enter your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-1"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Subscribing...' : (
              <>
                <span>Enable Alerts</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/* ── Forecast Table ── */
function ForecastTable({ forecast, threshold, crop, soil }) {
  return (
    <div className="glass-card animate-fade-in-up-delay-3 overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--card-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>14-Day Detailed Forecast</h3>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>Model: XGBoost · {crop} on {soil} soil · Optimal: {threshold.optLow}–{threshold.optHigh}%</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--table-border)', color: 'var(--text-muted)' }}>
              <th className="px-5 py-3 font-medium">Day</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Temp (°C)</th>
              <th className="px-5 py-3 font-medium">Moisture (%)</th>
              <th className="px-5 py-3 font-medium">Rain (mm)</th>
              <th className="px-5 py-3 font-medium">Irrigation</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((row) => {
              const adv = getIrrigationAdvice(row.soilMoisturePercent, crop, soil);
              const dotColor = adv.color === 'green' ? '#10b95f' : adv.color === 'yellow' ? '#eab308' : '#ef4444';
              return (
                <tr key={row.day} className="border-b transition-colors hover:bg-gray-50/50 dark:hover:bg-white/5" style={{ borderColor: 'var(--table-border)' }}>
                  <td className="px-5 py-2.5 font-mono" style={{ color: 'var(--text-muted)' }}>{String(row.day).padStart(2, '0')}</td>
                  <td className="px-5 py-2.5" style={{ color: 'var(--text-primary)' }}>{row.dateLabel}</td>
                  <td className="px-5 py-2.5 text-orange-500">{row.temperature}°</td>
                  <td className="px-5 py-2.5 font-semibold" style={{ color: 'var(--accent)' }}>{row.soilMoisturePercent}%</td>
                  <td className="px-5 py-2.5 text-blue-500">{row.precipitation}</td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{adv.title.split(' — ')[0].split(' ').slice(0,2).join(' ')}</span>
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

/* ══════════════════════════════════════════════════════════ */
/* ══ MAIN APP ══ */
/* ══════════════════════════════════════════════════════════ */
export default function App() {
  const [selectedCity, setSelectedCity] = useState('Baku');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedSoil, setSelectedSoil] = useState('');
  const [time, setTime] = useState(new Date());
  const [liveData, setLiveData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [dynamicPredictions, setDynamicPredictions] = useState(null);
  
  // Try to load user theme preference, default to false (light)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Load predictions
  useEffect(() => {
    fetch('/predictions.json')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setDynamicPredictions)
      .catch(() => console.log('Using fallback predictions.'));
  }, []);

  // Auto-set crop/soil when city changes
  useEffect(() => {
    const crops = CITY_CROPS[selectedCity] || [];
    const soils = CITY_SOILS[selectedCity] || [];
    setSelectedCrop(crops[0] || 'Wheat');
    setSelectedSoil(soils[0] || 'Loamy');
  }, [selectedCity]);

  // Live weather
  useEffect(() => {
    let cancelled = false;
    fetchCityForecast(selectedCity).then((apiData) => {
      if (cancelled) return;
      if (apiData?.daily) {
        setLiveData(parseApiResponse(apiData));
        setIsLive(true);
      } else {
        setLiveData(null);
        setIsLive(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedCity]);

  // Model predictions
  const { forecast: mockForecast, modelName, profile } = useMemo(
    () => simulateModelPrediction(selectedCity, dynamicPredictions),
    [selectedCity, dynamicPredictions],
  );

  // Merge live weather + model moisture
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
      };
    });
  }, [mockForecast, liveData]);

  const current = forecast[0] || {};
  const threshold = getMoistureThreshold(selectedCrop, selectedSoil);
  const advice = getIrrigationAdvice(current.soilMoisturePercent || 0, selectedCrop, selectedSoil);
  const avgMoisture = (forecast.reduce((s, d) => s + d.soilMoisturePercent, 0) / forecast.length).toFixed(1);

  const daysNeedingWater = forecast.filter(d => {
    const a = getIrrigationAdvice(d.soilMoisturePercent, selectedCrop, selectedSoil);
    return a.color === 'red' || a.status === 'needs_water';
  }).length;

  const availableCrops = CITY_CROPS[selectedCity] || ['Wheat'];
  const availableSoils = CITY_SOILS[selectedCity] || ['Loamy'];

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl animate-pulse-glow" style={{ backgroundColor: 'var(--accent)15', border: '1px solid var(--accent)25' }}>
              <Leaf className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Quadro<span style={{ color: 'var(--accent)' }}>Sense</span>
              </h1>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Smart Irrigation Advisory</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date */}
            <div className="hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:flex" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-secondary)' }}>
              <Calendar className="h-3 w-3" style={{ color: 'var(--accent)' }} />
              <span>{time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
            {/* Connection Status */}
            <div className="hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs md:flex" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-secondary)' }}>
              {isLive ? <Wifi className="h-3 w-3" style={{ color: 'var(--accent)' }} /> : <WifiOff className="h-3 w-3 text-amber-500" />}
              <span className={isLive ? '' : 'text-amber-500'} style={{ color: isLive ? 'var(--accent)' : undefined }}>{isLive ? 'Live' : 'Offline'}</span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>{modelName}</span>
            </div>
            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-secondary)' }}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl space-y-5 px-4 pt-6 sm:px-6">

        {/* ── Selection Row: City → Crop → Soil ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Selector icon={MapPin} label="Select City" value={selectedCity} onChange={setSelectedCity} options={CITY_KEYS} />
          <Selector icon={Wheat} label="Crop Type" value={selectedCrop} onChange={setSelectedCrop} options={availableCrops} />
          <Selector icon={Layers} label="Soil Type" value={selectedSoil} onChange={setSelectedSoil} options={availableSoils} />
        </div>

        {/* ── Hero Soil Moisture Focus & City Info ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main Soil Moisture Focus Card */}
          <div className="lg:col-span-2">
            <StatusCard 
              icon={Droplets} 
              label="Predicted Soil Moisture" 
              value={current.soilMoisturePercent} 
              unit="%" 
              color="#22c55e" 
              trend={`Avg ${avgMoisture}% next 14 days`} 
              delay="animate-fade-in-up-delay-1" 
              highlighted={true}
            />
          </div>
          <div className="glass-card animate-fade-in-up flex flex-col justify-center p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--accent)10', border: '1px solid var(--accent)20' }}>
                <Sprout className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{profile.label}</h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--accent)30', backgroundColor: 'var(--accent)10', color: 'var(--accent)' }}>
                <Sun className="mr-1 inline h-3 w-3" />{profile.climate}
              </span>
              <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--text-muted)30', backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                <Leaf className="mr-1 inline h-3 w-3" />{selectedCrop}
              </span>
              <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--text-muted)30', backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                <Layers className="mr-1 inline h-3 w-3" />{selectedSoil} soil
              </span>
            </div>
          </div>
        </div>

        {/* ── Advice & Alerts ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IrrigationCard advice={advice} threshold={threshold} moisturePercent={current.soilMoisturePercent || 0} />
          </div>
          <div>
            <EmailAlerts crop={selectedCrop} city={selectedCity} soil={selectedSoil} current={current} advice={advice} forecast={forecast} />
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Moisture Forecast with optimal zone */}
          <div className="glass-card animate-fade-in-up-delay-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Soil Moisture Forecast</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>14-day · Optimal zone highlighted</p>
              </div>
              <div className="rounded-lg border px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--accent)10', borderColor: 'var(--accent)30', color: 'var(--accent)' }}>
                {selectedCrop} / {selectedSoil}
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceArea y1={threshold.optLow} y2={threshold.optHigh} fill="#10b95f" fillOpacity={0.08} stroke="#10b95f" strokeOpacity={0.2} strokeDasharray="3 3" />
                <ReferenceLine y={threshold.optLow} stroke="#10b95f" strokeDasharray="4 4" strokeOpacity={0.4} />
                <ReferenceLine y={threshold.optHigh} stroke="#10b95f" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="soilMoisturePercent" name="Moisture (%)" stroke="#10b95f" strokeWidth={2.5} fill="url(#moistureGrad)" dot={{ fill: '#10b95f', stroke: 'var(--card-bg)', strokeWidth: 2, r: 3 }} activeDot={{ r: 5, fill: '#34d37f', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature + Humidity */}
          <div className="glass-card animate-fade-in-up-delay-3 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Temperature & Humidity</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>14-day trend comparison</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs><linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.25} /><stop offset="100%" stopColor="#fb923c" stopOpacity={0.0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '8px' }} />
                <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#fb923c" strokeWidth={2} fill="url(#tempGrad)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', stroke: 'var(--card-bg)', strokeWidth: 2, r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Additional Weather Stats ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatusCard icon={Thermometer} label="Temperature" value={current.temperature} unit="°C" color="#fb923c" trend={current.temperature > 25 ? 'Warm' : 'Moderate'} delay="animate-fade-in-up-delay-2" />
          <StatusCard icon={Wind} label="Humidity" value={current.humidity} unit="%" color="#60a5fa" trend={current.humidity > 70 ? 'Humid' : 'Normal'} delay="animate-fade-in-up-delay-3" />
          <StatusCard icon={CloudRain} label="Precipitation" value={current.precipitation} unit="mm" color="#a78bfa" trend={daysNeedingWater > 0 ? `${daysNeedingWater} days need 💧` : 'All optimal'} delay="animate-fade-in-up-delay-4" />
        </div>

        {/* Forecast Table */}
        <ForecastTable forecast={forecast} threshold={threshold} crop={selectedCrop} soil={selectedSoil} />

        {/* Footer */}
        <footer className="border-t pt-6 text-center text-xs" style={{ borderColor: 'var(--footer-border)', color: 'var(--text-secondary)' }}>
          <p><span className="font-semibold" style={{ color: 'var(--accent)' }}>QuadroSense</span> — Developed by Team <span className="font-semibold" style={{ color: 'var(--accent)' }}>QUADRA COSMOS</span></p>
          <p className="mt-1">Soil moisture predictions powered by XGBoost models · Crop thresholds from agronomic datasets · Weather from Open-Meteo API</p>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </footer>
      </main>
    </div>
  );
}
