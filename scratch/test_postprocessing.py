import os
import sys
from sqlalchemy import create_engine, text
from urllib.parse import quote

# Add backend to path
sys.path.append("/Users/gustavo/Downloads/auctionos/backend")

from app.schemas.property import PropertyDashboardSchema
from app.core.config import settings

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("--- TESTING POST-PROCESSING & GSI URL INJECTION ---")
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        history_table = "(SELECT DISTINCT ON (property_id) * FROM property_auction_history ORDER BY property_id, auction_date DESC)"
        ae_join = """
            LEFT JOIN auction_events ae_lookup ON 
                ae_lookup.auction_date = p.next_auction_date AND 
                ae_lookup.state ILIKE p.state AND 
                ae_lookup.county ILIKE p.county
        """
        score_join = "LEFT JOIN property_scores ps ON ps.parcel_id = p.parcel_id"
        where_str = "1=1"
        
        priority_sort = "CASE WHEN p.created_by_user_id = :uid OR (p.company_id = :cid AND p.company_id IS NOT NULL) THEN 0 ELSE 1 END ASC"
        order_by_clause = f"{priority_sort}, pah.auction_date ASC NULLS LAST, p.parcel_id ASC"
        
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
                COALESCE(pah.listed_as, ae_lookup.tax_status) as auction_type,
                p.market_land_value,
                p.market_improvement_value,
                p.owner_occupied,
                p.latitude,
                p.longitude,
                p.gsi_url
            FROM property_details p
            LEFT JOIN {history_table} pah ON pah.property_id = p.property_id
            {ae_join}
            {score_join}
            WHERE {where_str}
            ORDER BY {order_by_clause}
            OFFSET :skip LIMIT :limit
        """
        
        params = {
            "skip": 0,
            "limit": 100,
            "uid": 40,
            "cid": None
        }
        
        result = conn.execute(text(items_query), params).fetchall()
        print(f"Query returned {len(result)} rows.")
        
        items = []
        for r in result:
            item = {
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
                "auction_type": r[41],
                "market_land_value": r[42],
                "market_improvement_value": r[43],
                "owner_occupied": r[44],
                "latitude": r[45],
                "longitude": r[46],
                "gsi_url": r[47],
            }
            items.append(item)
            
        # Run post-processing
        api_key = "AIzaSyAoFrjr_t9lCEaVpXUgjUFr7jnoTii9Azg"  # mock key
        processed_count = 0
        for item in items:
            if not item.get("gsi_url") and api_key:
                address = item.get("address") or ""
                county = item.get("county") or ""
                state = item.get("state_code") or ""
                location_parts = [address, county, state]
                location_str = ", ".join([p for p in location_parts if p]).strip()
                if not location_str or location_str == ", ,":
                    location_str = item.get("parcel_id") or ""
                
                lat = item.get("latitude")
                lng = item.get("longitude")
                if lat is not None and lng is not None:
                    location_str = f"{lat},{lng}"

                if location_str:
                    sanitized_location = quote(location_str.replace('\n', ' ').strip())
                    item["gsi_url"] = f"https://maps.googleapis.com/maps/api/streetview?size=640x400&location={sanitized_location}&fov=90&pitch=10&key={api_key}"
            processed_count += 1
            
        print(f"Successfully post-processed {processed_count} items!")
except Exception as e:
    print(f"FAILED: {e}")
print("--- END ---")
