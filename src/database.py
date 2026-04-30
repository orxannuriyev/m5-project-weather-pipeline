import duckdb
import os

def get_connection(db_path="../data/weather_pipeline.duckdb"):
    """Returns a DuckDB connection, creating the DB file and directory if they don't exist."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return duckdb.connect(db_path)

def create_schemas(conn):
    """Creates the logical schemas for a multi-layered architecture."""
    conn.execute("CREATE SCHEMA IF NOT EXISTS raw;")
    conn.execute("CREATE SCHEMA IF NOT EXISTS staging;")
    conn.execute("CREATE SCHEMA IF NOT EXISTS analytics;")

def create_raw_tables(conn):
    """Creates raw-layer tables matching the ingested data structure."""
    query = """
    CREATE TABLE IF NOT EXISTS raw.weather_daily (
        city VARCHAR,
        date TIMESTAMP,
        temperature_2m_mean DOUBLE,
        et0_fao_evapotranspiration_sum DOUBLE,
        sunshine_duration DOUBLE,
        shortwave_radiation_sum DOUBLE,
        relative_humidity_2m_mean DOUBLE,
        surface_pressure_mean DOUBLE,
        precipitation_sum DOUBLE,
        precipitation_hours DOUBLE,
        wind_speed_10m_max DOUBLE,
        cloud_cover_mean DOUBLE,
        wind_gusts_10m_mean DOUBLE,
        soil_moisture_0_to_7cm_mean DOUBLE,
        data_type VARCHAR
    );
    """
    conn.execute(query)

def load_raw_data(conn, data_dir="../data/raw/"):
    """Loads all Parquet files from the raw directory into the raw.weather_daily table."""
    # Truncate first to prevent duplicates if you run the cell multiple times
    conn.execute("TRUNCATE TABLE raw.weather_daily;")
    
    # DuckDB can natively read multiple parquet files using a wildcard (*)
    query = f"""
    INSERT INTO raw.weather_daily BY NAME
    SELECT * FROM read_parquet('{data_dir}*.parquet');
    """
    conn.execute(query)


def get_max_dates(conn):
    """Fetches the latest date available in the raw table for each city."""
    try:
        df = conn.execute("SELECT city, MAX(date) as max_date FROM raw.weather_daily GROUP BY city").df()
        # Convert to dictionary: {'Baki': Timestamp, 'Zerdab': Timestamp}
        return dict(zip(df['city'], df['max_date']))
    except duckdb.CatalogException:
        return {} # Table doesn't exist yet

def append_raw_data(conn, data_dir="../data/raw/"):
    """Appends data from parquet files into the raw table without truncating."""
    query = f"""
    INSERT INTO raw.weather_daily BY NAME
    SELECT * FROM read_parquet('{data_dir}*.parquet');
    """
    conn.execute(query)

   