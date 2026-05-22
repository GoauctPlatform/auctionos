import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's see the range of auction_date in property_auction_history for ALL rows
    res_all = conn.execute(text("""
        SELECT MIN(auction_date), MAX(auction_date)
        FROM property_auction_history
        WHERE auction_date IS NOT NULL
    """)).fetchone()
    print('All rows date range:', res_all)

    # Let's count by year of auction_date
    res_year = conn.execute(text("""
        SELECT EXTRACT(YEAR FROM auction_date)::INTEGER as yr, COUNT(*)
        FROM property_auction_history
        WHERE auction_date IS NOT NULL
        GROUP BY yr
        ORDER BY yr
    """)).fetchall()
    print('Distribution by year:')
    for r in res_year:
        print(f"Year: {r[0]} | Count: {r[1]}")

    # Let's check if there are other auction dates stored in other columns or tables, E.G., property_details?
    # Wait, does property_details have any columns with dates that represent auctions?
    # Let's look at the information_schema for columns ending with 'date' or 'time' in property_details
    res_cols = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'property_details'
          AND (column_name LIKE '%date%' OR column_name LIKE '%time%')
    """)).fetchall()
    print('\nDate/time columns in property_details:')
    for r in res_cols:
        print(r)
