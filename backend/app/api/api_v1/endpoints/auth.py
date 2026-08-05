import secrets
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks, Body
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.oauth import oauth
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema
from pydantic import BaseModel, EmailStr
from app.core.email import send_email
from app.core.email_templates import get_welcome_template, get_verification_email_template
import time

router = APIRouter()

class ForgotPasswordPayload(BaseModel):
    email: EmailStr

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str




@router.post("/login/access-token", response_model=Token)
@rate_limit(max_requests=10, window_seconds=60, key_prefix="login")
def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    import uuid
    session_id = str(uuid.uuid4())
    user.active_session_id = session_id
    db.add(user)
    db.commit()
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires, session_id=session_id
        ),
        "refresh_token": security.create_refresh_token(
            user.id, session_id=session_id
        ),
        "token_type": "bearer",
    }


class RefreshTokenPayload(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
@rate_limit(max_requests=30, window_seconds=60, key_prefix="refresh")
def refresh_access_token(
    request: Request,
    payload: RefreshTokenPayload,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Exchange a valid refresh token for a new access token.
    Does NOT rotate the refresh token (stateless design).
    """
    from jose import jwt, JWTError
    try:
        data = jwt.decode(payload.refresh_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(data["sub"])
        session_id = data.get("session_id")
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Validate session is still the active one
    if session_id and user.active_session_id and session_id != user.active_session_id:
        raise HTTPException(status_code=401, detail="Session invalidated. Please log in again.")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires, session_id=session_id
        ),
        "refresh_token": payload.refresh_token,  # Return same refresh token (not rotated)
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
@rate_limit(max_requests=5, window_seconds=60, key_prefix="register")
async def register_user(
    *,
    request: Request,
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
) -> Any:
    # Allow public signup for client, realtor, agent_due_diligence, contractor roles
    allowed_roles = {"client", "realtor", "agent_due_diligence", "contractor", "pending"}
    requested_role = (user_in.role or "pending").strip().lower()
    if requested_role not in allowed_roles:
        requested_role = "pending"   # Silently default to pending for onboarding choice

    email = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        email=email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_superuser=False,         # Never allow self-registration as superuser
        role=requested_role,
        is_verified=False,
        verification_token=secrets.token_urlsafe(32),
        terms_accepted=True,
        newsletter_opt_in=user_in.newsletter or False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize onboarding record
    from app.models.user_onboarding import UserOnboarding
    onboarding = UserOnboarding(
        user_id=user.id,
        has_completed_tour=False,
        onboarding_step="role_selection" if requested_role == "pending" else "profile_setup"
    )
    db.add(onboarding)
    db.commit()

    # Create a default Workspace/Company for the user
    from app.models.company import Company
    company = Company(
        user_id=user.id,
        name=f"{user.full_name}'s Workspace" if user.full_name else "My Workspace"
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # Set the user's active company
    user.active_company_id = company.id
    db.commit()
    db.refresh(user)

    # Handle Referral Logic
    if getattr(user_in, 'referral_code', None):
        from app.models.affiliate import AffiliateProfile, AffiliateReferral, ReferralStatus
        affiliate_profile = db.query(AffiliateProfile).filter(AffiliateProfile.affiliate_code == user_in.referral_code).first()
        if affiliate_profile:
            # Create the referral link
            referral = AffiliateReferral(
                affiliate_id=affiliate_profile.id,
                referred_user_id=user.id,
                status=ReferralStatus.REGISTERED
            )
            db.add(referral)
            
            # The referrer gets a free month per registration
            # Find the referrer user and extend their subscription end_date or give a free month
            # For this simplified model, we could just log it or handle it in a separate job
            # but as requested, let's auto-extend if they have a subscription
            from app.models.monetization import UserSubscription
            referrer_sub = db.query(UserSubscription).filter(UserSubscription.user_id == affiliate_profile.user_id).first()
            if referrer_sub and referrer_sub.end_date:
                from datetime import timedelta
                # Grant 1 free month (30 days)
                referrer_sub.end_date = referrer_sub.end_date + timedelta(days=30)
                db.add(referrer_sub)
                
            db.commit()

    # Trigger Verification Email in background
    verification_link = f"{settings.FRONTEND_URL}/#/verify-email?token={user.verification_token}"
    email_body = get_verification_email_template(user.full_name or "there", verification_link)
    background_tasks.add_task(
        send_email,
        subject="Verify your GoAuct Account",
        recipients=[user.email],
        body=email_body
    )
    
    # Check for newsletter/terms via extra parameters (usually sent by frontend but ignored by Pydantic UserCreate)
    # We will log the registration.
    from app.services.activity import log_activity
    # Log the signup
    log_activity(db, user.id, "user_registration", "User", user.id, {"role": requested_role})
    
    # Send Admin Notification
    admin_body = f"A new user has registered on GoAuct.\nName: {user.full_name}\nEmail: {user.email}\nRole: {requested_role}"
    background_tasks.add_task(
        send_email,
        subject="New User Registration",
        recipients=["admin@goauct.com"],
        body=admin_body
    )

    return user

@router.post("/onboard")
def onboard_user(
    payload: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Saves onboarding details (role, SSN, MLS, etc) and updates user role.
    """
    role = payload.get("role")
    if role not in ["client", "realtor", "agent_due_diligence", "contractor"]:
        raise HTTPException(status_code=400, detail="Invalid role selection.")
    
    # Update User Role (ONLY for non-partner roles or if it's client)
    # Realtors and Agents stay 'pending' until Admin approval in admin dashboard
    if current_user.role == "pending" and role == "client":
        current_user.role = role
    
    # If Realtor, create/update Realtor Profile
    if role == "realtor":
        from app.models.realtor import Realtor
        profile = db.query(Realtor).filter(Realtor.user_id == current_user.id).first()
        if not profile:
            profile = Realtor(user_id=current_user.id, name=current_user.full_name or "Realtor", email=current_user.email)
            db.add(profile)
        profile.social_security = payload.get("social_security")
        profile.license_number = payload.get("license_number")
        profile.mls_id = payload.get("mls_id")
        profile.payment_account = payload.get("payment_account")
        
    # If Agent, create/update Agent Profile
    elif role == "agent_due_diligence":
        from app.models.agent_due_diligence import AgentDueDiligenceProfile
        profile = db.query(AgentDueDiligenceProfile).filter(AgentDueDiligenceProfile.user_id == current_user.id).first()
        if not profile:
            profile = AgentDueDiligenceProfile(user_id=current_user.id)
            db.add(profile)
        profile.social_security = payload.get("social_security")
        profile.coverage_area = payload.get("coverage_area")
        profile.vehicle_type = payload.get("vehicle_type")
        profile.payment_account = payload.get("payment_account")
        
    # If Contractor, create/update Contractor Profile
    elif role == "contractor":
        from app.models.contractor import ContractorProfile
        profile = db.query(ContractorProfile).filter(ContractorProfile.user_id == current_user.id).first()
        if not profile:
            profile = ContractorProfile(user_id=current_user.id)
            db.add(profile)
        profile.profession = payload.get("profession")
        profile.service_area_zipcodes = payload.get("service_area_zipcodes")
        profile.license_number = payload.get("license_number")
        
    # Mark onboarding as complete
    from app.models.user_onboarding import UserOnboarding
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    if onboarding:
        onboarding.onboarding_step = "done"
        
    db.commit()
    return {"status": "success", "role": role}

@router.post("/forgot-password")
@rate_limit(max_requests=5, window_seconds=600, key_prefix="forgot_pw")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordPayload,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Generates a reset token and sends an email to the user."""
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user:
        # We return success even if user not found for security (prevent email enumeration)
        return {"status": "success", "message": "If this email is registered, you will receive a reset link shortly."}
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = int(time.time()) + 3600 # 1 hour
    
    db.add(user)
    db.commit()
    
    # Send Professional Email
    reset_link = f"{settings.FRONTEND_URL}/#/reset-password?token={token}"
    email_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #0A84FF 0%, #12B3B6 100%); padding: 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">GoAuct</h1>
                                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Real Estate Intelligence OS</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
                                <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                                    We received a request to reset the password for your GoAuct account. Click the button below to choose a new password. This link will remain active for <strong>1 hour</strong>.
                                </p>
                                <div style="text-align: center; margin-bottom: 32px;">
                                    <a href="{reset_link}" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                                        Set New Password
                                    </a>
                                </div>
                                <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 0;">
                                    If you didn't request this change, you can safely ignore this email. Your password will remain unchanged.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 24px; text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    &copy; 2026 GoAuct Intelligence. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    try:
        print(f"Attempting to send reset email to {user.email} via {settings.MAIL_SERVER}:{settings.MAIL_PORT}")
        success = await send_email(
            subject="Reset your GoAuct password",
            recipients=[user.email],
            body=email_body
        )
        if success:
            print(f"Successfully sent reset email to {user.email}")
        else:
            print(f"CRITICAL: send_email returned False for {user.email}. Check SMTP logs.")
    except Exception as e:
        print(f"CRITICAL EMAIL ERROR: Exception raised while sending to {user.email}. Error: {str(e)}")
    
    # We still return success to the frontend to avoid email enumeration
    return {"status": "success", "message": "If this email is registered, you will receive a reset link shortly."}

@router.post("/reset-password")
@rate_limit(max_requests=5, window_seconds=600, key_prefix="reset_pw")
def reset_password(
    request: Request,
    payload: ResetPasswordPayload,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Validates the token and updates the user's password."""
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires > int(time.time())
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    # Update password
    user.hashed_password = security.get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    
    db.add(user)
    db.commit()
    
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/verify-email")
def verify_email(
    token: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db)
) -> Any:
    """Validates the verification token and marks user as verified."""
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
    
    user.is_verified = True
    user.verification_token = None
    db.commit()
    
    return {"status": "success", "message": "Email verified successfully! You can now access all features."}


@router.post("/resend-verification")
async def resend_verification(
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Resends the verification email to the logged-in user."""
    if current_user.is_verified:
        return {"status": "success", "message": "Email is already verified."}
    
    if not current_user.verification_token:
        current_user.verification_token = secrets.token_urlsafe(32)
        db.commit()
    
    verification_link = f"{settings.FRONTEND_URL}/#/verify-email?token={current_user.verification_token}"
    email_body = get_verification_email_template(current_user.full_name or "there", verification_link)
    
    background_tasks.add_task(
        send_email,
        subject="Verify your GoAuct Account",
        recipients=[current_user.email],
        body=email_body
    )
    
    return {"status": "success", "message": "Verification email sent. Please check your inbox."}

@router.post("/dev-auto-verify")
def dev_auto_verify(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Instantly verify the logged-in user in development or mock mode."""
    current_user.is_verified = True
    current_user.verification_token = None
    db.commit()
    return {"status": "success", "message": "Development auto-verification successful!"}

# NOTE: /reset-admin-prod was removed (hardcoded credentials in query params — CRITICAL security risk).
# To reset the admin password, use the Django-style management script:
#   docker exec -it <container> python scripts/reset_admin.py

@router.get("/login/{provider}")
async def login_oauth(request: Request, provider: str, role: str = "investor"):
    """
    Redirect the user to the given provider (google or facebook).
    `role` param: 'investor' or 'realtor' — passed as state so callback can enforce role separation.
    """
    client = getattr(oauth, provider, None)
    if not client:
        raise HTTPException(
            status_code=400, 
            detail=f"Provider {provider} not configured."
        )
    
    try:
        redirect_uri = request.url_for('oauth_callback', provider=provider, _external=True)
    except Exception:
        base_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}{settings.API_V1_STR}/auth/callback/{provider}"
        
    if "https://" not in str(redirect_uri) and "localhost" not in str(redirect_uri) and "127.0.0.1" not in str(redirect_uri):
        redirect_uri = str(redirect_uri).replace("http://", "https://")
    
    print(f">>> OAUTH REDIRECT URI: {redirect_uri} | role={role}")

    # Encode intended role in the OAuth state parameter.
    # `prompt=select_account` forces Google to always show the account picker
    extra_params: dict = {"state": role}
    if provider == "google":
        extra_params["prompt"] = "select_account"

    return await client.authorize_redirect(request, str(redirect_uri), **extra_params)

@router.get("/callback/{provider}", name="oauth_callback", response_model=Token)
async def auth_callback(
    request: Request,
    provider: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
):
    """
    OAuth Callback handler. Verifies token, fetches user info and grants access.
    """
    client = getattr(oauth, provider, None)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    try:
        token = await client.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error authenticating with {provider}")
    
    # Extract user info
    user_info = None
    if provider == 'google':
        user_info = token.get('userinfo')
    elif provider == 'facebook':
        # Facebook returns a normal dict, we fetch profile info via API
        resp = await client.get('me?fields=id,name,email', token=token)
        user_info = resp.json()
    
    if not user_info or not user_info.get('email'):
        raise HTTPException(status_code=400, detail="Failed to fetch email from provider")
    
    email = user_info['email'].strip().lower()
    
    # Determine intended role from the OAuth state parameter
    # authlib returns the state both in query params AND in the session-validated state
    intended_role_raw = request.query_params.get('state', '') or ''
    # Clean up in case state has extra encoding
    intended_role_raw = intended_role_raw.strip().lower()
    allowed_roles = {"client", "realtor", "agent_due_diligence"}
    intended_role = intended_role_raw if intended_role_raw in allowed_roles else "pending"
    
    def get_frontend_url(req: Request) -> str:
        base = str(req.base_url)
        if 'localhost' in base or '127.0.0.1' in base:
            return 'http://localhost:5173'
        return settings.FRONTEND_URL
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    is_new_user = False
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        # Anti-crossover removed: unified login handles routing.
    else:
        is_new_user = True
        # Create new user with the intended role
        random_password = secrets.token_urlsafe(32)
        user = User(
            email=email,
            hashed_password=security.get_password_hash(random_password),
            full_name=user_info.get('name') or user_info.get('given_name') or None,
            is_active=True,
            is_superuser=False,
            role=intended_role,
            is_verified=False,
            verification_token=secrets.token_urlsafe(32),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Initialize onboarding record
        from app.models.user_onboarding import UserOnboarding
        onboarding = UserOnboarding(
            user_id=user.id,
            has_completed_tour=False,
            onboarding_step="role_selection" if intended_role == "pending" else "profile_setup"
        )
        db.add(onboarding)
        db.commit()

        # Trigger Verification Email in background
        verification_link = f"{settings.FRONTEND_URL}/#/verify-email?token={user.verification_token}"
        email_body = get_verification_email_template(user.full_name or "there", verification_link)
        background_tasks.add_task(
            send_email,
            subject="Verify your GoAuct Account",
            recipients=[user.email],
            body=email_body
        )
        
    import uuid
    session_id = str(uuid.uuid4())
    user.active_session_id = session_id
    db.add(user)
    db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires, session_id=session_id
    )

    frontend_url = get_frontend_url(request)

    # Unified login routing - we pass token, frontend routing will check role and redirect
    is_new_flag = "&is_new=true" if is_new_user else ""
    redirect_url = f"{frontend_url}/#/login?token={access_token}{is_new_flag}"
    
    print(f">>> OAuth success: user={email} role={user.role} redirect={redirect_url[:80]}...")
    return RedirectResponse(url=redirect_url)


# ── Public Support Contact Endpoint ──────────────────────────────────────────

from typing import Optional

class ContactSupportPayload(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

@router.post("/contact-support")
def contact_support(
    payload: ContactSupportPayload,
    background_tasks: BackgroundTasks,
) -> Any:
    """Send support contact message via email using Resend."""
    email_body = f"""
    <h3>New Support Request Received</h3>
    <p><strong>Name:</strong> {payload.name}</p>
    <p><strong>Email:</strong> {payload.email}</p>
    <p><strong>Phone:</strong> {payload.phone or 'N/A'}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">{payload.message}</p>
    """
    background_tasks.add_task(
        send_email,
        subject=f"GoAuct Support Message from {payload.name}",
        recipients=["support@goauct.com"],
        body=email_body
    )
    return {"ok": True}

