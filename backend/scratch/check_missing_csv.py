import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")
db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url)

PROPERTIES_CSV = os.path.abspath("/Users/gustavo/Downloads/auctionos/backend/data/postgres_property_details.csv")

with engine.connect() as conn:
    # Get database properties without history
    db_no_hist = set(r[0] for r in conn.execute(text("""
        SELECT p.property_id 
        FROM property_details p 
        LEFT JOIN property_auction_history h ON p.property_id = h.property_id
        WHERE h.property_id IS NULL
    """)).fetchall())
    print(f"Total properties in DB with NO history linked: {len(db_no_hist)}")

    if os.path.exists(PROPERTIES_CSV):
        df_prop = pd.read_csv(PROPERTIES_CSV, dtype=str)
        csv_prop_ids = set(df_prop['property_id'].dropna().unique())
        print(f"Total property_ids in CSV: {len(csv_prop_ids)}")

        # How many of the DB properties with NO history are in the CSV?
        overlap = db_no_hist.intersection(csv_prop_ids)
        print(f"How many of the DB properties with NO history are present in the CSV: {len(overlap)}")

        # Check if ALL CSV properties are present in the DB
        db_prop_ids = set(r[0] for r in conn.execute(text("SELECT property_id FROM property_details")).fetchall())
        missing_csv_in_db = csv_prop_ids - db_prop_ids
        print(f"How many CSV properties are NOT in the database: {len(missing_csv_in_db)}")

        # Check if any CSV properties exist in DB but have NO history in DB
        csv_in_db_no_hist = csv_prop_ids.intersection(db_no_hist)
        print(f"How many CSV properties exist in DB but have NO history in DB: {len(csv_in_db_no_hist)}")
    else:
        print("CSV file not found.")
