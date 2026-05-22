import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # Let's count where pah.auction_date is null but auction_id has an auction_date in auction_events
    query = """
        SELECT COUNT(*)
        FROM property_auction_history pah
        JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NULL
          AND ae.auction_date IS NOT NULL
    """
    res = conn.execute(text(query)).fetchone()[0]
    print('Rows where pah.auction_date is null but linked auction_event has auction_date:', res)

    # Let's also see if there are any other columns in auction_events that could have date
    query_dates = """
        SELECT COUNT(*), MIN(ae.auction_date), MAX(ae.auction_date)
        FROM property_auction_history pah
        JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE ae.auction_date IS NOT NULL
    """
    cnt, min_dt, max_dt = conn.execute(text(query_dates)).fetchone()
    print('Total rows joined with auction_events having date:', cnt, 'Min:', min_dt, 'Max:', max_dt)
