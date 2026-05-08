import requests
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
with open("backend/.env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    prop = conn.execute(text("SELECT parcel_id, address, county, state, county_fips, attom_id FROM property_details WHERE parcel_id = '020-433-250-000'")).fetchone()
    print(f"Property in DB: {prop}")

    if not prop:
        print("Property not found in DB")
        exit(0)
    
    parcel_id, address, county, state, county_fips, attom_id = prop

    query_params = {}
    if attom_id:
        query_params = {"attomId": attom_id}
    elif parcel_id and county_fips:
        query_params = {
            "apn": parcel_id,
            "fips": county_fips
        }
    else:
        city_state = f"{county or ''} {state or ''}" 
        query_params = {
            "address1": address,
            "address2": city_state
        }

    print(f"Testing ATTOM API with params: {query_params}")
    
    API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
    ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
    headers = {"Accept": "application/json", "apikey": API_KEY}
    url = f"{ATTOM_BASE_URL}/property/detail"
    
    response = requests.get(url, headers=headers, params=query_params, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

