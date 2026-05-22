import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)).fetchall()
    print("Tables in Postgres:")
    for r in res:
        table = r[0]
        # count rows
        cnt = conn.execute(text(f'SELECT count(*) FROM {table}')).fetchone()[0]
        print(f" - {table}: {cnt} rows")
