from datetime import date, timedelta

# 1. API URLs
HISTORICAL_API_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast"

# 2. Weather Variables
MY_VARIABLES = [
    "temperature_2m_mean", "et0_fao_evapotranspiration_sum",
    "sunshine_duration", "shortwave_radiation_sum",
    "relative_humidity_2m_mean", "surface_pressure_mean",
    "precipitation_sum", "precipitation_hours",
    "wind_speed_10m_max", "cloud_cover_mean",
    "wind_gusts_10m_mean", "soil_moisture_0_to_7cm_mean"
]

# 3. Cities Configuration
CITIES = [
    {"name": "Zerdab", "lat": 40.2184, "lon": 47.7121},
    {"name": "Quba", "lat": 41.3611, "lon": 48.5134},
    {"name": "Lenkeran", "lat": 38.7543, "lon": 48.8506},
    {"name": "Baki", "lat": 40.3777, "lon": 49.892},
    {"name": "Saatli", "lat": 39.9321, "lon": 48.3689}
]

# 4. Date Range Logic (Last 10 days for pipeline)
TODAY = date.today()
START_DATE = (TODAY - timedelta(days=10)).strftime('%Y-%m-%d')
END_DATE = (TODAY - timedelta(days=1)).strftime('%Y-%m-%d')