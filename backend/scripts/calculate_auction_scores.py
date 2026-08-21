import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal

def get_rating_from_score(score: float) -> str:
    if score >= 85:
        return 'A+'
    elif score >= 75:
        return 'A'
    elif score >= 60:
        return 'B'
    elif score >= 45:
        return 'C'
    elif score >= 30:
        return 'D'
    return 'F'

def calculate_and_update_auction_scores():
    db: Session = SessionLocal()
    try:
        # We need to calculate the average deal_score for each auction
        # and then update the auction_events table.
        
        query = text("""
            WITH auction_avg_scores AS (
                SELECT 
                    pah.auction_id,
                    AVG(ps.deal_score) as avg_score
                FROM property_auction_history pah
                JOIN property_details pd ON pd.property_id = pah.property_id
                JOIN property_scores ps ON ps.parcel_id = pd.parcel_id
                WHERE pah.auction_id IS NOT NULL
                GROUP BY pah.auction_id
            )
            UPDATE auction_events ae
            SET avg_deal_score = a.avg_score
            FROM auction_avg_scores a
            WHERE ae.id = a.auction_id;
        """)
        
        # Execute the update for avg_deal_score
        db.execute(query)
        db.commit()
        
        print("Updated avg_deal_score for all auctions.")
        
        # Now update deal_rating in a quick loop or another query
        auctions = db.execute(text("SELECT id, avg_deal_score FROM auction_events WHERE avg_deal_score IS NOT NULL")).fetchall()
        for auction_id, avg_score in auctions:
            rating = get_rating_from_score(avg_score)
            db.execute(text("UPDATE auction_events SET deal_rating = :rating WHERE id = :id"), {"rating": rating, "id": auction_id})
        
        db.commit()
        print(f"Updated deal_rating for {len(auctions)} auctions.")
        
    except Exception as e:
        print(f"Error calculating scores: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    calculate_and_update_auction_scores()
