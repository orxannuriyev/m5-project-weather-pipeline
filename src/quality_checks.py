import pandas as pd
from datetime import datetime

def run_all_checks(df_raw, df_staging, df_features):
    """Runs all data quality checks and returns a summary report."""
    results = []
    
    # 1. Row count (After raw load)
    count = len(df_raw)
    results.append({
        "stage": "Raw", "check_name": "Row count > 0",
        "status": "PASS" if count > 0 else "FAIL",
        "details": f"{count} rows loaded"
    })
    
    # 2. Null ratio (After staging)
    # Exclude soil moisture columns — their NaNs are intentionally preserved
    # (forecast rows have no ground-truth soil moisture)
    non_soil_cols = [c for c in df_staging.columns if "soil_moisture" not in c]
    null_ratios = df_staging[non_soil_cols].isnull().mean()
    high_null_cols = null_ratios[null_ratios >= 0.05].index.tolist()
    results.append({
        "stage": "Staging", "check_name": "Null ratio < 5%",
        "status": "WARN" if high_null_cols else "PASS",
        "details": f"High nulls in: {high_null_cols}" if high_null_cols else "All columns < 5% nulls"
    })
    
    # 3. Date continuity (After staging)
    max_gap_overall = 0
    for city in df_staging['city'].unique():
        df_city = df_staging[df_staging['city'] == city].sort_values('date')
        gaps = df_city['date'].diff().dt.days
        max_gap = gaps.max()
        if pd.notna(max_gap) and max_gap > max_gap_overall:
            max_gap_overall = max_gap
            
    results.append({
        "stage": "Staging", "check_name": "No gaps > 3 days",
        "status": "WARN" if max_gap_overall > 3 else "PASS",
        "details": f"Max gap found: {max_gap_overall} days"
    })
    
    # 4. Value ranges (After staging)
    invalid_temps = df_staging[(df_staging['temperature_2m_mean'] < -50) | 
                               (df_staging['temperature_2m_mean'] > 60)]
    results.append({
        "stage": "Staging", "check_name": "Temperature range [-50, 60]",
        "status": "WARN" if len(invalid_temps) > 0 else "PASS",
        "details": f"{len(invalid_temps)} invalid rows flagged"
    })
    
    # 5. Feature completeness (After analytics)
    expected_features = ["day_of_year", "precip_sum_7d", "prev_soil_moisture", "precip_squared"]
    missing_feats = [f for f in expected_features if f not in df_features.columns]
    results.append({
        "stage": "Analytics", "check_name": "Feature completeness",
        "status": "WARN" if missing_feats else "PASS",
        "details": f"Missing: {missing_feats}" if missing_feats else "All features present"
    })
    
    # 6. Freshness (After raw load)
    latest_date = pd.to_datetime(df_raw['date']).max()
    days_diff = (pd.Timestamp.now().tz_localize(latest_date.tz) - latest_date).days
    results.append({
        "stage": "Raw", "check_name": "Freshness (within 2 days)",
        "status": "WARN" if days_diff > 2 else "PASS",
        "details": f"Latest data is {days_diff} days old"
    })
    
    return pd.DataFrame(results)