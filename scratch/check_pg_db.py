import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    # 1. Row count
    cnt_pah = conn.execute(text('SELECT count(*) FROM property_auction_history')).fetchone()[0]
    print('Row count in property_auction_history:', cnt_pah)

    cnt_ae = conn.execute(text('SELECT count(*) FROM auction_events')).fetchone()[0]
    print('Row count in auction_events:', cnt_ae)

    # 2. Sample records where auction_date is past
    print('\nSample property_auction_history records:')
    res = conn.execute(text('SELECT id, property_id, auction_date, auction_name, created_at FROM property_auction_history ORDER BY auction_date DESC LIMIT 10')).fetchall()
    for r in res:
        print(r)

    # Let's count properties with past vs future auction_date relative to now
    print('\nDate distribution:')
    res = conn.execute(text("""
        SELECT 
            SUM(CASE WHEN auction_date < CURRENT_DATE THEN 1 ELSE 0 END) as past_count,
            SUM(CASE WHEN auction_date >= CURRENT_DATE THEN 1 ELSE 0 END) as future_count,
            SUM(CASE WHEN auction_date IS NULL THEN 1 ELSE 0 END) as null_count
        FROM property_auction_history
    """)).fetchone()
    print('PAH distribution:', res)
