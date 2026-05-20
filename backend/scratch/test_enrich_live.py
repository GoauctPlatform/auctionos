import sys
import os

# Add parent path to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
import app.db.base  # Import all models to bind SQLAlchemy metadata
from app.models.property import PropertyDetails
from app.services.attom_enrichment import enrich_property, get_missing_fields

def test_enrich():
    print("--- Running Live Enrichment Test ---")
    db = SessionLocal()
    try:
        # Resolve test property
        parcel_id = "105490"
        prop = db.query(PropertyDetails).filter(PropertyDetails.parcel_id == parcel_id).first()
        if not prop:
            print("Property 105490 not found in database!")
            return

        print(f"Original Property State:")
        print(f"  - Bedrooms: {prop.bedrooms}")
        print(f"  - Bathrooms: {prop.bathrooms}")
        print(f"  - Year Built: {prop.year_built}")
        print(f"  - Is Processed: {prop.is_processed}")

        # Reset fields to simulate raw manually created record
        print("\nResetting fields to simulate raw record...")
        prop.bedrooms = 0
        prop.bathrooms = 0.0
        prop.year_built = 0
        prop.is_processed = False
        db.commit()

        # Run enrichment
        print("\nTriggering on-demand enrichment...")
        result = enrich_property(db, prop.property_id)
        
        # Reload property details
        db.refresh(prop)
        print("\nEnriched Property State:")
        print(f"  - Bedrooms: {prop.bedrooms}")
        print(f"  - Bathrooms: {prop.bathrooms}")
        print(f"  - Year Built: {prop.year_built}")
        print(f"  - Is Processed: {prop.is_processed}")
        print(f"  - Owner Name: {prop.owner_name}")
        print(f"  - Owner Address: {prop.owner_address}")
        print(f"  - Estimated Value: {prop.estimated_value}")
        print(f"  - Extended Owner AVM Snapshot: {bool(prop.extended_owner_json.get('avm_snapshot') if prop.extended_owner_json else None)}")
        print(f"  - Sales History JSON Length: {len(prop.sales_history_json or []) if prop.sales_history_json else 0}")
        print(f"  - Tax History JSON Length: {len(prop.tax_history_json or []) if prop.tax_history_json else 0}")
        print(f"  - Permits JSON Length: {len(prop.permits_json or []) if prop.permits_json else 0}")
        print(f"  - Result Status: {result.get('status')}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_enrich()
