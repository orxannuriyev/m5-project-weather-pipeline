import pandas as pd
import duckdb

def create_features(conn):
    """
    Compute and save derived features for modeling into analytics.weather_features.
    Works with columns available in staging.weather_daily.
    """

    print("🔧 Generating features from staging.weather_daily ...")

    # 1. Read data from staging
    df = conn.execute("SELECT * FROM staging.weather_daily").df()
    df = df.sort_values(["city", "date"]).reset_index(drop=True)

    # 2. Feature engineering ---------------------------------------------

    # --- 2.1 Day of year (for seasonality)
    df["day_of_year"] = df["date"].dt.dayofyear

    # --- 2.2 7-day rolling precipitation sum per city
    df["precip_sum_7d"] = (
        df.groupby("city")["precipitation_sum"]
          .transform(lambda x: x.rolling(7, min_periods=1).sum())
    )

    # --- 2.3 Previous day's soil moisture (lag-1)
    df["prev_soil_moisture"] = (
        df.groupby("city")["soil_moisture_0_to_7cm_mean"]
          .shift(1)
    )

    # --- 2.4 Squared precipitation (captures non-linear heavy-rain effects)
    df["precip_squared"] = df["precipitation_sum"] ** 2

    print("✅ Features computed: day_of_year, precip_sum_7d, prev_soil_moisture, precip_squared")

    # 3. Inspect basic info
    print(f"\nData now has {len(df)} rows and {df.shape[1]} columns.")
    print("\n📊 Example of engineered data:")
    print(df.head(10).to_string(index=False))

    # 4. Save into analytics schema --------------------------------------
    conn.execute("CREATE SCHEMA IF NOT EXISTS analytics;")
    conn.execute("DROP TABLE IF EXISTS analytics.weather_features;")
    conn.execute("CREATE TABLE analytics.weather_features AS SELECT * FROM df;")

    print("\n✅ Features written to analytics.weather_features.")
    return df

