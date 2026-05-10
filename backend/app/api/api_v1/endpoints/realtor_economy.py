from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.api import deps
from app.models.user import User

router = APIRouter()

class WithdrawalRequestPayload(BaseModel):
    amount_usd: float
    payment_method: str = "paypal"
    payment_details: str

@router.get("/wallet")
def get_wallet_balance(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns the realtor's wallet balance."""
    # First ensure the wallet exists
    row = db.execute(text("SELECT * FROM realtor_wallets WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()
    if not row:
        db.execute(text("""
            INSERT INTO realtor_wallets (user_id, balance, total_earned, total_withdrawn)
            VALUES (:uid, 0, 0, 0)
        """), {"uid": current_user.id})
        db.commit()
        row = db.execute(text("SELECT * FROM realtor_wallets WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()

    # Get available commissions (points) from the ledger to sync the wallet balance
    # Note: A real system might use a trigger or event bus to update the wallet on commission insert.
    commissions = db.execute(text("""
        SELECT SUM(points) as total_earned FROM realtor_commissions
        WHERE realtor_user_id = :uid AND type = 'earned' AND status = 'available'
    """), {"uid": current_user.id}).fetchone()
    
    total_earned_pts = commissions.total_earned or 0
    
    withdrawals = db.execute(text("""
        SELECT SUM(amount) as total_withdrawn FROM withdrawal_requests
        WHERE user_id = :uid AND status IN ('pending', 'approved', 'paid')
    """), {"uid": current_user.id}).fetchone()
    
    total_withdrawn_usd = withdrawals.total_withdrawn or 0
    total_earned_usd = total_earned_pts / 100.0
    balance_usd = total_earned_usd - total_withdrawn_usd

    # Update wallet table
    db.execute(text("""
        UPDATE realtor_wallets 
        SET balance = :balance, total_earned = :earned, total_withdrawn = :withdrawn
        WHERE user_id = :uid
    """), {
        "balance": balance_usd,
        "earned": total_earned_usd,
        "withdrawn": total_withdrawn_usd,
        "uid": current_user.id
    })
    db.commit()

    return {
        "balance": balance_usd,
        "total_earned": total_earned_usd,
        "total_withdrawn": total_withdrawn_usd
    }

@router.post("/withdraw")
def request_withdrawal(
    payload: WithdrawalRequestPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Request a withdrawal from the wallet."""
    if payload.amount_usd < 200:
        raise HTTPException(status_code=400, detail="Minimum withdrawal amount is $200.00")

    # Sync wallet balance
    wallet_resp = get_wallet_balance(db, current_user)
    available_balance = wallet_resp["balance"]

    if payload.amount_usd > available_balance:
        raise HTTPException(status_code=400, detail="Insufficient funds.")

    db.execute(text("""
        INSERT INTO withdrawal_requests (user_id, amount, status, payment_method, payment_details)
        VALUES (:uid, :amount, 'pending', :method, :details)
    """), {
        "uid": current_user.id,
        "amount": payload.amount_usd,
        "method": payload.payment_method,
        "details": payload.payment_details
    })
    
    # Also log a commission entry for the withdrawal
    db.execute(text("""
        INSERT INTO realtor_commissions
            (realtor_user_id, points, usd_value, type, status, description)
        VALUES
            (:uid, :pts, :usd, 'withdrawn', 'pending', 'Withdrawal Request')
    """), {
        "uid": current_user.id,
        "pts": -int(payload.amount_usd * 100),
        "usd": -payload.amount_usd
    })

    db.commit()
    return {"ok": True, "message": "Withdrawal requested successfully."}

@router.get("/withdrawals")
def list_withdrawals(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List withdrawal history."""
    rows = db.execute(text("""
        SELECT * FROM withdrawal_requests WHERE user_id = :uid ORDER BY created_at DESC
    """), {"uid": current_user.id}).fetchall()
    return [dict(r._mapping) for r in rows]

@router.get("/admin/withdrawals")
def admin_list_withdrawals(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """CRM Admin endpoint to view all realtor withdrawal requests."""
    rows = db.execute(text("""
        SELECT w.*, u.full_name, u.email 
        FROM withdrawal_requests w
        JOIN users u ON u.id = w.user_id
        ORDER BY w.created_at DESC
    """)).fetchall()
    return [dict(r._mapping) for r in rows]
