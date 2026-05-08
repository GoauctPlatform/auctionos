import os
import sys
from sqlalchemy import create_engine, text

# Get DB URL from .env or just use the local one
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
# check if it exists or parse .env
with open("backend/.env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    result = conn.execute(text("SELECT parcel_id, address, county, state, county_fips FROM property_details WHERE parcel_id = '003-511-161-000'")).fetchone()
    print(f"Property in DB: {result}")

