import sys
import os
import asyncio
import logging
from datetime import datetime
from sqlalchemy import text

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reconcile_statuses():
    """
    Finds properties tied to auctions that have already occurred 
    and updates their status to 'unavailable'.
    """
    current_date = datetime.utcnow().date()
    logger.info(f"Starting status reconciliation for auctions passed before {current_date}")
    
    try:
        with engine.begin() as conn:
            # 1. Update properties whose latest auction is in the past
            # We join with property_auction_history to find the link
            query = text("""
                UPDATE property_details p
                SET availability_status = 'unavailable'
                FROM property_auction_history pah
                WHERE p.property_id = pah.property_id
                  AND pah.auction_date < :current_date
                  AND p.availability_status = 'available'
                  AND COALESCE(p.property_category, '') != 'tax_lien';
            """)
            
            result = conn.execute(query, {"current_date": current_date})
            logger.info(f"Reconciliation complete. Properties marked as 'unavailable': {result.rowcount}")
            
            # 2. Log changes in availability history for audit
            if result.rowcount > 0:
                history_query = text("""
                    INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source, changed_at)
                    SELECT p.property_id, 'available', 'unavailable', 'auto_reconciliation_past_auction', :now
                    FROM property_details p
                    JOIN property_auction_history pah ON p.property_id = pah.property_id
                    WHERE pah.auction_date < :current_date
                      AND p.availability_status = 'unavailable'
                      AND COALESCE(p.property_category, '') != 'tax_lien'
                      AND NOT EXISTS (
                          SELECT 1 FROM property_availability_history pah2 
                          WHERE pah2.property_id = p.property_id 
                          AND pah2.change_source = 'auto_reconciliation_past_auction'
                          AND pah2.changed_at > :today_start
                      );
                """)
                now = datetime.utcnow()
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                conn.execute(history_query, {"current_date": current_date, "now": now, "today_start": today_start})

        print(f"\nSuccessfully updated {result.rowcount} properties to 'unavailable'.")
    except Exception as e:
        logger.error(f"Failed to reconcile statuses: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(reconcile_statuses())
