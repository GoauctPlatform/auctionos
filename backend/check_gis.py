import os
import json
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")
engine = create_engine(db_url)
with engine.connect() as conn:
    result = conn.execute(text("SELECT parcel_shape_data FROM property_details WHERE parcel_shape_data IS NOT NULL LIMIT 1;"))
    row = result.fetchone()
    print("Shape Data Preview:", str(row[0])[:500] if row else "None")
