/**
 * Crop & Soil moisture thresholds derived from docs/data_core.csv
 * Optimal range = mean ± 10% (practical agronomic window)
 */

export const SOIL_TYPES = ['Sandy', 'Loamy', 'Clayey', 'Black', 'Red'];

export const CROP_TYPES = [
  'Barley', 'Cotton', 'Ground Nuts', 'Maize', 'Millets',
  'Oil seeds', 'Paddy', 'Pulses', 'Sugarcane', 'Tobacco', 'Wheat',
];

// City → typical crops grown in that region
export const CITY_CROPS = {
  Baku:     ['Barley', 'Wheat', 'Cotton', 'Maize'],
  Saatli:   ['Cotton', 'Wheat', 'Barley', 'Maize', 'Sugarcane'],
  Lenkeran: ['Sugarcane', 'Paddy', 'Wheat', 'Maize', 'Ground Nuts'],
  Zerdab:   ['Wheat', 'Barley', 'Cotton', 'Maize', 'Pulses', 'Oil seeds'],
  Quba:     ['Barley', 'Wheat', 'Maize', 'Pulses', 'Ground Nuts', 'Millets'],
};

// City → typical soil types
export const CITY_SOILS = {
  Baku:     ['Sandy', 'Loamy'],
  Saatli:   ['Clayey', 'Loamy', 'Black'],
  Lenkeran: ['Red', 'Loamy', 'Clayey'],
  Zerdab:   ['Loamy', 'Sandy', 'Black'],
  Quba:     ['Black', 'Loamy', 'Red'],
};

