import argparse
import logging
from logging.handlers import RotatingFileHandler
import os
import time
import pandas as pd
from datetime import timedelta

# Import your custom modules
import database
import ingestion
import cleaning
import features
import quality_checks
from config import CITIES, MY_VARIABLES, START_DATE, END_DATE

# Setup Logging
os.makedirs("../logs", exist_ok=True)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# File handler with rotation: max 1MB per file, keep 3 backups
file_handler = RotatingFileHandler(
    '../logs/pipeline.log', maxBytes=1_000_000, backupCount=3
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

# Console handler
console = logging.StreamHandler()
console.setLevel(logging.INFO)
console.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(console)

def run_pipeline(mode="full"):
    start_time = time.time()
    logging.info(f"🚀 Starting Weather Pipeline in '{mode.upper()}' mode.")
    
    conn = database.get_connection()
    database.create_schemas(conn)
    database.create_raw_tables(conn)
    
    output_path = "../data/raw/"
    os.makedirs(output_path, exist_ok=True)
    
    try:
        # --- STAGE 1: INGESTION ---
        logging.info("STAGE 1: Data Ingestion")
        
        # In incremental mode, get the max HISTORICAL date per city (ignore old forecast rows)
        if mode == "incremental":
            try:
                hist_max_df = conn.execute(
                    "SELECT city, MAX(date) as max_date FROM raw.weather_daily WHERE data_type = 'historical' GROUP BY city"
                ).df()
                max_hist_dates = dict(zip(hist_max_df['city'], hist_max_df['max_date']))
            except Exception:
                max_hist_dates = {}
        else:
            max_hist_dates = {}
        
        new_data_fetched = False
        
        for city in CITIES:
            city_name = city['name']
            
            # --- Historical data: skip only if we already have up to END_DATE ---
            city_start = START_DATE
            hist_skip = False
            if mode == "incremental" and city_name in max_hist_dates and pd.notna(max_hist_dates[city_name]):
                last_hist = pd.to_datetime(max_hist_dates[city_name]).tz_localize(None)
                city_start = (last_hist + timedelta(days=1)).strftime('%Y-%m-%d')
                if pd.to_datetime(city_start) > pd.to_datetime(END_DATE):
                    logging.info(f"⏩ {city_name}: Historical data up to date (Latest: {last_hist.date()}).")
                    hist_skip = True
            
            frames = []
            if not hist_skip:
                logging.info(f"📥 Fetching {city_name} historical from {city_start} to {END_DATE}...")
                df_hist = ingestion.fetch_historical(city_name, city['lat'], city['lon'], city_start, END_DATE, MY_VARIABLES)
                frames.append(df_hist)
            
            # --- Forecast data: ALWAYS re-fetch (forecasts update daily) ---
            logging.info(f"🔮 Fetching {city_name} forecast (14 days)...")
            df_fore = ingestion.fetch_forecast(city_name, city['lat'], city['lon'], MY_VARIABLES)
            frames.append(df_fore)
            
            combined = pd.concat(frames, ignore_index=True)
            
            # Save to parquet
            file_suffix = "_full" if mode == "full" else f"_inc_{pd.Timestamp.now().strftime('%Y%m%d')}"
            file_name = f"{city_name.lower()}{file_suffix}.parquet"
            combined.to_parquet(os.path.join(output_path, file_name), index=False)
            new_data_fetched = True
            
        # --- STAGE 2: DATABASE LOAD ---
        logging.info("STAGE 2: Loading to DuckDB Raw Layer")
        
        if mode == "incremental" and new_data_fetched:
            # Drop old forecast rows — they will be replaced with fresh ones
            conn.execute("DELETE FROM raw.weather_daily WHERE data_type = 'forecast'")
            logging.info("🗑️ Removed stale forecast rows from raw table.")
        
        if mode == "full":
            database.load_raw_data(conn, output_path)
        elif new_data_fetched:
            database.append_raw_data(conn, output_path)
            # Cleanup incremental parquets after loading
            for f in os.listdir(output_path):
                if "_inc_" in f:
                    os.remove(os.path.join(output_path, f))
            
        df_raw = conn.execute("SELECT * FROM raw.weather_daily").df()
        logging.info(f"✅ Raw table contains {len(df_raw)} total rows.")
        
        # --- STAGE 3 & 4: CLEANING & FEATURES ---
        logging.info("STAGE 3: Cleaning (Raw -> Staging)")
        df_staging = cleaning.clean_raw_to_staging(conn)
        
        logging.info("STAGE 4: Feature Engineering (Staging -> Analytics)")
        df_features = features.create_features(conn)
        
        # --- STAGE 5: QUALITY GATES ---
        logging.info("STAGE 5: Running Quality Checks")
        qc_report = quality_checks.run_all_checks(df_raw, df_staging, df_features)
        
        print("\n" + "="*50)
        print("📊 DATA QUALITY REPORT")
        print("="*50)
        print(qc_report.to_string(index=False))
        print("="*50 + "\n")
        
        # Log failures or warnings
        issues = qc_report[qc_report['status'] != 'PASS']
        if not issues.empty:
            logging.warning(f"Quality checks flagged {len(issues)} issues.")
            
        duration = round(time.time() - start_time, 2)
        logging.info(f"🎉 Pipeline completed successfully in {duration} seconds.")

    except Exception as e:
        logging.error(f"❌ Pipeline failed: {str(e)}", exc_info=True)
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Weather Data Pipeline")
    parser.add_argument("--mode", type=str, choices=["full", "incremental"], default="full",
                        help="Run mode: 'full' (re-ingests everything) or 'incremental' (appends new data)")
    args = parser.parse_args()
    
    run_pipeline(mode=args.mode)