"""
Quick Forecast — Standalone script that:
  1. Fetches 14-day weather from Open-Meteo FORECAST API (no archive needed)
  2. Engineers features matching what the XGBoost models expect
  3. Generates soil moisture predictions
  4. Writes predictions.json for the web dashboard

Usage:
    python src/quick_forecast.py
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
import requests

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT_DIR, 'src'))

from config import CITIES

# ── City name mapping (pipeline → web) ──
CITY_WEB_KEYS = {
    "Baki": "Baku",
    "Lenkeran": "Lenkeran",
    "Quba": "Quba",
    "Saatli": "Saatli",
    "Zerdab": "Zerdab",
}

CITY_MODELS = {
    "Baki": "BAKU_0_7_xgb.pkl",
    "Lenkeran": "LENKERAN_0_7_xgb.pkl",
    "Quba": "QUBA_0_7_xgb.pkl",
    "Saatli": "SAATLI_0_7_xgb.pkl",
    "Zerdab": "ZERDAB_0_7_xgb.pkl",
}

FORECAST_API = "https://api.open-meteo.com/v1/forecast"

# Variables to fetch (same as config.MY_VARIABLES but for forecast API)
WEATHER_VARS = [
    "temperature_2m_mean",
    "et0_fao_evapotranspiration_sum",
    "sunshine_duration",
    "shortwave_radiation_sum",
    "relative_humidity_2m_mean",
    "surface_pressure_mean",
    "precipitation_sum",
    "precipitation_hours",
    "wind_speed_10m_max",
    "cloud_cover_mean",
    "wind_gusts_10m_mean",
    "soil_moisture_0_to_7cm_mean",
]


def fetch_forecast_weather(lat, lon, city_name):
    """Fetch 14-day weather forecast directly via REST API."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ",".join(WEATHER_VARS),
        "timezone": "auto",
        "forecast_days": 14,
        # Also fetch past 7 days for rolling features
        "past_days": 7,
    }
    resp = requests.get(FORECAST_API, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    daily = data["daily"]
    df = pd.DataFrame({
        "date": pd.to_datetime(daily["time"]),
        **{var: daily.get(var, [None] * len(daily["time"])) for var in WEATHER_VARS},
    })
    df.insert(0, "city", city_name)

    return df


def engineer_features(df):
    """Add the same engineered features the pipeline creates."""
    df = df.sort_values("date").reset_index(drop=True)

    # day_of_year
    df["day_of_year"] = df["date"].dt.dayofyear

    # 7-day rolling precipitation sum
    df["precip_sum_7d"] = df["precipitation_sum"].rolling(7, min_periods=1).sum()

    # Previous day soil moisture (lag-1)
    df["prev_soil_moisture"] = df["soil_moisture_0_to_7cm_mean"].shift(1)

    # Squared precipitation
    df["precip_squared"] = df["precipitation_sum"] ** 2

    return df


def run_quick_forecast():
    model_dir = os.path.join(ROOT_DIR, "ML")
    all_results = {}       # For web/public/predictions.json  (flat arrays)
    all_detailed = {}      # For web/src/forecast_data.json    (date+value)

    for city in CITIES:
        city_name = city["name"]
        web_key = CITY_WEB_KEYS.get(city_name, city_name)
        model_file = CITY_MODELS.get(city_name)

        if not model_file:
            print(f"⚠️  No model mapping for {city_name}, skipping.")
            continue

        model_path = os.path.join(model_dir, model_file)
        if not os.path.exists(model_path):
            print(f"⚠️  Model file not found: {model_path}, skipping.")
            continue

        # 1. Fetch weather
        print(f"📡 Fetching 14-day forecast for {city_name}...")
        try:
            df = fetch_forecast_weather(city["lat"], city["lon"], city_name)
        except Exception as e:
            print(f"❌ API failed for {city_name}: {e}")
            continue

        # 2. Engineer features
        df = engineer_features(df)

        # Split: past days (have real soil moisture) vs future (need prediction)
        today = pd.Timestamp.now().normalize()
        df_past = df[df["date"] < today].copy()
        df_future = df[df["date"] >= today].copy()

        if df_future.empty:
            print(f"⚠️  No future dates for {city_name}, skipping.")
            continue

        # 3. Load model & get feature names
        print(f"🤖 Loading model {model_file}...")
        model = joblib.load(model_path)
        model_features = model.get_booster().feature_names

        # Get last known real soil moisture for recursive prediction
        last_real_moisture = df_past["soil_moisture_0_to_7cm_mean"].dropna().iloc[-1] if not df_past["soil_moisture_0_to_7cm_mean"].dropna().empty else 0.2

        # 4. Recursive 14-day prediction
        predictions = []
        current_prev_moisture = last_real_moisture

        for _, row in df_future.iterrows():
            input_row = row.to_dict()
            input_row["prev_soil_moisture"] = current_prev_moisture

            # Set soil_moisture_0_to_7cm_mean to NaN (it's the target, not a feature)
            # Build feature vector matching model expectations
            X_dict = {}
            for feat in model_features:
                if feat in input_row and input_row[feat] is not None and not (isinstance(input_row[feat], float) and np.isnan(input_row[feat])):
                    X_dict[feat] = input_row[feat]
                elif feat == "prev_soil_moisture":
                    X_dict[feat] = current_prev_moisture
                else:
                    X_dict[feat] = 0.0  # fallback

            X_input = pd.DataFrame([X_dict])[model_features]
            prediction = float(model.predict(X_input)[0])
            current_prev_moisture = prediction

            date_str = row["date"].strftime("%Y-%m-%d")
            predictions.append(round(prediction, 4))
            all_detailed.setdefault(web_key, []).append({
                "date": date_str,
                "soil_moisture": round(prediction, 4),
            })

        all_results[web_key] = predictions
        print(f"✅ {city_name} ({web_key}): {len(predictions)} days predicted")
        for i, p in enumerate(predictions):
            print(f"   Day {i+1}: {p:.4f} m³/m³ ({p*100:.1f}%)")

    if not all_results:
        print("\n❌ No predictions were generated.")
        return

    # ── Write web/public/predictions.json (flat arrays) ──
    public_dir = os.path.join(ROOT_DIR, "web", "public")
    os.makedirs(public_dir, exist_ok=True)
    predictions_path = os.path.join(public_dir, "predictions.json")
    with open(predictions_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n✅ Saved to web/public/predictions.json")

    # ── Write web/src/forecast_data.json (detailed) ──
    detailed_path = os.path.join(ROOT_DIR, "web", "src", "forecast_data.json")
    with open(detailed_path, "w") as f:
        json.dump(all_detailed, f, indent=4)
    print(f"✅ Saved to web/src/forecast_data.json")

    # ── Summary table ──
    print(f"\n{'='*60}")
    print("📊 14-Day Soil Moisture Forecast (0-7cm):")
    print(f"{'='*60}")
    for city, preds in all_results.items():
        print(f"\n{city}:")
        for i, p in enumerate(preds):
            print(f"  Day {i+1:2d}: {p:.4f}")
    print(f"{'='*60}")


if __name__ == "__main__":
    run_quick_forecast()
