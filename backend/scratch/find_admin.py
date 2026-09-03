from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")

db_url = os.environ.get("DATABASE_URL")
print(f"Connecting to: {db_url}")
engine = create_engine(db_url)

with engine.connect() as conn:
    # Get all columns from users
    result = conn.execute(text("SELECT * FROM users WHERE email = 'admin@auctionpro.com';"))
    row = result.fetchone()
    if row:
        print("User found!")
        keys = result.keys()
        for k, v in zip(keys, row):
            print(f"  {k}: {v}")
    else:
        print("User not found.")
        # Let's print some users to see what emails exist
        result = conn.execute(text("SELECT email, is_active, is_superuser, role FROM users LIMIT 10;"))
        rows = result.fetchall()
        print("Available users:")
        for r in rows:
            print(f"  {r[0]} | active: {r[1]} | super: {r[2]} | role: {r[3]}")
