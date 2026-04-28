import os
import sys
import pandas as pd
import joblib

# Set root directory to locate the src folder properly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT_DIR, 'src'))

import database
import pipeline

def get_realtime_forecast(city_name):
    """
    On-demand API function for the website.
    Triggers the data pipeline, loads the pre-trained model, 
    and returns 14-day predictions as JSON.
    """
    
    # 1. Trigger the pipeline to fetch the latest data from Open-Meteo
    try:
        print(f"Triggering pipeline to fetch latest weather data...")
        pipeline.run_pipeline(mode="incremental")
    except Exception as e:
        return {"status": 500, "error": f"Data pipeline failed: {str(e)}"}
        
    # 2. Establish database connection
    conn = database.get_connection()
    
    # 3. Map cities to their respective pre-trained models
    model_dir = os.path.join(ROOT_DIR, "ML")
    city_models = {
        "Baki": "BAKU_0_7_xgb.pkl",
        "Lenkeran": "LENKERAN_0_7_xgb.pkl",
        "Quba": "QUBA_0_7_xgb.pkl",
        "Saatli": "SAATLI_0_7_xgb.pkl",
        "Zerdab": "ZERDAB_0_7_xgb.pkl"
    }

    model_filename = city_models.get(city_name)
    
    if not model_filename:
        return {"status": 404, "error": "Invalid city selection."}
        
    model_path = os.path.join(model_dir, model_filename)
    
    if not os.path.exists(model_path):
         return {"status": 500, "error": "Pre-trained model file is missing."}

    # Load the pre-trained model
    model = joblib.load(model_path)
    model_features = model.get_booster().feature_names

    # 4. Fetch the freshly updated 14-day forecast features from DuckDB
    df_features = conn.execute(f"""
        SELECT * FROM analytics.weather_features 
        WHERE city = '{city_name}' AND data_type = 'forecast'
        ORDER BY date
    """).df()

    if df_features.empty:
        return {"status": 404, "error": "Forecast data not generated properly."}

    # Fetch the last recorded actual soil moisture to start the sequence
    last_real_val = conn.execute(f"""
        SELECT soil_moisture_0_to_7cm_mean FROM analytics.weather_features 
        WHERE city = '{city_name}' AND data_type = 'historical'
        ORDER BY date DESC LIMIT 1
    """).fetchone()

    if last_real_val is None:
        return {"status": 404, "error": "Historical baseline data is missing."}

    current_prev_moisture = last_real_val[0]
    forecast_results = []

    # 5. Generate recursive predictions
    for i, row in df_features.iterrows():
        input_row = row.to_dict()
        input_row['prev_soil_moisture'] = current_prev_moisture
        
        # Align features exactly as the pre-trained model expects
        X_input = pd.DataFrame([input_row])[model_features]
        prediction = float(model.predict(X_input)[0])
        
        # Current prediction becomes tomorrow's historical data
        current_prev_moisture = prediction
        
        forecast_results.append({
            "date": row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else row['date'],
            "predicted_soil_moisture": round(prediction, 4)
        })

    conn.close()
    
    # 6. Return standard dictionary/JSON structure for web integration
    return {
        "city": city_name,
        "status": 200,
        "forecast": forecast_results
    }

# Local testing block
if __name__ == "__main__":
    target_city = "Baki"
    print(f"Testing On-Demand Prediction for: {target_city}\n")
    
    result = get_realtime_forecast(target_city)
    
    import json
    print(json.dumps(result, indent=4))