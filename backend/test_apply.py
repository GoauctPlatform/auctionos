import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
from app.db.session import SessionLocal
from app.models.user import User
from app.api.api_v1.endpoints.affiliate import apply_for_affiliate, AffiliateProfileResponse
from fastapi import HTTPException

db = SessionLocal()
user = db.query(User).filter(User.email.isnot(None)).first()
if not user:
    print("No user found")
    sys.exit(0)

print(f"Testing for user {user.email}")
try:
    profile = apply_for_affiliate(db=db, current_user=user)
    print("Applied successfully:", profile.affiliate_code)
    
    # Test pydantic response
    resp = AffiliateProfileResponse.from_orm(profile)
    print("Response serialized:", resp.dict())
except HTTPException as e:
    print("HTTPException:", e.detail)
except Exception as e:
    import traceback
    traceback.print_exc()

