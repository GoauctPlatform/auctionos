import os
import sys
import json

# Adjust python path to be able to import from backend app
sys.path.append("/Users/gustavo/Downloads/auctionos/backend")

from dotenv import load_dotenv
load_dotenv("/Users/gustavo/Downloads/auctionos/backend/.env")

# Force settings to load the postgres DATABASE_URL
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.property import PropertyDetails

db_url = os.getenv("DATABASE_URL")
print(f"Connecting to database: {db_url.split('@')[-1] if db_url else None}")

try:
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Query properties with address like Nolan or parcel_id 105490
    properties = db.query(PropertyDetails).filter(
        (PropertyDetails.address.ilike("%Nolan%")) | (PropertyDetails.parcel_id == "105490")
    ).all()
    
    print(f"Found {len(properties)} matching properties.\n")
    
    for prop in properties:
        print("=" * 60)
        print(f"Property ID (UUID):  {prop.property_id}")
        print(f"Address:            {prop.address}")
        print(f"Parcel ID:          {prop.parcel_id}")
        print(f"Owner Name:         {prop.owner_name}")
        print(f"Owner Address:      {prop.owner_address}")
        print(f"Estimated Value:    {prop.estimated_value}")
        print(f"Assessed Value:     {prop.assessed_value}")
        print(f"Land Value:         {prop.land_value}")
        print(f"Improvement Value:  {prop.improvement_value}")
        print(f"Tax Amount:         {prop.tax_amount}")
        print(f"Tax Year:           {prop.tax_year}")
        print(f"County:             {prop.county}")
        print(f"State:              {prop.state}")
        print(f"County FIPS:        {prop.county_fips}")
        print(f"Attom ID:           {prop.attom_id}")
        
        print("\n--- JSON Blocks ---")
        print("sales_history_json:")
        print(json.dumps(prop.sales_history_json, indent=2))
        
        print("\ntax_history_json:")
        print(json.dumps(prop.tax_history_json, indent=2))
        
        print("\npermits_json:")
        print(json.dumps(prop.permits_json, indent=2))
        
        print("\nextended_owner_json:")
        print(json.dumps(prop.extended_owner_json, indent=2))
        print("=" * 60)
        
    db.close()
except Exception as e:
    import traceback
    print("An error occurred during query:")
    traceback.print_exc()
