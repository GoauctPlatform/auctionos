from sqlalchemy import create_engine, text
import os

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    list_id = 57
    county_name = "Harris" # We'll use a fuzzy approach or match the specific one found
    
    # Remove properties in Harris county from list 57
    # Using ILIKE '%Harris%' to be safe about leading/trailing spaces
    res = conn.execute(text("""
        DELETE FROM client_list_property
        WHERE list_id = :list_id
        AND property_id IN (
            SELECT id FROM property_details WHERE county ILIKE :pattern
        )
    """), {"list_id": list_id, "pattern": f"%{county_name}%"})
    
    conn.commit()
    print(f"Deleted {res.rowcount} properties from list {list_id} in county containing '{county_name}'")
    
    # Also check tags just in case
    lst = conn.execute(text("SELECT tags FROM client_lists WHERE id = :list_id"), {"list_id": list_id}).fetchone()
    if lst and lst[0] and "Harris" in lst[0]:
        new_tags = ",".join([c.strip() for c in lst[0].split(":")[1].split(",") if "Harris" not in c])
        if new_tags:
            final_tags = f"STANDARD:{new_tags}"
        else:
            final_tags = "STANDARD"
        conn.execute(text("UPDATE client_lists SET tags = :tags WHERE id = :list_id"), {"tags": final_tags, "list_id": list_id})
        conn.commit()
        print(f"Updated tags for list {list_id}")
