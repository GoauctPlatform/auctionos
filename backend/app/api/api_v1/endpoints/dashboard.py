from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Any, List
from datetime import datetime, timedelta

from app.api import deps
from app.models.user import User


router = APIRouter()

@router.get("/init")
def get_dashboard_init() -> Any:
    # Providing the mocked structure expected by the React Dashboard
    return {
        "quick_stats": {
            "total_value": 3450000,
            "total_value_trend": "+12.5%",
            "active_count": 42,
            "active_count_trend": "+4",
            "pending_count": 18,
            "pending_count_trend": "-2"
        },
        "county_stats": [],
        "analytics": {
            "status_distribution": {
                "active": 0,
                "sold": 0,
                "pending": 0
            },
            "spend_vs_equity": [
                {"name": "Spend", "value": 0},
                {"name": "Equity", "value": 0}
            ],
            "county_breakdown": [
                {"range": "None", "value": 0}
            ]
        },
        "recent_activity": []
    }

@router.get("/ticker")
def get_ticker(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    # Properties linked to auctions within the next 30 days
    now = datetime.utcnow()
    thirty_days = now + timedelta(days=30)
    
    # We query auctions happening in next 30 days and their properties
    rows = db.execute(text("""
        SELECT p.id, p.address, a.auction_date, a.name as auction_name, p.property_type
        FROM properties p
        JOIN auctions a ON p.auction_id = a.id
        WHERE a.auction_date >= :now AND a.auction_date <= :thirty_days
        ORDER BY a.auction_date ASC
        LIMIT 10
    """), {"now": now.strftime('%Y-%m-%d'), "thirty_days": thirty_days.strftime('%Y-%m-%d')}).fetchall()
    
    results = []
    for r in rows:
        auction_date = datetime.strptime(str(r.auction_date), '%Y-%m-%d')
        days_left = (auction_date - now).days
        results.append({
            "id": r.id,
            "title": r.address or "Unknown Address",
            "countdown": f"{days_left}d left",
            "type": r.property_type or "Auction",
            "address": r.address or ""
        })
    return results

@router.get("/metrics")
def get_metrics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    # Count properties by auction_type / property_type
    foreclosure = db.execute(text("SELECT COUNT(*) FROM properties WHERE LOWER(auction_type) LIKE '%foreclosure%' OR LOWER(property_type) LIKE '%foreclosure%'")).scalar() or 0
    lien = db.execute(text("SELECT COUNT(*) FROM properties WHERE LOWER(auction_type) LIKE '%lien%' OR LOWER(property_type) LIKE '%lien%'")).scalar() or 0
    deed = db.execute(text("SELECT COUNT(*) FROM properties WHERE LOWER(auction_type) LIKE '%deed%' OR LOWER(property_type) LIKE '%deed%'")).scalar() or 0
    
    return {
        "foreclosure": foreclosure,
        "lien": lien,
        "deed": deed
    }

@router.get("/recommended")
def get_recommended(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    # Top 8 deals sorted by deal_score
    rows = db.execute(text("""
        SELECT p.id, p.address, p.county, p.state, p.assessed_value, p.deal_score
        FROM properties p
        WHERE p.deal_score IS NOT NULL
        ORDER BY p.deal_score DESC
        LIMIT 8
    """)).fetchall()
    
    results = []
    for r in rows:
        results.append({
            "id": r.id,
            "address": r.address or "Unknown Address",
            "county": r.county or "Unknown County",
            "state": r.state or "FL",
            "assessed_value": r.assessed_value or 0,
            "deal_score": r.deal_score or 0
        })
    
    # If no scored properties, fallback to latest
    if not results:
        rows = db.execute(text("""
            SELECT p.id, p.address, p.county, p.state, p.assessed_value, p.deal_score
            FROM properties p
            ORDER BY p.id DESC
            LIMIT 8
        """)).fetchall()
        for r in rows:
            results.append({
                "id": r.id,
                "address": r.address or "Unknown Address",
                "county": r.county or "Unknown County",
                "state": r.state or "FL",
                "assessed_value": r.assessed_value or 0,
                "deal_score": r.deal_score or 0
            })
            
    return results