// Optimal moisture ranges (%) per crop+soil from dataset analysis
// Thresholds adjusted -7% to match sensor-level volumetric readings
const RAW_THRESHOLDS = {
  'Barley|Sandy':   { min: 15, optLow: 28, optHigh: 45, max: 63 },
  'Barley|Loamy':   { min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Barley|Clayey':  { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Barley|Black':   { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Barley|Red':     { min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Cotton|Sandy':   { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Cotton|Loamy':   { min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Cotton|Clayey':  { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Cotton|Black':   { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Cotton|Red':     { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Ground Nuts|Sandy': { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Ground Nuts|Loamy': { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Ground Nuts|Clayey':{ min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Ground Nuts|Black': { min: 13, optLow: 28, optHigh: 47, max: 63 },
  'Ground Nuts|Red':   { min: 14, optLow: 27, optHigh: 45, max: 63 },
  'Maize|Sandy':   { min: 13, optLow: 31, optHigh: 49, max: 63 },
  'Maize|Loamy':   { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Maize|Clayey':  { min: 13, optLow: 29, optHigh: 46, max: 63 },
  'Maize|Black':   { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Maize|Red':     { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Millets|Sandy':  { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Millets|Loamy':  { min: 13, optLow: 28, optHigh: 45, max: 63 },
  'Millets|Clayey': { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Millets|Black':  { min: 13, optLow: 28, optHigh: 46, max: 62 },
  'Millets|Red':    { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Oil seeds|Sandy': { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Oil seeds|Loamy': { min: 13, optLow: 26, optHigh: 45, max: 63 },
  'Oil seeds|Clayey':{ min: 13, optLow: 29, optHigh: 48, max: 63 },
  'Oil seeds|Black': { min: 13, optLow: 26, optHigh: 45, max: 63 },
  'Oil seeds|Red':   { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Paddy|Sandy':   { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Paddy|Loamy':   { min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Paddy|Clayey':  { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Paddy|Black':   { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Paddy|Red':     { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Pulses|Sandy':  { min: 13, optLow: 27, optHigh: 44, max: 63 },
  'Pulses|Loamy':  { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Pulses|Clayey': { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Pulses|Black':  { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Pulses|Red':    { min: 13, optLow: 25, optHigh: 43, max: 63 },
  'Sugarcane|Sandy': { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Sugarcane|Loamy': { min: 13, optLow: 27, optHigh: 46, max: 63 },
  'Sugarcane|Clayey':{ min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Sugarcane|Black': { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Sugarcane|Red':   { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Tobacco|Sandy':  { min: 13, optLow: 29, optHigh: 48, max: 63 },
  'Tobacco|Loamy':  { min: 13, optLow: 26, optHigh: 44, max: 63 },
  'Tobacco|Clayey': { min: 15, optLow: 29, optHigh: 47, max: 63 },
  'Tobacco|Black':  { min: 13, optLow: 29, optHigh: 47, max: 63 },
  'Tobacco|Red':    { min: 13, optLow: 28, optHigh: 47, max: 63 },
  'Wheat|Sandy':   { min: 13, optLow: 26, optHigh: 45, max: 63 },
  'Wheat|Loamy':   { min: 13, optLow: 28, optHigh: 46, max: 63 },
  'Wheat|Clayey':  { min: 13, optLow: 27, optHigh: 45, max: 63 },
  'Wheat|Black':   { min: 13, optLow: 28, optHigh: 47, max: 63 },
  'Wheat|Red':     { min: 13, optLow: 27, optHigh: 46, max: 63 },
};

/**
 * Get optimal moisture range for a crop+soil combination.
 * @returns {{ min, optLow, optHigh, max }} — all in % (e.g. 35 = 35%)
 */
export function getMoistureThreshold(crop, soil) {
  const key = `${crop}|${soil}`;
  return RAW_THRESHOLDS[key] || { min: 13, optLow: 28, optHigh: 45, max: 63 };
}

/**
 * Get irrigation recommendation based on predicted moisture vs crop needs.
 * @param {number} moisturePercent — predicted soil moisture in %
 * @param {string} crop
 * @param {string} soil
 * @returns {{ status, color, icon, title, message, urgency }}
 */
export function getIrrigationAdvice(moisturePercent, crop, soil) {
  const t = getMoistureThreshold(crop, soil);

  if (moisturePercent < t.min) {
    return {
      status: 'critical_dry',
      color: 'red',
      icon: '🚨',
      title: 'Immediate Irrigation Required',
      message: `Soil moisture (${moisturePercent}%) is critically below the minimum threshold (${t.min}%) for ${crop} on ${soil} soil. Irrigate immediately to prevent crop damage.`,
      urgency: 5,
    };
  }
  if (moisturePercent < t.optLow) {
    return {
      status: 'needs_water',
      color: 'yellow',
      icon: '💧',
      title: 'Irrigation Recommended',
      message: `Soil moisture (${moisturePercent}%) is below the optimal range (${t.optLow}–${t.optHigh}%) for ${crop} on ${soil} soil.`,
      urgency: 3,
    };
  }
  if (moisturePercent <= t.optHigh) {
    return {
      status: 'optimal',
      color: 'green',
      icon: '✅',
      title: 'No Irrigation Needed',
      message: `Soil moisture (${moisturePercent}%) is within the optimal range (${t.optLow}–${t.optHigh}%) for ${crop} on ${soil} soil. Conditions are ideal.`,
      urgency: 0,
    };
  }
  if (moisturePercent <= t.max) {
    return {
      status: 'too_wet',
      color: 'yellow',
      icon: '⚠️',
      title: 'Over-Saturated — Monitor Drainage',
      message: `Soil moisture (${moisturePercent}%) exceeds optimal range (${t.optLow}–${t.optHigh}%) for ${crop} on ${soil} soil. Hold irrigation and check drainage.`,
      urgency: 2,
    };
  }
  return {
    status: 'critical_wet',
    color: 'red',
    icon: '🌊',
    title: 'Critical — Waterlogged',
    message: `Soil moisture (${moisturePercent}%) is dangerously high for ${crop} on ${soil} soil. Risk of root rot. Ensure drainage immediately.`,
    urgency: 4,
  };
}
