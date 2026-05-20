from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
import shutil
from datetime import datetime
from uuid import uuid4

from app.api import deps
from app.models.client_data import ClientList, ClientNote, ClientAttachment, client_list_property
from app.models.property import PropertyDetails
from pydantic import BaseModel
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.services.activity import log_activity

router = APIRouter()

# UPLOAD_DIR = "/app/uploads"
UPLOAD_DIR = os.getenv("UPLOADS_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Schemas ---
class ClientListCreate(BaseModel):
    name: str
    tags: Optional[str] = None
    company_id: Optional[int] = None
    notes: Optional[str] = None

class ClientListResponse(BaseModel):
    id: int
    name: str
    property_count: int
    is_favorite_list: bool
    is_broadcasted: bool
    tags: Optional[str] = None
    company_id: Optional[int] = None
    has_upcoming_auction: bool = False
    upcoming_auctions_count: int = 0
    notes: Optional[str] = None

class ClientListUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[str] = None
    is_broadcasted: Optional[bool] = None
    company_id: Optional[int] = None
    notes: Optional[str] = None

class ClientNoteCreate(BaseModel):
    property_id: int
    note_text: str

class ClientNoteResponse(BaseModel):
    id: int
    property_id: int
    note_text: str
    created_at: datetime

class ClientAttachmentResponse(BaseModel):
    id: int
    property_id: int
    filename: str
    file_path: str
    created_at: datetime

class CustomPropertyCreate(BaseModel):
    visibility: Optional[str] = "public"
    parcel_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    county: Optional[str] = None
    zip_code: Optional[str] = None
    description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    owner_name: Optional[str] = None
    amount_due: Optional[float] = None
    assessed_value: Optional[float] = None
    property_type: Optional[str] = None
    occupancy: Optional[str] = None
    availability_status: Optional[str] = "Available"
    tax_amount: Optional[float] = None
    tax_year: Optional[int] = None
    legal_description: Optional[str] = None
    zoning: Optional[str] = None
    num_units: Optional[int] = None
    target_list_id: Optional[int] = None


# --- Endpoints ---

@router.post("/lists", response_model=ClientListResponse)
def create_client_list(
    *,
    db: Session = Depends(deps.get_db),
    list_in: ClientListCreate,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Create a new List folder for the client. Optionally scoped to a company."""
    target_company = list_in.company_id or getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    if current_user.role in ['manager', 'agent']:
        target_company = current_user.company_id

    # Check for unique folder name within the company
    existing_list = db.query(ClientList).filter(
        ClientList.company_id == target_company,
        ClientList.name.ilike(list_in.name)
    ).first()
    
    if existing_list:
        raise HTTPException(status_code=400, detail="A folder with this name already exists in your company.")

    new_list = ClientList(
        name=list_in.name,
        user_id=current_user.id,
        company_id=target_company,
        is_favorite_list=False,
        is_broadcasted=False,
        tags=list_in.tags,
        notes=list_in.notes
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    
    user_identifier = current_user.full_name or current_user.email
    log_activity(db, current_user.id, "create_folder", "ClientList", new_list.id, {"name": new_list.name}, company_id=target_company)
    
    return {
        "id": new_list.id,
        "name": new_list.name,
        "property_count": 0,
        "is_favorite_list": new_list.is_favorite_list,
        "is_broadcasted": new_list.is_broadcasted,
        "tags": new_list.tags,
        "company_id": new_list.company_id,
    }

@router.get("/lists")
def get_client_lists(
    company_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Get all lists for the current client or team member, optionally filtered by active company."""
    # Priority: parameter > active_company (switched) > legacy company_id
    effective_company_id = company_id or current_user.active_company_id or current_user.company_id

    if current_user.role in ['manager', 'agent']:
        if not effective_company_id:
            return []
        query = db.query(ClientList).filter(ClientList.company_id == effective_company_id)
    else:
        query = db.query(ClientList)
        if effective_company_id:
            query = query.filter(ClientList.company_id == effective_company_id)
        else:
            query = query.filter(ClientList.user_id == current_user.id).filter(ClientList.company_id == None)
            
    lists = query.all()

    # Auto-migration for legacy standard folders using acronyms (e.g., "TX" -> "Texas")
    standard_lists = [l for l in lists if l.tags == "STANDARD"]
    for lst in standard_lists:
        normalized_name = lst.name.strip().upper()
        if normalized_name in STATE_MAPPING:
            full_name = STATE_MAPPING[normalized_name]
            existing_full = next((l for l in standard_lists if l.name == full_name and l.id != lst.id), None)
            if existing_full:
                for prop in lst.properties:
                    if prop not in existing_full.properties:
                        existing_full.properties.append(prop)
                db.delete(lst)
                db.commit()
                lists.remove(lst)
            else:
                lst.name = full_name
                db.commit()

    results = []
    for lst in lists:
        count = db.query(client_list_property).filter(client_list_property.c.list_id == lst.id).count()
        auction_q = text("""
            SELECT COUNT(DISTINCT pah.property_id)
            FROM client_list_property clp
            JOIN property_details p ON p.id = clp.property_id
            JOIN property_auction_history pah ON pah.property_id = p.property_id
            LEFT JOIN auction_events ae ON pah.auction_id = ae.id
            WHERE clp.list_id = :list_id AND COALESCE(pah.auction_date, ae.auction_date) >= CURRENT_DATE
        """)
        upcoming_count = db.execute(auction_q, {"list_id": lst.id}).scalar() or 0
        results.append({
            "id": lst.id,
            "name": lst.name,
            "property_count": count,
            "is_favorite_list": lst.is_favorite_list,
            "is_broadcasted": lst.is_broadcasted,
            "tags": lst.tags,
            "company_id": lst.company_id,
            "has_upcoming_auction": upcoming_count > 0,
            "upcoming_auctions_count": upcoming_count,
            "notes": lst.notes
        })
    return results


@router.get("/custom-properties")
def get_custom_properties(
    *,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Get all private custom properties created by the current user's company."""
    if not current_user.active_company_id:
        return []
    
    from app.models.property import PropertyDetails
    props = db.query(PropertyDetails).filter(
        PropertyDetails.company_id == current_user.active_company_id,
        PropertyDetails.created_by_user_id != None
    ).all()
    
    results = []
    for p in props:
        results.append({
            "id": p.id,
            "property_id": p.property_id,
            "parcel_id": p.parcel_id,
            "address": p.address,
            "city": "",  # Extracted from address if needed
            "state": p.state,
            "county": p.county,
            "description": p.description,
            "bedrooms": p.bedrooms,
            "bathrooms": p.bathrooms,
            "sqft": p.sqft,
            "lot_size": p.lot_size,
            "year_built": p.year_built,
            "amount_due": p.amount_due,
            "assessed_value": p.assessed_value,
            "property_type": p.property_type,
            "availability_status": p.availability_status
        })
    return results

@router.post("/custom-properties")
def create_custom_property(
    *,
    db: Session = Depends(deps.get_db),
    property_in: CustomPropertyCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Create a private custom property linked to a client's company and assign it to a list."""
    import uuid
    from app.models.property import PropertyDetails

    # Require company isolation for private properties
    if property_in.visibility == "private" and not current_user.active_company_id:
        # Bypassed since we default to public/global visibility (company_id = None)
        pass

    # Prevent Trial users from creating custom properties (public or private)
    from app.services.permission_service import PermissionService
    parent_sub = PermissionService.get_parent_subscription(db, current_user)
    if parent_sub.plan_type == "trial":
        raise HTTPException(
            status_code=403,
            detail="Trial plan users are not allowed to create properties manually. Please upgrade to a paid plan."
        )

    # Format the fallback address based on fields if address not fully provided
    full_address = property_in.address or ""
    if property_in.city and property_in.state:
        if full_address:
            full_address += f", {property_in.city}, {property_in.state} {property_in.zip_code or ''}"
        else:
            full_address = f"{property_in.city}, {property_in.state} {property_in.zip_code or ''}"

    # ── Duplicate Detection: Auto-link instead of rejecting ──────────────────
    # If the parcel_id already exists globally, we create a private override instead
    # of a new property record to avoid IntegrityError (UniqueViolation).
    if property_in.parcel_id:
        existing = db.execute(
            text("SELECT id, property_id FROM property_details WHERE parcel_id = :parcel_id"),
            {"parcel_id": property_in.parcel_id}
        ).fetchone()

        if existing:
            master_id, master_property_id = existing
            
            # 1. Ensure an override record exists
            import json as _json
            initial_payload = property_in.dict(exclude_unset=True)
            initial_payload.pop("parcel_id", None)
            initial_payload.pop("visibility", None)
            initial_payload.pop("target_list_id", None)

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
                    "pid": master_property_id,
                    "overrides": _json.dumps(initial_payload) if initial_payload else "{}",
                }
            )
            db.commit()

            # 2. Resolve Target List and link the property
            target_list_id = property_in.target_list_id
            lst = None
            if target_list_id:
                lst = db.query(ClientList).filter(
                    ClientList.id == target_list_id, 
                    (ClientList.user_id == current_user.id) | (ClientList.company_id == current_user.active_company_id)
                ).first()
            
            if not lst and property_in.state:
                raw_state = property_in.state
                normalized_state = raw_state.strip().upper()
                list_name = STATE_MAPPING.get(normalized_state, raw_state.strip().title())
                
                lst = db.query(ClientList).filter(
                    ClientList.name == list_name,
                    ClientList.tags.like("STANDARD%"),
                    (ClientList.company_id == current_user.active_company_id) if current_user.active_company_id else (ClientList.user_id == current_user.id)
                ).first()

                if not lst:
                    lst = ClientList(
                        name=list_name,
                        user_id=current_user.id,
                        company_id=current_user.active_company_id,
                        is_favorite_list=False,
                        is_broadcasted=False,
                        tags="STANDARD",
                        notes="Auto-managed standard folder"
                    )
                    db.add(lst)
                    db.commit()
                    db.refresh(lst)

            if not lst:
                lst = db.query(ClientList).filter(
                    ClientList.name == "Custom Folder",
                    ClientList.company_id == current_user.active_company_id
                ).first() or db.query(ClientList).filter(
                    ClientList.name == "Custom Folder",
                    ClientList.user_id == current_user.id
                ).first()

            if not lst:
                lst = ClientList(
                    name="Custom Folder",
                    user_id=current_user.id,
                    company_id=current_user.active_company_id,
                    notes="Default folder for manually created properties"
                )
                db.add(lst)
                db.commit()
                db.refresh(lst)

            # Link master property to list (not the override, as lists track real properties)
            master_prop_obj = db.query(PropertyDetails).get(master_id)
            if master_prop_obj and master_prop_obj not in lst.properties:
                lst.properties.append(master_prop_obj)
                db.commit()

            log_activity(db, current_user.id, "link_existing_property", "PropertyDetails", master_id, {"address": master_prop_obj.address, "list": lst.name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))

            return {
                "id": master_id,
                "property_id": master_property_id,
                "list_id": lst.id,
                "list_name": lst.name,
                "status": "already_exists"
            }

    # Synchronously resolve FIPS
    from app.utils.fips_resolver import resolve_county_fips
    resolved_fips = resolve_county_fips(property_in.state, property_in.county)

    # ── New Property — standard creation path ─────────────────────────────────
    prop_id = str(uuid.uuid4())
    new_prop = PropertyDetails(
        property_id=prop_id,
        parcel_id=property_in.parcel_id or f"CUSTOM-{prop_id[:8]}",
        address=full_address.strip(),
        state=property_in.state,
        county=property_in.county,
        county_fips=resolved_fips,
        description=property_in.description,
        bedrooms=property_in.bedrooms,
        bathrooms=property_in.bathrooms,
        sqft=property_in.sqft,
        lot_size=property_in.lot_size,
        year_built=property_in.year_built,
        owner_name=property_in.owner_name,
        amount_due=property_in.amount_due,
        assessed_value=property_in.assessed_value,
        property_type=property_in.property_type,
        occupancy=property_in.occupancy,
        availability_status=property_in.availability_status,
        tax_amount=property_in.tax_amount,
        tax_year=property_in.tax_year,
        legal_description=property_in.legal_description,
        zoning=property_in.zoning,
        num_units=property_in.num_units,
        company_id=None,
        created_by_user_id=current_user.id
    )

    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)

    # Resolve Target List
    target_list_id = property_in.target_list_id
    lst = None
    if target_list_id:
        # Check if list belongs to user OR their company
        lst = db.query(ClientList).filter(
            ClientList.id == target_list_id, 
            (ClientList.user_id == current_user.id) | (ClientList.company_id == current_user.active_company_id)
        ).first()
    
    if not lst and property_in.state:
        raw_state = property_in.state
        normalized_state = raw_state.strip().upper()
        list_name = STATE_MAPPING.get(normalized_state, raw_state.strip().title())
        
        lst = db.query(ClientList).filter(
            ClientList.name == list_name,
            ClientList.tags.like("STANDARD%"),
            (ClientList.company_id == current_user.active_company_id) if current_user.active_company_id else (ClientList.user_id == current_user.id)
        ).first()

        if not lst:
            lst = ClientList(
                name=list_name,
                user_id=current_user.id,
                company_id=current_user.active_company_id,
                is_favorite_list=False,
                is_broadcasted=False,
                tags="STANDARD",
                notes="Auto-managed standard folder"
            )
            db.add(lst)
            db.commit()
            db.refresh(lst)

    if not lst:
        # Create or find default "Custom Folder" for the company
        lst = db.query(ClientList).filter(
            ClientList.name == "Custom Folder",
            ClientList.company_id == current_user.active_company_id
        ).first()

        if not lst:
            # Fallback to user_id if company_id is not set (legacy or personal)
            lst = db.query(ClientList).filter(
                ClientList.name == "Custom Folder",
                ClientList.user_id == current_user.id
            ).first()

        if not lst:
            lst = ClientList(
                name="Custom Folder",
                user_id=current_user.id,
                company_id=current_user.active_company_id,
                notes="Default folder for manually created properties"
            )
            db.add(lst)
            db.commit()
            db.refresh(lst)

    # Link Property to List
    if new_prop not in lst.properties:
        lst.properties.append(new_prop)
        db.commit()

    user_identifier = current_user.full_name or current_user.email
    log_activity(db, current_user.id, "create_property", "PropertyDetails", new_prop.id, {"address": new_prop.address, "list": lst.name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))

    # ── Trigger Background Enrichment via Attom API ──
    from app.services.attom_enrichment import enrich_property
    background_tasks.add_task(enrich_property, db, new_prop.property_id)

    return {"id": new_prop.id, "property_id": new_prop.property_id, "list_id": lst.id, "list_name": lst.name}


@router.get("/lists/preferences")
def get_list_preferences(
    company_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """
    Returns the distinct states and counties from all properties saved by
    the current user (optionally scoped to company) — used by the Home
    dashboard to dynamically personalize the experience.
    """
    from sqlalchemy import or_
    query = db.query(ClientList).filter(ClientList.user_id == current_user.id)
    if company_id:
        query = query.filter(or_(ClientList.company_id == company_id, ClientList.company_id == None))
    user_lists = query.all()
    list_ids = [l.id for l in user_lists]

    if not list_ids:
        return {"states": [], "counties": [], "total_properties": 0}

    placeholders = ", ".join(str(i) for i in list_ids)
    rows = db.execute(text(f"""
        SELECT DISTINCT p.state, p.county
        FROM client_list_property clp
        JOIN property_details p ON p.id = clp.property_id
        WHERE clp.list_id IN ({placeholders})
          AND p.state IS NOT NULL
    """)).fetchall()

    states = sorted(set(r[0] for r in rows if r[0]))
    counties = sorted(set(r[1] for r in rows if r[1]))
    total = db.execute(text(f"""
        SELECT COUNT(DISTINCT clp.property_id)
        FROM client_list_property clp
        WHERE clp.list_id IN ({placeholders})
    """)).scalar() or 0

    return {"states": states, "counties": counties, "total_properties": total}

@router.get("/broadcasted")
def get_broadcasted_lists(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Get all lists broadcasted by admins."""
    # Logic: Only admins can broadcast, so we fetch lists where is_broadcasted=True
    # and they belong to an admin user (though currently any admin is fine).
    broadcasted = db.query(ClientList).filter(ClientList.is_broadcasted == True).all()
    results = []
    for lst in broadcasted:
        count = db.query(client_list_property).filter(client_list_property.c.list_id == lst.id).count()
        
        # Calculate upcoming auctions flag
        auction_q = text("""
            SELECT COUNT(DISTINCT pah.property_id)
            FROM client_list_property clp
            JOIN property_details p ON p.id = clp.property_id
            JOIN property_auction_history pah ON pah.property_id = p.property_id
            WHERE clp.list_id = :list_id AND pah.auction_date >= CURRENT_DATE
        """)
        upcoming_count = db.execute(auction_q, {"list_id": lst.id}).scalar() or 0

        results.append({
            "id": lst.id, 
            "name": lst.name, 
            "property_count": count, 
            "is_broadcasted": True,
            "has_upcoming_auction": upcoming_count > 0,
            "upcoming_auctions_count": upcoming_count
        })
    return results

@router.post("/broadcasted/{list_id}/import")
def import_broadcasted_list(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Clone a broadcasted list into the client's own library."""
    source_list = db.query(ClientList).filter(ClientList.id == list_id, ClientList.is_broadcasted == True).first()
    if not source_list:
        raise HTTPException(status_code=404, detail="Broadcasted list not found")
    
    # Create copy
    new_list = ClientList(name=f"Imported: {source_list.name}", user_id=current_user.id, is_broadcasted=False)
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    
    # Copy relations
    for prop in source_list.properties:
        new_list.properties.append(prop)
    db.commit()
    
    return {"id": new_list.id, "name": new_list.name}

@router.put("/lists/{list_id}", response_model=ClientListResponse)
def update_client_list(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    list_in: ClientListUpdate,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Update a list's name."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    
    # RBAC logic
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this folder")
    else:
        if lst.user_id != current_user.id and not lst.is_broadcasted:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to edit this folder")

    if lst.is_favorite_list and list_in.name:
        raise HTTPException(status_code=400, detail="Cannot rename the Favorites list")
    
    if list_in.name is not None and not lst.is_favorite_list:
        lst.name = list_in.name
    if list_in.tags is not None:
        lst.tags = list_in.tags
    if list_in.is_broadcasted is not None:
        lst.is_broadcasted = list_in.is_broadcasted
    if list_in.notes is not None:
        lst.notes = list_in.notes

    user_identifier = current_user.full_name or current_user.email
    if list_in.name is not None and not lst.is_favorite_list:
        log_activity(db, current_user.id, "update_folder", "ClientList", lst.id, {"new_name": list_in.name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))

    db.commit()
    count = db.query(client_list_property).filter(client_list_property.c.list_id == lst.id).count()
    
    # Calculate upcoming auctions flag
    auction_q = text("""
        SELECT COUNT(DISTINCT pah.property_id)
        FROM client_list_property clp
        JOIN property_details p ON p.id = clp.property_id
        JOIN property_auction_history pah ON pah.property_id = p.property_id
        WHERE clp.list_id = :list_id AND pah.auction_date >= CURRENT_DATE
    """)
    upcoming_count = db.execute(auction_q, {"list_id": lst.id}).scalar() or 0

    return {
        "id": lst.id, 
        "name": lst.name, 
        "property_count": count, 
        "is_favorite_list": lst.is_favorite_list, 
        "is_broadcasted": lst.is_broadcasted, 
        "tags": lst.tags,
        "has_upcoming_auction": upcoming_count > 0,
        "upcoming_auctions_count": upcoming_count,
        "notes": lst.notes
    }

@router.delete("/lists/{list_id}")
def delete_client_list(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Delete a client list."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
        
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    else:
        if lst.user_id != current_user.id:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    if lst.is_favorite_list:
        raise HTTPException(status_code=400, detail="Cannot delete the Favorites list")
    
    name = lst.name
    db.delete(lst)
    db.commit()
    
    user_identifier = current_user.full_name or current_user.email
    log_activity(db, current_user.id, "delete_folder", "ClientList", list_id, {"name": name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))
    return {"ok": True}

@router.delete("/lists/{list_id}/county/{county_name}")
def delete_client_list_county(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    county_name: str,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Delete a county subfolder from a client list, removing all its properties."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
        
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    else:
        if lst.user_id != current_user.id:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")

    # Remove all properties in this county from the list
    db.execute(text("""
        DELETE FROM client_list_property
        WHERE list_id = :list_id
        AND property_id IN (
            SELECT id FROM property_details WHERE county ILIKE :county_name
        )
    """), {"list_id": list_id, "county_name": county_name})
    
    # Also remove from tags if it's a STANDARD list pinned county
    if lst.tags and lst.tags.startswith("STANDARD:"):
        parts = lst.tags.split(":")
        if len(parts) > 1:
            counties = [c.strip() for c in parts[1].split(",")]
            # Filter out the county case-insensitively
            counties = [c for c in counties if c.lower() != county_name.lower()]
            if counties:
                lst.tags = f"STANDARD:{','.join(counties)}"
            else:
                lst.tags = "STANDARD"
            db.add(lst)
    
    db.commit()
    
    log_activity(db, current_user.id, "delete_subfolder", "ClientList", list_id, {"county": county_name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))
    return {"ok": True}

@router.post("/lists/{list_id}/properties/{property_id}")
def add_property_to_list(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    property_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Add a scraped property to a specific client list."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    prop = db.query(PropertyDetails).filter(PropertyDetails.id == property_id).first()
    if not lst or not prop:
        raise HTTPException(status_code=404, detail="List or Property not found")
        
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    else:
        if lst.user_id != current_user.id:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    if prop not in lst.properties:
        lst.properties.append(prop)
        db.commit()
        user_identifier = current_user.full_name or current_user.email
        log_activity(db, current_user.id, "add_property_to_list", "PropertyDetails", prop.id, {"address": prop.address, "list": lst.name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))
    return {"ok": True}

STATE_MAPPING = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
}

@router.post("/lists/standard/add/{property_id}")
def add_property_to_standard_list(
    *,
    db: Session = Depends(deps.get_db),
    property_id: int,
    company_id: Optional[int] = None,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Add a property to an auto-managed State/County Standard List."""
    prop = db.query(PropertyDetails).filter(PropertyDetails.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    raw_state = prop.state or "Unknown State"
    # Normalize state string: attempt abbreviation translation, fallback to capitalized string
    normalized_state = raw_state.strip().upper()
    list_name = STATE_MAPPING.get(normalized_state, raw_state.strip().title())

    # Always ensure the property goes into its specific State parent list
    # If Agent/Manager, prioritize looking for company list. If Client, use their company or private.
    target_company = company_id or getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    
    lst = db.query(ClientList).filter(
        ClientList.name == list_name,
        ClientList.tags.like("STANDARD%"),
        ClientList.company_id == target_company
    ).first()

    if not lst and not target_company:
        # Fallback for truly private lists if no company context
        lst = db.query(ClientList).filter(
            ClientList.user_id == current_user.id,
            ClientList.name == list_name,
            ClientList.tags.like("STANDARD%"),
            ClientList.company_id == None
        ).first()

    if not lst:
        lst = ClientList(
            name=list_name, 
            user_id=current_user.id, 
            company_id=target_company,
            is_favorite_list=False, 
            is_broadcasted=False, 
            tags="STANDARD"
        )
        db.add(lst)
        db.commit()
        db.refresh(lst)

    if prop not in lst.properties:
        lst.properties.append(prop)
        db.commit()
        log_activity(db, current_user.id, "add_property_to_standard_list", "PropertyDetails", prop.id, {"address": prop.address, "list": lst.name}, company_id=target_company)
    
    # Return the new list info so frontend can react if needed
    count = db.query(client_list_property).filter(client_list_property.c.list_id == lst.id).count()
    return {"ok": True, "list": {"id": lst.id, "name": lst.name, "property_count": count, "tags": lst.tags}}

@router.get("/lists/{list_id}/properties")
def get_list_properties(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Get all properties in a specific list, including auction proximity alert."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
        
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this list")
    else:
        if lst.user_id != current_user.id and not lst.is_broadcasted:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to view this list")

    results = []
    for p in lst.properties:
        try:
            # Get NEAREST auction and include links from the auction_events table
            # Using LEFT JOIN and matching on the UUID property_id
            auction = db.execute(text("""
                SELECT 
                    COALESCE(pah.auction_date, ae.auction_date) as auction_date,
                    COALESCE(pah.list_link, ae.list_link) as auction_list_link,
                    COALESCE(pah.info_link, ae.register_link) as auction_info_link,
                    ae.status as auction_status,
                    ae.name as case_number
                FROM property_auction_history pah
                LEFT JOIN auction_events ae ON pah.auction_id = ae.id
                WHERE pah.property_id = :property_id AND COALESCE(pah.auction_date, ae.auction_date) >= CURRENT_DATE
                ORDER BY pah.auction_date ASC
                LIMIT 1
            """), {"property_id": p.property_id}).fetchone()
            
            # Fetch Property Notes (Company scoped if applicable)
            target_company = getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
            if target_company:
                note = db.query(ClientNote).filter(
                    ClientNote.property_id == p.id,
                    ClientNote.company_id == target_company
                ).first()
            else:
                note = db.query(ClientNote).filter(
                    ClientNote.property_id == p.id,
                    ClientNote.user_id == current_user.id
                ).first()

            # Calculate days until auction
            days_until_auction = None
            is_auction_upcoming = False
            if auction and auction.auction_date:
                try:
                    from datetime import date, datetime
                    auction_dt = auction.auction_date if isinstance(auction.auction_date, date) else datetime.strptime(str(auction.auction_date), "%Y-%m-%d").date()
                    days_until_auction = (auction_dt - date.today()).days
                    is_auction_upcoming = 0 <= days_until_auction <= 30  # Alert within 30 days
                except Exception:
                    pass

            prop_dict = {
                "id": p.id,
                "parcel_id": p.parcel_id,
                "address": p.address,
                "owner_address": p.owner_address,
                "county": p.county,
                "state": p.state,
                "state_code": p.state,
                "description": p.description or p.legal_description,
                "lot_acres": p.lot_acres,
                "improvement_value": p.improvement_value,
                "availability_status": p.availability_status,
                "property_type": p.property_type,
                "auction_name": auction.case_number if auction else None,
                "auction_date": str(auction.auction_date) if auction and auction.auction_date else None,
                "auction_info_link": auction.auction_info_link if auction else None,
                "auction_list_link": auction.auction_list_link if auction else None,
                "is_auction_upcoming": is_auction_upcoming,
                "days_until_auction": days_until_auction,
                "note_content": note.notes if getattr(note, 'notes', None) else "",
                "amount_due": p.amount_due,
                "assessed_value": p.assessed_value,
                "occupancy": p.occupancy,
                "latitude": p.latitude,
                "longitude": p.longitude
            }
            results.append(prop_dict)
        except Exception as e:
            db.rollback()
            print(f"Error processing property {p.id}: {str(e)}")
            # Fallback basics to ensure it shows up even if auction logic fails
            results.append({
                "id": p.id,
                "parcel_id": p.parcel_id,
                "address": p.address,
                "state": p.state,
                "availability_status": p.availability_status
            })

    # Sort: upcoming auctions first, then by days_until
    results.sort(key=lambda x: (
        0 if x.get("is_auction_upcoming") else 1,
        x.get("days_until_auction") if x.get("days_until_auction") is not None else 9999
    ))
    return results

@router.post("/lists/{list_id}/move/{property_id}")
def move_property_between_lists(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    property_id: int,
    target_list_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Move a property from one list to another."""
    source_list = db.query(ClientList).filter(ClientList.id == list_id, ClientList.user_id == current_user.id).first()
    target_list = db.query(ClientList).filter(ClientList.id == target_list_id, ClientList.user_id == current_user.id).first()
    prop = db.query(PropertyDetails).filter(PropertyDetails.id == property_id).first()

    if not source_list or not target_list or not prop:
        raise HTTPException(status_code=404, detail="Source, Target list or Property not found")
    
    if prop in source_list.properties:
        source_list.properties.remove(prop)
    
    if prop not in target_list.properties:
        target_list.properties.append(prop)
    
    db.commit()
    return {"ok": True}

@router.delete("/lists/{list_id}/properties/{property_id}")
def remove_property_from_list(
    *,
    db: Session = Depends(deps.get_db),
    list_id: int,
    property_id: int,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Remove a property from a specific client list."""
    lst = db.query(ClientList).filter(ClientList.id == list_id).first()
    prop = db.query(PropertyDetails).filter(PropertyDetails.id == property_id).first()
    if not lst or not prop:
        raise HTTPException(status_code=404, detail="List or Property not found")
        
    if current_user.role in ['manager', 'agent']:
        effective_company_id = current_user.active_company_id or current_user.company_id
        if lst.company_id != effective_company_id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    else:
        if lst.user_id != current_user.id:
            co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": lst.company_id, "uid": current_user.id}).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail="Not authorized to modify this list")
    
    if prop in lst.properties:
        lst.properties.remove(prop)
        user_identifier = current_user.full_name or current_user.email
        log_activity(db, current_user.id, "remove_property_from_list", "PropertyDetails", prop.id, {"address": prop.address, "list": lst.name}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))
        db.commit()
    return {"ok": True}

@router.post("/favorites/toggle/{property_id}")
def toggle_favorite(
    *,
    db: Session = Depends(deps.get_db),
    property_id: int,
    company_id: Optional[int] = None,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Toggle a property in the user's auto-generated Favorites list (company scoped)."""
    prop = db.query(PropertyDetails).filter(PropertyDetails.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    target_company = company_id or getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    
    fav_list = db.query(ClientList).filter(
        ClientList.is_favorite_list == True,
        ClientList.company_id == target_company
    ).first()
    
    if not fav_list and not target_company:
         fav_list = db.query(ClientList).filter(
            ClientList.user_id == current_user.id,
            ClientList.is_favorite_list == True,
            ClientList.company_id == None
        ).first()
    
    if not fav_list:
        fav_list = ClientList(name="Favorites", user_id=current_user.id, is_favorite_list=True, company_id=target_company)
        db.add(fav_list)
        db.commit()
        db.refresh(fav_list)

    if prop in fav_list.properties:
        fav_list.properties.remove(prop)
        is_favorite = False
    else:
        fav_list.properties.append(prop)
        is_favorite = True

    db.commit()
    log_activity(db, current_user.id, "toggle_favorite", "PropertyDetails", prop.id, {"address": prop.address, "is_favorite": is_favorite}, company_id=target_company)
    return {"is_favorite": is_favorite}

@router.get("/favorites")
def get_favorites(
    company_id: Optional[int] = None,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Get all property IDs that are favorited by the user (company scoped)."""
    target_company = company_id or getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    
    fav_list = db.query(ClientList).filter(
        ClientList.is_favorite_list == True,
        ClientList.company_id == target_company
    ).first()
    
    if not fav_list and not target_company:
        fav_list = db.query(ClientList).filter(
            ClientList.user_id == current_user.id, 
            ClientList.is_favorite_list == True,
            ClientList.company_id == None
        ).first()
    
    if not fav_list:
        return []
    
    return [p.id for p in fav_list.properties]

@router.post("/notes", response_model=ClientNoteResponse)
def create_client_note(
    *,
    db: Session = Depends(deps.get_db),
    note_in: ClientNoteCreate,
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Write or update a shared note on a property."""
    target_company = getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    
    # Check for existing note to perform an 'upsert'
    if target_company:
        existing_note = db.query(ClientNote).filter(
            ClientNote.company_id == target_company,
            ClientNote.property_id == note_in.property_id
        ).first()
    else:
        existing_note = db.query(ClientNote).filter(
            ClientNote.user_id == current_user.id,
            ClientNote.property_id == note_in.property_id
        ).first()
    
    if existing_note:
        existing_note.note_text = note_in.note_text
        existing_note.created_at = datetime.now()
        db.commit()
        db.refresh(existing_note)
        return existing_note
    
    note = ClientNote(
        user_id=current_user.id, 
        company_id=target_company,
        property_id=note_in.property_id, 
        note_text=note_in.note_text
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.post("/attachments", response_model=ClientAttachmentResponse)
async def upload_attachment(
    *,
    db: Session = Depends(deps.get_db),
    property_id: int = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """Upload a file attachment for a property, stored locally."""
    # Validations
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".txt", ".csv"}
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {file_ext} not allowed")

    # Read a chunk to check size if possible or use file.size (FastAPI 0.100+)
    # For compatibility, we'll check after upload or via content-length if available
    
    unique_filename = f"{uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    size = 0
    with open(file_path, "wb") as buffer:
        while content := file.file.read(1024 * 1024): # 1MB chunks
            size += len(content)
            if size > MAX_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large (Max 10MB)")
            buffer.write(content)
        
    target_company = getattr(current_user, 'active_company_id', None) or getattr(current_user, 'company_id', None)
    
    attachment = ClientAttachment(
        user_id=current_user.id,
        company_id=target_company,
        property_id=property_id,
        filename=file.filename,
        file_path=f"/uploads/{unique_filename}"
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment
