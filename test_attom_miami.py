import requests
API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
headers = {"Accept": "application/json", "apikey": API_KEY}

def test_attom(addr1, addr2, apn=None, fips=None):
    params = {}
    if apn and fips:
        params = {"apn": apn, "fips": fips}
    else:
        params = {"address1": addr1, "address2": addr2}
    print(f"\n--- Testing with params: {params} ---")
    response = requests.get(f"{ATTOM_BASE_URL}/property/detail", headers=headers, params=params, timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        props = data.get("property", [])
        if props:
            print(f"Found {len(props)} properties!")
            print(f"First property identifier: {props[0].get('identifier')}")
        else:
            print("No properties returned in 200 OK")
    else:
        print(f"Error: {response.text}")

# Test 1: Exactly as the backend does it currently
test_attom("2521 Nw 13 Ave Miami FL 33142", "Miami-Dade FL")

# Test 2: Only street in Address1, City/State/Zip in Address2
test_attom("2521 Nw 13 Ave", "Miami FL 33142")

# Test 3: APN search with the Miami-Dade FIPS code (12086)
# https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt -> 12086 is Miami-Dade
test_attom(None, None, apn="01-3126-039-2553", fips="12086")
# wait, APN might just be 0131260392553
test_attom(None, None, apn="0131260392553", fips="12086")

