import pandas as pd
import io
import uuid
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.csv_import import PropertyCSVRow, AuctionCSVRow
from app.db.session import engine
from datetime import datetime
from redis import Redis
import os
import time
import asyncio
from sqlalchemy.exc import OperationalError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_redis_url():
    # Railway injects explicit components for the Redis plugin.
    # We forcefully reconstruct the URL to bypass any dirty 'REDIS_URL' overrides the user might have saved.
    pwd = os.getenv("REDISPASSWORD")
    host = os.getenv("REDISHOST")
    port = os.getenv("REDISPORT", "6379")
    if pwd and host:
        return f"redis://:{pwd}@{host}:{port}/0"
    return os.getenv("REDIS_URL", "redis://redis:6379/0")


try:
    redis = Redis.from_url(get_redis_url(), socket_connect_timeout=2)
    # Test connection
    redis.ping()
except:
    logger.warning("Redis not available. Progress tracking will be limited to console output.")
    redis = None

class ImportService:
    @staticmethod
    def process_properties_csv(file_content: bytes, job_id: str):
        # Wrapper to maintain existing interface but redirect to file-based processing
        temp_path = f"data/temp_imports/{job_id}.csv"
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        with open(temp_path, "wb") as f:
            f.write(file_content)
        
        # We manually call the sync version for background_tasks or let Celery handle it
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(import_service.process_properties_csv_file(temp_path, job_id))
        else:
            asyncio.run(import_service.process_properties_csv_file(temp_path, job_id))

    @staticmethod
    async def process_properties_csv_file(file_path: str, job_id: str, skip_rows: int = 0):
        try:
            # Using chunksize to keep memory footprint low
            chunk_size = 500
            total_rows = 0
            success_count = 0
            errors = []

            # Headers and types mapping
            def parse_auction_date(d_str):
                if not d_str: return None
                try: return datetime.strptime(d_str.strip(), "%m/%d/%Y").date()
                except: pass
                try: return datetime.strptime(d_str.strip(), "%Y-%m-%d").date()
                except: return None

            # Iterate in chunks
            skip_range = range(1, skip_rows + 1) if skip_rows > 0 else None
            for chunk in pd.read_csv(file_path, dtype=str, chunksize=chunk_size, skiprows=skip_range):
                total_rows += len(chunk)
                
                details_batch = []
                history_batch = []
                
                for _, row in chunk.iterrows():
                    try:
                        row_dict = row.where(pd.notnull(row), None).to_dict()
                        validated_data = PropertyCSVRow(**row_dict)
                        
                        
                        def parse_availability(raw_val):
                            if not raw_val or pd.isna(raw_val): return "available"
                            s = str(raw_val).lower().strip()
                            # Standardize all negative terms to 'unavailable'
                            if s in ["unavailable", "not available", "sold", "redeemed"]:
                                return "unavailable"
                            return "available"

                        # Parse dense text blocks from zoning and legal_description
                        def extract_dense_data(z_str, l_str):
                            import re
                            res = {
                                "zoning": z_str, "subdivision": l_str,
                                "lot_sqft": None, "lot_acres": None,
                                "legal_desc": l_str, "parcel_shape_data": []
                            }
                            if z_str and isinstance(z_str, str):
                                res["parcel_shape_data"].append(f"Zoning Data: {z_str}")
                                m_zone = re.search(r'Zoning Code:\s*([^\s]+)', z_str)
                                if m_zone: res["zoning"] = m_zone.group(1).strip()
                                
                                m_sq = re.search(r'Land Sq\. Ft:\s*([\d,]+)', z_str)
                                if m_sq: res["lot_sqft"] = m_sq.group(1).replace(',', '')
                                
                                m_ac = re.search(r'Acres:\s*([\d.]+)', z_str)
                                if m_ac: res["lot_acres"] = m_ac.group(1).strip()
                                
                            if l_str and isinstance(l_str, str):
                                res["parcel_shape_data"].append(f"Legal Rules: {l_str}")
                                m_sub = re.search(r'Subdivision Name:\s*(.*?)(?=\s+(?:Living|Adjusted|Ground|Building|#\s*of|Stories|Legal\sDescription))', l_str)
                                if m_sub: res["subdivision"] = m_sub.group(1).strip()
                                
                                m_leg = re.search(r'Legal Description:\s*(.*)', l_str)
                                if m_leg: res["legal_desc"] = m_leg.group(1).strip()
                                
                            # Convert array of shapes to a single text block
                            res["parcel_shape_data"] = "\n\n".join(res["parcel_shape_data"]) if res["parcel_shape_data"] else None
                            return res

                        dense_parsed = extract_dense_data(validated_data.zoning, validated_data.legal_description)

                        # Auto-resolve FIPS during import
                        resolved_fips = None
                        try:
                            from app.utils.fips_resolver import resolve_county_fips
                            resolved_fips = resolve_county_fips(validated_data.state_code, validated_data.county)
                        except Exception as fe:
                            logger.error(f"FIPS auto-resolve error during import: {fe}")

                        # Prepare PropertyDetails map
                        new_avail_status = parse_availability(validated_data.availability)
                        
                        d = {
                            "property_id": validated_data.property_id if validated_data.property_id else str(uuid.uuid4()),
                            "parcel_id": str(validated_data.parcel_id).strip() if validated_data.parcel_id else None,
                            "address": validated_data.address,
                            "owner_address": validated_data.owner_address,
                            "county": validated_data.county,
                            "state": validated_data.state_code,
                            "county_fips": resolved_fips,
                            "amount_due": validated_data.amount_due,
                            "occupancy": validated_data.vacancy,
                            "tax_year": int(float(validated_data.tax_sale_year)) if validated_data.tax_sale_year else None,
                            "cs_number": validated_data.cs_number,
                            "property_type": validated_data.type,
                            "availability_status": new_avail_status,
                            "account_number": validated_data.account,
                            "lot_acres": validated_data.acres or dense_parsed["lot_acres"],
                            "estimated_value": validated_data.estimated_arv,
                            "rental_value": validated_data.estimated_rent,
                            "improvement_value": validated_data.improvements,
                            "land_value": validated_data.land_value,
                            "assessed_value": validated_data.total_value,
                            "property_category": validated_data.property_category,
                            "purchase_option_type": validated_data.purchase_option_type,
                            "latitude": validated_data.latitude,
                            "longitude": validated_data.longitude,
                            "redfin_url": validated_data.redfin_url,
                            "redfin_estimate": validated_data.redfin_estimate,
                            "lot_sqft": validated_data.lot_sqft or dense_parsed["lot_sqft"],
                            "zoning": dense_parsed["zoning"],
                            "subdivision": dense_parsed["subdivision"],
                            "legal_description": dense_parsed["legal_desc"],
                            "parcel_shape_data": dense_parsed["parcel_shape_data"],
                            "sewer_type": validated_data.sewer_type,
                            "water_type": validated_data.water_type,
                            "property_type_detail": validated_data.property_type_detail,
                            "import_error_msg": validated_data.error,
                            "is_processed": str(validated_data.processed).lower() in ['true', '1', 'yes'] if pd.notna(validated_data.processed) else False,
                            "map_link": validated_data.map_link,
                        }
                        
                        # Coordinate Synchronization Logic
                        if not d["latitude"] and not d["longitude"] and pd.notna(validated_data.coordinates):
                            try:
                                clean_coords = str(validated_data.coordinates).replace(',', ' ').strip()
                                parts = clean_coords.split()
                                if len(parts) >= 2:
                                    d["latitude"] = float(parts[0])
                                    d["longitude"] = float(parts[1])
                            except: pass

                        details_batch.append(d)

                        # Prepare Auction History mapping
                        if validated_data.auction_name and validated_data.auction_date:
                            history_batch.append({
                                "parcel_id": validated_data.parcel_id, # Temporary ref to link to property
                                "auction_name": validated_data.auction_name,
                                "auction_date": parse_auction_date(validated_data.auction_date),
                                "taxes_due": validated_data.taxes_due_auction,
                                "info_link": validated_data.auction_info_link,
                                "list_link": validated_data.auction_list_link,
                                "created_at": datetime.utcnow()
                            })

                    except Exception as e:
                        errors.append(f"Row {total_rows - chunk_size + _ + 2}: {str(e)}")

                # Commit each chunk as a separate transaction with connection drop retry logic
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        with engine.begin() as conn:
                            # 1. Bulk Upsert PropertyDetails
                            if details_batch:
                                # Extract parcel IDs to check current status for History tracking
                                parcel_ids = [d["parcel_id"] for d in details_batch if d["parcel_id"]]
                                existing_status_map = {}
                                if parcel_ids:
                                    in_placeholders = ", ".join([f":p_{i}" for i in range(len(parcel_ids))])
                                    params = {f"p_{i}": pid for i, pid in enumerate(parcel_ids)}
                                    existing_rows = conn.execute(
                                        text(f"SELECT parcel_id, property_id, availability_status FROM property_details WHERE parcel_id IN ({in_placeholders})"),
                                        params
                                    ).fetchall()
                                    for r in existing_rows:
                                        existing_status_map[r[0]] = (r[1], r[2]) # (property_id, availability_status)

                                availability_history_batch = []
                                
                                # Process existing ID mappings for updates and detect changes
                                for d in details_batch:
                                    pid = d["parcel_id"]
                                    if pid in existing_status_map:
                                        db_prop_id, old_status = existing_status_map[pid]
                                        d["property_id"] = db_prop_id # Keep the same UUID
                                        # Check if status changed
                                        if (old_status or "not available") != d["availability_status"]:
                                            availability_history_batch.append({
                                                "property_id": db_prop_id,
                                                "previous_status": old_status or "not available",
                                                "new_status": d["availability_status"],
                                                "change_source": "batch_import",
                                                "changed_at": datetime.utcnow()
                                            })
                                    else:
                                        # New property, defaults to whatever is in d["availability_status"]
                                        availability_history_batch.append({
                                            "property_id": d["property_id"],
                                            "previous_status": None,
                                            "new_status": d["availability_status"],
                                            "change_source": "batch_import",
                                            "changed_at": datetime.utcnow()
                                        })

                                fields_pd = ", ".join(details_batch[0].keys())
                                placeholders_pd = ", ".join([f":{k}" for k in details_batch[0].keys()])
                                updates_pd = ", ".join([f"{k} = EXCLUDED.{k}" for k in details_batch[0].keys() if k not in ["property_id", "parcel_id"]])
                                
                                query_pd = text(f"""
                                    INSERT INTO property_details ({fields_pd}) VALUES ({placeholders_pd})
                                    ON CONFLICT (parcel_id) DO UPDATE SET {updates_pd}
                                """)
                                conn.execute(query_pd, details_batch)
                                
                                # 2. Bulk Insert Availability History
                                if availability_history_batch:
                                    fields_ah = ", ".join(availability_history_batch[0].keys())
                                    placeholders_ah = ", ".join([f":{k}" for k in availability_history_batch[0].keys()])
                                    query_ah = text(f"""
                                        INSERT INTO property_availability_history ({fields_ah}) VALUES ({placeholders_ah})
                                    """)
                                    conn.execute(query_ah, availability_history_batch)

                            # 3. Bulk Upsert Property Auction History
                            if history_batch:
                                query_h = text("""
                                    INSERT INTO property_auction_history (property_id, auction_name, auction_date, taxes_due, info_link, list_link, created_at)
                                    SELECT p.property_id, :auction_name, :auction_date, :taxes_due, :info_link, :list_link, :created_at
                                    FROM property_details p
                                    WHERE p.parcel_id = :parcel_id
                                    ON CONFLICT (property_id, auction_name) DO UPDATE SET
                                        auction_date = EXCLUDED.auction_date,
                                        taxes_due = EXCLUDED.taxes_due,
                                        info_link = EXCLUDED.info_link,
                                        list_link = EXCLUDED.list_link
                                """)
                                conn.execute(query_h, history_batch)
                        
                        success_count += len(details_batch)
                        print(f"Job {job_id}: Progress: {total_rows + skip_rows} rows read... ({success_count + skip_rows} successfully saved to DB)")
                        break # Break loop on successful insert

                    except OperationalError as oe:
                        if attempt == max_retries - 1:
                            logger.error(f"Job {job_id}: Failed to save chunk starting at {total_rows - chunk_size + 1} after {max_retries} retries: {str(oe)}")
                            errors.append(f"Chunk rows {total_rows - chunk_size + 1} to {total_rows} completely failed: {str(oe)}")
                            raise oe # We must raise it to stop the script, or we can choose to continue. Since partial imports are okay, let's catch it!
                        
                        logger.warning(f"Job {job_id}: DB OperationalError (Drop), retrying {attempt+1}/{max_retries} in 3s... ({str(oe)})")
                        time.sleep(3)
                        
                    except Exception as ge:
                        logger.error(f"Job {job_id}: Unhandled error in DB save chunk: {str(ge)}")
                        errors.append(f"Chunk DB Error rows {total_rows - chunk_size + 1}: {str(ge)}")
                        break # Not a connection error, break retry loop

            # Final Status Update
            if redis:
                if errors:
                    status_msg = f"Completed with errors. Success: {success_count}/{total_rows}. Errors: {len(errors[:100])}..."
                    redis.set(f"import_errors:{job_id}", str(errors[:500]), ex=3600)
                else:
                    status_msg = f"Success: {success_count} properties processed"
                    
                redis.set(f"import_status:{job_id}", status_msg, ex=3600)
            
            # TRIGGER EVENT: Link imported properties to their auctions automatically
            try:
                from app.tasks import resolve_property_auction_links_task
                if redis:
                    resolve_property_auction_links_task.delay(job_id)
                else:
                    resolve_property_auction_links_task(job_id)
            except Exception as te:
                logger.warning(f"Could not trigger auction resolution task: {te}")
            
            # Cleanup temp file
            if os.path.exists(file_path) and "temp_imports" in file_path:
                os.remove(file_path)

        except Exception as e:
            logger.error(f"Import Job Failed: {e}")
            if redis:
                redis.set(f"import_status:{job_id}", f"Critical Error: {str(e)}", ex=3600)
            if os.path.exists(file_path) and "temp_imports" in file_path:
                os.remove(file_path)
            raise e

    @staticmethod
    async def process_auctions_csv(file_content: bytes, job_id: str):
        try:
            # Read CSV forcing all columns to string to prevent Pydantic crashes
            df = pd.read_csv(io.BytesIO(file_content), dtype=str)
            total_rows = len(df)
            success_count = 0
            errors = []

            chunk_size = 100
            
            # Iterate in chunks manually
            for i in range(0, len(df), chunk_size):
                chunk = df.iloc[i:i+chunk_size]
                
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        with engine.begin() as conn:
                            for index, row in chunk.iterrows():
                                try:
                                    row_dict = row.where(pd.notnull(row), None).to_dict()
                                    validated_data = AuctionCSVRow(**row_dict)
                                    
                                    # Parse dates
                                    def parse_dt(d_str):
                                        if not d_str or d_str.strip() == "" or d_str == "N/A": return None
                                        try: return datetime.strptime(d_str.strip(), "%Y-%m-%d").date()
                                        except: return None
                                        
                                    a_date = parse_dt(validated_data.auction_date)
                                    if not a_date:
                                        raise ValueError(f"Invalid or missing auction date: {validated_data.auction_date}")
                                        
                                    r_date = parse_dt(validated_data.register_date)

                                    def parse_parcels(p_str):
                                        if not p_str or str(p_str).strip() == "": return 0
                                        try:
                                            return int(float(str(p_str).replace(',', '')))
                                        except ValueError:
                                            return 0

                                    auction_data = {
                                        "name": validated_data.name,
                                        "short_name": validated_data.short_name,
                                        "auction_date": a_date,
                                        "time": validated_data.time,
                                        "location": validated_data.location,
                                        "county": validated_data.county_name,
                                        "county_code": validated_data.county_code,
                                        "state": validated_data.state,
                                        "tax_status": validated_data.tax_status,
                                        "parcels_count": parse_parcels(validated_data.parcels),
                                        "notes": validated_data.notes,
                                        "search_link": validated_data.search_link,
                                        "register_date": r_date,
                                        "register_link": validated_data.register_link,
                                        "list_link": validated_data.list_link,
                                        "purchase_info_link": validated_data.purchase_info_link,
                                        "updated_at": datetime.utcnow()
                                    }
                                    
                                    # Check exist by name and date
                                    check_query = """
                                        SELECT id FROM auction_events 
                                        WHERE (name = :name OR short_name = :name OR name = :short_name OR short_name = :short_name) 
                                        AND auction_date = :auction_date
                                    """
                                    check_params = {
                                        "name": auction_data["name"], 
                                        "short_name": auction_data["short_name"],
                                        "auction_date": auction_data["auction_date"]
                                    }
                                    
                                    if validated_data.id:
                                        check_query = """
                                            SELECT id FROM auction_events 
                                            WHERE id = :id 
                                            OR ((name = :name OR short_name = :name OR name = :short_name OR short_name = :short_name) 
                                                AND auction_date = :auction_date)
                                        """
                                        check_params["id"] = int(validated_data.id)
                                    
                                    existing = conn.execute(text(check_query), check_params).fetchone()
                                    
                                    if existing:
                                        updates = ", ".join([f"{k} = :{k}" for k in auction_data.keys() if k not in ["name", "auction_date"]])
                                        query = text(f"UPDATE auction_events SET {updates} WHERE id = :id")
                                        update_params = {**auction_data, "id": existing[0]}
                                        conn.execute(query, update_params)
                                    else:
                                        # Use original ID if provided
                                        if validated_data.id:
                                            auction_data["id"] = int(validated_data.id)
                                        
                                        auction_data["created_at"] = datetime.utcnow()
                                        fields = ", ".join(auction_data.keys())
                                        placeholders = ", ".join([f":{k}" for k in auction_data.keys()])
                                        query = text(f"INSERT INTO auction_events ({fields}) VALUES ({placeholders})")
                                        conn.execute(query, auction_data)

                                except Exception as e:
                                    logger.error(f"Row {index + 2} failed: {str(e)}")
                                    errors.append(f"Row {index + 2}: {str(e)}")
                        
                        # Chunk processed perfectly
                        success_count += len(chunk)
                        logger.info(f"Job {job_id}: Processed {min(i + chunk_size, total_rows)} / {total_rows} auctions...")
                        break
                        
                    except OperationalError as oe:
                        if attempt == max_retries - 1:
                            logger.error(f"Job {job_id}: Failed chunk after {max_retries} retries: {str(oe)}")
                            errors.append(f"Chunk DB rows {i+2} completely failed: {str(oe)}")
                            raise oe
                        
                        logger.warning(f"Job {job_id}: DB OperationalError (Drop), retrying {attempt+1}/{max_retries} in 3s... ({str(oe)})")
                        time.sleep(3)
                        
                    except Exception as ge:
                        logger.error(f"Job {job_id}: Unhandled error in DB save chunk: {str(ge)}")
                        errors.append(f"Chunk DB Error rows {i+2}: {str(ge)}")
                        break

            if redis:
                if errors:
                    status_msg = f"Completed with errors. Success: {success_count}/{total_rows}. Errors: {len(errors)}"
                    redis.set(f"import_errors:{job_id}", str(errors), ex=3600)
                else:
                    status_msg = f"Success: {success_count} auctions processed"
                redis.set(f"import_auctions_status:{job_id}", status_msg, ex=3600)
        except Exception as e:
            logger.error(f"Auctions Import Job Failed: {e}")
            if redis:
                redis.set(f"import_auctions_status:{job_id}", f"Critical Error: {str(e)}", ex=3600)

    @staticmethod
    async def process_history_mapping_csv(file_content: bytes, job_id: str):
        try:
            df = pd.read_csv(io.BytesIO(file_content), dtype=str)
            total_rows = len(df)
            success_count = 0
            errors = []

            chunk_size = 500
            query = text("""
                INSERT INTO property_auction_history (property_id, auction_id, auction_name, auction_date, created_at)
                SELECT :prop_id, a.id, a.name, a.auction_date, :created_at
                FROM auction_events a
                WHERE a.id = :auction_id
                ON CONFLICT (property_id, auction_name) DO UPDATE SET
                    auction_id = EXCLUDED.auction_id,
                    auction_date = EXCLUDED.auction_date,
                    created_at = EXCLUDED.created_at
            """)
            for i in range(0, len(df), chunk_size):
                chunk = df.iloc[i:i+chunk_size]
                batch_params = []
                now = datetime.utcnow()
                for index, row in chunk.iterrows():
                    row_dict = row.where(pd.notnull(row), None).to_dict()
                    prop_id = row_dict.get("property_id")
                    legacy_auction_id = row_dict.get("auction_eventId") or row_dict.get("auction_id")
                    if not prop_id or not legacy_auction_id:
                        continue
                    try:
                        batch_params.append({
                            "prop_id": prop_id,
                            "auction_id": int(legacy_auction_id),
                            "created_at": now
                        })
                    except Exception as e:
                        errors.append(f"Row {i + index + 2}: {str(e)}")
                if not batch_params:
                    success_count += len(chunk)
                    continue
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        with engine.begin() as conn:
                            conn.execute(query, batch_params)
                        success_count += len(chunk)
                        if success_count % 2500 == 0 or (i + chunk_size) >= total_rows:
                            logger.info(f"Job {job_id}: Processed {min(i + chunk_size, total_rows)} / {total_rows} history mappings...")
                        break
                    except OperationalError:
                        if attempt == max_retries - 1: raise
                        time.sleep(3)
                    except Exception as ge:
                        errors.append(f"Chunk error: {str(ge)}")
                        break
            status_msg = f"History Linkage Success: {success_count} mappings processed"
            if redis:
                if errors:
                    status_msg = f"Completed with {len(errors)} errors. Success: {success_count}/{total_rows}"
                    redis.set(f"import_errors:{job_id}", str(errors[:200]), ex=3600)
                redis.set(f"import_history_status:{job_id}", status_msg, ex=3600)
        except Exception as e:
            logger.error(f"History Mapping Failed: {e}")
            if redis:
                redis.set(f"import_history_status:{job_id}", f"Critical Error: {str(e)}", ex=3600)

import_service = ImportService()
