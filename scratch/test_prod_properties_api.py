import urllib.request
import urllib.parse
import json

base_url = "https://auctionos-production.up.railway.app/api/v1"

import ssl

def test_api():
    context = ssl._create_unverified_context()
    print("Logging in to Production...")
    login_url = f"{base_url}/auth/login/access-token"
    data = urllib.parse.urlencode({
        "username": "admin@goauct.com",
        "password": "AdminSecurePass123!"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(
            login_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req, context=context) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            token = res_data.get("access_token")
            print("Login successful. Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    print("Fetching properties from Production...")
    prop_url = f"{base_url}/properties/?limit=10"
    try:
        req = urllib.request.Request(prop_url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, context=context) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print("Properties fetched successfully from Production:")
            print(f"  Total: {res_data.get('total')}")
    except Exception as e:
        print(f"Failed to fetch properties from Production: {e}")

    print("Fetching auctions from Production...")
    auc_url = f"{base_url}/auctions/?limit=10"
    try:
        req = urllib.request.Request(auc_url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, context=context) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print("Auctions fetched successfully from Production:")
            print(f"  Total: {res_data.get('total')}")
    except Exception as e:
        print(f"Failed to fetch auctions from Production: {e}")

    print("Fetching lists from Production...")
    lists_url = f"{base_url}/client-data/lists"
    try:
        req = urllib.request.Request(lists_url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, context=context) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print("Lists fetched successfully from Production:")
            print(f"  Count: {len(res_data)}")
    except Exception as e:
        print(f"Failed to fetch lists from Production: {e}")

if __name__ == "__main__":
    test_api()
