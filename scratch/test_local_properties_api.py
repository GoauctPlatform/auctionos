import urllib.request
import urllib.parse
import json

base_url = "http://localhost:8000/api/v1"

def test_api():
    print("Logging in...")
    login_url = f"{base_url}/auth/login/access-token"
    # Note: oauth2 uses form-data or urlencoded form
    data = urllib.parse.urlencode({
        "username": "admin@auctionpro.com",
        "password": "password"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(
            login_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            token = res_data.get("access_token")
            print("Login successful. Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    print("Fetching properties...")
    prop_url = f"{base_url}/properties/?limit=10"
    try:
        req = urllib.request.Request(
            prop_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print("Properties fetched successfully:")
            print(f"  Total count in DB according to API: {res_data.get('total')}")
            items = res_data.get("items", [])
            print(f"  Returned items count: {len(items)}")
            if items:
                print("  Sample item address:", items[0].get("address"))
    except Exception as e:
        print(f"Failed to fetch properties: {e}")

if __name__ == "__main__":
    test_api()
