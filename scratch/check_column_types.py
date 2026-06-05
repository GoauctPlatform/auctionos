import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("--- COLUMN TYPES IN REMOTE DB ---")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'property_details'
        """)).fetchall()
        for r in res:
            if r[0] in ['next_auction_date', 'parcel_id', 'latitude', 'longitude', 'gsi_url']:
                print(f"Column: {r[0]}, Type: {r[1]}")
except Exception as e:
    print(f"Error: {e}")
print("--- END ---")
