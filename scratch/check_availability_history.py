import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's check date range of property_availability_history
    res = conn.execute(text("""
        SELECT MIN(changed_at), MAX(changed_at), COUNT(*)
        FROM property_availability_history
    """)).fetchone()
    print('property_availability_history range:', res)

    # Let's count by month for 2026
    res_months = conn.execute(text("""
        SELECT EXTRACT(MONTH FROM changed_at)::INTEGER as m, COUNT(*)
        FROM property_availability_history
        WHERE EXTRACT(YEAR FROM changed_at) = 2026
        GROUP BY m
        ORDER BY m
    """)).fetchall()
    print('\n2026 distribution by month:')
    for r in res_months:
        print(f"Month: {r[0]} | Count: {r[1]}")
