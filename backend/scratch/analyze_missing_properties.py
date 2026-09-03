import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url)

PROPERTIES_CSV = os.path.abspath("/Users/gustavo/Downloads/auctionos/backend/data/postgres_property_details.csv")

if os.path.exists(PROPERTIES_CSV):
    df = pd.read_csv(PROPERTIES_CSV, dtype=str)
    
    # Let's take the first 100 missing property IDs
    with engine.connect() as conn:
        db_prop_ids = set(r[0] for r in conn.execute(text("SELECT property_id FROM property_details")).fetchall())
        csv_prop_ids = set(df['property_id'].dropna().unique())
        missing_ids = csv_prop_ids - db_prop_ids
        print(f"Total missing property_ids: {len(missing_ids)}")
        
        # Get the parcel_ids corresponding to these missing property_ids in the CSV
        df_missing = df[df['property_id'].isin(missing_ids)]
        missing_parcels = df_missing['parcel_id'].dropna().unique()
        print(f"Unique parcel_ids corresponding to these missing property_ids: {len(missing_parcels)}")
        
        # How many of these parcel_ids are present in the database?
        # Let's check in the DB
        present_in_db_count = 0
        different_uuid_count = 0
        
        # Chunk query to avoid SQL size limit
        missing_parcels_list = list(missing_parcels)
        chunk_size = 500
        for i in range(0, len(missing_parcels_list), chunk_size):
            chunk = missing_parcels_list[i:i+chunk_size]
            placeholders = ", ".join([f":p_{idx}" for idx in range(len(chunk))])
            params = {f"p_{idx}": val for idx, val in enumerate(chunk)}
            
            rows = conn.execute(
                text(f"SELECT parcel_id, property_id FROM property_details WHERE parcel_id IN ({placeholders})"),
                params
            ).fetchall()
            
            present_in_db_count += len(rows)
            for r in rows:
                # Find the UUID in the CSV for this parcel_id
                csv_row = df_missing[df_missing['parcel_id'] == r[0]].iloc[0]
                csv_uuid = csv_row['property_id']
                if csv_uuid != r[1]:
                    different_uuid_count += 1
                    
        print(f"Out of the {len(missing_parcels)} missing properties' parcel_ids:")
        print(f"  Present in database (under any UUID): {present_in_db_count}")
        print(f"  Present under a DIFFERENT UUID: {different_uuid_count}")
else:
    print("PROPERTIES_CSV not found.")
