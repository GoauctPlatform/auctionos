import requests
import json
import os
from app.core.config import settings

api_key = settings.ATTOM_API_KEY
url = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile"

headers = {
    "Accept": "application/json",
    "apikey": api_key
}

params = {
    "address1": "4220  SANTIAGO ST",
    "address2": "TAMPA, FL"
}

resp = requests.get(url, headers=headers, params=params)
data = resp.json()

print(json.dumps(data, indent=2)[:2000])

