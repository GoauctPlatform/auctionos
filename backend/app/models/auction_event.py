from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Date, Text, DateTime, Float
from app.db.base_class import Base
class AuctionEvent(Base):
    __tablename__ = "auction_events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100), nullable=True)
    auction_date = Column(Date, nullable=False)
    time = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    county = Column(String(100), nullable=True)
    county_code = Column(String(50), nullable=True)
    state = Column(String(100), nullable=True)
    tax_status = Column(String(100), nullable=True)
    parcels_count = Column(Integer, nullable=True, default=0)
    available_count = Column(Integer, nullable=True, default=0)
    notes = Column(Text, nullable=True)
    
    # ML Scoring / Ranking
    avg_deal_score = Column(Float, nullable=True)
    deal_rating = Column(String(5), nullable=True)
    
    # Links
    search_link = Column(String(2048), nullable=True)
    register_date = Column(Date, nullable=True)
    register_link = Column(String(2048), nullable=True)
    list_link = Column(String(2048), nullable=True)
    purchase_info_link = Column(String(2048), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
