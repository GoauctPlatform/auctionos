import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from app.db.session import SessionLocal

def upgrade():
    db = SessionLocal()
    try:
        # Check if columns exist, if not add them
        db.execute(text("ALTER TABLE auction_events ADD COLUMN IF NOT EXISTS avg_deal_score FLOAT;"))
        db.execute(text("ALTER TABLE auction_events ADD COLUMN IF NOT EXISTS deal_rating VARCHAR(5);"))
        db.commit()
        print("Successfully added avg_deal_score and deal_rating to auction_events.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    upgrade()
