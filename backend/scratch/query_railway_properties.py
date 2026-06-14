import os
import sys
from sqlalchemy import create_engine, text

# Load variables from backend/.env
env_path = "/Users/gustavo/Downloads/auctionos/backend/.env"
variables = {}

if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                variables[key.strip()] = val.strip()

db_url = variables.get("DATABASE_URL")
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to: {db_url}")
engine = create_engine(db_url)
with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT 
            p.parcel_id, 
            p.assessed_value,
            p.estimated_value,
            p.max_bid,
            p.amount_due,
            p.address,
            p.property_category
        FROM property_details p
        WHERE p.address LIKE '%1770 Blm 518%'
    """)).all()
    for r in res:
        print(f"Parcel: {r[0]} | Assessed: {r[1]} | Estimated: {r[2]} | Max Bid: {r[3]} | Due: {r[4]} | Address: {r[5]} | Category: {r[6]}")
