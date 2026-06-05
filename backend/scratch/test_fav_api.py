import app.db.base
from app.core import security
from app.models.user import User
from app.models.auction_event import AuctionEvent
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import urllib.request
import urllib.error
import json

from app.core.config import settings
settings.SECRET_KEY = "changethiskeyinproduction"

# Connect to local database container
engine = create_engine('postgresql://user:password@localhost:5433/auctionos')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == 'client@test.com').first()
    auc = db.query(AuctionEvent).first()
    if not user or not auc:
        print("User or Auction not found!")
    else:
        # Generate token
        token = security.create_access_token(user.id)
        print(f"Generated token for user {user.email} (ID {user.id}): {token}")
        
        # Test GET favorites
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # 1. Add favorite
        url_add = f"http://localhost:8000/api/v1/auctions/favorites/{auc.id}"
        req_add = urllib.request.Request(url_add, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req_add) as res:
                print(f"ADD status: {res.status}")
                print(f"ADD response: {res.read().decode()}")
        except urllib.error.HTTPError as e:
            print(f"ADD failed: {e.code} - {e.read().decode()}")

        # 2. Get favorites
        url_get = "http://localhost:8000/api/v1/auctions/favorites"
        req_get = urllib.request.Request(url_get, headers=headers, method='GET')
        try:
            with urllib.request.urlopen(req_get) as res:
                print(f"GET status: {res.status}")
                print(f"GET response: {res.read().decode()}")
        except urllib.error.HTTPError as e:
            print(f"GET failed: {e.code} - {e.read().decode()}")

        # 3. Remove favorite
        url_del = f"http://localhost:8000/api/v1/auctions/favorites/{auc.id}"
        req_del = urllib.request.Request(url_del, headers=headers, method='DELETE')
        try:
            with urllib.request.urlopen(req_del) as res:
                print(f"DEL status: {res.status}")
                print(f"DEL response: {res.read().decode()}")
        except urllib.error.HTTPError as e:
            print(f"DEL failed: {e.code} - {e.read().decode()}")

except Exception as e:
    print(f"General ERROR: {e}")
finally:
    db.close()
