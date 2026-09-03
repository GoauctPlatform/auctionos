from sqlalchemy import create_engine, text

db_urls = {
    "Local Docker DB (5433)": "postgresql://user:password@localhost:5433/auctionos",
    "Remote Railway DB": "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"
}

for name, db_url in db_urls.items():
    print(f"\n=== Sample Addresses from {name} ===")
    try:
        engine = create_engine(db_url, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            sql = text("SELECT id, address, city, state, zip_code FROM property_details LIMIT 50")
            # Wait, let's check if city, state, zip_code are columns in property_details!
            # Looking at backend/app/models/property.py:
            # - address is a column.
            # Wait, are city, state, zip_code columns?
            # property.py has:
            # - address
            # - county
            # - state
            # but does it have city and zip_code in property_details?
            # Let's query only ID and address first to be safe.
            sql = text("SELECT id, address, county, state FROM property_details LIMIT 50")
            rows = conn.execute(sql).fetchall()
            for r in rows:
                print(f"ID: {r[0]} | Address: {r[1]} | County: {r[2]} | State: {r[3]}")
    except Exception as e:
        print(f"Error: {e}")
