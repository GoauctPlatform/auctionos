from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    # Get user id
    user_res = conn.execute(text("SELECT id FROM users WHERE email = 'cabralscbr@gmail.com'")).fetchone()
    if not user_res:
        print("User not found")
        exit(1)
    user_id = user_res[0]
    
    # Get lists for this user
    lists = conn.execute(text("SELECT id, name, tags FROM client_lists WHERE user_id = :uid OR company_id IN (SELECT active_company_id FROM users WHERE id = :uid)"), {"uid": user_id}).fetchall()
    print("User Lists:")
    for l in lists:
        print(f"ID: {l[0]}, Name: '{l[1]}', Tags: '{l[2]}'")
