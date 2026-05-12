from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    # Fix user subscription
    res = conn.execute(text("UPDATE user_subscriptions SET plan_type = 'enterprise', status = 'active', property_views_used = 0 WHERE user_id = 8"))
    conn.commit()
    print(f"Updated user_subscriptions: {res.rowcount} rows affected")
    
    # Verify
    sub_res = conn.execute(text("SELECT plan_type, status, property_views_used FROM user_subscriptions WHERE user_id = 8")).fetchone()
    print(f"New Subscription: Plan: {sub_res[0]}, Status: {sub_res[1]}, Views Used: {sub_res[2]}")
