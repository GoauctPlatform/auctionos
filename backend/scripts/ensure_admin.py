import sys
import os

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
import app.db.base  # Import all models
from app.models.user import User


def ensure_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@goauct.com").first()
        if user:
            print(f"Found user {user.email}. Superuser: {user.is_superuser}")
            if not user.is_superuser or user.role != "admin":
                user.is_superuser = True
                user.role = "admin"
                db.add(user)
                db.commit()
                print(f"Updated user {user.email} to Superuser: True and Role: admin")
            else:
                print("User already has correct permissions.")
        else:
            print("User admin@goauct.com not found. Creating...")
            from app.core.security import get_password_hash
            new_user = User(
                email="admin@goauct.com",
                hashed_password=get_password_hash("password"),
                is_superuser=True,
                is_active=True,
                role="admin"
            )
            db.add(new_user)
            db.commit()
            print("Created admin user.")
    except Exception as e:
        print(f"Error updating user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    ensure_admin()
