import requests
API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"
headers = {"Accept": "application/json", "apikey": API_KEY}
params = {"address1": "invalid_address"}
url = f"{ATTOM_BASE_URL}/property/detail"
response = requests.get(url, headers=headers, params=params, timeout=10)
print(f"Status: {response.status_code}")
print(response.text)
