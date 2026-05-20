from typing import List, Any, Optional
from datetime import date
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
import re
from app.api import deps
from app.schemas.property import PropertyDashboardSchema, PaginatedPropertyResponse
from app.models.user import User
from app.services.reconciliation_service import reconciliation_service
from app.utils.state_mapper import normalize_state
from app.services.intelligence_service import intelligence_service
import uuid

router = APIRouter()

@router.get("/", response_model=PaginatedPropertyResponse)
def read_properties(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    county: Optional[str] = None,
    state: Optional[str] = None,
    auction_name: Optional[str] = None,
    auction_date: Optional[str] = None,
    auction_types: Optional[List[str]] = None,
    auction_id: Optional[int] = None,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    min_amount_due: Optional[float] = None,
    max_amount_due: Optional[float] = None,
    property_category: Optional[str] = None,
    occupancy: Optional[str] = None,
    tax_year: Optional[int] = None,
    property_type: Optional[str] = None,
    # New Optional Filters
    inventory: Optional[str] = None,
    min_improvements: Optional[float] = None,
    max_improvements: Optional[float] = None,
    availability: Optional[str] = None,
    min_county_appraisal: Optional[float] = None,
    max_county_appraisal: Optional[float] = None,
    min_acreage: Optional[float] = None,
    max_acreage: Optional[float] = None,
    owner_location: Optional[str] = None,
    keyword: Optional[str] = None,
    # Advanced Filters
    added_since: Optional[str] = None,
    is_unavailable: Optional[bool] = None,
    min_score: Optional[float] = None,
) -> Any:
    
    # 1. Build Base Filter Query
    # Ensure private custom properties are hidden from global search, unless owned by current_user's company
    where_clauses = ["1=1"]
    params = {"skip": skip, "limit": limit}
    
    if current_user and not current_user.is_superuser:
        where_clauses.append("(p.company_id IS NULL OR p.visibility = 'public' OR p.company_id = :cid)")
        params["cid"] = current_user.company_id or current_user.active_company_id

    if county:
        where_clauses.append("p.county ILIKE :county")
        params["county"] = f"%{county}%"
    if state:
        state = normalize_state(state)
        where_clauses.append("p.state ILIKE :state")
        params["state"] = f"%{state}%"
    if auction_id:
        where_clauses.append("pah.auction_id = :auction_id")
        params["auction_id"] = auction_id
    if auction_name:
        where_clauses.append("pah.auction_name ILIKE :auction_name")
        params["auction_name"] = f"%{auction_name}%"
    if auction_date:
        where_clauses.append("pah.auction_date::text LIKE :auction_date")
        params["auction_date"] = f"{auction_date}%"
    if auction_types:
        # Filter by multiple types if provided (e.g. Deed, Lien, Foreclosure)
        where_clauses.append("LOWER(pah.listed_as) = ANY(:auction_types) OR LOWER(p.property_category) = ANY(:auction_types)")
        params["auction_types"] = [t.lower() for t in auction_types]
    if min_amount_due is not None:
        where_clauses.append("p.amount_due >= :min_amount_due")
        params["min_amount_due"] = min_amount_due
    if max_amount_due is not None:
        where_clauses.append("p.amount_due <= :max_amount_due")
        params["max_amount_due"] = max_amount_due
    if property_category:
        where_clauses.append("p.property_category = :property_category")
        params["property_category"] = property_category
    if occupancy:
        where_clauses.append("p.occupancy ILIKE :occupancy")
        params["occupancy"] = f"%{occupancy}%"
    if tax_year:
        where_clauses.append("p.tax_year = :tax_year")
        params["tax_year"] = tax_year
    if property_type:
        where_clauses.append("p.property_type ILIKE :property_type")
        params["property_type"] = f"%{property_type}%"
        
    # Apply New Filters
    if inventory:
        where_clauses.append("p.purchase_option_type ILIKE :inventory")
        params["inventory"] = f"%{inventory}%"
    if min_improvements is not None:
        where_clauses.append("p.improvement_value >= :min_improvements")
        params["min_improvements"] = min_improvements
    if max_improvements is not None:
        where_clauses.append("p.improvement_value <= :max_improvements")
        params["max_improvements"] = max_improvements
    # Check if a specific keyword (Parcel ID, Address) is provided to bypass availability
    ignore_availability = False
    if keyword and len(keyword.strip()) > 3:
        ignore_availability = True

    if availability and not ignore_availability:
        # Exact match — ILIKE with % would match 'unavailable' when searching 'available'
        where_clauses.append("LOWER(p.availability_status) = LOWER(:availability)")
        params["availability"] = availability
    if min_county_appraisal is not None:
        where_clauses.append("p.assessed_value >= :min_county_appraisal")
        params["min_county_appraisal"] = min_county_appraisal
    if max_county_appraisal is not None:
        where_clauses.append("p.assessed_value <= :max_county_appraisal")
        params["max_county_appraisal"] = max_county_appraisal
    if min_acreage is not None:
        where_clauses.append("p.lot_acres >= :min_acreage")
        params["min_acreage"] = min_acreage
    if max_acreage is not None:
        where_clauses.append("p.lot_acres <= :max_acreage")
        params["max_acreage"] = max_acreage
    if owner_location:
        where_clauses.append("p.owner_address ILIKE :owner_location")
        params["owner_location"] = f"%{owner_location}%"
    
    # Phase 36: Intelligent Search & Fuzzy Matching
    if keyword:
        k = keyword.strip()
        
        # 1. Detect 5-digit ZIP Codes
        if re.fullmatch(r'\d{5}', k):
            where_clauses.append("p.address ILIKE :zip_keyword")
            params["zip_keyword"] = f"%{k}%"
            
        # 2. Detect Parcel IDs (digits and dashes, typical formats)
        elif re.match(r'^[\d\-A-Z]+$', k.upper()) and len(k) > 4:
            # Strip dashes for a "clean" search if the user included them
            clean_k = k.replace('-', '')
            
            where_clauses.append('''
                (
                    REPLACE(p.parcel_id, '-', '') ILIKE :clean_k OR 
                    REPLACE(p.pin_ppin, '-', '') ILIKE :clean_k OR
                    REPLACE(p.raw_parcel_number, '-', '') ILIKE :clean_k OR
                    p.parcel_id ILIKE :keyword OR
                    p.pin_ppin ILIKE :keyword
                )
            ''')
            params["clean_k"] = f"%{clean_k}%"
            params["keyword"] = f"%{k}%"
            
        # 3. Default "Fuzzy" / Broad Match (Addresses, Counties, etc.)
        else:
            # Replace spaces with wildcards to handle slight typos (e.g., "123Main" -> "123%Main")
            fuzzy_k = "%".join(k.split()) 
            
            where_clauses.append('''
                (
                    p.address ILIKE :fuzzy_k OR 
                    p.county ILIKE :fuzzy_k OR
                    p.state ILIKE :fuzzy_k OR
                    p.owner_address ILIKE :fuzzy_k OR
                    p.description ILIKE :fuzzy_k OR
                    p.legal_description ILIKE :fuzzy_k OR
                    p.parcel_id ILIKE :keyword OR
                    p.cs_number ILIKE :fuzzy_k OR
                    pah.auction_name ILIKE :fuzzy_k
                )
            ''')
            params["fuzzy_k"] = f"%{fuzzy_k}%"
            params["keyword"] = f"%{k}%"

    if is_unavailable is True:
        where_clauses.append("p.availability_status = 'unavailable'")

    if min_score is not None:
        where_clauses.append("ps.deal_score >= :min_score")
        params["min_score"] = min_score

    where_str = " AND ".join(where_clauses)

    # Always LEFT JOIN property_scores so deal_score/rating are always available in SELECT
    score_join = "LEFT JOIN property_scores ps ON ps.parcel_id = p.parcel_id"

    # 2. Join structure for Auction Lookup
    # If filtering by a specific auction (name or id), we join against the full history. 
    # Otherwise, we use DISTINCT ON to ensure 1 property = 1 row for general dashboard.
    if auction_name or auction_id:
        history_table = "property_auction_history"
    else:
        history_table = "(SELECT DISTINCT ON (property_id) * FROM property_auction_history ORDER BY property_id, auction_date DESC)"
    
    # Smart Auction Lookup Join (ae_lookup)
    # This matches properties that have a next_auction_date imported from CSV 
    # with the actual Auction Events in the system.
    ae_join = """
        LEFT JOIN auction_events ae_lookup ON 
            ae_lookup.auction_date = p.next_auction_date AND 
            ae_lookup.state ILIKE p.state AND 
            ae_lookup.county ILIKE p.county
    """

    count_query = f"SELECT count(*) FROM property_details p LEFT JOIN {history_table} pah ON pah.property_id = p.property_id {ae_join} {score_join} WHERE {where_str}"
    total = db.execute(text(count_query), params).scalar()

    # 3. Get Items
    items_query = f"""
        SELECT 
            p.parcel_id, 
            p.county, 
            p.state as state_code, 
            p.amount_due, 
            p.assessed_value,
            COALESCE(pah.auction_date, p.next_auction_date) as auction_date, 
            COALESCE(pah.auction_name, ae_lookup.name, TO_CHAR(COALESCE(pah.auction_date, p.next_auction_date), 'MM/DD/YYYY')) as auction_name,
            p.cs_number,
            p.account_number,
            p.owner_address,
            p.tax_year,
            p.lot_acres,
            p.estimated_value,
            p.land_value,
            p.improvement_value,
            p.property_type,
            p.address,
            p.occupancy,
            p.purchase_option_type,
            p.availability_status,
            p.alternate_owner_address,
            p.state_inventory_entered_date,
            p.qoz_description,
            p.parcel_shape_data,
            p.pin_ppin,
            p.raw_parcel_number,
            p.county_fips,
            p.additional_parcel_numbers,
            p.occupancy_checked_date,
            p.redfin_url,
            p.redfin_estimate,
            p.lot_sqft,
            p.sewer_type,
            p.water_type,
            p.property_type_detail,
            p.import_error_msg,
            p.is_processed,
            p.map_link,
            COALESCE(ps.deal_score, NULL) as deal_score,
            COALESCE(ps.rating, NULL) as deal_rating,
            COALESCE(pah.listed_as, ae_lookup.tax_status, p.property_category) as property_category,
            p.market_land_value,
            p.market_improvement_value,
            p.owner_occupied
        FROM property_details p
        LEFT JOIN {history_table} pah ON pah.property_id = p.property_id
        {ae_join}
        {score_join}
        WHERE {where_str}
        ORDER BY {"{order_by_clause}"}
        OFFSET :skip LIMIT :limit
    """
    
    # Ensure safe ordering
    sort_map = {
        "deal_grade": "p.assessed_value", 
        "parcel_id": "p.parcel_id",
        "cs_number": "p.cs_number",
        "account_number": "p.account_number",
        "owner_address": "p.owner_address",
        "county": "p.county",
        "state_code": "p.state",
        "availability_status": "p.availability_status",
        "tax_year": "p.tax_year",
        "amount_due": "p.amount_due",
        "lot_acres": "p.lot_acres",
        "assessed_value": "p.assessed_value",
        "land_value": "p.land_value",
        "improvement_value": "p.improvement_value",
        "property_type": "p.property_type",
        "address": "p.address",
        "auction_name": "pah.auction_name",
        "auction_date": "pah.auction_date",
        "occupancy": "p.occupancy"
    }

    order_by_clause = "pah.auction_date ASC NULLS LAST, p.parcel_id ASC"
    if sort_field and sort_field in sort_map:
        safe_col = sort_map[sort_field]
        safe_dir = "DESC" if sort_order and sort_order.lower() == "desc" else "ASC"
        order_by_clause = f"{safe_col} {safe_dir} NULLS LAST, p.parcel_id ASC"

    # Format the query with the safe order_by_clause
    items_query = items_query.format(order_by_clause=order_by_clause)

    result = db.execute(text(items_query), params).fetchall()
    
    items = [
        {
            "parcel_id": r[0] if r[0] else "",
            "county": r[1],
            "state_code": r[2],
            "amount_due": r[3],
            "assessed_value": r[4],
            "auction_date": r[5],
            "auction_name": r[6],
            "cs_number": r[7],
            "account_number": r[8],
            "owner_address": r[9],
            "tax_year": r[10],
            "lot_acres": r[11],
            "estimated_value": r[12],
            "land_value": r[13],
            "improvement_value": r[14],
            "property_type": r[15],
            "address": r[16],
            "occupancy": r[17],
            "purchase_option_type": r[18],
            "availability_status": r[19],
            "alternate_owner_address": r[20],
            "state_inventory_entered_date": r[21],
            "qoz_description": r[22],
            "parcel_shape_data": r[23],
            "pin_ppin": r[24],
            "raw_parcel_number": r[25],
            "county_fips": r[26],
            "additional_parcel_numbers": r[27],
            "occupancy_checked_date": r[28],
            "redfin_url": r[29],
            "redfin_estimate": r[30],
            "lot_sqft": r[31],
            "sewer_type": r[32],
            "water_type": r[33],
            "property_type_detail": r[34],
            "import_error_msg": r[35],
            "is_processed": bool(r[36]) if r[36] is not None else False,
            "map_link": r[37],
            "deal_score": float(r[38]) if r[38] is not None else None,
            "deal_rating": r[39],
            "property_category": r[40],
            "market_land_value": r[41],
            "market_improvement_value": r[42],
            "owner_occupied": r[43],
        }
        for r in result
    ]

    return {"items": items, "total": total}

