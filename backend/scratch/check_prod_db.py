from sqlalchemy import create_engine, text
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.config import settings

def check_users():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # Check columns first
        columns_res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).all()
        columns = [r[0] for r in columns_res]
        print(f"Columns in 'users': {columns}")

        if 'is_verified' in columns:
            res = conn.execute(text("SELECT is_verified, count(*) FROM users GROUP BY is_verified")).all()
            print(f"Verification stats: {res}")
        else:
            print("is_verified column MISSING!")

if __name__ == "__main__":
    check_users()
