import httpx
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

url = "http://localhost:8000/api/v1/properties/parceltiles/18/71355/109015.png"
res = httpx.get(url)
print(f"Status: {res.status_code}")
print(f"Content-Type: {res.headers.get('content-type')}")
print(f"Length: {len(res.content)}")
if res.status_code == 200:
    with open("tile.png", "wb") as f:
        f.write(res.content)
    print("Tile saved to tile.png")
