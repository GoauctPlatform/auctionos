import os
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("--- TESTING VISIBILITY QUERY ON REMOTE DB ---")
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
        where_str = "(p.company_id IS NULL OR p.visibility = 'public' OR p.company_id = :cid)"
        
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
            "limit": 10,
            "uid": 40,
            "cid": None
        }
        
        result = conn.execute(text(items_query), params).fetchall()
        print(f"Visibility query executed successfully! Returned {len(result)} items.")
except Exception as e:
    print(f"Query FAILED: {e}")
print("--- END ---")
