from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings

def check_property():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT id, parcel_id, address, assessed_value, estimated_value, amount_due, max_bid, property_type, property_category
            FROM property_details 
            WHERE address LIKE '%Junction City%'
        """)).all()
        for r in res:
            print(f"ID: {r[0]} | APN: {r[1]} | Address: {r[2]} | Assessed: {r[3]} | Est. Value: {r[4]} | Amount Due: {r[5]} | Max Bid: {r[6]} | Type: {r[7]} | Category: {r[8]}")

if __name__ == "__main__":
    check_property()
