import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base

class PropertyDetails(Base):
    __tablename__ = "property_details"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String(36), unique=True, index=True, nullable=False)
    
    # Privacy / Custom Property tracking
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    parcel_id = Column(String(100), unique=True, index=True, nullable=True)
    address = Column(String(255), nullable=True)
    owner_address = Column(String(255), nullable=True)
    county = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    amount_due = Column(Float, nullable=True)
    occupancy = Column(String(100), nullable=True)
    cs_number = Column(String(100), nullable=True)
    property_type = Column(String(100), nullable=True)
    status = Column(String(100), nullable=True, default="active")
    visibility = Column(String(50), nullable=True, default="public", index=True)
    public_photos = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Float, nullable=True)
    sqft = Column(Integer, nullable=True)
    lot_size = Column(Float, nullable=True)
    year_built = Column(Integer, nullable=True)
    estimated_value = Column(Float, nullable=True)
    rental_value = Column(Float, nullable=True)
    state_parcel_id = Column(String(100), nullable=True)
    account_number = Column(String(100), nullable=True)
    attom_id = Column(String(100), nullable=True)
    use_code = Column(String(50), nullable=True)
    use_description = Column(String(255), nullable=True)
    zoning = Column(String(50), nullable=True)
    zoning_description = Column(String(255), nullable=True)
    legal_description = Column(Text, nullable=True)
    subdivision = Column(String(100), nullable=True)
    num_stories = Column(Integer, nullable=True)
    num_units = Column(Integer, nullable=True)
    structure_style = Column(String(100), nullable=True)
    building_area_sqft = Column(Integer, nullable=True)
    lot_acres = Column(Float, nullable=True)
    assessed_value = Column(Float, nullable=True)
    land_value = Column(Float, nullable=True)
    improvement_value = Column(Float, nullable=True)
    tax_amount = Column(Float, nullable=True)
    tax_year = Column(Integer, nullable=True)
    homestead_exemption = Column(Boolean, nullable=True)
    last_sale_date = Column(Date, nullable=True)
    last_sale_price = Column(Float, nullable=True)
    last_transfer_date = Column(Date, nullable=True)
    flood_zone_code = Column(String(20), nullable=True)
    is_qoz = Column(Boolean, nullable=True)
    legal_tags = Column(String(500), nullable=True)
    market_value_url = Column(String(2048), nullable=True)
    appraisal_desc = Column(Text, nullable=True)
    regrid_url = Column(String(2048), nullable=True)
    fema_url = Column(String(2048), nullable=True)
    zillow_url = Column(String(2048), nullable=True)
    gsi_url = Column(String(2048), nullable=True)
    gsi_data = Column(Text, nullable=True)
    max_bid = Column(Float, nullable=True)
    property_category = Column(String(255), nullable=True)
    purchase_option_type = Column(String(255), nullable=True)
    availability_status = Column(String(50), nullable=True, default="available", index=True)
    
    # New Fields for Extended Detail View
    alternate_owner_address = Column(String(255), nullable=True)
    state_inventory_entered_date = Column(Date, nullable=True)
    qoz_description = Column(String(255), nullable=True)
    parcel_shape_data = Column(Text, nullable=True)
    pin_ppin = Column(String(100), nullable=True)
    raw_parcel_number = Column(String(100), nullable=True)
    county_fips = Column(String(20), nullable=True)
    additional_parcel_numbers = Column(Text, nullable=True)
    occupancy_checked_date = Column(Date, nullable=True)

    # V3 Expanded Fields
    redfin_url = Column(String(2048), nullable=True)
    redfin_estimate = Column(Float, nullable=True)
    lot_sqft = Column(Float, nullable=True)
    sewer_type = Column(String(100), nullable=True)
    water_type = Column(String(100), nullable=True)
    property_type_detail = Column(String(255), nullable=True)
    import_error_msg = Column(Text, nullable=True)
    is_processed = Column(Boolean, nullable=True, default=False)
    map_link = Column(String(2048), nullable=True)

    # ATTOM Enrichment Extracted Fields
    owner_name = Column(String(255), nullable=True)
    owner_occupied = Column(String(20), nullable=True)
    apn_unformatted = Column(String(100), nullable=True)

    # ATTOM Extended Enrichment — JSONB blocks
    # Stores: co-owners, corporate indicator, mailing address parts, ownership duration
    extended_owner_json = Column(JSONB, nullable=True)
    # Stores: array of {sale_date, sale_amount, buyer, seller, deed_type, recording_date}
    sales_history_json = Column(JSONB, nullable=True)
    # Stores: array of {year, assessed_value, land_value, improvement_value, tax_amount}
    tax_history_json = Column(JSONB, nullable=True)
    # Stores: array of {permit_date, description, estimated_cost, contractor, status}
    permits_json = Column(JSONB, nullable=True)



class PropertyAuctionHistory(Base):
    __tablename__ = "property_auction_history"
    __table_args__ = (
        UniqueConstraint('property_id', 'auction_name', name='uq_property_auction_history_property_id_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String(36), nullable=False, index=True)
    auction_id = Column(Integer, ForeignKey("auction_events.id", ondelete="SET NULL"), nullable=True, index=True)
    auction_name = Column(String(255), nullable=True)
    auction_date = Column(Date, nullable=True, index=True)
    location = Column(String(255), nullable=True)
    listed_as = Column(String(255), nullable=True)
    taxes_due = Column(Float, nullable=True)
    info_link = Column(String(2048), nullable=True)
    list_link = Column(String(2048), nullable=True)
    created_at = Column(DateTime, nullable=True)

class PropertyAvailabilityHistory(Base):
    __tablename__ = "property_availability_history"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String(36), nullable=False, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    change_source = Column(String(100), nullable=True) # e.g., 'batch_import', 'manual_update'
    changed_at = Column(DateTime, default=datetime.utcnow)

