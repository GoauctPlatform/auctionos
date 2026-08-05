from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any, List, Optional
import secrets
from datetime import datetime

from app.api import deps
from app.models.user import User
from app.models.affiliate import (
    AffiliateProfile, AffiliateReferral, AffiliateWithdrawal,
    AffiliateStatus, ReferralStatus, WithdrawalStatus, ClearanceStatus
)
from app.schemas.user import User as UserSchema
from pydantic import BaseModel

router = APIRouter()

class AffiliateProfileCreate(BaseModel):
    pass # In the future, we could ask for more data like website, social media, etc.

class AffiliateProfileResponse(BaseModel):
    id: int
    user_id: int
    affiliate_code: str
    status: str
    total_earnings: float
    available_balance: float
    terms_accepted: bool = False
    terms_accepted_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserSchema] = None
    
    class Config:
        from_attributes = True

class ReferralResponse(BaseModel):
    id: int
    referred_user_id: Optional[int]
    status: str
    commission_amount: float
    clearance_status: str
    created_at: datetime
    converted_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class WithdrawalRequestCreate(BaseModel):
    amount: float
    payment_method: str
    payment_details: str

class WithdrawalResponse(BaseModel):
    id: int
    amount: float
    status: str
    payment_method: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

def generate_affiliate_code(db: Session, prefix: str = "AFF") -> str:
    """Generate a unique affiliate code."""
    while True:
        code = f"{prefix}-{secrets.token_hex(3).upper()}"
        if not db.query(AffiliateProfile).filter(AffiliateProfile.affiliate_code == code).first():
            return code

class AffiliateApplyRequest(BaseModel):
    terms_accepted: bool

@router.post("/apply", response_model=AffiliateProfileResponse)
def apply_for_affiliate(
    *,
    db: Session = Depends(deps.get_db),
    apply_in: AffiliateApplyRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Apply to become an affiliate.
    """
    if not apply_in.terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the Affiliate Terms of Service.")

    existing_profile = db.query(AffiliateProfile).filter(AffiliateProfile.user_id == current_user.id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="You already have an affiliate profile.")

    # Generate a unique affiliate code based on user's name or email
    prefix = current_user.full_name[:3].upper() if current_user.full_name else current_user.email[:3].upper()
    affiliate_code = generate_affiliate_code(db, prefix)

    profile = AffiliateProfile(
        user_id=current_user.id,
        affiliate_code=affiliate_code,
        status=AffiliateStatus.PENDING, # Needs admin approval
        terms_accepted=True,
        terms_accepted_at=datetime.utcnow()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/me", response_model=AffiliateProfileResponse)
def get_my_affiliate_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's affiliate profile.
    """
    profile = db.query(AffiliateProfile).filter(AffiliateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
    return profile

@router.get("/me/referrals", response_model=List[ReferralResponse])
def get_my_referrals(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's referrals.
    """
    profile = db.query(AffiliateProfile).filter(AffiliateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
        
    referrals = db.query(AffiliateReferral).filter(AffiliateReferral.affiliate_id == profile.id).order_by(AffiliateReferral.created_at.desc()).all()
    return referrals

@router.get("/me/withdrawals", response_model=List[WithdrawalResponse])
def get_my_withdrawals(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user's withdrawal history.
    """
    profile = db.query(AffiliateProfile).filter(AffiliateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
        
    withdrawals = db.query(AffiliateWithdrawal).filter(AffiliateWithdrawal.affiliate_id == profile.id).order_by(AffiliateWithdrawal.created_at.desc()).all()
    return withdrawals

@router.post("/withdraw", response_model=WithdrawalResponse)
def request_withdrawal(
    *,
    db: Session = Depends(deps.get_db),
    withdrawal_in: WithdrawalRequestCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Request a withdrawal of available balance.
    """
    profile = db.query(AffiliateProfile).filter(AffiliateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
        
    if profile.status != AffiliateStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Your affiliate account is not approved yet.")

    if withdrawal_in.amount < 50.0:
        raise HTTPException(status_code=400, detail="Minimum withdrawal amount is $50.00.")

    if profile.available_balance < withdrawal_in.amount:
        raise HTTPException(status_code=400, detail="Insufficient available balance.")

    # Deduct from available balance (optimistic locking would be better in prod)
    profile.available_balance -= withdrawal_in.amount
    
    withdrawal = AffiliateWithdrawal(
        affiliate_id=profile.id,
        amount=withdrawal_in.amount,
        payment_method=withdrawal_in.payment_method,
        payment_details=withdrawal_in.payment_details,
        status=WithdrawalStatus.PENDING
    )
    
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    
    return withdrawal

@router.get("/admin/all", response_model=List[AffiliateProfileResponse])
def get_all_affiliates(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get all affiliates (Admin only).
    """
    affiliates = db.query(AffiliateProfile).order_by(AffiliateProfile.created_at.desc()).all()
    return affiliates

@router.post("/admin/{id}/approve", response_model=AffiliateProfileResponse)
def approve_affiliate(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Approve an affiliate application (Admin only).
    """
    profile = db.query(AffiliateProfile).filter(AffiliateProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Affiliate profile not found")
        
    profile.status = AffiliateStatus.APPROVED
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/admin/withdrawals", response_model=List[WithdrawalResponse])
def get_all_withdrawals(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get all affiliate withdrawals (Admin only).
    """
    withdrawals = db.query(AffiliateWithdrawal).order_by(AffiliateWithdrawal.created_at.desc()).all()
    return withdrawals

@router.post("/admin/withdrawals/{id}/approve", response_model=WithdrawalResponse)
def approve_withdrawal(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Approve/process a withdrawal (Admin only).
    """
    withdrawal = db.query(AffiliateWithdrawal).filter(AffiliateWithdrawal.id == id).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
        
    withdrawal.status = WithdrawalStatus.PAID
    from datetime import timezone
    withdrawal.processed_at = datetime.now(timezone.utc)
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal
