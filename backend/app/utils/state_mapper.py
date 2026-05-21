STATE_MAPPING = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
    "district of columbia": "DC",
    "washington, d.c.": "DC",
    "washington,d.c.": "DC",
    "washington d.c.": "DC",
    "washington dc": "DC",
    "puerto rico": "PR"
}

def normalize_state(state_input: str) -> str:
    """
    Normalizes a state string. 
    If a full name is provided (e.g., 'Texas' or 'texas '), it converts it to the 2-letter abbreviation ('TX').
    If it's already an abbreviation or not found, it returns the input trimmed and capitalized appropriately.
    """
    if not state_input:
        return state_input
        
    cleaned = state_input.strip().lower()
    
    # If the user typed the full name
    if cleaned in STATE_MAPPING:
        return STATE_MAPPING[cleaned]
    
    # If it's already a code, just uppercase it
    if len(cleaned) == 2:
        return cleaned.upper()
        
    # Fallback
    return state_input.strip().upper()
