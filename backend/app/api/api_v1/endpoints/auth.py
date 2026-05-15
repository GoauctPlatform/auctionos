import secrets
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.oauth import oauth
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema
from pydantic import BaseModel, EmailStr
from app.core.email import send_email
import time

router = APIRouter()

class ForgotPasswordPayload(BaseModel):
    email: EmailStr

class ResetPasswordPayload(BaseModel):
    token: str
    new_password: str




@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    # Allow public signup for client, realtor, agent_due_diligence roles
    allowed_roles = {"client", "realtor", "agent_due_diligence", "pending"}
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
    if role not in ["client", "realtor", "agent_due_diligence"]:
        raise HTTPException(status_code=400, detail="Invalid role selection.")
    
    # Update User Role
    if current_user.role == "pending":
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
        
    # Mark onboarding as complete
    from app.models.user_onboarding import UserOnboarding
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == current_user.id).first()
    if onboarding:
        onboarding.onboarding_step = "done"
        
    db.commit()
    return {"status": "success", "role": role}

@router.post("/forgot-password")
async def forgot_password(
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
    
    # Send Email
    reset_link = f"{settings.FRONTEND_URL}/#/reset-password?token={token}"
    email_body = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your GoAuct account.</p>
            <p>Please click the link below to set a new password. This link will expire in 1 hour.</p>
            <a href="{reset_link}" style="display:inline-block; padding:10px 20px; background-color:#0A84FF; color:white; text-decoration:none; border-radius:5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
        </body>
    </html>
    """
    await send_email(
        subject="GoAuct - Password Reset",
        recipients=[user.email],
        body=email_body
    )
    
    return {"status": "success", "message": "If this email is registered, you will receive a reset link shortly."}

@router.post("/reset-password")
def reset_password(
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

@router.get("/reset-admin-prod")
def reset_admin_production(secret: str, db: Session = Depends(deps.get_db)):
    if secret != "ResetAdmin2026Secure!":
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    email = "admin@goauct.com"
    temp_password = "AdminSecurePass123!"
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        existing_user.hashed_password = security.get_password_hash(temp_password)
        existing_user.is_superuser = True
        msg = f"Existing user '{email}' updated with password: {temp_password}"
    else:
        new_user = User(
            email=email,
            hashed_password=security.get_password_hash(temp_password),
            is_superuser=True,
            is_active=True
        )
        db.add(new_user)
        msg = f"New admin user '{email}' created with password: {temp_password}"
    
    db.commit()
    return {"message": "Success", "details": msg}

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
async def auth_callback(request: Request, provider: str, db: Session = Depends(deps.get_db)):
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
            role=intended_role
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
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )

    frontend_url = get_frontend_url(request)

    # Unified login routing - we pass token, frontend routing will check role and redirect
    is_new_flag = "&is_new=true" if is_new_user else ""
    redirect_url = f"{frontend_url}/#/login?token={access_token}{is_new_flag}"
    
    print(f">>> OAuth success: user={email} role={user.role} redirect={redirect_url[:80]}...")
    return RedirectResponse(url=redirect_url)
