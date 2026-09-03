#!/usr/bin/env python3
"""
reset_admin.py — Secure admin password reset script.

Replaces the removed /auth/reset-admin-prod HTTP endpoint which had
hardcoded credentials visible in server logs.

Usage (from backend/ directory):
    python scripts/reset_admin.py

In Railway/Docker:
    docker exec -it <container> python scripts/reset_admin.py
    # OR via Railway CLI:
    railway run python scripts/reset_admin.py
"""
import sys
import os
import getpass

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def reset_admin():
    admin_email = os.getenv("ADMIN_EMAIL", "admin@goauct.com")

    print(f"\n🔐 GoAuct Admin Password Reset")
    print(f"   Target account: {admin_email}")
    print(f"   (Set ADMIN_EMAIL env var to change target)\n")

    # Read password securely — never echoed to terminal or logs
    new_password = getpass.getpass("Enter new admin password: ")
    confirm_password = getpass.getpass("Confirm new admin password: ")

    if new_password != confirm_password:
        print("❌ Passwords do not match. Aborting.")
        sys.exit(1)

    if len(new_password) < 12:
        print("❌ Password must be at least 12 characters. Aborting.")
        sys.exit(1)

    from app.db.session import SessionLocal
    import app.db.base  # Register all models
    from app.models.user import User
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == admin_email).first()

        if user:
            user.hashed_password = get_password_hash(new_password)
            user.is_superuser = True
            user.is_active = True
            if not user.role or user.role != "admin":
                user.role = "admin"
            db.add(user)
            db.commit()
            print(f"\n✅ Password updated for existing user: {admin_email}")
        else:
            user = User(
                email=admin_email,
                hashed_password=get_password_hash(new_password),
                is_superuser=True,
                is_active=True,
                role="admin",
            )
            db.add(user)
            db.commit()
            print(f"\n✅ New admin user created: {admin_email}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error resetting admin: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
