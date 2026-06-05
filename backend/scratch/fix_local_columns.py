from sqlalchemy import create_engine, text

engine = create_engine('postgresql://user:password@localhost:5433/auctionos')
queries = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'trial'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS property_searches_used INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS workbench_layout TEXT"
]

with engine.connect() as conn:
    for q in queries:
        try:
            conn.execute(text(q))
            conn.commit()
            print(f"Executed: {q}")
        except Exception as e:
            print(f"Error executing {q}: {e}")
            conn.rollback()
