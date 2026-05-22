import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's count matching rows in the query:
    # 1. Total matching rows with non-null auction_date and p.created_by_user_id is null
    q_total = """
        SELECT COUNT(*)
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        LEFT JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NOT NULL
          AND p.created_by_user_id IS NULL
    """
    total_matched = conn.execute(text(q_total)).fetchone()[0]
    print('Total matched rows in query:', total_matched)

    # 2. What are the min and max auction dates of these matched rows?
    q_dates = """
        SELECT MIN(pah.auction_date), MAX(pah.auction_date)
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        LEFT JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NOT NULL
          AND p.created_by_user_id IS NULL
    """
    min_date, max_date = conn.execute(text(q_dates)).fetchone()
    print('Date range of matched rows:', min_date, 'to', max_date)

    # 3. How many matched rows are past vs future relative to now?
    q_dist = """
        SELECT 
            SUM(CASE WHEN pah.auction_date < CURRENT_DATE THEN 1 ELSE 0 END) as past,
            SUM(CASE WHEN pah.auction_date >= CURRENT_DATE THEN 1 ELSE 0 END) as future
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        LEFT JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NOT NULL
          AND p.created_by_user_id IS NULL
    """
    past, future = conn.execute(text(q_dist)).fetchone()
    print('Matched rows distribution - Past:', past, 'Future:', future)

    # 4. Let's see if there is any year filter or constraint in the dashboard frontend logic or backend logic
    # E.g. did get_monthly_stats filter by current year? Let's check.
