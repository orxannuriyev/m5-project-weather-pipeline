import sys
import os
import json

# Ensure we are in the root directory
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(base_dir, 'src'))

from api_services import get_realtime_forecast
from config import CITIES

def update_predictions():
    results = {}
    print("Fetching new soil moisture predictions...")
    for city in CITIES:
        c = city['name']
        print(f" - {c}")
        res = get_realtime_forecast(c)
        city_key = "Baku" if c == "Baki" else c
        if res.get("status") == 200:
            forecasts = [f['predicted_soil_moisture'] for f in res['forecast']]
            results[city_key] = forecasts
        else:
            results[city_key] = res.get("error")

    out_dir = os.path.join(base_dir, 'web', 'public')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'predictions.json')

    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"Successfully saved predictions to {out_path}")

if __name__ == "__main__":
    update_predictions()
