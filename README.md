# QuadroSense

> **An end-to-end soil moisture predictor and analytical pipeline.**

## 🚀 Developed by Team **QUADRA COSMOS**

### Team Members

- **Orkhan Nuriyev** → Database Design & Pipeline Development, Web Development
- **Ibrahim Suleymanov** → Machine Learning Modelling, Statistical Analysis
- **Khalid Ahmadov** → Demo & Web Development
- **Revan Khanbabayev** → Exploratory Data Analysis (EDA)

---

## 🌐 Live Website

Experience the live, AI-powered predictions in action!  
👉 **[Visit QuadroSense Online](https://www.quadrosense.online/)**

The website features:
- **Interactive 14-Day Forecasts**: Real-time soil moisture predictions based on our XGBoost models.
- **Smart Irrigation Advisory**: Dynamic thresholds customized per crop and soil type.
- **Email Alerts**: Automated notifications when irrigation is needed.

---

## 📌 Problem Statement
Can we accurately predict soil moisture levels for the next 14 days across diverse climatic zones in Azerbaijan? By systematically analyzing a decade of historical weather patterns, **QuadroSense serves as a robust soil moisture predictor** aimed at providing high-precision irrigation guidance specifically tailored for regional agriculture, such as cotton cultivation in Saatli and tea farming in Lankaran.

## 💡 Why It Matters
Reliable soil moisture forecasting is the backbone of efficient agricultural water management. This pipeline addresses genuine climate data challenges—such as seasonal non-stationarity and sensor gaps—to help farmers and agricultural planners optimize irrigation scheduling, conserve water resources, and maximize crop yields in varying climates. 

## 🏗️ Pipeline Architecture

<p align="center">
  <img src="docs/Open-Meteo Data Pipeline-2026-04-28-153112.svg" alt="Data Pipeline Architecture" width="100%">
</p>

---

## 🎯 Target Definition
* **Objective:** Predict future soil moisture levels based on historical weather patterns.
* **Metric of Success:** Achieve a Mean Absolute Error (MAE) of **< 0.05 $m^3/m^3$** on the prediction set.
* **Prediction Horizon:** Next 14 rolling days.

## 📊 Dataset & Horizon
* **Date Range:** 10+ years of historical data (2015–2026) alongside real-time 14-day forecasts.
* **Granularity:** Daily aggregated records.
* **Target Regions:**
  * **Baku:** Semi-arid climate (Urban/Control)
  * **Saatli:** Arid climate (Cotton focus)
  * **Lankaran:** Humid climate (Tea focus)
  * **Zardab:** Semi-arid / Central Aran climate (General agricultural focus)
  * **Guba:** Temperate / Mountainous climate (Orchard and fruit focus)

## 📋 Features

| # | Variable | Source | Unit | Aggregation |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `temperature_2m_mean` | Open-Meteo Archive & Forecast | °C | Daily mean |
| 2 | `et0_fao_evapotranspiration_sum` | Open-Meteo Archive & Forecast | mm | Daily sum |
| 3 | `sunshine_duration` | Open-Meteo Archive & Forecast | s | Daily sum |
| 4 | `shortwave_radiation_sum` | Open-Meteo Archive & Forecast | MJ/m² | Daily sum |
| 5 | `relative_humidity_2m_mean` | Open-Meteo Archive & Forecast | % | Daily mean |
| 6 | `surface_pressure_mean` | Open-Meteo Archive & Forecast | hPa | Daily mean |
| 7 | `precipitation_sum` | Open-Meteo Archive & Forecast | mm | Daily sum |
| 8 | `precipitation_hours` | Open-Meteo Archive & Forecast | h | Daily sum |
| 9 | `wind_speed_10m_max` | Open-Meteo Archive & Forecast | km/h | Daily max |
| 10 | `cloud_cover_mean` | Open-Meteo Archive & Forecast | % | Daily mean |
| 11 | `wind_gusts_10m_mean` | Open-Meteo Archive & Forecast | km/h | Daily mean |
| 12 | `soil_moisture_0_to_7cm_mean` | Open-Meteo Archive (target) | m³/m³ | Daily mean |

**Engineered features** (computed in the Analytics layer):

| Feature | Description |
| :--- | :--- |
| `day_of_year` | Ordinal day (1–366) to capture seasonality |
| `precip_sum_7d` | 7-day rolling precipitation sum per city |
| `prev_soil_moisture` | Lag-1 soil moisture (previous day) |
| `precip_squared` | Squared precipitation to model non-linear heavy-rain effects |

## 📖 Key Definitions
* **DuckDB:** An embedded, high-performance analytical database used locally to rapidly query and transform our large weather datasets.
* **Medallion Architecture:** Our DuckDB schema is designed with structured layers—**Raw** (direct ingest), **Staging** (cleaned and validated), and **Analytics** (feature-engineered) to ensure strict data quality.
* **Open-Meteo API:** A free, open-source weather API providing access to both our historical archive endpoint and the forecasting endpoint without requiring API keys.

---

## 🛠️ Getting Started

### Prerequisites
- Python 3.9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/orxannuriyev/Soil_Moisture_Prediction.git
cd Soil_Moisture_Prediction

# 2. Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

# 3. Install dependencies
pip install -r requirements.txt
```

### Running the Pipeline

```bash
cd src

# Full run — fetches all historical data + forecasts from scratch
python pipeline.py --mode full

# Incremental run — only fetches new data since the last run
python pipeline.py --mode incremental
```

The pipeline will:
1. **Ingest** historical weather data and 14-day forecasts from the Open-Meteo API
2. **Load** raw data into a local DuckDB database (`data/weather_pipeline.duckdb`)
3. **Clean** and validate the data (Raw → Staging)
4. **Engineer features** such as rolling averages (Staging → Analytics)
5. **Run quality checks** and print a report

Logs are written to `logs/pipeline.log`.

### Running the Web Dashboard

The project includes a modern React/Vite dashboard to visualize the soil moisture predictions and receive irrigation alerts.

```bash
cd web
npm install
npm run dev
```

Open your browser at `http://localhost:5175` (or the port provided in the terminal) to view the dashboard.

---

## 📅 Project Roadmap & Daily Activities

Below is the execution timeline of our two-week sprint, detailing completed and planned milestones. 

| Status | Date | Focus Area | Key Activities |
| :---: | :---: | :--- | :--- |
| ✅ **Done** | **Apr 20** | Project Kick-Off | Repo setup, Open-Meteo API exploration, city/variable selection. |
| ✅ **Done** | **Apr 21** | Data Ingestion | Developed ingestion module, fetched 10 years of historical data and 14-day forecasts. |
| ✅ **Done** | **Apr 22** | Database Design | Configured local DuckDB instance; built Raw, Staging, and Analytics schemas. |
| ✅ **Done** | **Apr 24** | Data Cleaning | Implemented automated cleaning rules, handled missing values, engineered features (e.g., rolling averages). |
| ✅ **Done** | **Apr 24** | Pipeline Automation | Orchestrated end-to-end Python pipeline with logging and automated quality gates. |
| ✅ **Done** | **Apr 26** | Exploratory Data Analysis | Conducted statistical descriptions, temporal visualizations, and cross-city comparisons. |
| ✅ **Done** | **Apr 28** | Statistical Analysis | Execute formal hypothesis testing, feature correlation analysis, and finalize modeling features. |
| ✅ **Done** | **Apr 30** | Final Presentation | Prepare live pipeline demo, project submission, and presentation deck. |
