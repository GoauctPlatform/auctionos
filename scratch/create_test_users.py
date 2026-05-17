import os
import sys

# Ensure backend root is in PYTHONPATH
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.db import base # Import all models to register them in SQLAlchemy
from app.db.session import SessionLocal
from app.models.user import User
from app.models.realtor import Realtor
from app.models.agent_due_diligence import AgentDueDiligenceProfile
from app.models.user_onboarding import UserOnboarding
from app.core import security

def create_or_update_test_users():
    db = SessionLocal()
    try:
        # 1. Realtor (Corretor)
        realtor_email = "corretor@goauct.com"
        hashed_pw = security.get_password_hash("Senha123!")
        
        realtor_user = db.query(User).filter(User.email == realtor_email).first()
        if realtor_user:
            print(f"Updating existing realtor user: {realtor_email}")
            realtor_user.hashed_password = hashed_pw
            realtor_user.is_active = True
            realtor_user.is_verified = True
            realtor_user.role = "realtor"
            realtor_user.full_name = "Corretor GoAuct"
        else:
            print(f"Creating new realtor user: {realtor_email}")
            realtor_user = User(
                email=realtor_email,
                hashed_password=hashed_pw,
                is_active=True,
                is_verified=True,
                role="realtor",
                full_name="Corretor GoAuct"
            )
            db.add(realtor_user)
        db.commit()
        db.refresh(realtor_user)

        # Realtor Profile
        realtor_profile = db.query(Realtor).filter(Realtor.user_id == realtor_user.id).first()
        if realtor_profile:
            print("Updating realtor profile...")
            realtor_profile.name = "Corretor GoAuct"
            realtor_profile.email = realtor_email
            realtor_profile.verification_status = "approved"
            realtor_profile.license_number = "CRECI-12345"
            realtor_profile.social_security = "111-222-3333"
            realtor_profile.mls_id = "MLS-67890"
            realtor_profile.payment_account = "corretor_paypal@example.com"
        else:
            print("Creating realtor profile...")
            realtor_profile = Realtor(
                user_id=realtor_user.id,
                name="Corretor GoAuct",
                email=realtor_email,
                verification_status="approved",
                license_number="CRECI-12345",
                social_security="111-222-3333",
                mls_id="MLS-67890",
                payment_account="corretor_paypal@example.com"
            )
            db.add(realtor_profile)

        # Realtor Onboarding
        realtor_onb = db.query(UserOnboarding).filter(UserOnboarding.user_id == realtor_user.id).first()
        if realtor_onb:
            realtor_onb.onboarding_step = "done"
        else:
            realtor_onb = UserOnboarding(
                user_id=realtor_user.id,
                has_completed_tour=True,
                onboarding_step="done"
            )
            db.add(realtor_onb)
        db.commit()

        # 2. Agent (Agente Due Diligence)
        agent_email = "agente@goauct.com"
        
        agent_user = db.query(User).filter(User.email == agent_email).first()
        if agent_user:
            print(f"Updating existing agent user: {agent_email}")
            agent_user.hashed_password = hashed_pw
            agent_user.is_active = True
            agent_user.is_verified = True
            agent_user.role = "agent_due_diligence"
            agent_user.full_name = "Agente Due Diligence"
        else:
            print(f"Creating new agent user: {agent_email}")
            agent_user = User(
                email=agent_email,
                hashed_password=hashed_pw,
                is_active=True,
                is_verified=True,
                role="agent_due_diligence",
                full_name="Agente Due Diligence"
            )
            db.add(agent_user)
        db.commit()
        db.refresh(agent_user)

        # Agent Profile
        agent_profile = db.query(AgentDueDiligenceProfile).filter(AgentDueDiligenceProfile.user_id == agent_user.id).first()
        if agent_profile:
            print("Updating agent profile...")
            agent_profile.verification_status = "approved"
            agent_profile.coverage_area = "Fulton County, GA"
            agent_profile.coverage_radius_miles = 50
            agent_profile.vehicle_type = "SUV"
            agent_profile.social_security = "999-888-7777"
            agent_profile.payment_account = "agente_paypal@example.com"
        else:
            print("Creating agent profile...")
            agent_profile = AgentDueDiligenceProfile(
                user_id=agent_user.id,
                verification_status="approved",
                coverage_area="Fulton County, GA",
                coverage_radius_miles=50,
                vehicle_type="SUV",
                social_security="999-888-7777",
                payment_account="agente_paypal@example.com"
            )
            db.add(agent_profile)

        # Agent Onboarding
        agent_onb = db.query(UserOnboarding).filter(UserOnboarding.user_id == agent_user.id).first()
        if agent_onb:
            agent_onb.onboarding_step = "done"
        else:
            agent_onb = UserOnboarding(
                user_id=agent_user.id,
                has_completed_tour=True,
                onboarding_step="done"
            )
            db.add(agent_onb)
        db.commit()

        print("🎉 Successfully created and verified test users!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating test users: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    create_or_update_test_users()
