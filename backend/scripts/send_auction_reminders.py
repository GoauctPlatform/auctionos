import asyncio
import sys
import os
from sqlalchemy import text
from datetime import datetime, timedelta

# Add parent directory to path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.core.email import send_email
from app.core.email_templates import get_auction_reminder_template

async def send_7day_reminders():
    """
    Finds properties in users' watchlists that are exactly 7 days away from auction
    and sends a reminder email.
    """
    db = SessionLocal()
    target_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    print(f"[{datetime.now()}] Checking for auctions on {target_date}...")
    
    try:
        # Query to find users watching properties with auctions in 7 days
        # Join user_properties with auction_events and users
        query = text("""
            SELECT 
                u.email, 
                u.full_name, 
                p.address, 
                ae.auction_date,
                ae.name as auction_name
            FROM user_properties up
            JOIN property_details p ON up.property_id = p.id
            JOIN auction_events ae ON p.id = ae.id -- Assuming 1:1 or appropriate link
            JOIN users u ON up.user_id = u.id
            WHERE DATE(ae.auction_date) = :target_date
            AND u.is_active = TRUE
        """)
        
        results = db.execute(query, {"target_date": target_date}).fetchall()
        
        if not results:
            print("No reminders to send today.")
            return

        print(f"Found {len(results)} reminders to send.")
        
        for row in results:
            email = row.email
            name = row.full_name or email
            address = row.address
            auction_date = row.auction_date.strftime('%B %d, %Y')
            
            print(f"Sending reminder to {email} for property {address}...")
            
            body = get_auction_reminder_template(
                address=address,
                date=auction_date,
                days=7
            )
            
            success = await send_email(
                subject=f"Urgent: Auction in 7 days - {address}",
                recipients=[email],
                body=body
            )
            
            if success:
                print(f"Successfully sent to {email}")
            else:
                print(f"Failed to send to {email}")

    except Exception as e:
        print(f"Error in reminder script: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(send_7day_reminders())
