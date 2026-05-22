import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's search all tables in public schema for columns with 'date' in their name
    res = conn.execute(text("""
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (column_name LIKE '%date%' OR column_name LIKE '%time%')
    """)).fetchall()

    print("Found date/time columns:")
    for r in res:
        table, col = r
        try:
            # Check range of this column
            min_max = conn.execute(text(f"SELECT MIN({col}), MAX({col}), COUNT(*) FILTER (WHERE {col} IS NOT NULL) FROM {table}")).fetchone()
            if min_max[2] > 0:
                print(f" - {table}.{col}: Min={min_max[0]}, Max={min_max[1]}, NonNullCount={min_max[2]}")
        except Exception as e:
            # Some columns might not be dates directly or schema mismatch
            pass
