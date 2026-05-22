import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # 1. Count availability_status in property_details
    res = conn.execute(text("""
        SELECT availability_status, COUNT(*)
        FROM property_details
        GROUP BY availability_status
    """)).fetchall()
    print("availability_status distribution in property_details:")
    for r in res:
        print(f" - Status: {r[0]} | Count: {r[1]}")

    # 2. Let's see the availability_status of properties that are in property_auction_history
    res2 = conn.execute(text("""
        SELECT p.availability_status, COUNT(*)
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        WHERE pah.auction_date IS NOT NULL
        GROUP BY p.availability_status
    """)).fetchall()
    print("\navailability_status of properties in property_auction_history:")
    for r in res2:
        print(f" - Status: {r[0]} | Count: {r[1]}")
