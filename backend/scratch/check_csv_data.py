import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url)

PROPERTIES_CSV = os.path.abspath("/Users/gustavo/Downloads/auctionos/backend/data/postgres_property_details.csv")
HISTORY_CSV = os.path.abspath("/Users/gustavo/Downloads/auctionos/backend/data/postgres_property_auction_history.csv")

print("-" * 60)
print("CSV FILE INSPECTION")
print("-" * 60)

# Check if files exist
prop_exists = os.path.exists(PROPERTIES_CSV)
hist_exists = os.path.exists(HISTORY_CSV)
print(f"Properties CSV exists: {prop_exists} (Path: {PROPERTIES_CSV})")
print(f"History CSV exists: {hist_exists} (Path: {HISTORY_CSV})")

if prop_exists and hist_exists:
    try:
        # Load CSVs
        print("Loading CSVs...")
        df_prop = pd.read_csv(PROPERTIES_CSV, dtype=str)
        df_hist = pd.read_csv(HISTORY_CSV, dtype=str)
        
        print(f"Properties CSV rows: {len(df_prop)}")
        print(f"History CSV rows: {len(df_hist)}")
        
        # Unique property_ids in each
        prop_ids_csv = set(df_prop['property_id'].dropna().unique())
        hist_prop_ids_csv = set(df_hist['property_id'].dropna().unique())
        
        print(f"Unique property_ids in Properties CSV: {len(prop_ids_csv)}")
        print(f"Unique property_ids in History CSV: {len(hist_prop_ids_csv)}")
        
        # Check if there are properties in CSV with NO history in CSV
        no_hist_in_csv = prop_ids_csv - hist_prop_ids_csv
        print(f"Properties in CSV with NO history in CSV: {len(no_hist_in_csv)}")
        
        # Check if there are history rows with property_ids not in Properties CSV
        orphan_hist_in_csv = hist_prop_ids_csv - prop_ids_csv
        print(f"History rows with property_ids NOT in Properties CSV: {len(orphan_hist_in_csv)}")
        
    except Exception as e:
        print(f"Error loading CSVs: {e}")

print("\n" + "-" * 60)
print("DATABASE INSPECTION")
print("-" * 60)

with engine.connect() as conn:
    # Get database counts
    db_props_count = conn.execute(text("SELECT COUNT(*) FROM property_details")).scalar()
    db_hist_count = conn.execute(text("SELECT COUNT(*) FROM property_auction_history")).scalar()
    
    print(f"Properties in Database: {db_props_count}")
    print(f"History in Database: {db_hist_count}")
    
    # Database unique property_ids
    db_prop_ids = set(r[0] for r in conn.execute(text("SELECT property_id FROM property_details")).fetchall())
    db_hist_prop_ids = set(r[0] for r in conn.execute(text("SELECT DISTINCT property_id FROM property_auction_history")).fetchall())
    
    print(f"Unique property_ids in Database properties: {len(db_prop_ids)}")
    print(f"Unique property_ids in Database history: {len(db_hist_prop_ids)}")
    
    # Missing links in Database
    db_no_hist = db_prop_ids - db_hist_prop_ids
    print(f"Properties in Database with NO history linked: {len(db_no_hist)}")
    
    # Check sample of database properties without history
    if db_no_hist:
        sample_missing = list(db_no_hist)[:5]
        print("\nSample properties in DB with no history:")
        for pid in sample_missing:
            p_data = conn.execute(text("SELECT parcel_id, address, county, state FROM property_details WHERE property_id = :pid"), {"pid": pid}).fetchone()
            print(f"  property_id: {pid} | parcel_id: {p_data[0]} | address: {p_data[1]} | county: {p_data[2]}, {p_data[3]}")
