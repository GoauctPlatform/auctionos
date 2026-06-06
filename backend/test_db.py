from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")
engine = create_engine(db_url)
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, parcel_id, address FROM property_details LIMIT 1;"))
    row = result.fetchone()
    print("Row:", row)
