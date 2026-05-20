import sys
import os

# Add parent path to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
import app.db.base  # Import all models to bind SQLAlchemy metadata
from app.models.property import PropertyDetails

def check_property():
    print("--- Checking Property in DB ---")
    db = SessionLocal()
    try:
        # Check by parcel ID first
        parcel_id = "105490"
        prop = db.query(PropertyDetails).filter(
            (PropertyDetails.parcel_id == parcel_id) | 
            (PropertyDetails.address.like("%509 Nolan%"))
        ).first()

        if not prop:
            print("Property not found in database!")
            return

        print(f"Property Found:")
        print(f"  - DB ID: {prop.id}")
        print(f"  - Property ID: {prop.property_id}")
        print(f"  - Parcel ID: {prop.parcel_id}")
        print(f"  - Address: {prop.address}")
        print(f"  - Attom ID: {prop.attom_id}")
        print(f"  - Owner Name: {prop.owner_name}")
        print(f"  - Owner Address: {prop.owner_address}")
        print(f"  - Estimated Value: {prop.estimated_value}")
        print(f"  - Assessed Value: {prop.assessed_value}")
        print(f"  - Land Value: {prop.land_value}")
        print(f"  - Improvement Value: {prop.improvement_value}")
        print(f"  - Tax Amount: {prop.tax_amount}")
        print(f"  - Tax Year: {prop.tax_year}")
        print(f"  - Sales History JSON (first 100 chars): {str(prop.sales_history_json)[:100]}")
        print(f"  - Tax History JSON (first 100 chars): {str(prop.tax_history_json)[:100]}")
        print(f"  - Permits JSON (first 100 chars): {str(prop.permits_json)[:100]}")
        print(f"  - Extended Owner JSON (first 150 chars): {str(prop.extended_owner_json)[:150]}")
        
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_property()
