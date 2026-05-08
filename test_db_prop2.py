from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
with open("backend/.env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    prop = conn.execute(text("SELECT parcel_id, address, county, state, county_fips, attom_id FROM property_details WHERE parcel_id = '01-3126-039-2553'")).fetchone()
    print(f"Property in DB: {prop}")
