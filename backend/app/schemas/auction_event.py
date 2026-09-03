from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel

class AuctionEventBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    auction_date: date
    time: Optional[str] = None
    location: Optional[str] = None
    county: Optional[str] = None
    county_code: Optional[str] = None
    state: Optional[str] = None
    tax_status: Optional[str] = None
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
