import requests
API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
headers = {"Accept": "application/json", "apikey": API_KEY}
# Test 3
params = {"address1": "2521 Nw 13 Ave Miami FL 33142", "address2": "33142"}
r = requests.get(f"{ATTOM_BASE_URL}/property/detail", headers=headers, params=params)
print(f"Status 3: {r.status_code}")
# Test 4
params = {"address1": "2521 Nw 13 Ave Miami FL 33142", "address2": "Miami FL"}
r = requests.get(f"{ATTOM_BASE_URL}/property/detail", headers=headers, params=params)
print(f"Status 4: {r.status_code}")
