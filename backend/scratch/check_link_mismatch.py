import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url)

PROPERTIES_CSV = os.path.abspath("/Users/gustavo/Downloads/auctionos/backend/data/postgres_property_details.csv")

if os.path.exists(PROPERTIES_CSV):
    print("Reading PROPERTIES_CSV...")
    df = pd.read_csv(PROPERTIES_CSV, dtype=str)
    print(f"Total rows in CSV: {len(df)}")
    print(f"Unique property_ids in CSV: {df['property_id'].nunique()}")
    print(f"Unique parcel_ids in CSV: {df['parcel_id'].nunique()}")
    
    # Let's count how many rows will remain if we drop duplicate parcel_ids
    df_deduped = df.drop_duplicates(subset=['parcel_id'], keep='first')
    print(f"Rows remaining after dropping duplicate parcel_ids: {len(df_deduped)}")
    
    # Which property_ids are dropped?
    dropped_pids = set(df['property_id'].dropna()) - set(df_deduped['property_id'].dropna())
    print(f"Total property_ids dropped due to parcel_id duplication: {len(dropped_pids)}")

with engine.connect() as conn:
    # 1. Orphan history rows in database (history pointing to non-existent property_id in property_details)
    orphan_db_history = conn.execute(text("""
        SELECT COUNT(*) 
        FROM property_auction_history h
        LEFT JOIN property_details p ON h.property_id = p.property_id
        WHERE p.property_id IS NULL
    """)).scalar()
    print(f"\nOrphan history rows in database: {orphan_db_history}")

    # 2. Corrected query for sample orphans
    if orphan_db_history > 0:
        sample_orphans = conn.execute(text("""
            SELECT h.id, h.property_id, h.auction_id, h.auction_name, h.auction_date 
            FROM property_auction_history h
            LEFT JOIN property_details p ON h.property_id = p.property_id
            WHERE p.property_id IS NULL
            LIMIT 5
        """)).fetchall()
        print("\nSample orphan history rows in DB:")
        for r in sample_orphans:
            print(f"  History ID: {r.id} | property_id (missing): {r.property_id} | auction_id: {r.auction_id} | auction_name: {r.auction_name}")
            # Check if this missing property_id was one of the dropped ones in the CSV
            if os.path.exists(PROPERTIES_CSV):
                in_csv = r.property_id in dropped_pids
                print(f"    Is this property_id in the dropped CSV IDs? {in_csv}")
