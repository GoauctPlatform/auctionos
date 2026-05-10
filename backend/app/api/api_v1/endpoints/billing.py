from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api import deps
from app.models.user import User
from app.models.monetization import UserSubscription
from app.services.permission_service import PermissionService, PLAN_LIMITS

router = APIRouter()

@router.get("/usage")
def get_current_usage(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Returns current usage stats vs limits for the user's plan.
    """
    sub = PermissionService.get_parent_subscription(db, current_user)
    limits = PLAN_LIMITS.get(sub.plan_type, PLAN_LIMITS["trial"])

    # Provide safe string versions of infinity for the frontend
    def _format_limit(val):
        return "Unlimited" if val == float('inf') else val

    return {
        "plan_type": sub.plan_type,
        "status": sub.status,
        "usage": {
            "views": {
                "used": sub.property_views_used,
                "limit": _format_limit(limits.get("views"))
            },
            "companies": {
                "limit": _format_limit(limits.get("companies"))
            },
            "managers": {
                "limit": _format_limit(limits.get("managers"))
            },
            "agents": {
                "limit": _format_limit(limits.get("agents"))
            }
        },
        "features": {
            "community": limits.get("community"),
            "tasks": limits.get("tasks"),
            "exports": limits.get("exports"),
        }
    }

@router.post("/create-checkout-session")
def create_checkout_session(
    plan: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    MOCK STRIPE ENDPOINT
    Returns a mocked checkout URL.
    """
    if plan not in ["pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
        
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can upgrade the subscription.")

    # In a real app, you would create a Stripe Checkout Session here and return the URL.
    mock_checkout_url = f"https://mock-stripe.com/checkout?plan={plan}&user={current_user.id}"
    
    return {
        "checkout_url": mock_checkout_url,
        "message": "Redirecting to secure payment portal..."
    }

@router.post("/mock-webhook")
def mock_stripe_webhook_success(
    plan: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    MOCK STRIPE ENDPOINT
    Simulates a successful payment webhook to instantly upgrade the user.
    """
    if plan not in ["pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")

    sub = PermissionService.get_parent_subscription(db, current_user)
    sub.plan_type = plan
    sub.status = "active"
    sub.start_date = datetime.now(timezone.utc)
    # Pro/Enterprise plans usually don't expire in a week, they bill monthly. We remove the end_date.
    sub.end_date = None 
    # Reset usage counters upon upgrade
    sub.property_views_used = 0 
    
    db.commit()

    return {"status": "success", "message": f"Successfully upgraded to {plan.upper()}!"}
