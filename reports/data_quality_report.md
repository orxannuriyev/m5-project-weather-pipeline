# 🧾 Data Quality Report

> **Last Updated:** 2026-04-28  
> **Pipeline Version:** Incremental / Full (dual-mode)  
> **Database:** DuckDB (`data/weather_pipeline.duckdb`)

---

## 1. Data Overview

| Metric | Value |
|--------|-------|
| **Source API** | Open-Meteo (Historical Archive + Forecast) |
| **Cities** | Zerdab, Quba, Lenkeran, Baki, Saatli |
| **Historical window** | Rolling last 10 days (config-driven) |
| **Forecast window** | 14 days ahead |
| **Total raw records** | 120 (24 per city) |
| **Historical records** | 50 (10 per city) |
| **Forecast records** | 70 (14 per city) |
| **Date range** | 2026-04-18 → 2026-05-11 |
| **Raw variables** | 12 weather features + `city`, `date`, `data_type` |

### Weather Variables Ingested

| # | Variable | Unit |
|---|----------|------|
| 1 | `temperature_2m_mean` | °C |
| 2 | `et0_fao_evapotranspiration_sum` | mm |
| 3 | `sunshine_duration` | seconds |
| 4 | `shortwave_radiation_sum` | MJ/m² |
| 5 | `relative_humidity_2m_mean` | % |
| 6 | `surface_pressure_mean` | hPa |
| 7 | `precipitation_sum` | mm |
| 8 | `precipitation_hours` | hours |
| 9 | `wind_speed_10m_max` | km/h |
| 10 | `cloud_cover_mean` | % |
| 11 | `wind_gusts_10m_mean` | km/h |
| 12 | `soil_moisture_0_to_7cm_mean` | m³/m³ |

---

## 2. Pipeline Architecture (Three-Layer)

```
Ingestion → raw.weather_daily → Cleaning → staging.weather_daily → Features → analytics.weather_features
```

| Layer | Table | Rows | Purpose |
|-------|-------|------|---------|
| **Raw** | `raw.weather_daily` | 120 | Untouched ingested data (historical + forecast) |
| **Staging** | `staging.weather_daily` | 120 | Deduplicated & cleaned data |
| **Analytics** | `analytics.weather_features` | 120 | Engineered features ready for modeling |

---

## 3. Cleaning Steps Applied

| Step | Description |
|------|-------------|
| **Deduplication** | Duplicate `(city, date)` pairs removed — keeps the latest record per pair via `drop_duplicates(subset=['city', 'date'], keep='last')`. |
| **Forward Fill (ffill)** | Applied to all non-target columns to handle NaN values, since weather variables change slowly over time. |
| **Soil Moisture Preserved** | NaN values in `soil_moisture_0_to_7cm_mean` are intentionally left untouched — this is the **target variable** and is expected to be null for forecast rows. |
| **Outlier Retention** | Outliers are **not** removed. They may serve as informative features or anomaly flags during the modeling stage. |

---

## 4. Missing Value Summary

### Staging Layer

| Column | Null Ratio | Note |
|--------|-----------|------|
| `soil_moisture_0_to_7cm_mean` | **58.33%** | Expected — forecast rows have no ground-truth soil moisture |
| All other columns | **0%** | Fully populated after ffill |

### Analytics Layer

| Column | Null Ratio | Note |
|--------|-----------|------|
| `soil_moisture_0_to_7cm_mean` | 58.33% | Inherited from staging (target variable) |
| `prev_soil_moisture` | 58.33% | Lag-1 of soil moisture — inherits the same NaN pattern |
| All other columns | 0% | Fully populated |

---

## 5. Engineered Features

| Feature | Formula / Logic | Purpose |
|---------|----------------|---------|
| `day_of_year` | `date.dt.dayofyear` | Captures seasonality patterns |
| `precip_sum_7d` | 7-day rolling sum of `precipitation_sum` (per city) | Cumulative precipitation effect on soil |
| `prev_soil_moisture` | Lag-1 of `soil_moisture_0_to_7cm_mean` (per city) | Models the inertial behavior of soil moisture |
| `precip_squared` | `precipitation_sum ** 2` | Captures non-linear heavy-rain saturation effects |

---

## 6. Date Continuity & Gaps

- **No date gaps detected** for any of the 5 cities.
- Each city has a continuous daily series from 2026-04-18 to 2026-05-11.
- Repetitions in `precipitation_hours` and `precipitation_sum` are considered normal weather data behavior rather than data errors.

---

## 7. Automated Quality Gates

The pipeline runs 6 automated checks after every execution (`quality_checks.py`):

| # | Check | Stage | Threshold |
|---|-------|-------|-----------|
| 1 | Row count > 0 | Raw | FAIL if 0 rows |
| 2 | Null ratio < 5% (excl. soil moisture) | Staging | WARN if any non-target column ≥ 5% null |
| 3 | No date gaps > 3 days | Staging | WARN if max gap > 3 days |
| 4 | Temperature range [−50, 60] °C | Staging | WARN if out-of-range rows found |
| 5 | Feature completeness | Analytics | WARN if any of the 4 engineered features missing |
| 6 | Data freshness (≤ 2 days old) | Raw | WARN if latest data older than 2 days |

---

## 8. Pipeline Modes

| Mode | Behavior |
|------|----------|
| **Full** (`--mode full`) | Re-ingests all data from scratch; truncates and reloads all layers |
| **Incremental** (`--mode incremental`) | Fetches only new historical data since last run; always refreshes 14-day forecast; removes stale forecast rows before appending |

---

## 9. Data Storage

| Location | Format | Contents |
|----------|--------|----------|
| `data/raw/*.parquet` | Apache Parquet | Per-city raw data files (≈11 KB each) |
| `data/weather_pipeline.duckdb` | DuckDB | Multi-schema analytical database (≈2.1 MB) |
