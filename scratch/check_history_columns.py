import os
from sqlalchemy import create_engine, text

def check_db(name, url):
    print(f"\n--- Columns in '{name}' DB table 'property_auction_history' ---")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'property_auction_history'")).fetchall()
            cols = [r[0] for r in res]
            print(f"Columns: {sorted(cols)}")
            print("auction_date present:", "auction_date" in cols)
            print("auction_name present:", "auction_name" in cols)
            print("listed_as present:", "listed_as" in cols)
    except Exception as e:
        print(f"Error checking {name} DB: {e}")

check_db("Local", "postgresql://user:password@localhost:5433/auctionos")
check_db("Remote/Railway", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")
