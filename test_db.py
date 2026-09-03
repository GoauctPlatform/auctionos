import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import SessionLocal
from app.models.affiliate import AffiliateProfile
db = SessionLocal()
try:
    print(db.query(AffiliateProfile).count())
except Exception as e:
    print("Error:", e)
