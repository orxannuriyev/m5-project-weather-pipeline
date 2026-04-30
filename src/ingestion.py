import os # Make sure os is imported at the top of your file!
import pandas as pd
import openmeteo_requests
import requests_cache
from retry_requests import retry
from datetime import datetime, date, timedelta
import time
from config import HISTORICAL_API_URL, FORECAST_API_URL, CITIES, MY_VARIABLES, START_DATE, END_DATE
# 1. API Client Setup
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=3, backoff_factor=1.5)
openmeteo = openmeteo_requests.Client(session=retry_session)

def fetch_historical(city_name, latitude, longitude, start_date, end_date, variables):
    """Fetches historical weather data (Archive API)"""
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    today_dt = pd.Timestamp.now().normalize()

    if start_dt >= end_dt:
        raise ValueError(f"Error: start_date ({start_date}) must be less than end_date ({end_date}).")
    if end_dt > today_dt:
        raise ValueError(f"Error: Future dates ({end_date}) cannot be selected for historical data.")

    url = HISTORICAL_API_URL
    params = {
        "latitude": latitude, "longitude": longitude,
        "start_date": start_date, "end_date": end_date,
        "daily": variables, "timezone": "auto"
    }

    for attempt in range(3):
        try:
            responses = openmeteo.weather_api(url, params=params)
            if not responses:
                raise ValueError(f"Empty response received for {city_name}.")
            
            response = responses[0]
            daily = response.Daily()
            daily_data = {
                "date": pd.date_range(
                    start=pd.to_datetime(daily.Time(), unit="s", utc=True),
                    end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
                    freq=pd.Timedelta(seconds=daily.Interval()),
                    inclusive="left"
                )
            }
            for i, var_name in enumerate(variables):
                daily_data[var_name] = daily.Variables(i).ValuesAsNumpy()

            df = pd.DataFrame(data=daily_data)
            df.insert(0, 'city', city_name)
            df['data_type'] = 'historical'
            return df
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Critical Error ({city_name}): {e}")

def fetch_forecast(city_name, latitude, longitude, variables):
    """Fetches the 14-day weather forecast"""
    url = FORECAST_API_URL
    params = {
        "latitude": latitude, "longitude": longitude,
        "daily": variables, "timezone": "auto", "forecast_days": 14
    }
    for attempt in range(3):
        try:
            responses = openmeteo.weather_api(url, params=params)
            if not responses:
                raise ValueError(f"Empty response for forecast ({city_name}).")
            
            response = responses[0]
            daily = response.Daily()
            daily_data = {
                "date": pd.date_range(
                    start=pd.to_datetime(daily.Time(), unit="s", utc=True),
                    end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
                    freq=pd.Timedelta(seconds=daily.Interval()),
                    inclusive="left"
                )
            }
            for i, var_name in enumerate(variables):
                daily_data[var_name] = daily.Variables(i).ValuesAsNumpy()

            df = pd.DataFrame(data=daily_data)
            df.insert(0, 'city', city_name)
            df['data_type'] = 'forecast'

            for col in df.columns:
                if "soil_moisture" in col:
                    df[col] = float("nan")

            return df
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Forecast Error ({city_name}): {e}")

def fetch_all_cities(cities_config, start_date, end_date, variables):
    """Fetches and combines data for all cities"""
    all_results = {}
    for city in cities_config:
        name = city['name']
        print(f"Processing: {name}...")
        df_hist = fetch_historical(name, city['lat'], city['lon'], start_date, end_date, variables)
        df_fore = fetch_forecast(name, city['lat'], city['lon'], variables)
        combined = pd.concat([df_hist, df_fore], ignore_index=True)
        all_results[name] = combined
        time.sleep(1)
    return all_results

if __name__ == "__main__":
    try:
        results = fetch_all_cities(CITIES, START_DATE, END_DATE, MY_VARIABLES)
        
        # --- NEW CODE: Save the data directly from the python script ---
        output_path = "../data/raw/"
        os.makedirs(output_path, exist_ok=True)
        
        for city_name, df in results.items():
            file_name = f"{city_name.lower()}_inference.parquet"
            full_path = os.path.join(output_path, file_name)
            df.to_parquet(full_path, index=False)
            print(f"✅ {city_name}: {len(df)} rows saved to {file_name}")
        # ---------------------------------------------------------------
            
        print("\n✅ Data successfully collected and saved to Parquet using config settings.")
        print(f"Start Date: {START_DATE}")
        print(f"End Date: {END_DATE}")

    except Exception as e:
        print(f"\n❌ Pipeline stopped: {e}")