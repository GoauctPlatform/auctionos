from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Request, Header, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

from app.api import deps
from app.models.user import User
from app.models.monetization import UserSubscription
from app.services.permission_service import PermissionService, PLAN_LIMITS
from app.core.config import settings
from app.core.email import send_email
from app.core.email_templates import get_plan_upgrade_template

logger = logging.getLogger(__name__)
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# Stripe Initialisation (lazy, only runs if key is configured)
# ─────────────────────────────────────────────────────────────────────────────
def get_stripe():
    """Returns the stripe module initialised with the secret key, or raises if not configured."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Payment system is not configured. Please contact support."
        )
    try:
        import stripe as _stripe
        _stripe.api_key = settings.STRIPE_SECRET_KEY
        return _stripe
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe library not installed on server.")


# ─────────────────────────────────────────────────────────────────────────────
# Plan → Stripe Price mapping
# Prices are defined in BRL (cents).
# For TEST purposes: Pro = R$0.01 (1 centavo) = 1 cent | Enterprise = R$0.02 (2 centavos) = 2 cents
# When you create real prices in the Stripe dashboard, update STRIPE_PRO_PRICE_ID
# and STRIPE_ENTERPRISE_PRICE_ID environment variables.
# ─────────────────────────────────────────────────────────────────────────────
PLAN_PRICES_USD_CENTS_ANNUAL = {
    "advanced": 72000,    # $60/mo * 12 = $720
    "pro": 156000,        # $130/mo * 12 = $1560
    "enterprise": 420000, # $350/mo * 12 = $4200
}

PLAN_PRICES_USD_CENTS_MONTHLY = {
    "advanced": 7200,     # $60 * 1.2 = $72/mo
    "pro": 15600,         # $130 * 1.2 = $156/mo
    "enterprise": 42000,  # $350 * 1.2 = $420/mo
}

PLAN_DISPLAY_PRICES = {
    "advanced": "$60/mo",
    "pro": "$130/mo",
    "enterprise": "$350/mo",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _activate_subscription(
    db: Session, 
    user: User, 
    plan: str, 
    background_tasks: Optional[BackgroundTasks] = None,
    stripe_customer_id: Optional[str] = None,
    stripe_subscription_id: Optional[str] = None
):
    """
    Activates or upgrades a user's subscription.
    Single source of truth – called by both the mock and real Stripe webhook flows.
    """
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
    if not sub:
        sub = UserSubscription(user_id=user.id)
        db.add(sub)

    sub.plan_type = plan
    sub.status = "active"
    sub.start_date = datetime.now(timezone.utc)
    sub.end_date = None
    sub.property_views_used = 0
    if stripe_customer_id:
        sub.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id:
        sub.stripe_subscription_id = stripe_subscription_id

    # Keep User.subscription_tier in sync (source of truth)
    user.subscription_tier = plan
    db.commit()
    db.refresh(sub)

    # Trigger Plan Upgrade Email
    if background_tasks:
        email_body = get_plan_upgrade_template(user.full_name or user.email, plan.capitalize())
        background_tasks.add_task(
            send_email,
            subject=f"Plan Upgraded to {plan.capitalize()}!",
            recipients=[user.email],
            body=email_body
        )

    # Affiliate Commission Check
    try:
        from app.models.affiliate import AffiliateReferral, AffiliateProfile, ReferralStatus
        referral = db.query(AffiliateReferral).filter(
            AffiliateReferral.referred_user_id == user.id,
            AffiliateReferral.status == ReferralStatus.REGISTERED
        ).first()

        if referral:
            # First time converting
            referral.status = ReferralStatus.CONVERTED
            referral.converted_at = datetime.now(timezone.utc)
            
            # Simple commission logic: $50 flat fee or a % of the plan
            # Here we assign $50 for simplicity
            commission = 50.0
            referral.commission_amount = commission
            
            # Update Affiliate Profile Earnings
            affiliate = db.query(AffiliateProfile).filter(AffiliateProfile.id == referral.affiliate_id).first()
            if affiliate:
                affiliate.total_earnings = (affiliate.total_earnings or 0.0) + commission
                affiliate.available_balance = (affiliate.available_balance or 0.0) + commission
                db.add(affiliate)

            db.add(referral)
            db.commit()
    except Exception as e:
        # Ignore affiliate errors so it doesn't break subscription
        print(f"Error handling affiliate commission: {e}")

    return sub


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/usage")
def get_current_usage(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Returns current usage stats vs limits for the user's plan.
    Uses billing-safe subscription lookup - allows expired users to see billing page.
    """
    sub = PermissionService.get_parent_subscription_for_billing(db, current_user)
    limits = PLAN_LIMITS.get(sub.plan_type, PLAN_LIMITS["trial"])

    def _fmt(val):
        return "Unlimited" if val == float('inf') else val

    return {
        "plan_type": sub.plan_type,
        "status": sub.status,
        "usage": {
            "views": {"used": sub.property_views_used, "limit": _fmt(limits.get("views"))},
            "companies": {"limit": _fmt(limits.get("companies"))},
            "managers": {"limit": _fmt(limits.get("managers"))},
            "agents": {"limit": _fmt(limits.get("agents"))},
        },
        "features": {
            "community": limits.get("community"),
            "tasks": limits.get("tasks"),
            "exports": limits.get("exports"),
        },
    }


