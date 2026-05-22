import os
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway'
engine = create_engine(db_url)

with engine.connect() as conn:
    query = """
        SELECT
            EXTRACT(MONTH FROM pah.auction_date)::INTEGER as month_num,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE (
                ae.tax_status ILIKE '%deed%' OR ae.tax_status ILIKE '%sheriff%' OR
                pah.auction_name ILIKE '%deed%' OR pah.auction_name ILIKE '%sheriff%'
            )) as deed_count,
            COUNT(*) FILTER (WHERE (
                ae.tax_status ILIKE '%lien%' OR ae.tax_status ILIKE '%certificate%' OR
                pah.auction_name ILIKE '%lien%' OR pah.auction_name ILIKE '%certificate%'
            )) as lien_count,
            COUNT(*) FILTER (WHERE (
                ae.tax_status ILIKE '%foreclosure%' OR
                pah.auction_name ILIKE '%foreclosure%'
            )) as foreclosure_count
        FROM property_auction_history pah
        LEFT JOIN property_details p ON p.property_id = pah.property_id
        LEFT JOIN auction_events ae ON ae.id = pah.auction_id
        WHERE pah.auction_date IS NOT NULL
          AND p.created_by_user_id IS NULL
        GROUP BY month_num
        ORDER BY month_num
    """
    rows = conn.execute(text(query)).fetchall()
    print("Monthly stats returned by query:")
    for r in rows:
        print(f"Month: {r[0]} | Total: {r[1]} | Deed: {r[2]} | Lien: {r[3]} | Foreclosure: {r[4]}")
