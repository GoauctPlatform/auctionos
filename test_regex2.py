import re

def parse(addr):
    match = re.search(r'^(.*?)\s+([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$', addr.strip())
    if match:
        return match.group(1).strip(), f"{match.group(2).upper()} {match.group(3) or ''}".strip()
    return addr, ""

print(parse("2521 Nw 13 Ave Miami FL 33142"))
print(parse("Dorris CA 96023"))
print(parse("123 Main St NY"))
print(parse("Some Place Avenue"))
