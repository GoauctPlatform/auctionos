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
        SELECT DISTINCT county 
        FROM property_details 
        WHERE county IS NOT NULL AND county != ''
        LIMIT 10
    """)).all()
    for r in res:
        print(f"County: {r[0]}")
