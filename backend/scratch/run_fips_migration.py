import requests
import csv
import unicodedata
from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings
from app.utils.state_mapper import normalize_state

def strip_accents(text_str):
    try:
        text_str = unicode(text_str, 'utf-8')
    except NameError:
        pass
    text_str = unicodedata.normalize('NFD', text_str)
    text_str = text_str.encode('ascii', 'ignore')
    return text_str.decode("utf-8")

def run_fips_migration():
    # Try reading the local CSV file provided by the user
    local_csv_paths = [
        "scratch/county_fips_master.csv",
        "backend/scratch/county_fips_master.csv",
        "/Users/gustavo/Downloads/auctionos/backend/scratch/county_fips_master.csv"
    ]
    
    lines = None
    for path in local_csv_paths:
        if os.path.exists(path):
            print(f"1. Found local FIPS CSV at: {path}")
            try:
                # Open with utf-8 and errors='ignore' to avoid encoding crash
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.read().splitlines()
            except Exception as e:
                print(f"Failed to read local CSV with UTF-8: {e}. Trying latin-1...")
                try:
                    with open(path, "r", encoding="latin-1") as f:
                        lines = f.read().splitlines()
                except Exception as e2:
                    print(f"Failed to read local CSV with latin-1: {e2}")
            break
            
    if not lines:
        print("1. Local FIPS CSV not found or unreadable. Downloading FIPS database from GitHub...")
        url = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/county_fips_master.csv"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        lines = response.text.splitlines()
    
    reader = csv.DictReader(lines)
    
    # 2. Build mapping dictionary
    fips_map = {}
    for row in reader:
        state = row['state_abbr'].upper().strip()
        county_raw = row['county_name'].lower()
        
        # Normalize: remove "county", "parish", "city", strip, strip accents, strip periods
        county_clean = strip_accents(county_raw).replace("county", "").replace("parish", "").replace("city", "").replace(".", "").replace("-", " ").strip()
        
        fips_str = row['fips'].strip().zfill(5)
        
        fips_map[(state, county_clean)] = fips_str
        
        # Also map standard "st" variations
        if county_clean.startswith("st "):
            fips_map[(state, county_clean.replace("st ", "saint "))] = fips_str
        if county_clean.startswith("saint "):
            fips_map[(state, county_clean.replace("saint ", "st "))] = fips_str
            
    print(f"Loaded {len(fips_map)} normalized county mappings.")
    
    # 3. Fetch groups and run updates in a single transaction block
    engine = create_engine(settings.DATABASE_URL)
    
    # Get distinct groups first
    with engine.connect() as conn:
        q_distinct = text("SELECT state, county, count(*) as cnt FROM property_details WHERE county_fips IS NULL GROUP BY state, county")
        distinct_groups = conn.execute(q_distinct).all()
        print(f"Found {len(distinct_groups)} unique (state, county) groups missing FIPS.")
    
    total_updated = 0
    
    # Execute batch updates inside an autocommitting transaction block
    with engine.begin() as conn:
        for group in distinct_groups:
            state_raw = (group.state or "").strip()
            state_abbr = normalize_state(state_raw)
            
            county_raw = (group.county or "").lower()
            county_clean = strip_accents(county_raw).replace("county", "").replace("parish", "").replace("city", "").replace(".", "").replace("-", " ").strip()
            
            if "jefferson-" in county_clean:
                county_clean = "jefferson"
            
            fips = fips_map.get((state_abbr, county_clean))
            if fips:
                # Use TRIM and LOWER for perfect robust matching in SQL
                stmt = text("""
                    UPDATE property_details 
                    SET county_fips = :fips 
                    WHERE county_fips IS NULL 
                      AND (
                        LOWER(TRIM(state)) = LOWER(:state_raw) 
                        OR LOWER(TRIM(state)) = LOWER(:state_abbr)
                      ) 
                      AND LOWER(TRIM(county)) = LOWER(:county_raw)
                """)
                res = conn.execute(stmt, {
                    "fips": fips,
                    "state_raw": state_raw,
                    "state_abbr": state_abbr,
                    "county_raw": group.county.strip() if group.county else ""
                })
                total_updated += res.rowcount
                if res.rowcount > 0:
                    print(f"Updated {group.county}, {state_raw} -> FIPS {fips} ({res.rowcount} properties)")
                    
    print(f"\nMigration SUCCESS: Updated county_fips for {total_updated} properties in total!")

if __name__ == "__main__":
    run_fips_migration()
