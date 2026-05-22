import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's count available vs unavailable properties by month in get_monthly_stats query
    query = """
        SELECT
            EXTRACT(MONTH FROM pah.auction_date)::INTEGER as month_num,
            COUNT(*) FILTER (WHERE p.availability_status = 'available') as available_count,
            COUNT(*) FILTER (WHERE p.availability_status = 'unavailable') as unavailable_count,
            COUNT(*) FILTER (WHERE p.availability_status IS NULL) as null_count
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        LEFT JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NOT NULL
          AND p.created_by_user_id IS NULL
        GROUP BY month_num
        ORDER BY month_num
    """
    rows = conn.execute(text(query)).fetchall()
    print("Monthly distribution by availability_status:")
    for r in rows:
        print(f"Month: {r[0]} | Available: {r[1]} | Unavailable: {r[2]} | Null: {r[3]}")
