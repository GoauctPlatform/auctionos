from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.models.county_contact import CountyContact
from app.services.county_contact_service import county_contact_service

router = APIRouter()
STATE_ABBREVIATIONS = {
    'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca', 'colorado': 'co',
    'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id',
    'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la',
    'maine': 'me', 'maryland': 'md', 'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms',
    'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
    'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
    'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd',
    'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt', 'virginia': 'va', 'washington': 'wa',
    'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy', 'district of columbia': 'dc'
}

@router.get("/{state}/counties", response_model=List[str])
def get_counties(
    state: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Return all known counties for a state."""
    state_query = state.lower().strip()
    state_abbr = STATE_ABBREVIATIONS.get(state_query, state_query)
    return county_contact_service.get_counties_for_state(state_abbr, db)

@router.get("/{state}/contact", response_model=Dict[str, str])
def get_state_contact(
    state: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    """Return the main portal contact info for a state."""
    state_query = state.lower().strip()
    state_abbr = STATE_ABBREVIATIONS.get(state_query, state_query)
    contact = county_contact_service.get_state_contact(state_abbr, db)
    if not contact:
        return {"state": state_abbr, "url": ""}
    return contact

@router.get("/{state}/{county}/contacts", response_model=List[Dict[str, str]])
def get_county_contacts(
    state: str, 
    county: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Retrieve contact information dynamically from the database for a specific county.
    """
    state_query = state.lower().strip()
    state_abbr = STATE_ABBREVIATIONS.get(state_query, state_query)
    county_query = county.lower().strip()
    # We already query DB first inside the service, so we don't need to manually merge here
    # Priority: DB contact data, then CSV
    contacts = county_contact_service.get_contacts(state_abbr, county_query, db)
    return contacts

