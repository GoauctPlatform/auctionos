from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    # Check properties in Harris county for both Texas lists
    query = text("""
        SELECT clp.list_id, cl.name, p.parcel_id, p.county, p.state
        FROM client_list_property clp
        JOIN property_details p ON p.id = clp.property_id
        JOIN client_lists cl ON cl.id = clp.list_id
        WHERE clp.list_id IN (46, 57) AND p.county ILIKE '%Harris%'
    """)
    res = conn.execute(query).fetchall()
    print("Properties in Harris County for Texas lists:")
    for r in res:
        print(f"ListID: {r[0]}, ListName: '{r[1]}', ParcelID: {r[2]}, County: '{r[3]}', State: '{r[4]}'")
