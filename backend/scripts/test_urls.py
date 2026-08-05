import urllib.request
import urllib.parse
import json

def check_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        response = urllib.request.urlopen(req, timeout=5)
        return response.getcode(), response.geturl()
    except urllib.error.HTTPError as e:
        return e.code, url
    except Exception as e:
        return str(e), url

urls = [
    "https://www.realtor.com/realestateandhomes-search/33139",
    "https://www.realtor.com/realestateandhomes-search/Miami_FL",
    "https://www.redfin.com/zipcode/33139",
    "https://www.trulia.com/FL/Miami/",
    "https://www.trulia.com/CA/San_Francisco/",
    "https://www.neighborhoodscout.com/fl/miami/crime",
    "https://www.neighborhoodscout.com/ca/san-francisco/crime"
]

for u in urls:
    print(f"Testing {u} ... ", end="")
    code, final_url = check_url(u)
    print(f"Code: {code}")

