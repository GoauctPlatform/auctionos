import urllib.request
import json

def test_api(name, url):
    print(f"Testing {name} ({url}):")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=5)
        code = response.getcode()
        body = response.read().decode('utf-8')
        print(f"  Status: {code}")
        print(f"  Response: {body[:300]}")
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error {e.code}: {e.read().decode('utf-8')[:300]}")
    except Exception as e:
        print(f"  Failed: {e}")

# Try standard endpoints
test_api("Production Health", "https://auctionos-production.up.railway.app/api/v1/health")
test_api("Production root", "https://auctionos-production.up.railway.app/")
test_api("Production Swagger", "https://auctionos-production.up.railway.app/api/v1/docs")

# Try potential staging domains
test_api("Staging Health", "https://auctionos-staging.up.railway.app/api/v1/health")
test_api("Staging root", "https://auctionos-staging.up.railway.app/")
