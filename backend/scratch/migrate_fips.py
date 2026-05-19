import requests
import csv
from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings

def dry_run_fips():
    # 1. Download FIPS CSV
    print("Downloading FIPS database...")
    url = "https://raw.githubusercontent.com/kjhealy/fips-codes/master/county_fips_master.csv"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    lines = response.text.splitlines()
    reader = csv.DictReader(lines)
    
    # 2. Build mapping dictionary
    fips_map = {}
    for row in reader:
        state = row['state_abbr'].upper().strip()
        # County names in DB might be "Escambia" or "Escambia County"
        # Let's normalize county names: lowercase, strip "county", strip spaces
        county_raw = row['county_name'].lower()
        county_clean = county_raw.replace("county", "").replace("parish", "").replace("city", "").strip()
        
        fips_str = row['fips'].strip().zfill(5)
        
        # Store both with and without "county" suffix for safety
        fips_map[(state, county_clean)] = fips_str
    
    print(f"Loaded {len(fips_map)} county mappings.")
    
    # 3. Query properties missing FIPS
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        q = text("SELECT id, state, county, parcel_id FROM property_details WHERE county_fips IS NULL")
        rows = conn.execute(q).all()
        print(f"Found {len(rows)} properties in DB missing county_fips.")
        
        resolved = 0
        unresolved = []
        
        for r in rows:
            state = (r.state or "").upper().strip()
            # Normalize DB county
            county = (r.county or "").lower()
            county_clean = county.replace("county", "").replace("parish", "").replace("city", "").strip()
            
            # Special case for Jefferson-Birmingham / Jefferson-Bessemer -> Jefferson
            if "jefferson-" in county_clean:
                county_clean = "jefferson"
            
            fips = fips_map.get((state, county_clean))
            if fips:
                resolved += 1
            else:
                unresolved.append((state, r.county))
                
        print(f"Dry run result: resolved {resolved} / {len(rows)} properties ({resolved / len(rows) * 100:.2f}%)!")
        if unresolved:
            from collections import Counter
            c = Counter(unresolved)
            print("Top unresolved counties:")
            for item, cnt in c.most_common(10):
                print(f"{item}: {cnt}")

if __name__ == "__main__":
    dry_run_fips()
