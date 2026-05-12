from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    # Check user
    user_res = conn.execute(text("SELECT id, email, role, subscription_tier FROM users WHERE email = 'cabralscbr@gmail.com'")).fetchone()
    if not user_res:
        print("User not found")
        exit(1)
    
    user_id, email, role, tier = user_res
    print(f"User: {email}, ID: {user_id}, Role: {role}, Tier: {tier}")
    
    # Check subscription
    sub_res = conn.execute(text("SELECT plan_type, status, property_views_used FROM user_subscriptions WHERE user_id = :uid"), {"uid": user_id}).fetchone()
    if sub_res:
        plan, status, views = sub_res
        print(f"Subscription: Plan: {plan}, Status: {status}, Views Used: {views}")
    else:
        print("No subscription found for user_id in user_subscriptions table")
