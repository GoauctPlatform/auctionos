import sys
import os
from sqlalchemy import text, create_engine

from dotenv import load_dotenv
load_dotenv("backend/.env")

# Database setup
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def sync_counts():
    print("-" * 50)
    print("SYNCING AUCTION PROPERTY COUNTS (TOTAL & AVAILABLE)")
    print("-" * 50)
    
    # 1. Update TOTAL parcels_count (regardless of status, preserving declared count if higher)
    sync_total_query = text("""
        UPDATE auction_events ae
        SET parcels_count = GREATEST(
            COALESCE(ae.parcels_count, 0),
            COALESCE((
                SELECT count(*)
                FROM property_auction_history pah
                WHERE pah.auction_id = ae.id
            ), 0)
        )
    """)
    
    # 2. Update AVAILABLE available_count (status == 'available')
    sync_available_query = text("""
        UPDATE auction_events ae
        SET available_count = (
            SELECT count(*)
            FROM property_auction_history pah
            JOIN property_details p ON p.property_id = pah.property_id
            WHERE pah.auction_id = ae.id
            AND p.availability_status = 'available'
        )
    """)
    
    try:
        with engine.begin() as conn:
            # Sync Totals
            print("Updating total parcels counts...")
            res_total = conn.execute(sync_total_query)
            print(f"Success: Updated totals for {res_total.rowcount} auctions.")
            
            # Sync Available
            print("Updating available counts...")
            res_avail = conn.execute(sync_available_query)
            print(f"Success: Updated available counts for {res_avail.rowcount} auctions.")
            
    except Exception as e:
        print(f"Error syncing counts: {e}")
        import traceback
        traceback.print_exc()
    print("-" * 50)

if __name__ == "__main__":
    sync_counts()
