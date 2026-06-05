import requests
import json
import os
from app.core.config import settings

api_key = settings.ATTOM_API_KEY
url = "https://api.gateway.attomdata.com/parceltiles/18/71355/109015.png"

resp = requests.get(url, params={"apikey": api_key})
print("Status:", resp.status_code)
print("Content-Type:", resp.headers.get("Content-Type"))

