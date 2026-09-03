from sqlalchemy import create_engine, text
import os
import sys
import json

sys.path.append(os.getcwd())
from app.core.config import settings

def test_endpoint():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        # Get first user ID
        user_row = conn.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
        uid = user_row[0] if user_row else 1
        
        # Raw SQL matching the endpoints query
        query = text("""
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
                p.gsi_url,
                p.id,
                p.max_bid,
                puo.overrides as user_overrides
            FROM property_details p
            LEFT JOIN property_auction_history pah ON pah.property_id = p.property_id
            LEFT JOIN property_user_overrides puo ON puo.property_id = p.property_id AND puo.user_id = :uid
            LEFT JOIN auction_events ae_lookup ON 
                ae_lookup.auction_date = p.next_auction_date AND 
                ae_lookup.state ILIKE p.state AND 
                ae_lookup.county ILIKE p.county
            LEFT JOIN property_scores ps ON ps.parcel_id = p.parcel_id
            WHERE p.address ILIKE :keyword
        """)
        
        result = conn.execute(query, {"uid": uid, "keyword": "%1770 Blm 518%"}).fetchall()
        for r in result:
            item = {
                "parcel_id": r[0],
                "county": r[1],
                "state_code": r[2],
                "amount_due": r[3],
                "assessed_value": r[4],
                "auction_date": r[5],
                "auction_name": r[6],
                "estimated_value": r[12],
                "max_bid": r[49] if len(r) > 49 and r[49] is not None else None,
                "user_overrides": r[50] if len(r) > 50 else None
            }
            # Merge overrides if present
            if len(r) > 50 and r[50]:
                user_overrides = r[50] if isinstance(r[50], dict) else (_json.loads(r[50]) if r[50] else {})
                if user_overrides:
                    for key, new_val in user_overrides.items():
                        if new_val is not None:
                            item[key] = new_val
                            
            print("Item returned from query:")
            print(json.dumps(item, indent=2, default=str))

if __name__ == "__main__":
    test_endpoint()
