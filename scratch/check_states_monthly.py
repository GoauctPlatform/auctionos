import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Get active states in property_details
    states = conn.execute(text("""
        SELECT UPPER(TRIM(state)) as st, COUNT(*)
        FROM property_details
        WHERE state IS NOT NULL
        GROUP BY st
        ORDER BY COUNT(*) DESC
        LIMIT 10
    """)).fetchall()
    print("Top states:")
    for st, count in states:
        print(f"State: {st} | Count: {count}")
        # Run monthly query for this state
        query = f"""
            SELECT
                EXTRACT(MONTH FROM pah.auction_date)::INTEGER as month_num,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE p.availability_status = 'available') as available,
                COUNT(*) FILTER (WHERE p.availability_status = 'unavailable') as unavailable
            FROM property_auction_history pah
            LEFT JOIN property_details p ON p.property_id = pah.property_id
            WHERE pah.auction_date IS NOT NULL
              AND p.created_by_user_id IS NULL
              AND UPPER(TRIM(p.state)) = '{st}'
            GROUP BY month_num
            ORDER BY month_num
        """
        rows = conn.execute(text(query)).fetchall()
        for r in rows:
            print(f"  Month: {r[0]} | Total: {r[1]} | Available: {r[2]} | Unavailable: {r[3]}")
