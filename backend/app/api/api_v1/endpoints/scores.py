import json
from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api import deps

router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────────────────────

class ScoreSubmitRequest(BaseModel):
    parcel_id: str
    deal_score: float
    rating: str
    status: Optional[str] = None
    state: Optional[str] = None
    county: Optional[str] = None
    score_factors: Optional[List[str]] = []
    model_version: Optional[str] = "rule-based-v1"


class ScoreResponse(BaseModel):
    parcel_id: str
    deal_score: float
    rating: str
    status: Optional[str]
    state: Optional[str]
    county: Optional[str]
    score_factors: Optional[List[str]]
    model_version: str
    computed_at: Optional[datetime]
    updated_at: Optional[datetime]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/", response_model=dict)
def upsert_score(
    payload: ScoreSubmitRequest,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Upsert a deal score for a given parcel_id.
    Called automatically from the frontend on property detail load.
    This builds the persistent scoring dataset for ML training later.
    """
    factors_json = json.dumps(payload.score_factors or [])
    now = datetime.utcnow()

    # Check if score already exists
    existing = db.execute(
        text("SELECT parcel_id FROM property_scores WHERE parcel_id = :parcel_id"),
        {"parcel_id": payload.parcel_id}
    ).fetchone()

    try:
        if existing:
            db.execute(
                text("""
                    UPDATE property_scores
                    SET deal_score = :deal_score,
                        rating = :rating,
                        status = :status,
                        state = :state,
                        county = :county,
                        score_factors = :score_factors,
                        model_version = :model_version,
                        updated_at = :updated_at
                    WHERE parcel_id = :parcel_id
                """),
                {
                    "deal_score": payload.deal_score,
                    "rating": payload.rating,
                    "status": payload.status,
                    "state": payload.state,
                    "county": payload.county,
                    "score_factors": factors_json,
                    "model_version": payload.model_version,
                    "updated_at": now,
                    "parcel_id": payload.parcel_id,
                }
            )
        else:
            db.execute(
                text("""
                    INSERT INTO property_scores
                        (parcel_id, deal_score, rating, status, state, county, score_factors, model_version, computed_at, updated_at)
                    VALUES
                        (:parcel_id, :deal_score, :rating, :status, :state, :county, :score_factors, :model_version, :computed_at, :updated_at)
                """),
                {
                    "parcel_id": payload.parcel_id,
                    "deal_score": payload.deal_score,
                    "rating": payload.rating,
                    "status": payload.status,
                    "state": payload.state,
                    "county": payload.county,
                    "score_factors": factors_json,
                    "model_version": payload.model_version,
                    "computed_at": now,
                    "updated_at": now,
                }
            )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Score upsert failed: {str(e)}")

    return {
        "ok": True,
        "parcel_id": payload.parcel_id,
        "deal_score": payload.deal_score,
        "rating": payload.rating,
        "action": "updated" if existing else "created",
    }


@router.get("/top", response_model=List[dict])
def get_top_scores(
    db: Session = Depends(deps.get_db),
    limit: int = 10,
    min_score: Optional[float] = None,
    state: Optional[str] = None,
) -> Any:
    """
    Returns the top-N scored properties from the DB,
    joined with key property fields for dashboard display.
    Optionally filter by state or minimum score.
    
    Strictly filters for 'available' status to ensure suggested 
    deals are actionable for the user.
    """
    where_clauses = [
        "1=1",
        "LOWER(TRIM(COALESCE(s.status, p.availability_status))) = 'available'",
        "p.created_by_user_id IS NULL"  # Exclude user-created custom properties
    ]
    params: dict = {"limit": limit}

    if min_score is not None:
        where_clauses.append("s.deal_score >= :min_score")
        params["min_score"] = min_score
    if state:
        # Prefer the direct state property if possible
        where_clauses.append("(s.state ILIKE :state OR p.state ILIKE :state)")
        params["state"] = f"%{state}%"

    where_str = " AND ".join(where_clauses)

    query = text(f"""
        SELECT
            s.parcel_id,
            s.deal_score,
            s.rating,
            s.score_factors,
            s.model_version,
            s.updated_at,
            p.address,
            COALESCE(s.county, p.county) as county,
            COALESCE(s.state, p.state) as state,
            p.amount_due,
            p.assessed_value,
            COALESCE(s.status, p.availability_status) as availability_status,
            p.property_type,
            p.lot_acres,
            p.improvement_value,
            p.owner_address,
            p.purchase_option_type,
            p.property_category
        FROM property_scores s
        JOIN property_details p ON p.parcel_id = s.parcel_id
        WHERE {where_str}
        ORDER BY 
            CASE 
                WHEN s.rating LIKE 'A%' THEN 1 
                WHEN s.rating = 'B' THEN 2 
                WHEN s.rating = 'C' THEN 3 
                ELSE 4 
            END ASC,
            s.deal_score DESC
        LIMIT :limit
    """)

    results = db.execute(query, params).fetchall()

    return [
        {
            "parcel_id": r[0],
            "deal_score": r[1],
            "rating": r[2],
            "score_factors": json.loads(r[3]) if r[3] else [],
            "model_version": r[4],
            "updated_at": r[5].isoformat() if r[5] else None,
            "address": r[6],
            "county": r[7],
            "state": r[8],
            "amount_due": r[9],
            "assessed_value": r[10],
            "availability_status": r[11],
            "property_type": r[12],
            "lot_acres": r[13],
            "improvement_value": r[14],
            "owner_address": r[15],
            "purchase_option_type": r[16],
            "property_category": r[17],
        }
        for r in results
    ]


@router.get("/{parcel_id}", response_model=dict)
def get_score(
    parcel_id: str,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Retrieve the persisted score for a specific property."""
    result = db.execute(
        text("""
            SELECT parcel_id, deal_score, rating, score_factors, model_version, computed_at, updated_at
            FROM property_scores
            WHERE parcel_id = :parcel_id
        """),
        {"parcel_id": parcel_id}
    ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="No score found for this property. It will be computed on next detail page view.")

    return {
        "parcel_id": result[0],
        "deal_score": result[1],
        "rating": result[2],
        "score_factors": json.loads(result[3]) if result[3] else [],
        "model_version": result[4],
        "computed_at": result[5].isoformat() if result[5] else None,
        "updated_at": result[6].isoformat() if result[6] else None,
    }


@router.get("/stats/state", response_model=List[dict])
def get_state_stats(
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Returns aggregated deal quality and volume statistics per state.
    Also includes breakdowns by auction type (deed, lien, foreclosure).
    Uses dialect-safe SQL: SQLite (dev) uses SUM(CASE WHEN),
    PostgreSQL (prod) uses COUNT(*) FILTER.
    """
    is_sqlite = "sqlite" in str(db.bind.url)

    if is_sqlite:
        query = text("""
            SELECT 
                UPPER(TRIM(p.state)) as state_code,
                COUNT(*) as volume,
                AVG(COALESCE(s.deal_score, 0)) as avg_score,
                SUM(CASE WHEN s.rating LIKE 'A%' THEN 1 ELSE 0 END) as dist_a,
                SUM(CASE WHEN s.rating = 'B' THEN 1 ELSE 0 END) as dist_b,
                SUM(CASE WHEN s.rating = 'C' THEN 1 ELSE 0 END) as dist_c,
                SUM(CASE WHEN s.rating = 'D' THEN 1 ELSE 0 END) as dist_d,
                SUM(CASE WHEN s.rating = 'F' THEN 1 ELSE 0 END) as dist_f,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%deed%' OR
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%sheriff%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%deed%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%sheriff%'
                ) THEN 1 ELSE 0 END) as deed_volume,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%lien%' OR
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%certificate%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%lien%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%certificate%'
                ) THEN 1 ELSE 0 END) as lien_volume,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%foreclosure%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%foreclosure%'
                ) THEN 1 ELSE 0 END) as foreclosure_volume
            FROM property_details p
            LEFT JOIN property_scores s ON p.parcel_id = s.parcel_id
            LEFT JOIN property_auction_history pah ON pah.property_id = p.property_id
            LEFT JOIN auction_events ae ON ae.id = pah.auction_id
            WHERE LOWER(TRIM(p.availability_status)) = 'available'
              AND p.state IS NOT NULL
              AND NULLIF(TRIM(p.state), '') IS NOT NULL
              AND p.created_by_user_id IS NULL
            GROUP BY UPPER(TRIM(p.state))
            ORDER BY volume DESC
        """)
    else:
        query = text("""
            SELECT 
                UPPER(TRIM(p.state)) as state_code,
                COUNT(*) as volume,
                AVG(COALESCE(s.deal_score, 0)) as avg_score,
                COUNT(*) FILTER (WHERE s.rating LIKE 'A%') as dist_a,
                COUNT(*) FILTER (WHERE s.rating = 'B') as dist_b,
                COUNT(*) FILTER (WHERE s.rating = 'C') as dist_c,
                COUNT(*) FILTER (WHERE s.rating = 'D') as dist_d,
                COUNT(*) FILTER (WHERE s.rating = 'F') as dist_f,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%deed%' OR ae.tax_status ILIKE '%sheriff%' OR
                    pah.auction_name ILIKE '%deed%' OR pah.auction_name ILIKE '%sheriff%'
                )) as deed_volume,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%lien%' OR ae.tax_status ILIKE '%certificate%' OR
                    pah.auction_name ILIKE '%lien%' OR pah.auction_name ILIKE '%certificate%'
                )) as lien_volume,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%foreclosure%' OR
                    pah.auction_name ILIKE '%foreclosure%'
                )) as foreclosure_volume
            FROM property_details p
            LEFT JOIN property_scores s ON p.parcel_id = s.parcel_id
            LEFT JOIN property_auction_history pah ON pah.property_id = p.property_id
            LEFT JOIN auction_events ae ON ae.id = pah.auction_id
            WHERE LOWER(TRIM(p.availability_status)) = 'available'
              AND p.state IS NOT NULL
              AND NULLIF(TRIM(p.state), '') IS NOT NULL
              AND p.created_by_user_id IS NULL
            GROUP BY UPPER(TRIM(p.state))
            ORDER BY volume DESC
        """)

    results = db.execute(query).fetchall()

    return [
        {
            "state_code": r[0] if r[0] else "Unknown",
            "volume": r[1],
            "average_score": float(r[2]) if r[2] is not None else 0.0,
            "distribution": {"A": r[3], "B": r[4], "C": r[5], "D": r[6], "F": r[7]},
            "deed_volume": r[8],
            "lien_volume": r[9],
            "foreclosure_volume": r[10]
        }
        for r in results
    ]


MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


@router.get("/stats/monthly", response_model=List[dict])
def get_monthly_stats(
    db: Session = Depends(deps.get_db),
    state: Optional[str] = None,
) -> Any:
    """
    Returns monthly historical counts of auction types (deed, lien, foreclosure).
    X-axis data: month labels (Jan–Dec, current year).
    Y-axis data: auction event counts per type.
    Optional ?state=FL filters to one state's history.
    Always returns all 12 months (zeros filled) so the line chart renders a full year.
    """
    is_sqlite = "sqlite" in str(db.bind.url)
    state_filter = "AND UPPER(TRIM(p.state)) = UPPER(:state)" if state else ""

    if is_sqlite:
        query = text(f"""
            SELECT
                CAST(strftime('%m', COALESCE(pah.auction_date, ae.auction_date)) AS INTEGER) as month_num,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%deed%' OR
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%sheriff%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%deed%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%sheriff%'
                ) THEN 1 ELSE 0 END) as deed_count,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%lien%' OR
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%certificate%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%lien%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%certificate%'
                ) THEN 1 ELSE 0 END) as lien_count,
                SUM(CASE WHEN (
                    LOWER(COALESCE(ae.tax_status, '')) LIKE '%foreclosure%' OR
                    LOWER(COALESCE(pah.auction_name, '')) LIKE '%foreclosure%'
                ) THEN 1 ELSE 0 END) as foreclosure_count
            FROM property_auction_history pah
            LEFT JOIN property_details p ON p.property_id = pah.property_id
            LEFT JOIN auction_events ae ON ae.id = pah.auction_id
            WHERE COALESCE(pah.auction_date, ae.auction_date) IS NOT NULL
              AND p.created_by_user_id IS NULL
              {state_filter}
            GROUP BY month_num
            ORDER BY month_num
        """)
    else:
        query = text(f"""
            SELECT
                EXTRACT(MONTH FROM COALESCE(pah.auction_date, ae.auction_date))::INTEGER as month_num,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%deed%' OR ae.tax_status ILIKE '%sheriff%' OR
                    pah.auction_name ILIKE '%deed%' OR pah.auction_name ILIKE '%sheriff%'
                )) as deed_count,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%lien%' OR ae.tax_status ILIKE '%certificate%' OR
                    pah.auction_name ILIKE '%lien%' OR pah.auction_name ILIKE '%certificate%'
                )) as lien_count,
                COUNT(*) FILTER (WHERE (
                    ae.tax_status ILIKE '%foreclosure%' OR
                    pah.auction_name ILIKE '%foreclosure%'
                )) as foreclosure_count
            FROM property_auction_history pah
            LEFT JOIN property_details p ON p.property_id = pah.property_id
            LEFT JOIN auction_events ae ON ae.id = pah.auction_id
            WHERE COALESCE(pah.auction_date, ae.auction_date) IS NOT NULL
              AND p.created_by_user_id IS NULL
              {state_filter}
            GROUP BY month_num
            ORDER BY month_num
        """)

    params = {"state": state.strip().upper()} if state else {}
    rows = db.execute(query, params).fetchall()

    # Map month_num → counts from query results
    month_map: dict = {r[0]: {"deed": int(r[1] or 0), "lien": int(r[2] or 0), "foreclosure": int(r[3] or 0)} for r in rows}

    # Return full 12-month array (fill zeros for months with no data)
    return [
        {
            "month_num": m,
            "month_label": MONTH_LABELS[m - 1],
            "deed": month_map.get(m, {}).get("deed", 0),
            "lien": month_map.get(m, {}).get("lien", 0),
            "foreclosure": month_map.get(m, {}).get("foreclosure", 0),
        }
        for m in range(1, 13)
    ]


@router.get("/", response_model=List[dict])
def list_scores(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Paginated list of all stored scores for admin analytics."""
    results = db.execute(
        text("""
            SELECT parcel_id, deal_score, rating, model_version, updated_at
            FROM property_scores
            ORDER BY deal_score DESC
            OFFSET :skip LIMIT :limit
        """),
        {"skip": skip, "limit": limit}
    ).fetchall()

    return [
        {
            "parcel_id": r[0],
            "deal_score": r[1],
            "rating": r[2],
            "model_version": r[3],
            "updated_at": r[4].isoformat() if r[4] else None,
        }
        for r in results
    ]
