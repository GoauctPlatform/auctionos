import requests

API_KEY = "fc96060ce7e5ea7ed50ab08605f948ab"
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"

headers = {
    "Accept": "application/json",
    "apikey": API_KEY
}

# Use a generic address to test
params = {
    "address1": "4529 Winona Court",
    "address2": "Denver CO"
}

url = f"{ATTOM_BASE_URL}/property/detail"
print(f"Calling: {url}")
try:
    response = requests.get(url, headers=headers, params=params, timeout=10)
    print(f"Status Code: {response.status_code}")
    try:
        print(response.json())
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
