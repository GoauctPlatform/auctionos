from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings

def check_max_bid_stats():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        total = conn.execute(text("SELECT count(*) FROM property_details")).scalar()
        has_est = conn.execute(text("SELECT count(*) FROM property_details WHERE estimated_value IS NOT NULL")).scalar()
        has_max_bid = conn.execute(text("SELECT count(*) FROM property_details WHERE max_bid IS NOT NULL")).scalar()
        has_assessed = conn.execute(text("SELECT count(*) FROM property_details WHERE assessed_value IS NOT NULL")).scalar()
        
        print(f"Total property_details: {total}")
        print(f"Has estimated_value: {has_est}")
        print(f"Has max_bid: {has_max_bid}")
        print(f"Has assessed_value: {has_assessed}")
        
        # Sample non-null max_bid
        if has_max_bid > 0:
            res = conn.execute(text("""
                SELECT id, parcel_id, assessed_value, estimated_value, max_bid 
                FROM property_details 
                WHERE max_bid IS NOT NULL 
                LIMIT 5
            """)).all()
            print("\nSample records with non-null Max Bid:")
            for r in res:
                print(f"ID: {r[0]} | APN: {r[1]} | Assessed: {r[2]} | Estimated: {r[3]} | Max Bid: {r[4]}")
            
if __name__ == "__main__":
    check_max_bid_stats()
