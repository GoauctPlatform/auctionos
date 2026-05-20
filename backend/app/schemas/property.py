from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

# Property Details
class PropertyDetailsBase(BaseModel):
    property_id: str
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    estimated_value: Optional[float] = None
    rental_value: Optional[float] = None
    state_parcel_id: Optional[str] = None
    account_number: Optional[str] = None
    attom_id: Optional[str] = None
    use_code: Optional[str] = None
    use_description: Optional[str] = None
    zoning: Optional[str] = None
    zoning_description: Optional[str] = None
    legal_description: Optional[str] = None
    subdivision: Optional[str] = None
    num_stories: Optional[int] = None
    num_units: Optional[int] = None
    structure_style: Optional[str] = None
    building_area_sqft: Optional[int] = None
    lot_acres: Optional[float] = None
    assessed_value: Optional[float] = None
    land_value: Optional[float] = None
    improvement_value: Optional[float] = None
    tax_amount: Optional[float] = None
    tax_year: Optional[int] = None
    homestead_exemption: Optional[bool] = None
    last_sale_date: Optional[date] = None
    last_sale_price: Optional[float] = None
    last_transfer_date: Optional[date] = None
    flood_zone_code: Optional[str] = None
    is_qoz: Optional[bool] = None
    legal_tags: Optional[str] = None
    market_value_url: Optional[str] = None
    appraisal_desc: Optional[str] = None
    regrid_url: Optional[str] = None
    fema_url: Optional[str] = None
    zillow_url: Optional[str] = None
    gsi_url: Optional[str] = None
    gsi_data: Optional[str] = None
    max_bid: Optional[float] = None

    # New Extended Detail Fields
    alternate_owner_address: Optional[str] = None
    state_inventory_entered_date: Optional[date] = None
    qoz_description: Optional[str] = None
    parcel_shape_data: Optional[str] = None
    pin_ppin: Optional[str] = None
    raw_parcel_number: Optional[str] = None
    county_fips: Optional[str] = None
    additional_parcel_numbers: Optional[str] = None
    occupancy_checked_date: Optional[date] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # V3 Expanded Fields
    redfin_url: Optional[str] = None
    redfin_estimate: Optional[float] = None
    lot_sqft: Optional[float] = None
    sewer_type: Optional[str] = None
    water_type: Optional[str] = None
    property_type_detail: Optional[str] = None
    import_error_msg: Optional[str] = None
    is_processed: Optional[bool] = None
    map_link: Optional[str] = None

class PropertyDetailsCreate(PropertyDetailsBase):
    pass

class PropertyDetailsUpdate(PropertyDetailsBase):
    property_id: Optional[str] = None

class PropertyDetails(PropertyDetailsBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Property Auction History
class PropertyAuctionHistoryBase(BaseModel):
    property_id: str
    auction_name: Optional[str] = None
    auction_date: Optional[date] = None
    location: Optional[str] = None
    listed_as: Optional[str] = None
    taxes_due: Optional[float] = None
    info_link: Optional[str] = None
    list_link: Optional[str] = None

class PropertyAuctionHistoryCreate(PropertyAuctionHistoryBase):
    pass

class PropertyAuctionHistoryUpdate(PropertyAuctionHistoryBase):
    property_id: Optional[str] = None

class PropertyAuctionHistory(PropertyAuctionHistoryBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Extended unified view for the Frontend DataGrid
class PropertyDashboardSchema(BaseModel):
    parcel_id: str
    county: Optional[str] = None
    state_code: Optional[str] = None
    auction_date: Optional[date] = None
    auction_name: Optional[str] = None
    amount_due: Optional[float] = None
    assessed_value: Optional[float] = None
    cs_number: Optional[str] = None
    account_number: Optional[str] = None
    owner_address: Optional[str] = None
    tax_year: Optional[int] = None
    lot_acres: Optional[float] = None
    estimated_value: Optional[float] = None
    land_value: Optional[float] = None
    improvement_value: Optional[float] = None
    property_type: Optional[str] = None
    address: Optional[str] = None
    occupancy: Optional[str] = None
    purchase_option_type: Optional[str] = None
    availability_status: Optional[str] = None
    
    # New Extended Detail Fields from Dashboard view perspective
    alternate_owner_address: Optional[str] = None
    state_inventory_entered_date: Optional[date] = None
    qoz_description: Optional[str] = None
    parcel_shape_data: Optional[str] = None
    pin_ppin: Optional[str] = None
    raw_parcel_number: Optional[str] = None
    county_fips: Optional[str] = None
    additional_parcel_numbers: Optional[str] = None
    occupancy_checked_date: Optional[date] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # V3 Expanded Fields
    redfin_url: Optional[str] = None
    redfin_estimate: Optional[float] = None
    lot_sqft: Optional[float] = None
    sewer_type: Optional[str] = None
    water_type: Optional[str] = None
    property_type_detail: Optional[str] = None
    import_error_msg: Optional[str] = None
    is_processed: Optional[bool] = None
    map_link: Optional[str] = None

    # Deal metrics and derived categories
    deal_score: Optional[float] = None
    deal_rating: Optional[str] = None
    property_category: Optional[str] = None
    auction_type: Optional[str] = None
    market_land_value: Optional[float] = None
    market_improvement_value: Optional[float] = None
    owner_occupied: Optional[str] = None

class PaginatedPropertyResponse(BaseModel):
    items: List[PropertyDashboardSchema]
    total: int
