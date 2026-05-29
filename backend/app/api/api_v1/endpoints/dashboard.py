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
    # 1. Get the list of IDs for all folders/lists belonging to the current user or their active company
    from app.models.client_data import ClientList
    effective_company_id = current_user.active_company_id or current_user.company_id
    
    if current_user.role in ['manager', 'agent']:
        if not effective_company_id:
            return []
        user_lists = db.query(ClientList).filter(ClientList.company_id == effective_company_id).all()
    else:
        query = db.query(ClientList)
        if effective_company_id:
            query = query.filter(ClientList.company_id == effective_company_id)
        else:
            query = query.filter(ClientList.user_id == current_user.id).filter(ClientList.company_id == None)
        user_lists = query.all()
        
    list_ids = [lst.id for lst in user_lists]
    if not list_ids:
        return []

    # 2. Query unique properties in these lists that have upcoming auctions
    now_str = datetime.utcnow().strftime('%Y-%m-%d')
    rows = db.execute(text("""
        WITH unique_upcoming AS (
            SELECT DISTINCT ON (p.property_id) 
                p.id, 
                p.address, 
                p.county,
                p.state,
                p.parcel_id,
                COALESCE(pah.auction_date, ae.auction_date) as auction_date, 
                COALESCE(pah.auction_name, ae.name) as auction_name, 
                p.property_type
            FROM client_list_property clp
            JOIN property_details p ON p.id = clp.property_id
            JOIN property_auction_history pah ON pah.property_id = p.property_id
            LEFT JOIN auction_events ae ON pah.auction_id = ae.id
            WHERE clp.list_id = ANY(:list_ids) 
              AND COALESCE(pah.auction_date, ae.auction_date) >= :now
            ORDER BY p.property_id, COALESCE(pah.auction_date, ae.auction_date) ASC
        )
        SELECT id, address, county, state, parcel_id, auction_date, auction_name, property_type
        FROM unique_upcoming
        ORDER BY auction_date ASC
        LIMIT 15
    """), {"list_ids": list_ids, "now": now_str}).fetchall()
    
    results = []
    today = datetime.utcnow().date()
    for r in rows:
        if isinstance(r.auction_date, str):
            try:
                auction_date = datetime.strptime(r.auction_date, '%Y-%m-%d').date()
            except ValueError:
                # Try fallback parse format
                try:
                    auction_date = datetime.strptime(r.auction_date, '%Y-%m-%d %H:%M:%S').date()
                except ValueError:
                    continue
        else:
            auction_date = r.auction_date
            
        days_left = (auction_date - today).days
        
        if days_left == 0:
            countdown = "Today"
        elif days_left == 1:
            countdown = "Tomorrow"
        elif days_left > 1:
            countdown = f"{days_left}d left"
        else:
            countdown = "Ended"
            
        results.append({
            "id": r.id,
            "title": f"{r.address or 'Unknown Address'} ({r.county or r.state or ''})",
            "countdown": countdown,
            "type": r.auction_name or r.property_type or "Auction",
            "address": r.address or "",
            "parcel_id": r.parcel_id
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
