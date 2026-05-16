from typing import List, Optional, Any
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import asc, or_, text, func
from fastapi.encoders import jsonable_encoder
from app.models.auction_event import AuctionEvent
from app.models.property import PropertyDetails, PropertyAuctionHistory
from app.schemas.auction_event import AuctionEventCreate, AuctionEventUpdate

class AuctionRepository:
    def get(self, db: Session, id: Any) -> Optional[AuctionEvent]:
        return db.query(AuctionEvent).filter(AuctionEvent.id == id).first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100,
        name: Optional[str] = None,
        state: Optional[str] = None,
        county: Optional[str] = None,
        is_presential: Optional[bool] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_parcels: Optional[int] = None,
        max_parcels: Optional[int] = None,
        q: Optional[str] = None,
        tax_statuses: Optional[List[str]] = None,
        sort_by_date: bool = True
    ) -> tuple[List[Any], int]:
        query = db.query(AuctionEvent)

        if name:
            query = query.filter(or_(
                AuctionEvent.name.ilike(f"%{name}%"),
                AuctionEvent.short_name.ilike(f"%{name}%")
            ))
        # ... (rest of filtering logic remains same)
        if state:
            query = query.filter(AuctionEvent.state.ilike(f"%{state}%"))
        if county:
            query = query.filter(AuctionEvent.county.ilike(f"%{county}%"))
        # ...
        if is_presential is not None:
            from sqlalchemy import and_, not_
            if is_presential:
                query = query.filter(
                    and_(
                        AuctionEvent.location.isnot(None),
                        AuctionEvent.location != '',
                        ~AuctionEvent.location.ilike("%online%")
                    )
                )
            else:
                query = query.filter(AuctionEvent.location.ilike("%online%"))
        if start_date:
            query = query.filter(AuctionEvent.auction_date >= start_date)
        if end_date:
            query = query.filter(AuctionEvent.auction_date <= end_date)
        if min_parcels is not None:
            query = query.filter(AuctionEvent.parcels_count >= min_parcels)
        if max_parcels is not None:
            query = query.filter(AuctionEvent.parcels_count <= max_parcels)
            
        if q:
            search_param = f"%{q}%"
            query = query.filter(or_(
                AuctionEvent.name.ilike(search_param),
                AuctionEvent.short_name.ilike(search_param),
                AuctionEvent.county.ilike(search_param),
                AuctionEvent.state.ilike(search_param),
                AuctionEvent.notes.ilike(search_param),
                AuctionEvent.location.ilike(search_param),
                AuctionEvent.tax_status.ilike(search_param)
            ))
            
        if tax_statuses:
            query = query.filter(func.lower(AuctionEvent.tax_status).in_([s.lower() for s in tax_statuses]))

        if sort_by_date:
            query = query.order_by(asc(AuctionEvent.auction_date))
        else:
            query = query.order_by(AuctionEvent.auction_date.desc())

        total = query.count()
        results = query.offset(skip).limit(limit).all()
        
        # Alias available_count to live_available_count for the schema
        for auction in results:
            auction.live_available_count = auction.available_count
            
        return results, total

    def get_calendar_events(
        self, db: Session,
        name: Optional[str] = None,
        state: Optional[str] = None,
        county: Optional[str] = None,
        is_presential: Optional[bool] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        q: Optional[str] = None,
        tax_statuses: Optional[List[str]] = None,
    ) -> List[Any]:
        # Build dynamic WHERE clause
        where_clauses = []
        params = {}
        
        if name:
            where_clauses.append("(name ILIKE :name OR short_name ILIKE :name)")
            params['name'] = f"%{name}%"
        if state:
            where_clauses.append("state ILIKE :state")
            params['state'] = f"%{state}%"
        if county:
            where_clauses.append("county ILIKE :county")
            params['county'] = f"%{county}%"
        if is_presential is not None:
            if is_presential:
                where_clauses.append("(location IS NOT NULL AND location != '' AND location NOT ILIKE '%online%')")
            else:
                where_clauses.append("location ILIKE '%online%'")
        if start_date:
            where_clauses.append("auction_date >= :start_date")
            params['start_date'] = start_date
        if end_date:
            where_clauses.append("auction_date <= :end_date")
            params['end_date'] = end_date
            
        if q:
            where_clauses.append("(name ILIKE :q OR short_name ILIKE :q OR county ILIKE :q OR state ILIKE :q OR location ILIKE :q OR notes ILIKE :q)")
            params['q'] = f"%{q}%"
        if tax_statuses:
            where_clauses.append("LOWER(tax_status) = ANY(:tax_statuses)")
            params['tax_statuses'] = [s.lower() for s in tax_statuses]

        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)

        query = text(f"""
            SELECT 
                id as auction_id,
                name as event_title,
                auction_date as event_date,
                time as event_time,
                location as event_location,
                notes as event_notes,
                tax_status,
                parcels_count as property_count,
                '' as linked_properties,
                '' as statuses,
                register_link,
                list_link
            FROM auction_events
            {where_sql}
            ORDER BY auction_date DESC
        """)
        
        results = db.execute(query, params).fetchall()
        return [dict(r._mapping) for r in results]

    def create(self, db: Session, *, obj_in: AuctionEventCreate) -> AuctionEvent:
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = AuctionEvent(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: AuctionEvent, obj_in: AuctionEventUpdate) -> AuctionEvent:
        obj_data = jsonable_encoder(db_obj)
        update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> AuctionEvent:
        obj = db.query(AuctionEvent).get(id)
        db.delete(obj)
        db.commit()
        return obj

auction_repo = AuctionRepository()
