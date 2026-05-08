import sys
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
with open("backend/.env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'property_details'")).fetchall()
    print([c[0] for c in cols])
