import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway")

def main():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check total properties and how many have gsi_url
        q = text("SELECT COUNT(*) FROM property_details")
        total = conn.execute(q).scalar()
        
        q2 = text("SELECT COUNT(*) FROM property_details WHERE gsi_url IS NOT NULL AND gsi_url != ''")
        has_gsi = conn.execute(q2).scalar()
        
        print(f"Total properties: {total}")
        print(f"Properties with GSI URL: {has_gsi}")
        
        if has_gsi > 0:
            # Let's print some samples
            q3 = text("SELECT parcel_id, address, gsi_url, gsi_status FROM property_details WHERE gsi_url IS NOT NULL AND gsi_url != '' LIMIT 5")
            rows = conn.execute(q3).fetchall()
            for r in rows:
                print(f"Parcel: {r[0]}, Address: {r[1]}, Status: {r[3]}, URL: {r[2][:80]}...")
        else:
            # Print a few properties without GSI URL to inspect their address/coords
            q4 = text("SELECT parcel_id, address, latitude, longitude FROM property_details LIMIT 5")
            rows = conn.execute(q4).fetchall()
            print("\nSample properties without GSI URL:")
            for r in rows:
                print(f"Parcel: {r[0]}, Address: {r[1]}, Coords: ({r[2]}, {r[3]})")

if __name__ == '__main__':
    main()
