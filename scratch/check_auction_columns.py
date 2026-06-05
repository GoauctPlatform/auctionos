import os
from sqlalchemy import create_engine, text

def check_db(name, url):
    print(f"\n--- Columns in '{name}' DB table 'auction_events' ---")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'auction_events'")).fetchall()
            cols = [r[0] for r in res]
            print(f"Columns: {sorted(cols)}")
            print("tax_status present:", "tax_status" in cols)
    except Exception as e:
        print(f"Error checking {name} DB: {e}")

check_db("Local", "postgresql://user:password@localhost:5433/auctionos")
check_db("Remote/Railway", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")
