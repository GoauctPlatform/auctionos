import requests
resp = requests.get("http://localhost:8000/api/v1/properties?limit=1")
print(resp.json())
