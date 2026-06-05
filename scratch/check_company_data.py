import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("--- REMOTE DB INSPECTOR ---")
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
            
        # Check user company links
        links = conn.execute(text("SELECT user_id, company_id FROM user_company_links")).fetchall()
        print(f"\nUser-Company Links ({len(links)}):")
        for l in links:
            print(f"  UserID: {l[0]}, CompanyID: {l[1]}")
            
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
            
        # Sample company_id values from property_details
        sample_company_props = conn.execute(text("""
            SELECT company_id, COUNT(*) 
            FROM property_details 
            WHERE company_id IS NOT NULL 
            GROUP BY company_id
        """)).fetchall()
        print("\nProperties grouped by assigned Company ID:")
        for scp in sample_company_props:
            print(f"  CompanyID: {scp[0]}, Count: {scp[1]}")

except Exception as e:
    print(f"Error checking remote DB: {e}")
print("\n--- END INSPECTOR ---")
