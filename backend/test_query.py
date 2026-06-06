from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")
engine = create_engine(db_url)
with engine.connect() as conn:
    query = text("""
        SELECT id, address, county, state, latitude, longitude
        FROM property_details
        WHERE parcel_id = :pid OR id::text = :pid OR property_id = :pid
        LIMIT 1
    """)
    try:
        row = conn.execute(query, {"pid": "090005186"}).fetchone()
        print("Row:", row)
    except Exception as e:
        print("Error:", e)
