import os
import csv
import unicodedata
from typing import Optional, Dict, Tuple
from app.utils.state_mapper import normalize_state

# Memory cache for FIPS mapping
_fips_cache: Optional[Dict[Tuple[str, str], str]] = None

def strip_accents(text_str: str) -> str:
    try:
        text_str = unicode(text_str, 'utf-8')
    except NameError:
        pass
    text_str = unicodedata.normalize('NFD', text_str)
    text_str = text_str.encode('ascii', 'ignore')
    return text_str.decode("utf-8")

def load_fips_mapping() -> Dict[Tuple[str, str], str]:
    global _fips_cache
    if _fips_cache is not None:
        return _fips_cache
        
    _fips_cache = {}
    
    # Try multiple possible paths to locate the CSV file
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    paths_to_try = [
        os.path.join(base_dir, "scratch", "county_fips_master.csv"),
        "scratch/county_fips_master.csv",
        "backend/scratch/county_fips_master.csv",
        "/Users/gustavo/Downloads/auctionos/backend/scratch/county_fips_master.csv"
    ]
    
    lines = None
    for path in paths_to_try:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.read().splitlines()
                break
            except Exception:
                try:
                    with open(path, "r", encoding="latin-1") as f:
                        lines = f.read().splitlines()
                    break
                except Exception:
                    pass
                    
    if not lines:
        # Return empty mapping if CSV not found (graceful fallback)
        return _fips_cache
        
    reader = csv.DictReader(lines)
    for row in reader:
        state = row['state_abbr'].upper().strip()
        county_raw = row['county_name'].lower()
        
        county_clean = strip_accents(county_raw).replace("county", "").replace("parish", "").replace("city", "").replace(".", "").replace("-", " ").strip()
        fips_str = row['fips'].strip().zfill(5)
        
        _fips_cache[(state, county_clean)] = fips_str
        
        # St and Saint variations
        if county_clean.startswith("st "):
            _fips_cache[(state, county_clean.replace("st ", "saint "))] = fips_str
        if county_clean.startswith("saint "):
            _fips_cache[(state, county_clean.replace("saint ", "st "))] = fips_str
            
    return _fips_cache

def resolve_county_fips(state: str, county: str) -> Optional[str]:
    """
    On-the-fly resolver to get the 5-digit county FIPS code based on state and county name.
    Normalizes inputs and handles standard county abbreviations.
    """
    if not state or not county:
        return None
        
    try:
        state_abbr = normalize_state(state.strip())
        
        county_raw = county.lower()
        county_clean = strip_accents(county_raw).replace("county", "").replace("parish", "").replace("city", "").replace(".", "").replace("-", " ").strip()
        
        if "jefferson-" in county_clean:
            county_clean = "jefferson"
            
        mapping = load_fips_mapping()
        return mapping.get((state_abbr, county_clean))
    except Exception:
        return None
