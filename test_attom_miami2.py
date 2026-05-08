import requests
API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
headers = {"Accept": "application/json", "apikey": API_KEY}
# Test 1
params = {"address1": "2521 Nw 13 Ave Miami", "address2": "FL 33142"}
r = requests.get(f"{ATTOM_BASE_URL}/property/detail", headers=headers, params=params)
print(f"Status 1: {r.status_code}")
# Test 2: Full address in address1, empty address2? 
# Wait, address2 can be just the state?
params = {"address1": "2521 Nw 13 Ave Miami FL 33142", "address2": "FL"}
r = requests.get(f"{ATTOM_BASE_URL}/property/detail", headers=headers, params=params)
print(f"Status 2: {r.status_code}")
