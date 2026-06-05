import urllib.request
import urllib.parse
import json
import ssl

base_url = "https://auctionos-production.up.railway.app/api/v1"
context = ssl._create_unverified_context()

def get_error():
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
        with urllib.request.urlopen(req, context=context) as res:
            print(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}:")
        print(e.read().decode("utf-8"))
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    get_error()
