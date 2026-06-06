import requests
import json
import os

url = "http://localhost:8000/api/v1/properties?limit=1"
resp = requests.get(url)
data = resp.json()

if "items" in data and len(data["items"]) > 0:
    prop = data["items"][0]
    pid = prop["parcel_id"] or prop["id"]
    gsi_url = prop["gsi_url"]
    print(f"Property ID: {pid}")
    print(f"gsi_url: {gsi_url}")
    
    # Try fetching it
    if gsi_url.startswith("/"):
        fetch_url = f"http://localhost:8000{gsi_url}"
    else:
        fetch_url = gsi_url
        
    print(f"Fetching: {fetch_url}")
    img_resp = requests.get(fetch_url)
    print(f"Status: {img_resp.status_code}")
    print(f"Content-Type: {img_resp.headers.get('Content-Type')}")
    if img_resp.status_code != 200:
        print(f"Error: {img_resp.text}")
else:
    print("No properties found.")
