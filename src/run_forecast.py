import os
import sys
import json
import pandas as pd
import joblib
from datetime import timedelta

# finding root folder
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT_DIR, 'src'))

import database
import pipeline
from config import CITIES

def generate_city_forecasts():
    # 1. Pipeline (try to refresh data, but continue with cached data if API fails)
    print(" Pipeline is working ...")
    try:
        pipeline.run_pipeline(mode="incremental")
    except Exception as e:
        print(f"\n⚠️  Pipeline failed: {e}")
        print("   Continuing with existing cached data in database...\n")
    
    conn = database.get_connection()
    
    
    model_dir = os.path.join(ROOT_DIR, "ML")
    
    # Mapping city names to dataset labels (e.g., Baki) within the model files.
    city_models = {
        "Baki": "BAKU_0_7_xgb.pkl",
        "Lenkeran": "LENKERAN_0_7_xgb.pkl",
        "Quba": "QUBA_0_7_xgb.pkl",
        "Saatli": "SAATLI_0_7_xgb.pkl",
        "Zerdab": "ZERDAB_0_7_xgb.pkl"
    }

    all_forecast_results = []

    for city in CITIES:
        city_name = city['name']
        model_filename = city_models.get(city_name)
        
        if not model_filename:
            print(f" {city_name} couldn't find model for this city.")
            continue
            
        model_path = os.path.join(model_dir, model_filename)
        
        if not os.path.exists(model_path):
            print(f" couldn't find model file: {model_path}")
            continue

        print(f" {city_name} is predicting...")
        model = joblib.load(model_path)
        model_features = model.get_booster().feature_names

        
        df_features = conn.execute(f"""
            SELECT * FROM analytics.weather_features 
            WHERE city = '{city_name}' AND data_type = 'forecast'
            ORDER BY date
        """).df()

        
        last_real_val = conn.execute(f"""
            SELECT soil_moisture_0_to_7cm_mean FROM analytics.weather_features 
            WHERE city = '{city_name}' AND data_type = 'historical'
            ORDER BY date DESC LIMIT 1
        """).fetchone()

        if last_real_val is None:
            print(f"⚠️ {city_name} Historical data missing; unable to generate forecast..")
            continue

        current_prev_moisture = last_real_val[0]

        for i, row in df_features.iterrows():
            input_row = row.to_dict()
            input_row['prev_soil_moisture'] = current_prev_moisture
            
            X_input = pd.DataFrame([input_row])[model_features]
            prediction = model.predict(X_input)[0]
            
            current_prev_moisture = prediction
            
            all_forecast_results.append({
                "Date": row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else row['date'],
                "City": city_name,
                "Soil_Moisture": round(float(prediction), 4)
            })

    if not all_forecast_results:
        print(" No forecasts could be generated. Please check the models and data.")
        return

    # 4. Output in tabular format
    final_df = pd.DataFrame(all_forecast_results)
    pivot_df = final_df.pivot(index='Date', columns='City', values='Soil_Moisture')
    
    print("\n 14-Day Soil Moisture Forecast (0-7cm):")
    print("=" * 60)
    print(pivot_df)
    print("=" * 60)
    
    conn.close()

    # ── Write results to JSON files (for web dashboard) ──
    # Convert Python city names to web keys
    city_name_to_web_key = {
        "Baki": "Baku",
        "Lenkeran": "Lenkeran",
        "Quba": "Quba",
        "Saatli": "Saatli",
        "Zerdab": "Zerdab"
    }

    # Detailed format (date + value) → web/src/forecast_data.json
    forecast_dict = {}
    for result in all_forecast_results:
        web_key = city_name_to_web_key.get(result["City"], result["City"])
        if web_key not in forecast_dict:
            forecast_dict[web_key] = []
        forecast_dict[web_key].append({
            "date": result["Date"],
            "soil_moisture": result["Soil_Moisture"]
        })

    output_path = os.path.join(ROOT_DIR, "web", "src", "forecast_data.json")
    with open(output_path, "w") as f:
        json.dump(forecast_dict, f, indent=4)

    print(f"\n✅ Forecasts written to 'web/src/forecast_data.json'.")

    # Flat-array format (numbers + dates) → web/public/predictions.json
    # This is the format the dashboard actually reads via fetch('/predictions.json')
    predictions_flat = {}

    # Collect unique dates (all cities share the same date range)
    seen_dates = []
    seen_set = set()
    for result in all_forecast_results:
        d = result["Date"]
        if d not in seen_set:
            seen_set.add(d)
            seen_dates.append(d)
    predictions_flat["dates"] = seen_dates[:14]  # exactly 14 days

    for result in all_forecast_results:
        web_key = city_name_to_web_key.get(result["City"], result["City"])
        if web_key not in predictions_flat:
            predictions_flat[web_key] = []
        predictions_flat[web_key].append(result["Soil_Moisture"])

    public_dir = os.path.join(ROOT_DIR, "web", "public")
    os.makedirs(public_dir, exist_ok=True)
    predictions_path = os.path.join(public_dir, "predictions.json")
    with open(predictions_path, "w") as f:
        json.dump(predictions_flat, f, indent=2)

    print(f"✅ Forecasts also written to 'web/public/predictions.json'.")

if __name__ == "__main__":
    generate_city_forecasts()