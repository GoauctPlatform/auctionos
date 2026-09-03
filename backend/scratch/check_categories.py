import os
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/auctionos")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("\nDistinct property_category in property_details:")
        res = conn.execute(text("SELECT property_category, COUNT(*) FROM property_details GROUP BY property_category")).fetchall()
        for r in res:
            print(f"  - Category: {r[0]}, Count: {r[1]}")
            
        print("\nDistinct property_type in property_details:")
        res = conn.execute(text("SELECT property_type, COUNT(*) FROM property_details GROUP BY property_type")).fetchall()
        for r in res:
            print(f"  - Type: {r[0]}, Count: {r[1]}")

        print("\nDistinct purchase_option_type in property_details:")
        res = conn.execute(text("SELECT purchase_option_type, COUNT(*) FROM property_details GROUP BY purchase_option_type")).fetchall()
        for r in res:
            print(f"  - Purchase Option: {r[0]}, Count: {r[1]}")

        print("\nDistinct listed_as in property_auction_history:")
        res = conn.execute(text("SELECT listed_as, COUNT(*) FROM property_auction_history GROUP BY listed_as")).fetchall()
        for r in res:
            print(f"  - Listed As: {r[0]}, Count: {r[1]}")
            
except Exception as e:
    print(f"Error: {e}")
