import pandas as pd

# 1️⃣ Missing value handler
def handle_missing_values(df, strategy="ffill"):
    """
    Fill or drop missing values depending on strategy.
    Leaves soil moisture columns untouched (their NaNs are expected).
    """
    df = df.copy()

    soil_cols = [c for c in df.columns if "soil_moisture" in c]
    target_cols = [c for c in df.columns if c not in soil_cols]

    if strategy == "ffill":
        df[target_cols] = df[target_cols].ffill()
    elif strategy == "zero":
        df[target_cols] = df[target_cols].fillna(0)
    elif strategy == "drop":
        df = df.dropna(subset=target_cols, how="any")
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    return df


# 2️⃣ Date continuity validator
def validate_date_continuity(df, city):
    """Check for missing dates within the series for a given city."""
    df_city = df[df["city"] == city].sort_values("date")
    full_range = pd.date_range(df_city["date"].min(), df_city["date"].max())
    missing_dates = full_range.difference(df_city["date"])
    summary = {
        "city": city,
        "start_date": df_city["date"].min(),
        "end_date": df_city["date"].max(),
        "expected_days": len(full_range),
        "actual_days": len(df_city),
        "missing_days": len(missing_dates),
        "missing_list": list(missing_dates.date)
    }
    return summary


# 3️⃣ Raw → Staging Cleaning Pipeline
def clean_raw_to_staging(conn):
    """Read from raw tables, clean, and write to staging schema."""
    print("🔄 Cleaning data from raw.weather_daily ...")

    # 1. Read raw data
    df = conn.execute("SELECT * FROM raw.weather_daily").df()
    df = df.drop_duplicates(subset=['city', 'date'], keep='last')
    print(f"📥 Raw data loaded: {len(df)} rows, {len(df.columns)} columns")

    # 2. Handle missing values
    df = handle_missing_values(df, strategy="ffill")

    # 3. Date continuity check
    cities = df["city"].unique()
    continuity_reports = [validate_date_continuity(df, c) for c in cities]
    report_df = pd.DataFrame(continuity_reports)
    print("\n📅 Date continuity summary:")
    print(report_df)

    # 4. Save cleaned data
    conn.execute("CREATE SCHEMA IF NOT EXISTS staging;")
    conn.execute("DROP TABLE IF EXISTS staging.weather_daily;")
    conn.execute("CREATE TABLE staging.weather_daily AS SELECT * FROM df;")

    print("\n✅ Cleaned data written to staging.weather_daily")
    print("📊 Sample of cleaned data:")
    print(df.head(5).to_string(index=False))

    return df  # əlavə: təmizlənmiş df-i qaytarır ki, notebook-da görə biləsən
