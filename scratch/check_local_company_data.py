import os
from sqlalchemy import create_engine, text

db_url = "postgresql://user:password@localhost:5433/auctionos"

print("--- LOCAL DB INSPECTOR ---")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        # Check users count and roles
        users = conn.execute(text("SELECT id, email, role, company_id, active_company_id FROM users")).fetchall()
        print(f"\nUsers ({len(users)}):")
        for u in users:
            print(f"  ID: {u[0]}, Email: {u[1]}, Role: {u[2]}, CompanyID: {u[3]}, ActiveCompanyID: {u[4]}")
            
        # Check companies
        companies = conn.execute(text("SELECT id, name FROM companies")).fetchall()
        print(f"\nCompanies ({len(companies)}):")
        for c in companies:
            print(f"  ID: {c[0]}, Name: {c[1]}")
            
        # Property details visibility and company assignment
        prop_stats = conn.execute(text("""
            SELECT 
                visibility, 
                company_id IS NULL as is_null,
                COUNT(*) 
            FROM property_details 
            GROUP BY visibility, company_id IS NULL
        """)).fetchall()
        print("\nProperty stats by visibility and company assignment:")
        for ps in prop_stats:
            print(f"  Visibility: {ps[0]}, Company ID is NULL: {ps[1]}, Count: {ps[2]}")

except Exception as e:
    print(f"Error checking local DB: {e}")
print("\n--- END INSPECTOR ---")