from fastapi import HTTPException
from pydantic import BaseModel

class PropertyUpdateRequest(BaseModel):
    county: Optional[str] = None
    state: Optional[str] = None
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
    availability_status: Optional[str] = None
    
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

    # V3 Extended Fields
    redfin_url: Optional[str] = None
    redfin_estimate: Optional[float] = None
    lot_sqft: Optional[float] = None
    sewer_type: Optional[str] = None
    water_type: Optional[str] = None
    property_type_detail: Optional[str] = None
    import_error_msg: Optional[str] = None
    is_processed: Optional[bool] = False
    visibility: Optional[str] = "private"

class PropertyCreateRequest(PropertyUpdateRequest):
    parcel_id: str  # Required for creation

@router.post("/", response_model=dict)
def create_property(
    property_in: PropertyCreateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    import uuid
    
    # ── Duplicate Detection: Auto-link instead of rejecting ──────────────────
    # When the parcel_id already exists, we don't block the user. Instead, we
    # create a private override record so the user can customize the property.
    existing = db.execute(
        text("SELECT property_id FROM property_details WHERE parcel_id = :parcel_id"),
        {"parcel_id": property_in.parcel_id}
    ).fetchone()

    if existing:
        master_property_id = existing[0]

        # Upsert an override record (blank if first time, otherwise keep existing)
        override_check = db.execute(
            text("SELECT id FROM property_user_overrides WHERE user_id = :uid AND property_id = :pid"),
            {"uid": current_user.id, "pid": master_property_id}
        ).fetchone()

        if not override_check:
            # Collect any extra fields the user submitted as the initial override payload
            initial_payload = property_in.dict(exclude_unset=True)
            initial_payload.pop("parcel_id", None)  # parcel_id is the master key, not overrideable
            initial_payload.pop("visibility", None)

            import json as _json
            db.execute(
                text("""
                    INSERT INTO property_user_overrides (user_id, property_id, overrides, created_at, updated_at)
                    VALUES (:uid, :pid, CAST(:overrides AS JSONB), NOW(), NOW())
                """),
                {
                    "uid": current_user.id,
                    "pid": master_property_id,
                    "overrides": _json.dumps(initial_payload) if initial_payload else "{}",
                }
            )
            db.commit()

        return {
            "status": "already_exists",
            "message": "Property found in the global database. Added to your private list for customization.",
            "parcel_id": property_in.parcel_id,
            "property_id": master_property_id,
            "override_created": not bool(override_check),
        }

    # ── New Property — standard creation path ─────────────────────────────────
    create_data = property_in.dict(exclude_unset=True)
    prop_id = str(uuid.uuid4())
    create_data["property_id"] = prop_id
    
    if "availability_status" not in create_data:
        create_data["availability_status"] = "available"
        
    create_data["created_by_user_id"] = current_user.id
    if create_data.get("visibility") == "private":
        create_data["company_id"] = current_user.company_id or current_user.active_company_id
    else:
        # public properties go to the global pool (company_id is NULL)
        create_data["company_id"] = None
        
    keys = list(create_data.keys())
    columns = ", ".join(keys)
    values_placeholders = ", ".join([f":{k}" for k in keys])
    
    query = text(f"INSERT INTO property_details ({columns}) VALUES ({values_placeholders})")
    
    try:
        db.execute(query, create_data)
        
        # Log creation
        db.execute(
            text("INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source) VALUES (:prop_id, 'new_entry', :status, 'manual_creation')"),
            {"prop_id": prop_id, "status": create_data["availability_status"]}
        )
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "created", "message": "Property created successfully", "parcel_id": property_in.parcel_id}

