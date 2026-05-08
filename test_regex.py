import re

def split_address(full_address, state=""):
    match = re.search(r'^(.*?)\s+([a-zA-Z\s]+)\s+([a-zA-Z]{2})\s+(\d{5}(?:-\d{4})?)$', full_address)
    if match:
        street = match.group(1).strip()
        city = match.group(2).strip()
        st = match.group(3).strip().upper()
        zipcode = match.group(4).strip()
        return street, f"{city} {st} {zipcode}"
    
    if state:
        match = re.search(fr'^(.*?)\s+([a-zA-Z\s]+)\s+{state}$', full_address, re.IGNORECASE)
        if match:
            street = match.group(1).strip()
            city = match.group(2).strip()
            return street, f"{city} {state}"
            
    return full_address, ""

print(split_address("2521 Nw 13 Ave Miami FL 33142", "FL"))
print(split_address("19217 Carrick Ave Weed CA 96094", "CA"))
print(split_address("123 Main St FL 12345", "FL"))
