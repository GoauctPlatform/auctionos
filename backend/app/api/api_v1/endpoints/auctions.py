from typing import List, Any, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.auction_event import AuctionEvent as AuctionEventSchema, AuctionEventCreate, AuctionEventUpdate, PaginatedAuctionResponse
from app.db.repositories.auction_repository import auction_repo
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=PaginatedAuctionResponse)
def read_auctions(
    db: Session = Depends(deps.get_db),
    name: Optional[str] = Query(None, description="Filtro por nome"),
    state: Optional[str] = Query(None, description="Filtro por estado"),
    county: Optional[str] = Query(None, description="Filtro por condado (county_name)"),
    is_presential: Optional[bool] = Query(None, description="True para presencial, False para online"),
    start_date: Optional[date] = Query(None, description="Data inicial do leilão"),
    end_date: Optional[date] = Query(None, description="Data final do leilão"),
    min_parcels: Optional[int] = Query(None, description="Mínimo de parcelas (imóveis)"),
    max_parcels: Optional[int] = Query(None, description="Máximo de parcelas (imóveis)"),
    q: Optional[str] = Query(None, description="Busca textual genérica avançada"),
    tax_status: Optional[str] = Query(None, description="Filtro singular por status de impostos/leilão (compatibilidade)"),
    tax_statuses: Optional[List[str]] = Query(None, description="Filtro por múltiplos status de impostos/leilão"),
    sort_by_date: bool = Query(False, description="Ordernar por auction_date descendente (False) ou ascendente (True)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> Any:
    items, total = auction_repo.get_multi(
        db, 
        skip=skip, 
        limit=limit,
        name=name,
        state=state,
        county=county,
        is_presential=is_presential,
        start_date=start_date,
        end_date=end_date,
        min_parcels=min_parcels,
        max_parcels=max_parcels,
        q=q,
        tax_statuses=tax_statuses,
        sort_by_date=sort_by_date
    )
    return {"items": items, "total": total}

@router.get("/calendar")
def get_auction_calendar(
    db: Session = Depends(deps.get_db),
    name: Optional[str] = Query(None, description="Filtro por nome"),
    state: Optional[str] = Query(None, description="Filtro por estado"),
    county: Optional[str] = Query(None, description="Filtro por condado (county_name)"),
    is_presential: Optional[bool] = Query(None, description="True para presencial, False para online"),
    start_date: Optional[date] = Query(None, description="Data inicial"),
    end_date: Optional[date] = Query(None, description="Data final"),
    q: Optional[str] = Query(None, description="Busca textual genérica avançada"),
    tax_status: Optional[str] = Query(None, description="Filtro singular por status de impostos/leilão"),
    tax_statuses: Optional[List[str]] = Query(None, description="Filtro por múltiplos status de impostos/leilão"),
) -> Any:
    return auction_repo.get_calendar_events(
        db,
        name=name,
        state=state,
        county=county,
        is_presential=is_presential,
        start_date=start_date,
        end_date=end_date,
        q=q,
        tax_status=tax_status,
        tax_statuses=tax_statuses
    )

@router.post("/", response_model=AuctionEventSchema)
def create_auction(
    *,
    db: Session = Depends(deps.get_db),
    auction_in: AuctionEventCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new auction.
    """
    auction = auction_repo.create(db=db, obj_in=auction_in)
    return auction

@router.put("/{id}", response_model=AuctionEventSchema)
def update_auction(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    auction_in: AuctionEventUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update an auction.
    """
    auction = auction_repo.get(db=db, id=id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    auction = auction_repo.update(db=db, db_obj=auction, obj_in=auction_in)
    return auction

@router.delete("/{id}", response_model=AuctionEventSchema)
def delete_auction(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete an auction.
    """
    auction = auction_repo.get(db=db, id=id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    auction = auction_repo.remove(db=db, id=id)
    return auction

