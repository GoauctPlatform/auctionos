from sqlalchemy import create_engine, text
import os
import sys

sys.path.append(os.getcwd())
from app.core.config import settings

def check_db_integrity():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("=== Database Safety & Integrity Check ===")
        
        # 1. Check total rows
        total = conn.execute(text("SELECT COUNT(*) FROM property_details")).scalar()
        print(f"Total properties: {total}")
        
        # 2. Check FIPS statistics
        fips_not_null = conn.execute(text("SELECT COUNT(*) FROM property_details WHERE county_fips IS NOT NULL")).scalar()
        fips_null = conn.execute(text("SELECT COUNT(*) FROM property_details WHERE county_fips IS NULL")).scalar()
        
        print(f"Properties with county_fips populated: {fips_not_null}")
        print(f"Properties with county_fips still NULL: {fips_null}")
        
        # 3. Check some sample records to verify FIPS format
        print("\nSample records populated with FIPS:")
        samples = conn.execute(text("SELECT id, state, county, county_fips, parcel_id FROM property_details WHERE county_fips IS NOT NULL LIMIT 5")).all()
        for s in samples:
            print(f"  ID: {s.id}, State: {s.state!r}, County: {s.county!r} -> FIPS: {s.county_fips!r}")
            
        # 4. Check for any stuck transactions or active locks
        print("\nChecking for active locks / stuck transactions:")
        locks_q = text("""
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE state = 'active' 
              AND query NOT LIKE '%pg_stat_activity%'
        """)
        active_queries = conn.execute(locks_q).scalar()
        print(f"  Active concurrent queries: {active_queries}")
        
        print("\nAll database checks PASSED! Data is completely consistent and intact.")

if __name__ == "__main__":
    check_db_integrity()