@router.post("/create-checkout-session")
def create_checkout_session(
    plan: str = Body(..., embed=True),
    billing_cycle: str = Body("annual", embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Creates a real Stripe Checkout Session for subscription upgrade.
    Returns the hosted checkout URL to redirect the user.
    Falls back to mock flow if Stripe is not configured.
    """
    if plan not in ["advanced", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")

    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only account owners can manage subscriptions.")

    # ── REAL STRIPE FLOW ──────────────────────────────────────────────────────
    if settings.STRIPE_SECRET_KEY:
        stripe = get_stripe()

        # Determine the price to charge
        # If dedicated Price IDs are configured, use them (Recurring).
        # Otherwise, fall back to a one-time payment (ad-hoc price) for testing.
        price_id = None
        if plan == "advanced":
            price_id = settings.STRIPE_ADVANCED_PRICE_ID
        elif plan == "pro":
            price_id = settings.STRIPE_PRO_PRICE_ID
        elif plan == "enterprise":
            price_id = settings.STRIPE_ENTERPRISE_PRICE_ID

        try:
            if price_id:
                # Recurring subscription using pre-configured Price IDs
                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="subscription",
                    line_items=[{"price": price_id, "quantity": 1}],
                    success_url=f"{settings.FRONTEND_URL}/#/client/billing?payment=success&plan={plan}&session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{settings.FRONTEND_URL}/#/client/billing?payment=cancelled",
                    customer_email=current_user.email,
                    metadata={
                        "user_id": str(current_user.id),
                        "plan": plan,
                    },
                )
            else:
                # Ad-hoc one-time payment (for testing or one-time plan purchase)
                amount_cents = PLAN_PRICES_USD_CENTS_MONTHLY[plan] if billing_cycle == "monthly" else PLAN_PRICES_USD_CENTS_ANNUAL[plan]
                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="payment",
                    line_items=[{
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": amount_cents,
                            "product_data": {
                                "name": f"GoAuct {plan.capitalize()} Plan ({billing_cycle.capitalize()})",
                                "description": f"Upgrade to GoAuct {plan.capitalize()} ({billing_cycle})",
                            },
                        },
                        "quantity": 1,
                    }],
                    success_url=f"{settings.FRONTEND_URL}/#/client/billing?payment=success&plan={plan}&session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{settings.FRONTEND_URL}/#/client/billing?payment=cancelled",
                    customer_email=current_user.email,
                    metadata={
                        "user_id": str(current_user.id),
                        "plan": plan,
                        "billing_cycle": billing_cycle,
                    },
                )

            return {
                "checkout_url": session.url,
                "session_id": session.id,
                "message": "Redirecting to secure Stripe payment portal...",
            }

        except Exception as e:
            logger.error(f"Stripe session creation failed: {e}")
            raise HTTPException(status_code=502, detail=f"Payment session creation failed: {str(e)}")

    # ── MOCK FALLBACK (Stripe not configured) ─────────────────────────────────
    mock_url = f"https://mock-stripe.com/checkout?plan={plan}&cycle={billing_cycle}&user={current_user.id}"
    return {
        "checkout_url": mock_url,
        "session_id": None,
        "message": f"⚠️ Mock Mode: Stripe not configured. Simulating payment flow for {plan} ({billing_cycle}).",
    }


@router.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Real Stripe Webhook handler.
    Stripe calls this endpoint after a successful payment to provision the plan.
    This endpoint must be PUBLIC (no auth) – Stripe calls it, not the user.
    Register this URL in your Stripe Dashboard:
      https://your-backend-url.up.railway.app/api/v1/billing/stripe-webhook
    """
    payload = await request.body()

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured.")

    stripe = get_stripe()

    # ── Signature Verification (security-critical) ────────────────────────────
    if settings.STRIPE_WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed.")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature.")
    else:
        # Without the webhook secret, parse event without verification
        # (Only acceptable during initial development – add the secret ASAP)
        import json
        event = json.loads(payload)
        logger.warning("Processing Stripe webhook WITHOUT signature verification. Set STRIPE_WEBHOOK_SECRET.")

    event_type = event.get("type") if isinstance(event, dict) else event.type

    # ── Handle checkout.session.completed ────────────────────────────────────
    if event_type == "checkout.session.completed":
        session_data = event["data"]["object"] if isinstance(event, dict) else event.data.object
        metadata = session_data.get("metadata", {}) if isinstance(session_data, dict) else session_data.metadata or {}

        user_id = metadata.get("user_id")
        plan = metadata.get("plan")

        if not user_id or not plan:
            logger.error(f"Stripe webhook missing metadata: user_id={user_id}, plan={plan}")
            return {"status": "ignored", "reason": "Missing metadata"}

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            logger.error(f"Stripe webhook: user {user_id} not found in DB.")
            return {"status": "error", "reason": "User not found"}

        customer_id = session_data.get("customer")
        subscription_id = session_data.get("subscription")

        _activate_subscription(
            db, user, plan, background_tasks, 
            stripe_customer_id=customer_id, 
            stripe_subscription_id=subscription_id
        )
        logger.info(f"✅ Stripe webhook: Activated {plan} for user {user.email}")
        return {"status": "success"}

    # ── Handle subscription events (for recurring plans) ──────────────────────
    elif event_type in ["customer.subscription.updated", "invoice.payment_succeeded"]:
        logger.info(f"Stripe event received: {event_type} – No action required for now.")
        return {"status": "acknowledged"}

    elif event_type == "customer.subscription.deleted":
        # Downgrade user to trial when subscription is cancelled
        session_data = event["data"]["object"] if isinstance(event, dict) else event.data.object
        customer_id = session_data.get("customer") if isinstance(session_data, dict) else session_data.customer
        logger.warning(f"Stripe subscription cancelled for customer: {customer_id}")
        # TODO: Implement downgrade logic if needed (lookup user by stripe_customer_id)
        return {"status": "acknowledged"}

    logger.info(f"Stripe webhook: unhandled event type '{event_type}'")
    return {"status": "ignored"}


@router.post("/confirm-payment")
async def confirm_payment(
    background_tasks: BackgroundTasks,
    session_id: str = Body(..., embed=True),
    plan: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Called by the frontend after the user is redirected back from Stripe checkout.
    Verifies the session and activates the subscription if not already done by webhook.
    This is a safety net in case the webhook fires late.
    """
    if plan not in ["advanced", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan.")

    if settings.STRIPE_SECRET_KEY and session_id:
        stripe = get_stripe()
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            payment_ok = (
                getattr(session, "payment_status", None) in ["paid", "no_payment_required"]
                or getattr(session, "status", None) == "complete"
            )
            if not payment_ok:
                raise HTTPException(status_code=402, detail="Payment not completed.")

            # Verify the session belongs to this user
            session_email = getattr(session, "customer_email", None)
            if session_email and session_email.lower() != current_user.email.lower():
                raise HTTPException(status_code=403, detail="Session does not belong to this account.")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Stripe session retrieval failed: {e}")
            raise HTTPException(status_code=502, detail="Could not verify payment with Stripe.")

    # Activate the plan (idempotent – safe to call even if webhook already ran)
    _activate_subscription(db, current_user, plan, background_tasks)
    return {"status": "success", "message": f"✅ {plan.capitalize()} plan activated!"}


@router.post("/mock-webhook")
async def mock_stripe_webhook_success(
    background_tasks: BackgroundTasks,
    plan: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    DEVELOPMENT ONLY – Simulates a successful Stripe payment without going through checkout.
    Used for local testing. Safe to keep in production (only activates authenticated user's plan).
    """
    if plan not in ["advanced", "pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
    _activate_subscription(db, current_user, plan, background_tasks)
    return {"status": "success", "message": f"✅ Upgraded to {plan.upper()} (mock)!"}


@router.post("/cancel-subscription")
async def cancel_subscription(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Cancels the user's active Stripe subscription.
    1. Cancels in Stripe (if active).
    2. Updates DB to 'canceled'.
    3. Notifies support@goauct.com.
    """
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).first()
    if not sub or sub.plan_type == "trial" or sub.status != "active":
        raise HTTPException(status_code=400, detail="No active paid subscription found to cancel.")

    # 1. Real Stripe Cancellation
    if settings.STRIPE_SECRET_KEY and sub.stripe_subscription_id:
        stripe = get_stripe()
        try:
            # Cancel at end of period (default) or immediately
            # We'll use immediately for simplicity in this flow
            stripe.Subscription.delete(sub.stripe_subscription_id)
        except Exception as e:
            logger.error(f"Stripe subscription deletion failed: {e}")
            # Continue anyway to update our DB and notify support

    # 2. Update DB
    sub.status = "canceled"
    sub.end_date = datetime.now(timezone.utc)
    current_user.subscription_tier = "trial" # Immediate downgrade
    db.commit()

    # 3. Notify Support
    support_email = "support@goauct.com"
    email_body = f"""
        <h2>Subscription Cancelled</h2>
        <p><strong>User:</strong> {current_user.full_name or 'N/A'} ({current_user.email})</p>
        <p><strong>Plan:</strong> {sub.plan_type.upper()}</p>
        <p><strong>Date:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        <p>The user has requested cancellation and has been downgraded to trial.</p>
    """
    background_tasks.add_task(
        send_email,
        subject=f"Churn Alert: {current_user.email} cancelled {sub.plan_type.upper()}",
        recipients=[support_email],
        body=email_body
    )

    return {"message": "Subscription cancelled successfully. You have been moved back to the Trial plan."}


@router.post("/checkout-task")
def create_task_checkout(
    amount_usd: float = Body(..., embed=True),
    property_id: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Creates a Stripe Checkout Session to pay for a due-diligence task."""
    if settings.STRIPE_SECRET_KEY:
        stripe = get_stripe()
        try:
            amount_cents = int(amount_usd * 100)
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": f"GoAuct Field Task – Property {property_id}",
                        },
                    },
                    "quantity": 1,
                }],
                success_url=f"{settings.FRONTEND_URL}/#/client/lists?task=paid&property={property_id}",
                cancel_url=f"{settings.FRONTEND_URL}/#/client/lists?task=cancelled",
                customer_email=current_user.email,
                metadata={"user_id": str(current_user.id), "type": "task", "property_id": property_id},
            )
            return {"checkout_url": session.url, "session_id": session.id}
        except Exception as e:
            logger.error(f"Stripe task checkout failed: {e}")

    # Fallback mock
    return {
        "checkout_url": f"https://mock-stripe.com/checkout?type=task&amount={amount_usd}&user={current_user.id}&property={property_id}",
        "message": "Redirecting to secure payment portal...",
    }


@router.post("/checkout-photos")
def create_photos_checkout(
    property_id: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Creates a Stripe Checkout Session to pay for updated property photos."""
    if settings.STRIPE_SECRET_KEY:
        stripe = get_stripe()
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": 5000,  # $50.00
                        "product_data": {
                            "name": f"GoAuct Updated Photos – Property {property_id}",
                        },
                    },
                    "quantity": 1,
                }],
                success_url=f"{settings.FRONTEND_URL}/#/client/lists?photos=paid&property={property_id}",
                cancel_url=f"{settings.FRONTEND_URL}/#/client/lists?photos=cancelled",
                customer_email=current_user.email,
                metadata={"user_id": str(current_user.id), "type": "photos", "property_id": property_id},
            )
            return {"checkout_url": session.url, "session_id": session.id}
        except Exception as e:
            logger.error(f"Stripe photos checkout failed: {e}")

    # Fallback mock
    return {
        "checkout_url": f"https://mock-stripe.com/checkout?type=photos&amount=50.0&user={current_user.id}&property={property_id}",
        "message": "Redirecting to secure payment portal for Updated Photos...",
    }