@router.put("/{parcel_id}", response_model=dict)
def update_property(
    parcel_id: str,
    property_in: PropertyUpdateRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    # Build dynamic update query
    update_data = property_in.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    if "availability_status" in update_data:
        old_prop = db.execute(
            text("SELECT property_id, availability_status FROM property_details WHERE parcel_id = :parcel_id"),
            {"parcel_id": parcel_id}
        ).fetchone()
        
        if not old_prop:
            raise HTTPException(status_code=404, detail="Property not found")
            
        old_status = old_prop[1] or "not available"
        new_status = update_data["availability_status"]
        
        if old_status != new_status:
            db.execute(
                text("INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source) VALUES (:prop_id, :prev, :new, 'manual_update')"),
                {"prop_id": old_prop[0], "prev": old_status, "new": new_status}
            )

    set_clause = ", ".join([f"{k} = :{k}" for k in update_data.keys()])
    query = text(f"UPDATE property_details SET {set_clause} WHERE parcel_id = :parcel_id RETURNING property_id")
    params = {**update_data, "parcel_id": parcel_id}
    
    result = db.execute(query, params).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
        
    db.commit()
    return {"message": "Property updated successfully", "parcel_id": parcel_id}

@router.delete("/{parcel_id}", response_model=dict)
def delete_property(
    parcel_id: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    # Property Auction History is linked via property_id, so we must query property_id first
    sel_query = text("SELECT property_id FROM property_details WHERE parcel_id = :parcel_id")
    prop = db.execute(sel_query, {"parcel_id": parcel_id}).fetchone()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    # Delete Auction History entries first
    db.execute(text("DELETE FROM property_auction_history WHERE property_id = :property_id"), {"property_id": prop[0]})
    # Delete from Property Details
    db.execute(text("DELETE FROM property_details WHERE parcel_id = :parcel_id"), {"parcel_id": parcel_id})
    db.commit()
    
    return {"message": "Property deleted successfully", "parcel_id": parcel_id}


@router.get("/redemption-info", response_model=dict)
def get_redemption_info(
    state: Optional[str] = None,
    auction_type: Optional[str] = None
) -> Any:
    """
    Tier 5: Specialized Redemption Intelligence.
    Returns legal rules for a specific state/auction combo or full database.
    """
    import os
    import json as _json
    
    # Path: backend/app/core/redemption_data.json
    # __file__ is backend/app/api/api_v1/endpoints/properties.py
    # 4 levels up to get to backend/app/
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    path = os.path.join(base_dir, "core", "redemption_data.json")
    if not os.path.exists(path):
        # Fallback for different environments if necessary
        return {"error": f"Redemption database not found at {path}"}
        
    with open(path, "r") as f:
        data = _json.load(f)
        
    # If no state is provided, return the full database for the global board
    if not state:
        return {
            "state": "ALL",
            "results": data,
            "disclaimer": "Global database of state-level redemption rules."
        }
        
    from app.utils.state_mapper import STATE_MAPPING
    
    # Create reverse mapping to convert 'FL' to 'Florida'
    reverse_mapping = {v.lower(): k.lower() for k, v in STATE_MAPPING.items()}
    state_to_search = reverse_mapping.get(state.lower(), state.lower())
    
    # Filter by state (exact match or containment)
    matches = [d for d in data if state_to_search in d['state'].lower() or d['state'].lower() in state_to_search]
    
    if auction_type:
        # Check if either one contains the other (e.g. "Tax Deed" vs "Deed")
        at_lower = auction_type.lower()
        matches = [d for d in matches if d['type'].lower() in at_lower or at_lower in d['type'].lower()]
        
    return {
        "state": state,
        "results": matches,
        "disclaimer": "Redemption rules vary by county. Verify with local officials."
    }


# ── Override Endpoints ────────────────────────────────────────────────────────

@router.put("/{parcel_id}/override", response_model=dict)
def upsert_property_override(
    parcel_id: str,
    override_data: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Save the current user's private customizations for a property.

    Only the fields included in the request body are stored (sparse JSONB).
    Existing override keys not included in this request are preserved.
    The master property_details record is never modified.

    To overwrite all overrides, pass the full set of changed fields.
    To remove a single field, use DELETE /{parcel_id}/override?field=<field_name>.
    """
    import json as _json

    # 1. Resolve master property_id from parcel_id
    prop_row = db.execute(
        text("SELECT property_id FROM property_details WHERE parcel_id = :parcel_id"),
        {"parcel_id": parcel_id}
    ).fetchone()
    if not prop_row:
        raise HTTPException(status_code=404, detail="Property not found")
    property_id = prop_row[0]

    # 2. Sanitize: remove immutable keys that should never be overridden
    IMMUTABLE_KEYS = {"parcel_id", "property_id", "id", "created_by_user_id", "company_id"}
    clean_data = {k: v for k, v in override_data.items() if k not in IMMUTABLE_KEYS}

    if not clean_data:
        raise HTTPException(status_code=400, detail="No valid override fields provided.")

    # 3. Upsert: merge new values on top of existing override JSONB
    db.execute(
        text("""
            INSERT INTO property_user_overrides (user_id, property_id, overrides, created_at, updated_at)
            VALUES (:uid, :pid, CAST(:overrides AS JSONB), NOW(), NOW())
            ON CONFLICT (user_id, property_id) DO UPDATE
                SET overrides = property_user_overrides.overrides || CAST(:overrides AS JSONB),
                    updated_at = NOW()
        """),
        {
            "uid": current_user.id,
            "pid": property_id,
            "overrides": _json.dumps(clean_data),
        }
    )
    db.commit()

    return {
        "status": "saved",
        "message": f"{len(clean_data)} field(s) saved to your private view.",
        "parcel_id": parcel_id,
        "overridden_fields": list(clean_data.keys()),
    }


@router.delete("/{parcel_id}/override", response_model=dict)
def delete_property_override(
    parcel_id: str,
    field: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Reset a user's private customization for a property.

    - If ?field=<field_name> is provided: removes only that key from the JSONB,
      restoring it to the master value. All other customizations are preserved.
    - If no field is provided: removes the entire override record, restoring all
      fields to master values.
    """
    import json as _json

    # Resolve master property_id
    prop_row = db.execute(
        text("SELECT property_id FROM property_details WHERE parcel_id = :parcel_id"),
        {"parcel_id": parcel_id}
    ).fetchone()
    if not prop_row:
        raise HTTPException(status_code=404, detail="Property not found")
    property_id = prop_row[0]

    if field:
        # Remove a single key from JSONB using the #- operator (safe, atomic)
        db.execute(
            text("""
                UPDATE property_user_overrides
                SET overrides = overrides - :field,
                    updated_at = NOW()
                WHERE user_id = :uid AND property_id = :pid
            """),
            {"uid": current_user.id, "pid": property_id, "field": field}
        )
        db.commit()
        return {
            "status": "reset",
            "message": f"Field '{field}' restored to original value.",
            "parcel_id": parcel_id,
        }
    else:
        # Remove the entire override record
        db.execute(
            text("""
                DELETE FROM property_user_overrides
                WHERE user_id = :uid AND property_id = :pid
            """),
            {"uid": current_user.id, "pid": property_id}
        )
        db.commit()
        return {
            "status": "reset",
            "message": "All customizations removed. Property restored to original data.",
            "parcel_id": parcel_id,
        }

@router.post("/{parcel_id}/purchase", response_model=dict)
def purchase_property_action(
    parcel_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Executes an atomic transaction that validates state transitions 
    and reserves/purchases the property, auditing the action.
    """
    try:
        # 1. Start explicit transaction block
        with db.begin_nested():
            # Apply row-level SELECT FOR UPDATE to ensure concurrency safety
            sel_query = text("SELECT property_id, availability_status FROM property_details WHERE parcel_id = :parcel_id FOR UPDATE")
            prop = db.execute(sel_query, {"parcel_id": parcel_id}).fetchone()
            
            if not prop:
                raise HTTPException(status_code=404, detail="Property not found")
                
            prop_id = prop[0]
            current_status = prop[1] or "not available"
            
            # State Transition Validation
            if current_status != "available":
                raise HTTPException(status_code=400, detail=f"Cannot purchase property. Current state is '{current_status}'. Must be 'available'.")
            
            # Auction Linkage Validation for non-privileged users
            if not current_user.is_superuser:
                auction_q = text("SELECT 1 FROM property_auction_history WHERE property_id = :prop_id LIMIT 1")
                has_auction = db.execute(auction_q, {"prop_id": prop_id}).fetchone()
                if has_auction:
                    raise HTTPException(
                        status_code=403, 
                        detail="This property is linked to a live auction. Clients must bid via the official portal instead of direct purchase."
                    )
                
            # Perform atomic update
            new_status = "purchased"
            update_q = text("UPDATE property_details SET availability_status = :new_status WHERE property_id = :prop_id")
            db.execute(update_q, {"new_status": new_status, "prop_id": prop_id})
            
            # Write Audit Trail History
            audit_q = text(
                "INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source) "
                "VALUES (:prop_id, :prev, :new, 'purchase_transaction')"
            )
            db.execute(audit_q, {"prop_id": prop_id, "prev": current_status, "new": new_status})
            
        # Commit the transaction block completely
        db.commit()
    except HTTPException:
        # Allow intentional HTTP validations to rise through gracefully
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Transaction completely failed due to concurrent modification or database error")
        
    return {
        "message": "Property Successfully Transacted",
        "parcel_id": parcel_id,
        "new_status": "purchased"
    }

@router.post("/{parcel_id}/purchase-media", response_model=dict)
def purchase_property_media(
    parcel_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    from app.services.permission_service import PermissionService
    # Ensure user has access to tasks/purchases
    PermissionService.check_feature_access(db, current_user, "tasks")

    # 1. Get Property ID and UUID
    prop = db.execute(text("SELECT property_id, id FROM property_details WHERE parcel_id = :parcel_id"), {"parcel_id": parcel_id}).fetchone()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    prop_uuid = prop[0]
    prop_int_id = prop[1]
    
    # 2. Check if already purchased
    existing = db.execute(text("""
        SELECT 1 FROM property_media_purchases 
        WHERE property_id = :prop_uuid 
        AND user_id = :uid
    """), {"prop_uuid": prop_uuid, "uid": current_user.id}).fetchone()
    
    if existing:
        return {"message": "Media already purchased or unlocked.", "unlocked": True}
        
    # 3. Check if there are monetizable tasks for this property
    task = db.execute(text("""
        SELECT reward_points FROM realtor_tasks 
        WHERE property_id = :prop_id AND status = 'approved'
        ORDER BY created_at DESC LIMIT 1
    """), {"prop_id": prop_int_id}).fetchone()
    
    if not task:
        raise HTTPException(status_code=400, detail="No monetizable media available for this property yet.")
        
    # 4. Process payment (cost is what the original investor paid / 100)
    cost_usd = task.reward_points / 100.0  
    
    db.execute(text("""
        INSERT INTO property_media_purchases (property_id, user_id, amount_paid)
        VALUES (:prop_uuid, :uid, :amount)
    """), {"prop_uuid": prop_uuid, "uid": current_user.id, "amount": cost_usd})
    db.commit()
    
    return {"message": f"Media unlocked for ${cost_usd:.2f}", "unlocked": True, "cost_usd": cost_usd}


@router.get("/availability-history")
def get_availability_history(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
    limit: int = 100
) -> Any:
    # Busca o histórico de alterações de disponibilidade das propriedades.
    history_query = text(f"""
        SELECT 
            h.id,
            h.property_id,
            p.parcel_id,
            p.address,
            h.previous_status,
            h.new_status,
            h.change_source,
            h.changed_at
        FROM property_availability_history h
        JOIN property_details p ON p.property_id = h.property_id
        ORDER BY h.changed_at DESC
        LIMIT :limit
    """)
    results = db.execute(history_query, {"limit": limit}).fetchall()
    return [dict(r._mapping) for r in results]

@router.get("/valuation/metrics", response_model=dict)
def get_valuation_metrics(
    county: str,
    state: str,
    city: str = None,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Returns aggregated real-data valuation metrics (ARV and Rent estimate)
    based on comparable properties in the same county/state (and optionally city).
    Business rule: Values below $1000 are returned as null to prevent distortions.
    Only 'available' properties are used as comps.
    """
    # Build city filter if provided
    city_clause = "AND LOWER(address) LIKE LOWER(:city_pattern)" if city else ""
    params: dict = {"county": county, "state": state}
    if city:
        params["city_pattern"] = f"%{city}%"

    query = text(f"""
        SELECT
            AVG(NULLIF(assessed_value, 0))    AS avg_arv,
            AVG(NULLIF(improvement_value, 0)) AS avg_improvement,
            AVG(NULLIF(amount_due, 0))        AS avg_tax_due,
            COUNT(id)                         AS sample_size
        FROM property_details
        WHERE LOWER(county) = LOWER(:county)
          AND LOWER(state)  = LOWER(:state)
          AND LOWER(availability_status) = 'available'
          AND assessed_value > 0
          {city_clause}
    """)

    res = db.execute(query, params).fetchone()

    if not res or res[0] is None:
        return {"arv": None, "rent": None, "confidence": 0, "sample_size": 0}

    avg_arv         = float(res[0] or 0)
    avg_improvement = float(res[1] or 0)
    sample_size     = int(res[3] or 0)

    # Rent estimate: 1% of ARV/month (conservative market heuristic).
    # When improvement data is available use 60% weight on it for better accuracy.
    if avg_improvement > 0:
        weighted_base = (avg_arv * 0.4) + (avg_improvement * 0.6)
    else:
        weighted_base = avg_arv

    est_rent = weighted_base * 0.01

    # Business rule: Do not expose values below $1,000
    if avg_arv < 1000 or est_rent < 1000:
        return {"arv": None, "rent": None, "confidence": 0, "sample_size": sample_size}

    confidence = min(100, sample_size * 2)  # Confidence grows with more comps
    return {
        "arv":         round(avg_arv, 2),
        "rent":        round(est_rent, 2),
        "sample_size": sample_size,
        "confidence":  confidence,
        "city_filtered": bool(city),
    }


@router.get("/{parcel_id}")
def get_property(
    parcel_id: str,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    # 1. Rate Limiting Check — applies to all authenticated non-superuser roles.
    if current_user and not current_user.is_superuser:
        from app.services.permission_service import PermissionService
        PermissionService.increment_usage(db, current_user, 'views')
    # Use explicit columns to avoid ambiguity and facilitate dict conversion
    query = text("""
        SELECT 
            p.*,
            pah.auction_name as current_auction_name, 
            pah.auction_date as current_auction_date,
            ae.tax_status as auction_type,
            COALESCE(pah.info_link, ae.register_link) as auction_info_link,
            COALESCE(pah.list_link, ae.list_link) as auction_list_link
        FROM property_details p
        LEFT JOIN property_auction_history pah ON pah.property_id = p.property_id
        LEFT JOIN auction_events ae ON pah.auction_id = ae.id
        WHERE p.parcel_id = :parcel_id OR p.id::text = :parcel_id
        ORDER BY pah.auction_date DESC
        LIMIT 1
    """)
    result = db.execute(query, {"parcel_id": parcel_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Use mapping for safe access
    row_map = result._mapping
    data = dict(row_map)
    prop_id_int = row_map.get('id')
    
    # Fetch History
    history_query = text("""
        SELECT *
        FROM property_auction_history
        WHERE property_id = :property_id
        ORDER BY auction_date DESC
    """)
    history_results = db.execute(history_query, {"property_id": data.get('property_id')}).fetchall()
    data["auction_history"] = [dict(h._mapping) for h in history_results]
    
    # Initialize defaults for resilience
    data["notes"] = ""
    data["attachments"] = []

    # Fetch Notes and Attachments only if we have a valid int ID and user
    if prop_id_int and current_user:
        try:
            # Fetch Notes (Shared by Company or Single per user)
            company_id = current_user.active_company_id or current_user.company_id
            if company_id:
                notes_query = text("""
                    SELECT note_text FROM client_notes 
                    WHERE property_id = :prop_id AND company_id = :company_id
                    ORDER BY id DESC LIMIT 1
                """)
                note_row = db.execute(notes_query, {"prop_id": prop_id_int, "company_id": company_id}).fetchone()
            else:
                notes_query = text("""
                    SELECT note_text FROM client_notes 
                    WHERE user_id = :user_id AND property_id = :prop_id AND company_id IS NULL
                    ORDER BY id DESC LIMIT 1
                """)
                note_row = db.execute(notes_query, {"user_id": current_user.id, "prop_id": prop_id_int}).fetchone()
                
            if note_row:
                data["notes"] = note_row[0]
            
            # Fetch Client Attachments ALWAYS (regardless of BPO media unlock)
            if company_id:
                att_query = text("""
                    SELECT filename, file_path FROM client_attachments 
                    WHERE property_id = :prop_id AND company_id = :company_id
                """)
                att_rows = db.execute(att_query, {"prop_id": prop_id_int, "company_id": company_id}).fetchall()
            else:
                att_query = text("""
                    SELECT filename, file_path FROM client_attachments 
                    WHERE property_id = :prop_id AND user_id = :user_id AND company_id IS NULL
                """)
                att_rows = db.execute(att_query, {"prop_id": prop_id_int, "user_id": current_user.id}).fetchall()
            
            data["attachments"] = [dict(a._mapping) for a in att_rows]

            # Check Media Monetization (Paywall)
            has_access = False
            if current_user.is_superuser:
                has_access = True
            else:
                # Check if user purchased media
                purchase = db.execute(text("""
                    SELECT 1 FROM property_media_purchases 
                    WHERE property_id = (SELECT property_id FROM property_details WHERE parcel_id = :parcel_id) 
                    AND user_id = :uid
                """), {"parcel_id": parcel_id, "uid": current_user.id}).fetchone()
                
                if purchase:
                    has_access = True
                else:
                    # Check if user is the one who created the task
                    task = db.execute(text("""
                        SELECT 1 FROM realtor_tasks 
                        WHERE property_id = :prop_id AND investor_user_id = :uid AND status = 'approved'
                    """), {"prop_id": prop_id_int, "uid": current_user.id}).fetchone()
                    if task:
                        has_access = True

            # Check if realtor media exists
            realtor_media_check = db.execute(text("""
                SELECT 1 FROM task_submissions ts
                JOIN realtor_tasks t ON t.id = ts.task_id
                WHERE t.property_id = :prop_id AND t.status = 'approved'
                LIMIT 1
            """), {"prop_id": prop_id_int}).fetchone()
            data["has_realtor_media"] = True if realtor_media_check else False

            if has_access:
                import os
                realtor_media_query = text("""
                    SELECT file_path FROM task_submissions
                    WHERE task_id IN (
                        SELECT id FROM realtor_tasks WHERE property_id = :prop_id AND status = 'approved'
                    )
                """)
                realtor_media_rows = db.execute(realtor_media_query, {"prop_id": prop_id_int}).fetchall()
                
                media_files = []
                for row in realtor_media_rows:
                    paths = row[0].split(',') if row[0] else []
                    for p in paths:
                        if p:
                            media_files.append({
                                "name": os.path.basename(p),
                                "url": p
                            })
                data["media_files"] = media_files
                data["media_unlocked"] = True
            else:
                data["media_files"] = []
                data["media_unlocked"] = False
                
        except Exception as e:
            # Log error but don't fail the whole request
            print(f"Error fetching notes/attachments: {e}")
    
    # Calculate Recommended Next Steps
    next_steps = []
    if data.get("availability_status") == "available":
        next_steps.append({"action": "Review Auction Details", "priority": "high", "type": "info"})
    if data.get("amount_due") and data.get("amount_due") > 0:
        next_steps.append({"action": "Calculate ROI with Taxes", "priority": "medium", "type": "calculate"})
    if not data.get("occupancy"):
        next_steps.append({"action": "Verify Occupancy", "priority": "medium", "type": "verify"})
    
    data["recommended_next_steps"] = next_steps

    # ── Tier 5: Real-time Intelligence Trigger ─────────────────────────────
    # If estimate or score is missing/stale, recompute using comparative logic
    needs_recompute = not data.get("estimated_value") or not data.get("deal_score")
    
    if needs_recompute:
        try:
            # 1. Comparative Market Analysis (CMA)
            new_estimate = intelligence_service.get_comparative_estimate(
                db, parcel_id, data.get("county"), data.get("address", ""), data.get("property_type")
            )
            if new_estimate:
                data["estimated_value"] = new_estimate
                db.execute(text("UPDATE property_details SET estimated_value = :val WHERE parcel_id = :pid"), {"val": new_estimate, "pid": parcel_id})
            
            # 2. Weighted Motor Score
            new_score_data = intelligence_service.calculate_weighted_score(data)
            data["deal_score"] = new_score_data["score"]
            data["deal_rating"] = new_score_data["rating"]
            data["score_factors"] = new_score_data["factors"]
            
            # Persist score
            db.execute(
                text("""
                    INSERT INTO property_scores (parcel_id, deal_score, rating, score_factors, model_version, computed_at, updated_at)
                    VALUES (:pid, :score, :rating, :factors, 'motor-v1', NOW(), NOW())
                    ON CONFLICT (parcel_id) DO UPDATE SET
                        deal_score = EXCLUDED.deal_score,
                        rating = EXCLUDED.rating,
                        score_factors = EXCLUDED.score_factors,
                        updated_at = NOW()
                """),
                {
                    "pid": parcel_id,
                    "score": new_score_data["score"],
                    "rating": new_score_data["rating"],
                    "factors": _json.dumps(new_score_data["factors"])
                }
            )
            db.commit()
        except Exception as e:
            print(f"Intelligence recompute error: {e}")
            db.rollback()

    # ── JSONB Override Merge ────────────────────────────────────────────────
    # Load the user's private overrides (if any) and merge on top of master data.
    # This is a read-only merge: master data is never modified.
    data["has_overrides"] = False
    data["original_values"] = {}
    data["user_override_id"] = None

    if current_user:
        try:
            import json as _json
            override_row = db.execute(
                text("""
                    SELECT id, overrides
                    FROM property_user_overrides
                    WHERE user_id = :uid AND property_id = :pid
                """),
                {"uid": current_user.id, "pid": data.get("property_id")}
            ).fetchone()

            if override_row:
                override_id, raw_overrides = override_row
                user_overrides = raw_overrides if isinstance(raw_overrides, dict) else (_json.loads(raw_overrides) if raw_overrides else {})

                if user_overrides:
                    # Save original values BEFORE overwriting, for the UI diff indicators
                    original_vals = {}
                    for key, new_val in user_overrides.items():
                        if key in data:
                            original_vals[key] = data[key]
                    data["original_values"] = original_vals

                    # Apply the merge: user values override master values
                    data.update(user_overrides)
                    data["has_overrides"] = True

                data["user_override_id"] = override_id
        except Exception as e:
            print(f"Override merge error (non-fatal): {e}")

    return data

from pydantic import BaseModel
class NotePayload(BaseModel):
    notes: str

@router.post("/{parcel_id}/notes")
def update_property_notes(
    parcel_id: str,
    payload: NotePayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Updates or creates a note for a property. 
    Notes are shared across the company.
    """
    prop = db.execute(
        text("SELECT id FROM property_details WHERE parcel_id = :parcel_id OR id::text = :parcel_id"),
        {"parcel_id": parcel_id}
    ).fetchone()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    prop_id = prop[0]
    company_id = current_user.active_company_id or current_user.company_id
    
    if company_id:
        # Check if a note already exists for this company
        existing_note = db.execute(text("""
            SELECT id FROM client_notes 
            WHERE property_id = :prop_id 
            AND user_id IN (SELECT id FROM users WHERE active_company_id = :company_id OR company_id = :company_id)
            ORDER BY id DESC LIMIT 1
        """), {"prop_id": prop_id, "company_id": company_id}).fetchone()
    else:
        existing_note = db.execute(text("""
            SELECT id FROM client_notes 
            WHERE property_id = :prop_id AND user_id = :user_id
            ORDER BY id DESC LIMIT 1
        """), {"prop_id": prop_id, "user_id": current_user.id}).fetchone()

    if existing_note:
        db.execute(
            text("UPDATE client_notes SET note_text = :note_text WHERE id = :id"),
            {"note_text": payload.notes, "id": existing_note[0]}
        )
    else:
        db.execute(
            text("INSERT INTO client_notes (user_id, property_id, note_text) VALUES (:user_id, :prop_id, :note_text)"),
            {"user_id": current_user.id, "prop_id": prop_id, "note_text": payload.notes}
        )
        
    db.commit()
    return {"status": "success", "message": "Notes updated successfully"}

@router.get("/{parcel_id}/redirect/auction")
def get_auction_redirect(
    parcel_id: str,
    db: Session = Depends(deps.get_db),
    # current_user = Depends(deps.get_current_active_user)
) -> Any:
    """
    Resolves the auction link, logs the redirection effort, and returns the URL.
    """
    query = text("""
        SELECT pah.info_link, pah.list_link, p.property_id
        FROM property_details p
        LEFT JOIN property_auction_history pah ON pah.property_id = p.property_id
        WHERE p.parcel_id = :parcel_id
        ORDER BY pah.auction_date DESC
        LIMIT 1
    """)
    res = db.execute(query, {"parcel_id": parcel_id}).fetchone()
    if not res:
        raise HTTPException(status_code=404, detail="Property or Auction history not found")
    
    url = res[0] or res[1]
    if not url:
        raise HTTPException(status_code=400, detail="No auction link associated with this property")
    
    # Log action for audit
    db.execute(
        text("INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source) VALUES (:prop_id, :status, :status, 'auction_redirect_click')"),
        {"prop_id": res[2], "status": "available"} # dummy status check for logging
    )
    db.commit()
    
    return {"url": url}

@router.post("/{parcel_id}/log-action")
def log_property_action(
    parcel_id: str,
    action: str = Form(...),
    db: Session = Depends(deps.get_db),
) -> Any:
    """Log generic user actions on a property for audit."""
    prop = db.execute(text("SELECT property_id FROM property_details WHERE parcel_id = :parcel_id"), {"parcel_id": parcel_id}).fetchone()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
        
    db.execute(
        text("INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source) VALUES (:prop_id, 'audit', 'audit', :action)"),
        {"prop_id": prop[0], "action": f"user_action_{action}"}
    )
    db.commit()
    return {"ok": True}

@router.post("/reconcile/{auction_id}", response_model=dict)
def reconcile_auction_properties(
    auction_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Triggers a reconciliation job to link available properties to a specific auction
    based on matching County and State locations.
    """
    result = reconciliation_service.reconcile_auction_properties(db, auction_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


from app.services.attom_enrichment import enrich_property, enrich_property_extended

@router.post("/{property_id}/enrich", response_model=dict)
def enrich_property_endpoint(
    property_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    On-demand endpoint to enrich property details using verified public registry data.
    Verifies missing fields, calls external data source, caches result, and persists to DB.
    """
    try:
        result = enrich_property(db, property_id)
        return result
    except Exception as e:
        logger.error(f"Erro no endpoint de enriquecimento para {property_id}: {e}")
        return {"status": "error", "message": str(e), "property_id": property_id}


@router.post("/{property_id}/enrich-extended", response_model=dict)
def enrich_property_extended_endpoint(
    property_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Lazy-load extended registry data for a property:
    - Full Sales/Transfer History (all recorded transactions)
    - Tax & Assessment History (multi-year valuation trajectory)
    - Building & Renovation Permits

    Requires basic enrichment to have been run first (to obtain the registry ID).
    Results are cached for 60 days and persisted in structured JSONB columns.
    """
    try:
        result = enrich_property_extended(db, property_id)
        return result
    except Exception as e:
        logger.error(f"Extended enrichment error for {property_id}: {e}")
        return {"status": "error", "message": str(e), "property_id": property_id}


from app.services.status_updater import transition_past_auctions

@router.post("/force-status-update", response_model=dict)
def force_status_update(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Manually triggers the background task to transition properties 
    linked to past auctions to 'unavailable'.
    """
    try:
        result = transition_past_auctions()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
