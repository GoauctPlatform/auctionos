from app.db.session import SessionLocal
from app.models.client_data import UserFavoriteAuction
from app.models.auction_event import AuctionEvent

db = SessionLocal()
try:
    # Get first auction
    auc = db.query(AuctionEvent).first()
    if not auc:
        print("No auctions found!")
    else:
        print(f"Testing with auction ID: {auc.id}")
        # Test inserting
        user_id = 4
        # Clean up first
        db.query(UserFavoriteAuction).filter_by(user_id=user_id, auction_id=auc.id).delete()
        db.commit()
        
        # Insert
        fav = UserFavoriteAuction(user_id=user_id, auction_id=auc.id)
        db.add(fav)
        db.commit()
        print("Successfully inserted favorite!")
        
        # Clean up
        db.query(UserFavoriteAuction).filter_by(user_id=user_id, auction_id=auc.id).delete()
        db.commit()
        print("Successfully cleaned up favorite!")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    db.close()
