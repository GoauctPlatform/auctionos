from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, root_validator

class AuctionEventBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    auction_date: date
    time: Optional[str] = None
    location: Optional[str] = None
    county: Optional[str] = None
    county_code: Optional[str] = None
    state: Optional[str] = None
    tax_status: str = "Deed"
    parcels_count: Optional[int] = 0
    available_count: Optional[int] = 0
    notes: Optional[str] = None
    
    avg_deal_score: Optional[float] = None
    deal_rating: Optional[str] = None
    
    search_link: Optional[str] = None
    register_date: Optional[date] = None
    register_link: Optional[str] = None
    list_link: Optional[str] = None
    purchase_info_link: Optional[str] = None

    @root_validator(pre=True)
    def validate_and_infer_tax_status(cls, values):
        if isinstance(values, dict):
            from app.utils.auction_classifier import infer_canonical_tax_status
            status = values.get('tax_status')
            name = values.get('name')
            short_name = values.get('short_name')
            notes = values.get('notes')
            values['tax_status'] = infer_canonical_tax_status(
                tax_status=status,
                name=name,
                short_name=short_name,
                notes=notes
            )
        return values

class AuctionEventCreate(AuctionEventBase):
    pass

class AuctionEventUpdate(AuctionEventBase):
    pass

class AuctionEvent(AuctionEventBase):
    id: int
    live_available_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaginatedAuctionResponse(BaseModel):
    items: list[AuctionEvent]
    total: int
