import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # 1. Check next_auction_date in property_details
    res_details = conn.execute(text("""
        SELECT MIN(next_auction_date), MAX(next_auction_date), COUNT(*) FILTER (WHERE next_auction_date IS NOT NULL)
        FROM property_details
    """)).fetchone()
    print('next_auction_date in property_details:', res_details)

    # Count by year for next_auction_date
    res_years_details = conn.execute(text("""
        SELECT EXTRACT(YEAR FROM next_auction_date)::INTEGER as yr, COUNT(*)
        FROM property_details
        WHERE next_auction_date IS NOT NULL
        GROUP BY yr
        ORDER BY yr
    """)).fetchall()
    print('next_auction_date distribution by year:')
    for r in res_years_details:
        print(f"Year: {r[0]} | Count: {r[1]}")

    # 2. Check auction_events table
    res_ae = conn.execute(text("""
        SELECT MIN(auction_date), MAX(auction_date), COUNT(*)
        FROM auction_events
    """)).fetchone()
    print('\nauction_events table date range and count:', res_ae)

    # Count by year for auction_events
    res_years_ae = conn.execute(text("""
        SELECT EXTRACT(YEAR FROM auction_date)::INTEGER as yr, COUNT(*)
        FROM auction_events
        GROUP BY yr
        ORDER BY yr
    """)).fetchall()
    print('auction_events distribution by year:')
    for r in res_years_ae:
        print(f"Year: {r[0]} | Count: {r[1]}")
