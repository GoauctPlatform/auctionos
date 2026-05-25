from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy import func
from app.models.user import User
from app.models.company import Company, user_company_links
from app.models.monetization import UserSubscription
from app.models.client_data import ClientList

PLAN_LIMITS = {
    "trial": {
        "views": 20,
        "companies": 1,
        "managers": 0,
        "agents": 0,
        "custom_properties": 0,
        "community": False,
        "tasks": False,
        "exports": False
    },
    "advanced": {
        "views": 1000,
        "companies": 1,
        "managers": 0,
        "agents": 0,
        "custom_properties": float('inf'),
        "community": True,
        "tasks": True,
        "exports": True
    },
    "pro": {
        "views": 2000,
        "companies": 2,
        "managers": 1,
        "agents": 1,
        "custom_properties": float('inf'),
        "community": True,
        "tasks": True,
        "exports": True
    },
    "enterprise": {
        "views": 10000,
        "companies": 4,
        "managers": 2,
        "agents": 3,
        "custom_properties": float('inf'),
        "community": True,
        "tasks": True,
        "exports": True
    }
}

class PermissionService:

    @staticmethod
    def get_parent_subscription(db: Session, user: User) -> UserSubscription:
        """
        Gets the subscription object governing the current user.
        If user is a client, it's their own subscription.
        If manager/agent, it's the subscription of the owner of their active company.
        Raises HTTP 402 if trial is expired or subscription is not active.
        """
        sub = PermissionService._get_subscription_data(db, user)
        
        # Check if trial is expired (7 days from start_date)
        if sub.plan_type == 'trial' and sub.start_date:
            # Calculate days active using timezone-aware comparison
            start_date = sub.start_date
            if start_date.tzinfo is None:
                # Handle naive datetime by assuming UTC
                from datetime import timezone as dt_timezone
                start_date = start_date.replace(tzinfo=dt_timezone.utc)
            
            days_active = (datetime.now(timezone.utc) - start_date).days
            
            # Trial expires after 7 complete days (days_active >= 7 means at least 7 days have passed)
            if days_active >= 7:
                sub.status = 'expired'
                db.commit()
                raise HTTPException(status_code=402, detail="Trial period has expired. Please upgrade your plan.")
                
        if sub.status != 'active':
            raise HTTPException(status_code=402, detail=f"Subscription is {sub.status}. Please upgrade your plan.")
            
        return sub

    @staticmethod
    def get_parent_subscription_for_billing(db: Session, user: User) -> UserSubscription:
        """
        Gets the subscription object for billing/usage display purposes.
        Does NOT raise HTTP 402 error for expired trials - allows access to billing page.
        Returns the subscription object as-is, including expired status.
        Used by billing endpoints to let expired users upgrade.
        """
        return PermissionService._get_subscription_data(db, user)

    @staticmethod
    def _get_subscription_data(db: Session, user: User) -> UserSubscription:
        """
        Internal method: Gets subscription data without enforcing trial expiration.
        Fetches and syncs subscription object for the user or their company owner.
        """
        if user.role == 'client':
            sub = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
        else:
            if not user.active_company_id:
                raise HTTPException(status_code=403, detail="User must have an active company to inherit permissions.")
            company = db.query(Company).filter(Company.id == user.active_company_id).first()
            if not company:
                raise HTTPException(status_code=403, detail="Active company not found.")
            sub = db.query(UserSubscription).filter(UserSubscription.user_id == company.user_id).first()

        owner_id = user.id if user.role == 'client' else company.user_id
        owner_user = db.query(User).filter(User.id == owner_id).first()

        if not sub:
            # Create default subscription based on owner's tier
            sub = UserSubscription(
                user_id=owner_id,
                plan_type=owner_user.subscription_tier if owner_user else 'trial',
                status='active'
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)
        elif owner_user and owner_user.subscription_tier != sub.plan_type:
            # Auto-sync: If User table says one thing and Subscription table another,
            # we favor the User table as it's often the target of manual admin updates.
            sub.plan_type = owner_user.subscription_tier
            sub.status = 'active'
            db.add(sub)
            db.commit()
            db.refresh(sub)
            
        return sub

    @staticmethod
    def check_feature_access(db: Session, user: User, feature: str):
        sub = PermissionService.get_parent_subscription(db, user)
        limits = PLAN_LIMITS.get(sub.plan_type, PLAN_LIMITS["trial"])
        
        if feature in limits and isinstance(limits[feature], bool):
            if not limits[feature]:
                raise HTTPException(status_code=403, detail=f"Your {sub.plan_type} plan does not include access to {feature}.")

    @staticmethod
    def increment_usage(db: Session, user: User, metric: str, amount: int = 1):
        sub = PermissionService.get_parent_subscription(db, user)
        limits = PLAN_LIMITS.get(sub.plan_type, PLAN_LIMITS["trial"])
        limit_val = limits.get(metric, 0)
        
        # Determine current usage
        current_usage = 0
        if metric == 'views':
            current_usage = sub.property_views_used
            if current_usage + amount > limit_val:
                raise HTTPException(status_code=403, detail=f"Property view limit reached for {sub.plan_type} plan.")
            sub.property_views_used += amount
            
        elif metric == 'companies':
            owner_id = sub.user_id
            current_usage = db.query(func.count(Company.id)).filter(Company.user_id == owner_id).scalar()
            if current_usage >= limit_val:
                raise HTTPException(status_code=403, detail=f"Company limit reached for {sub.plan_type} plan.")
                
        elif metric == 'managers':
            owner_id = sub.user_id
            # Managers belonging to companies owned by this client
            current_usage = db.query(func.count(user_company_links.c.user_id))\
                              .join(Company, Company.id == user_company_links.c.company_id)\
                              .join(User, User.id == user_company_links.c.user_id)\
                              .filter(Company.user_id == owner_id, User.role == 'manager').scalar()
            if current_usage >= limit_val:
                raise HTTPException(status_code=403, detail=f"Manager profile limit reached for {sub.plan_type} plan.")
                
        elif metric == 'agents':
            owner_id = sub.user_id
            current_usage = db.query(func.count(user_company_links.c.user_id))\
                              .join(Company, Company.id == user_company_links.c.company_id)\
                              .join(User, User.id == user_company_links.c.user_id)\
                              .filter(Company.user_id == owner_id, User.role == 'agent').scalar()
            if current_usage >= limit_val:
                raise HTTPException(status_code=403, detail=f"Agent profile limit reached for {sub.plan_type} plan.")
                
        db.commit()
