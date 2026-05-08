import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
with open(".env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

sys.path.append(os.getcwd())

from app.services.attom_enrichment import enrich_property

try:
    prop = db.execute(text("SELECT property_id FROM property_details WHERE parcel_id = '020-433-250-000'")).fetchone()
    if prop:
        print(f"Testing enrich for property_id: {prop[0]}")
        result = enrich_property(db, prop[0])
        print(f"Result: {result}")
    else:
        print("Property not found")
except Exception as e:
    print(f"Error: {e}")

