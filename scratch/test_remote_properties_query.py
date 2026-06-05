import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("--- EXECUTING PROPERTIES QUERY ON REMOTE DB ---")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        query = text("""
            SELECT count(*) FROM property_details p LEFT JOIN (
                SELECT DISTINCT ON (property_id) * FROM property_auction_history ORDER BY property_id, auction_date DESC
            ) pah ON pah.property_id = p.property_id 
            LEFT JOIN auction_events ae_lookup ON 
                ae_lookup.auction_date = p.next_auction_date AND 
                ae_lookup.state ILIKE p.state AND 
                ae_lookup.county ILIKE p.county
            LEFT JOIN property_scores ps ON ps.parcel_id = p.parcel_id WHERE 1=1
        """)
        count = conn.execute(query).scalar()
        print(f"Query executed successfully! Total count: {count}")
except Exception as e:
    print(f"Query FAILED: {e}")
print("--- END ---")
