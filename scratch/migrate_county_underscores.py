import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
load_dotenv(env_path)

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL not found in environment.")
    # Fallback to local SQLite if exists
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sql_app.db")
    if os.path.exists(sqlite_path):
        db_url = f"sqlite:///{sqlite_path}"
        print(f"Falling back to local SQLite: {db_url}")
    else:
        sys.exit(1)

print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
engine = create_engine(db_url)

def run_migration():
    with engine.begin() as conn:
        # 1. Migrate property_details county names
        print("Migrating property_details counties...")
        # Check count of affected properties
        res = conn.execute(text("SELECT count(*) FROM property_details WHERE county LIKE '%_%'")).fetchone()
        affected_props = res[0] if res else 0
        print(f"Found {affected_props} properties with underscores in county name.")
        
        if affected_props > 0:
            # We do it dynamically in Python or directly in SQL depending on SQL dialect.
            # Direct SQL update works on both PostgreSQL and SQLite:
            conn.execute(text("UPDATE property_details SET county = REPLACE(county, '_', ' ') WHERE county LIKE '%_%'"))
            print("Successfully updated property counties.")

        # 2. Migrate client_lists tags
        print("Migrating client_lists tags...")
        lists = conn.execute(text("SELECT id, name, tags FROM client_lists WHERE tags LIKE 'STANDARD%'")).fetchall()
        updated_lists_count = 0
        
        for lst in lists:
            list_id, list_name, tags = lst
            if not tags or "_" not in tags:
                continue
            
            # tags format: STANDARD:County_Name,Other_County
            parts = tags.split(":")
            prefix = parts[0]
            if len(parts) > 1:
                counties = parts[1].split(",")
                cleaned_counties = []
                for c in counties:
                    cleaned = c.replace("_", " ").strip()
                    if cleaned and cleaned not in cleaned_counties:
                        cleaned_counties.append(cleaned)
                new_tags = f"{prefix}:{','.join(cleaned_counties)}"
            else:
                new_tags = prefix
            
            if new_tags != tags:
                conn.execute(
                    text("UPDATE client_lists SET tags = :new_tags WHERE id = :id"),
                    {"new_tags": new_tags, "id": list_id}
                )
                updated_lists_count += 1
                print(f"Updated list '{list_name}' (ID: {list_id}) tags from '{tags}' to '{new_tags}'.")
        
        print(f"Migration completed successfully. Updated {affected_props} properties and {updated_lists_count} lists.")

if __name__ == "__main__":
    run_migration()
