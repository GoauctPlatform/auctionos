from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")

db_url = os.environ.get("DATABASE_URL")
engine = create_engine(db_url)

target_emails = [
    "hostcenter.lg@gmail.com",
    "phferroni@gmail.com",
    "novaeradosinvestimentos@gmail.com"
]

with engine.connect() as conn:
    # 1. Check activity_logs
    try:
        sample_log = conn.execute(text("SELECT * FROM activity_logs LIMIT 1")).fetchone()
        if sample_log:
            log_cols = list(sample_log._mapping.keys())
            print("activity_logs columns:", log_cols)
            # Query log events for the three users
            res = conn.execute(text("SELECT * FROM activity_logs WHERE user_id IN (58, 59, 60) ORDER BY id ASC"))
            print("Activity logs for targets:")
            for r in res.fetchall():
                r_dict = dict(r._mapping)
                print(f"  User ID {r_dict.get('user_id')}: {r_dict.get('action')} at {r_dict.get('timestamp') or r_dict.get('created_at')}")
    except Exception as e:
        print("Error reading activity_logs:", e)
    print("-" * 50)

    # 2. Check user_subscriptions
    try:
        sample_sub = conn.execute(text("SELECT * FROM user_subscriptions LIMIT 1")).fetchone()
        if sample_sub:
            sub_cols = list(sample_sub._mapping.keys())
            print("user_subscriptions columns:", sub_cols)
            res = conn.execute(text("SELECT * FROM user_subscriptions WHERE user_id IN (58, 59, 60)"))
            print("Subscriptions for targets:")
            for r in res.fetchall():
                r_dict = dict(r._mapping)
                print(f"  User ID {r_dict.get('user_id')}: tier={r_dict.get('tier')} start={r_dict.get('start_date') or r_dict.get('created_at')}")
    except Exception as e:
        print("Error reading user_subscriptions:", e)
    print("-" * 50)

    # 3. Check user_onboarding
    try:
        sample_onboarding = conn.execute(text("SELECT * FROM user_onboarding LIMIT 1")).fetchone()
        if sample_onboarding:
            onb_cols = list(sample_onboarding._mapping.keys())
            print("user_onboarding columns:", onb_cols)
            res = conn.execute(text("SELECT * FROM user_onboarding WHERE user_id IN (58, 59, 60)"))
            print("Onboarding for targets:")
            for r in res.fetchall():
                r_dict = dict(r._mapping)
                print(f"  User ID {r_dict.get('user_id')}: completed={r_dict.get('completed')} at {r_dict.get('completed_at') or r_dict.get('created_at')}")
    except Exception as e:
        print("Error reading user_onboarding:", e)

