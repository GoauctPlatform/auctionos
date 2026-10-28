from pydantic import BaseModel, Field, validator, root_validator, ConfigDict
from typing import Optional, Union, List, Any
from datetime import datetime
import pandas as pd
import re

def parse_date(v):
    if v is None or pd.isna(v) or v == '':
        return None
    return v

def parse_float(v):
    if v is None or pd.isna(v) or v == '':
        return None
    if isinstance(v, str):
        clean_str = v.replace(',', '')
        match = re.search(r'[-+]?\d*\.?\d+', clean_str)
        if match:
            return float(match.group())
        return None
    return float(v)

class PropertyCSVRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    property_id: Optional[str] = Field(None, alias="property_id")
    parcel_id: str = Field(..., alias="parcel_id")
    address: Optional[str] = Field(None, alias="address")
    type: Optional[str] = Field("residential", alias="property_type")
    description: Optional[str] = None
    
    # Financials
    amount_due: Optional[float] = None
    total_value: Optional[float] = Field(None, alias="assessed_value")
    land_value: Optional[float] = None
    improvements: Optional[float] = None
    estimated_arv: Optional[float] = None
    estimated_rent: Optional[float] = None
    taxes_due_auction: Optional[float] = None

    # Location
    county: Optional[str] = None
    state_code: Optional[str] = Field(None, alias="state")
    coordinates: Optional[str] = None # coordinates: "lat, lon" or "lat lon"

    # Auction Info
    auction_date: Optional[str] = None # Keep as string for initial parsing
    auction_name: Optional[str] = None
    auction_info_link: Optional[str] = None
    auction_list_link: Optional[str] = None
    
    # Details
    account: Optional[str] = None
    acres: Optional[float] = Field(None, alias="lot_acres")
    tax_sale_year: Optional[Union[float, int]] = Field(None, alias="tax_year")
    date: Optional[str] = None
    cs_number: Optional[str] = None
    parcel_code: Optional[str] = None
    map_link: Optional[str] = None
    property_category: Optional[str] = None
    purchase_option_type: Optional[str] = None
    vacancy: Optional[str] = None
    owner_address: Optional[str] = None
    availability: Optional[str] = Field(None, alias="availability_status")
    
    # New Extended Fields (V3)
    redfin_url: Optional[str] = None
    redfin_estimate: Optional[float] = None
    lot_sqft: Optional[float] = None
    zoning: Optional[str] = None
    subdivision: Optional[str] = None
    legal_description: Optional[str] = None
    sewer_type: Optional[str] = None
    water_type: Optional[str] = None
    property_type_detail: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    error: Optional[str] = None
    processed: Optional[str] = None

    @validator('amount_due', 'total_value', 'land_value', 'improvements', 'estimated_arv', 'estimated_rent', 'taxes_due_auction', 'acres', 'redfin_estimate', 'lot_sqft', 'latitude', 'longitude', pre=True)
    def clean_floats(cls, v):
        return parse_float(v)

    @validator('parcel_id')
    def validate_parcel_id(cls, v):
        if not v or pd.isna(v):
            raise ValueError('Parcel ID is required')
        return str(v).strip()

class AuctionCSVRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[Union[int, str]] = Field(None, alias="id")
    name: str = Field(alias="Name")
    short_name: Optional[str] = Field(None, alias="Short Name")
    tax_status: Optional[str] = Field(None, alias="Tax Status")
    parcels: Any = Field(None, alias="Parcels")
    
    county_code: Any = Field(None, alias="County Code")
    county_name: Optional[str] = Field(None, alias="County Name")
    state: Optional[str] = Field(None, alias="State")
    
    auction_date: Optional[str] = Field(None, alias="Auction Date")
    time: Optional[str] = Field(None, alias="Time")
    location: Optional[str] = Field(None, alias="Location")
    notes: Optional[str] = Field(None, alias="Notes")
    
    search_link: Optional[str] = Field(None, alias="Search Link")
    register_date: Optional[str] = Field(None, alias="Register Date")
    register_link: Optional[str] = Field(None, alias="Register Link")
    list_link: Optional[str] = Field(None, alias="List Link")
    purchase_info_link: Optional[str] = Field(None, alias="Purchase Info Link")

    # Extra fields for fallback mapping from database export CSVs (lowercase)
    @root_validator(pre=True)
    def map_lowercase_headers(cls, values):
        # If 'Name' is missing but 'name' exists, map it
        if 'Name' not in values and 'name' in values:
            values['Name'] = values['name']
        if 'Short Name' not in values and 'short_name' in values:
            values['Short Name'] = values['short_name']
        if 'Tax Status' not in values and 'tax_status' in values:
            values['Tax Status'] = values['tax_status']
        if 'Parcels' not in values and 'parcels_count' in values:
            values['Parcels'] = values['parcels_count']
        if 'County Name' not in values and 'county' in values:
            values['County Name'] = values['county']
        if 'County Code' not in values and 'county_code' in values:
            values['County Code'] = values['county_code']
        if 'Auction Date' not in values and 'auction_date' in values:
            values['Auction Date'] = values['auction_date']
        if 'Search Link' not in values and 'search_link' in values:
            values['Search Link'] = values['search_link']
        if 'Register Date' not in values and 'register_date' in values:
            values['Register Date'] = values['register_date']
        if 'Register Link' not in values and 'register_link' in values:
            values['Register Link'] = values['register_link']
        if 'List Link' not in values and 'list_link' in values:
            values['List Link'] = values['list_link']
        if 'Purchase Info Link' not in values and 'purchase_info_link' in values:
            values['Purchase Info Link'] = values['purchase_info_link']

        # Ensure canonical tax_status ('Foreclosure', 'Deed', 'Lien')
        from app.utils.auction_classifier import infer_canonical_tax_status
        raw_status = values.get('Tax Status') or values.get('tax_status')
        name_val = values.get('Name') or values.get('name')
        short_val = values.get('Short Name') or values.get('short_name')
        notes_val = values.get('Notes') or values.get('notes')
        canonical_status = infer_canonical_tax_status(
            tax_status=raw_status,
            name=name_val,
            short_name=short_val,
            notes=notes_val
        )
        values['Tax Status'] = canonical_status
        values['tax_status'] = canonical_status
        return values

    @validator('name')
    def validate_name(cls, v):
        if not v or pd.isna(v):
            raise ValueError('Auction Name is required')
        return str(v).strip()
