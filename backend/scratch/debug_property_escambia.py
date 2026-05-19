from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings

def check_property():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        q = text("SELECT id, parcel_id, address, county, state, county_fips, attom_id FROM property_details WHERE id = 468693")
        row = conn.execute(q).first()
        print("=== Property 468693 Status ===")
        for k, v in row._mapping.items():
            print(f"{k}: {v}")

if __name__ == "__main__":
    check_property()
