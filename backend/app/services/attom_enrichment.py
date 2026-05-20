import os
import json
import concurrent.futures
import logging
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

import redis
import requests
from sqlalchemy.orm import Session
from sqlalchemy import update
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type, RetryError
from fastapi import HTTPException

# Assuming the model is imported from here based on the standard project structure
from app.models.property import PropertyDetails

# Configuração de Logs
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# Criar um log estruturado básico
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "message": "%(message)s"}'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

from app.core.config import settings

# Constantes ATTOM
ATTOM_API_KEY = settings.ATTOM_API_KEY
ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"

# Configuração Redis
REDIS_URL = settings.REDIS_URL
try:
    if REDIS_URL:
        # Resolve any strange protocols by ensuring safe loading
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    else:
        redis_client = None
except Exception as e:
    logger.warning(f"Não foi possível conectar ao Redis: {e}")
    redis_client = None


CACHE_TTL_SECONDS = 60 * 24 * 60 * 60  # 60 dias


def get_missing_fields(prop: PropertyDetails) -> List[str]:
    """
    Função auxiliar que verifica quais campos importantes estão faltando.
    """
    missing = []
    # Lista estendida visando extrair o MÁXIMO da ATTOM
    potential_fields = [
        "year_built", "latitude", "longitude", "estimated_value",
        "lot_size", "bedrooms", "bathrooms", "owner_name", "owner_occupied",
        "county_fips", "zoning", "legal_description", "lot_sqft", "subdivision",
        "num_stories", "num_units", "structure_style", "building_area_sqft",
        "lot_acres", "assessed_value", "land_value", "improvement_value",
        "tax_amount", "tax_year", "last_sale_date", "last_sale_price",
        "water_type", "sewer_type", "property_type_detail", "attom_id", "apn_unformatted",
        "occupancy"
    ]
    
    for field in potential_fields:
        if hasattr(prop, field):
            val = getattr(prop, field)
            if val is None or val == "":
                missing.append(field)
            elif isinstance(val, (int, float)) and val == 0:
                missing.append(field)
            
    return missing


def map_attom_to_db(attom_data: Dict[str, Any], existing_prop: PropertyDetails, missing_fields: List[str]) -> Dict[str, Any]:
    """
    Maps ATTOM API data to database fields.
    
    Strategy:
    - ALWAYS_UPDATE fields: Financial/valuation fields that should always be overwritten
      with verified ATTOM data, regardless of whether the field is already populated.
      (CSV imports often bring stale or county-approximated values.)
    - set_if_missing: Structural fields only filled in when blank.
    """
    if "property" not in attom_data or not attom_data["property"]:
        return {}

    p_data = attom_data["property"][0]
    
    identifier = p_data.get("identifier", {})
    address = p_data.get("address", {})
    location = p_data.get("location", {})
    summary = p_data.get("summary", {})
    building = p_data.get("building", {})
    b_size = building.get("size", {})
    b_rooms = building.get("rooms", {})
    b_interior = building.get("interior", {})
    b_construction = building.get("construction", {})
    b_summary = building.get("summary", {})
    lot = p_data.get("lot", {})
    avm = p_data.get("avm", {})
    owner = p_data.get("owner", {})
    owner1 = owner.get("owner1", {})
    owner2 = owner.get("owner2", {})
    utilities = p_data.get("utilities", {})
    assessment = p_data.get("assessment", {})
    assessed = assessment.get("assessed", {})
    tax = assessment.get("tax", {})
    sale = p_data.get("sale", {})
    area = p_data.get("area", {})

    update_data = {}

    # ── Helper: only fill if field is blank in the DB ──────────────────────────
    def set_if_missing(field, value):
        if value is not None and value != "" and field in missing_fields:
            update_data[field] = value

    # ── Helper: ALWAYS overwrite with verified ATTOM data ──────────────────────
    # Used for financial/valuation fields where CSV imports are often stale.
    def always_update(field, value):
        if value is not None and value != "":
            update_data[field] = value

    # ── Identifiers (fill-only) ────────────────────────────────────────────────
    set_if_missing("attom_id", str(identifier.get("attomId")) if identifier.get("attomId") else None)
    set_if_missing("apn_unformatted", identifier.get("apn"))
    set_if_missing("county_fips", identifier.get("fips"))

    # ── Location (fill-only) ──────────────────────────────────────────────────
    set_if_missing("latitude", float(location.get("latitude")) if location.get("latitude") else None)
    set_if_missing("longitude", float(location.get("longitude")) if location.get("longitude") else None)

    # ── Property Summary (fill-only) ──────────────────────────────────────────
    set_if_missing("property_type_detail", summary.get("propsubtype") or summary.get("propSubType") or summary.get("propclass"))
    set_if_missing("legal_description", summary.get("legal1"))

    # ── Building (fill-only) ──────────────────────────────────────────────────
    set_if_missing("year_built", summary.get("yearbuilt") or building.get("yearBuilt") or b_summary.get("yearbuilteffective"))
    set_if_missing("bedrooms", b_rooms.get("beds"))
    set_if_missing("bathrooms", b_rooms.get("bathstotal") or b_rooms.get("bathsTotal"))
    set_if_missing("sqft", b_size.get("livingsize") or b_size.get("livingSize") or b_size.get("bldgsize"))
    set_if_missing("building_area_sqft", b_size.get("bldgsize") or b_size.get("bldgSize"))
    set_if_missing("num_stories", b_summary.get("levels"))
    set_if_missing("num_units", b_summary.get("unitscount") or b_summary.get("unitsCount"))
    set_if_missing("structure_style", b_construction.get("condition") or b_summary.get("propclass") or summary.get("propclass"))

    # ── Lot (fill-only) ──────────────────────────────────────────────────────
    set_if_missing("lot_acres", lot.get("lotsize1") or lot.get("lotSize1"))
    set_if_missing("lot_sqft", lot.get("lotsize2") or lot.get("lotSize2"))
    set_if_missing("lot_size", lot.get("lotsize2") or lot.get("lotSize2"))
    set_if_missing("zoning", lot.get("zoningtype") or lot.get("zoningType") or lot.get("zoning"))
    set_if_missing("subdivision", area.get("subdname") or lot.get("subdivisionName"))

    # ── Utilities (fill-only) ────────────────────────────────────────────────
    set_if_missing("water_type", utilities.get("waterType"))
    set_if_missing("sewer_type", utilities.get("sewerType"))

    # ── FINANCIAL / VALUATION — ALWAYS overwrite with verified registry data ──
    # These come from public county records and are authoritative.
    # CSV imports often carry stale assessor snapshots from the list publication date.
    avm_value = avm.get("amount", {}).get("value")
    always_update("estimated_value", avm_value)

    assessed_val = assessed.get("assdttlvalue") or assessed.get("assdTtlValue") or assessed.get("assessedValue")
    always_update("assessed_value", assessed_val)

    land_val = assessed.get("assdlandvalue") or assessed.get("assdLandValue")
    always_update("land_value", land_val)

    improvement_val = assessed.get("assdimprvalue") or assessed.get("assdImprValue")
    always_update("improvement_value", improvement_val)

    tax_amt = tax.get("taxamt") or tax.get("taxAmt") or tax.get("taxAmount")
    always_update("tax_amount", tax_amt)

    tax_yr = tax.get("taxyear") or tax.get("taxYear")
    always_update("tax_year", tax_yr)

    homestead = assessment.get("homestead") or tax.get("taxExemptionHomesteadInd") or assessment.get("homesteadExemption")
    if homestead is not None:
        # Normalize to boolean
        if isinstance(homestead, str):
            update_data["homestead_exemption"] = homestead.lower() in ("y", "yes", "true", "1")
        else:
            update_data["homestead_exemption"] = bool(homestead)

    # ── Last Sale — ALWAYS overwrite with registry date ───────────────────────
    from datetime import datetime
    raw_date = sale.get("saleTransDate") or sale.get("saleSearchDate")
    if raw_date and isinstance(raw_date, str) and raw_date.strip():
        try:
            update_data["last_sale_date"] = datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    sale_price = sale.get("saleAmt")
    always_update("last_sale_price", sale_price)

    # ── Owner Name (fill-only — primary owner1) ───────────────────────────────
    set_if_missing("owner_name", owner1.get("fullName"))
    set_if_missing("owner_occupied", owner.get("ownerOccupied"))
    set_if_missing("occupancy", owner.get("ownerOccupied"))

    # ── TRUE Mailing Address — ALWAYS overwrite ───────────────────────────────
    # ATTOM provides mailingAddress in the owner block: use oneLine or compose from parts.
    # This is the actual correspondence address, NOT the owner name.
    mailing = owner.get("mailingAddress", {})
    mailing_one_line = mailing.get("oneLine") or mailing.get("oneLineAddress")
    if not mailing_one_line:
        # Compose from components if available
        m_parts = [
            mailing.get("line1") or mailing.get("address1") or "",
            mailing.get("line2") or mailing.get("address2") or "",
            mailing.get("locality") or mailing.get("city") or "",
            mailing.get("countrySubd") or mailing.get("state") or "",
            mailing.get("postal1") or mailing.get("zip") or "",
        ]
        composed = " ".join(p.strip() for p in m_parts if p.strip())
        mailing_one_line = composed if composed.strip() else None

    if mailing_one_line and mailing_one_line.strip():
        update_data["owner_address"] = mailing_one_line.strip()

    # ── Skip Tracing JSONB Block — ALWAYS rebuild ────────────────────────────
    # Contains structured data useful for locating the owner (co-owners, corporate flag, etc.)
    # Also captures absentee status, legal description, and area details from the basic API.
    skip_trace_block = {
        # Owner identification (from owner block — not always present in basic API)
        "owner1": {
            "full_name": owner1.get("fullName"),
            "first_name": owner1.get("firstName") or owner1.get("firstNameAndMi"),
            "last_name": owner1.get("lastName"),
        } if (owner1.get("fullName") or owner1.get("firstName") or owner1.get("lastName")) else None,
        "owner2": {
            "full_name": owner2.get("fullName"),
            "first_name": owner2.get("firstName") or owner2.get("firstNameAndMi"),
            "last_name": owner2.get("lastName"),
        } if owner2 and (owner2.get("fullName") or owner2.get("firstName")) else None,
        "corporate_indicator": owner.get("corporateIndicator"),
        "owner_occupied": owner.get("ownerOccupied"),
        # Mailing address (from owner.mailingAddress — not always present in basic API)
        "mailing_address": {
            "one_line": mailing_one_line,
            "street": mailing.get("line1") or mailing.get("address1"),
            "city": mailing.get("locality") or mailing.get("city"),
            "state": mailing.get("countrySubd") or mailing.get("state"),
            "zip": mailing.get("postal1") or mailing.get("zip"),
        },
        # Skip tracing intelligence — from summary block (ALWAYS present in basic API)
        "absentee_indicator": summary.get("absenteeInd"),
        "property_class": summary.get("propclass"),
        "property_subtype": summary.get("propsubtype"),
        "property_type": summary.get("propertyType") or summary.get("proptype"),
        # Area / location data — ALWAYS present in basic API
        "municipality": area.get("munname"),
        "municipality_code": area.get("muncode"),
        "county_name": area.get("countrysecsubd"),
        "subdivision": area.get("subdname"),
        "tax_code_area": area.get("taxcodearea"),
        "county_land_use_code": area.get("countyuse1"),
        # Last transfer data (from sale block — not always present)
        "last_transfer_date": sale.get("saleTransDate"),
        "last_transfer_amount": sale.get("saleAmt"),
    }
    # Remove fully empty sub-blocks
    if skip_trace_block["owner1"] and not any(skip_trace_block["owner1"].values()):
        skip_trace_block["owner1"] = None
    if skip_trace_block["owner2"] and not any((skip_trace_block["owner2"] or {}).values()):
        skip_trace_block["owner2"] = None
    update_data["extended_owner_json"] = skip_trace_block


    return {k: v for k, v in update_data.items() if v is not None}


class CircuitBreakerException(Exception):
    pass


@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((requests.exceptions.RequestException, CircuitBreakerException))
)
def fetch_attom_data_sync(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Busca os dados na API da ATTOM sincronamente.
    Inclui lógica de Retry e um simples Circuit Breaker (lança CircuitBreakerException se falhar com 429).
    """
    if not ATTOM_API_KEY:
        raise ValueError("ATTOM_API_KEY não está configurada no ambiente.")

    headers = {
        "Accept": "application/json",
        "apikey": ATTOM_API_KEY
    }

    url = f"{ATTOM_BASE_URL}/property/detail"
    
    logger.info(f"Chamando ATTOM API com parametros: {params}")
    response = requests.get(url, headers=headers, params=params, timeout=10)

    if response.status_code == 429:
        logger.warning("ATTOM API Rate Limit Exceeded (429).")
        raise CircuitBreakerException("Rate limit exceeded")
        
    if response.status_code in (400, 404):
        logger.info(f"ATTOM API returned {response.status_code} (Not Found / Bad Request). params: {params}, response: {response.text}")
        return {}
    
    response.raise_for_status()
    
    return response.json()

# async def fetch_attom_data_async(params: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Versão assimétrica para futura migração (usando httpx).
#     """
#     import httpx
#     if not ATTOM_API_KEY:
#         raise ValueError("ATTOM_API_KEY não configurada")
#     
#     headers = {
#         "Accept": "application/json",
#         "apikey": ATTOM_API_KEY
#     }
#     
#     url = f"{ATTOM_BASE_URL}/property/detail"
#     async with httpx.AsyncClient() as client:
#         response = await client.get(url, headers=headers, params=params)
#         
#         if response.status_code == 429:
#             raise CircuitBreakerException("Rate limit exceeded")
#         
#         response.raise_for_status()
#         return response.json()


def enrich_property(db: Session, property_id: str, background_tasks: Optional[Any] = None) -> Dict[str, Any]:
    """
    Função principal que enriquece os dados da propriedade listada on-demand.
    Totalmente sincrona para compatibilidade atual, mas num contexto FastAPI pode ser
    envolta ou trocada para async.
    """
    
    # 1. Recupera propriedade no BD
    prop = db.query(PropertyDetails).filter(PropertyDetails.property_id == property_id).first()
    if not prop:
        logger.error(f"Propriedade não encontrada. ID: {property_id}")
        raise HTTPException(status_code=404, detail="Property not found")

    # 2. Verifica campos faltantes
    missing_fields = get_missing_fields(prop)
    if not missing_fields:
        logger.info(f"Property {property_id} já está completa. Nenhum enriquecimento necessário.")
        return {"status": "skipped", "message": "No missing fields", "property_id": property_id}

    # Auto-resolve FIPS code if missing on-the-fly
    if not getattr(prop, 'county_fips', None):
        try:
            from app.utils.fips_resolver import resolve_county_fips
            resolved_fips = resolve_county_fips(prop.state, prop.county)
            if resolved_fips:
                prop.county_fips = resolved_fips
                db.add(prop)
                db.commit()
                db.refresh(prop)
                logger.info(f"FIPS resolved and saved on-the-fly: {resolved_fips} for {prop.county}, {prop.state}")
        except Exception as e:
            logger.error(f"Error resolving FIPS on-the-fly: {e}")

    # 3. Monta a chave de Cache e parâmetros de busca
    # PRIORIDADE: 1. attomId, 2. APN (Parcel ID) + County, 3. Address
    query_params = {}
    cache_key = ""

    if prop.attom_id:
        cache_key = f"attom:property:{prop.attom_id}"
        query_params = {"attomId": prop.attom_id}
    elif prop.parcel_id and getattr(prop, 'county_fips', None):
        # Search by APN (parcel_id) which is much more precise, but ATTOM requires FIPS
        cache_key = f"attom:property:apn:{prop.parcel_id}:{prop.county_fips}"
        query_params = {
            "apn": prop.parcel_id,
            "fips": prop.county_fips
        }
    else:
        # Fallback to address search
        import re
        addr = prop.address or ""
        # Check if address is suspiciously short (like just a state code 'AL')
        if len(addr.strip()) <= 3:
            logger.warning(f"Endereço '{addr}' parece inválido para busca. Abortando enriquecimento por endereço.")
            return {"status": "skipped", "message": "Invalid address for search", "property_id": property_id}
            
        # Parse the address to extract state and zip from the end, leaving Street + City in address1
        match = re.search(r'^(.*?)\s+([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$', addr.strip())
        if match:
            addr1 = match.group(1).strip()
            state_code = match.group(2).upper()
            zip_code = match.group(3) or ""
            addr2 = f"{state_code} {zip_code}".strip()
        else:
            addr1 = addr
            addr2 = f"{prop.county or ''} {prop.state or ''}".strip()
            
        full_address = f"{addr1} {addr2}".strip().lower()
        addr_hash = hashlib.md5(full_address.encode('utf-8')).hexdigest()
        cache_key = f"attom:property:addr:{addr_hash}"
        query_params = {
            "address1": addr1,
            "address2": addr2
        }
    
    attom_data = None
    
    # 4. Verifica Redis (Cache Hit)
    if redis_client:
        try:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit para chave: {cache_key}")
                attom_data = json.loads(cached_result)
        except Exception as e:
            logger.error(f"Erro ao ler do Redis: {e}")

    # 5. Se não tem no cache, busca na ATTOM API
    if not attom_data:
        logger.info(f"Cache miss para {cache_key}. Buscando na ATTOM.")
        try:
            attom_data = fetch_attom_data_sync(query_params)
            
            # Salva no Redis
            if redis_client and attom_data:
                try:
                    redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(attom_data))
                except Exception as e:
                    logger.error(f"Erro ao gravar no Redis: {e}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"ATTOM API erro de requisição: {e}")
            return {"status": "error", "message": "ATTOM API request failed", "error": str(e)}
        except CircuitBreakerException:
            logger.error("ATTOM API erro: Rate Limit Excedido (429).")
            return {"status": "error", "message": "ATTOM API rate limit exceeded"}
        except RetryError as e:
            logger.error(f"ATTOM API erro: Falha após múltiplas tentativas: {e}")
            return {"status": "error", "message": "ATTOM API retry failed after multiple attempts"}
        except Exception as e:
            logger.error(f"Erro inesperado durante enriquecimento: {e}")
            return {"status": "error", "message": "Unexpected error during enrichment", "error": str(e)}

    # Fallback to Address Search if APN search returned empty/no results
    if not attom_data and "apn" in query_params and prop.address:
        logger.info(f"APN Search returned empty for APN '{prop.parcel_id}' in county '{prop.county_fips}'. Trying Address Search fallback for '{prop.address}'...")
        try:
            import re
            addr = prop.address.strip()
            if len(addr) > 3:
                match = re.search(r'^(.*?)\s+([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$', addr)
                if match:
                    addr1 = match.group(1).strip()
                    state_code = match.group(2).upper()
                    zip_code = match.group(3) or ""
                    addr2 = f"{state_code} {zip_code}".strip()
                else:
                    addr1 = addr
                    addr2 = f"{prop.county or ''} {prop.state or ''}".strip()
                
                fallback_params = {
                    "address1": addr1,
                    "address2": addr2
                }
                
                # Check cache first for this fallback address query
                fallback_cache_key = None
                if redis_client:
                    full_address = f"{addr1} {addr2}".strip().lower()
                    addr_hash = hashlib.md5(full_address.encode('utf-8')).hexdigest()
                    fallback_cache_key = f"attom:property:addr:{addr_hash}"
                    try:
                        cached_fallback = redis_client.get(fallback_cache_key)
                        if cached_fallback:
                            logger.info(f"Cache hit for fallback address: {fallback_cache_key}")
                            attom_data = json.loads(cached_fallback)
                    except Exception as e:
                        logger.error(f"Erro ao ler do Redis para fallback: {e}")
                
                if not attom_data:
                    logger.info(f"Cache miss for fallback. Querying ATTOM with: {fallback_params}")
                    attom_data = fetch_attom_data_sync(fallback_params)
                    
                    if redis_client and attom_data:
                        try:
                            # Save to both address cache and APN cache to avoid redundant API queries
                            redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(attom_data))
                            if fallback_cache_key:
                                redis_client.setex(fallback_cache_key, CACHE_TTL_SECONDS, json.dumps(attom_data))
                        except Exception as e:
                            logger.error(f"Erro ao gravar no Redis para fallback: {e}")
        except Exception as e:
            logger.error(f"Error during Address Search fallback: {e}")

    # 6. Mapeamento dos dados retornados e UPSERT
    if attom_data:
        update_data = map_attom_to_db(attom_data, prop, missing_fields)
        
        if update_data:
            logger.info(f"Atualizando BD para propriedade {property_id} com {len(update_data)} campos.")
            # Atualiza apenas os campos necessários
            db.query(PropertyDetails).filter(PropertyDetails.id == prop.id).update(update_data)
            db.commit()
            
            # Atualiza o objeto da sessão com os novos dados
            db.refresh(prop)
        else:
            logger.info("ATTOM não retornou dados relevantes adicionais.")

    # Automatically trigger extended enrichment if attom_id is resolved or available
    if prop.attom_id:
        if background_tasks is not None:
            try:
                logger.info(f"Scheduling automatic extended enrichment for property {property_id} with attom_id {prop.attom_id} in background...")
                background_tasks.add_task(enrich_property_extended, db, property_id)
            except Exception as ext_err:
                logger.error(f"Error scheduling automatic extended enrichment: {ext_err}")
        else:
            try:
                logger.info(f"Triggering automatic extended enrichment for property {property_id} with attom_id {prop.attom_id} synchronously...")
                enrich_property_extended(db, property_id)
                db.refresh(prop)
            except Exception as ext_err:
                logger.error(f"Error during automatic extended enrichment: {ext_err}")

    # Mark as processed to prevent future API calls on subsequent accesses
    try:
        prop.is_processed = True
        db.add(prop)
        db.commit()
        db.refresh(prop)
    except Exception as process_err:
        logger.error(f"Error marking property as processed: {process_err}")

    # Serialize all columns from PropertyDetails database model, converting dates/datetimes to ISO strings
    from datetime import date
    refreshed_fields = {}
    for column in prop.__table__.columns:
        val = getattr(prop, column.name)
        if isinstance(val, (date, datetime)):
            refreshed_fields[column.name] = val.isoformat()
        else:
            refreshed_fields[column.name] = val

    return {
        "status": "success",
        "enriched_fields": refreshed_fields,
        "missing_fields_before": missing_fields,
        "property_id": property_id
    }


def _fetch_attom_endpoint(endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generic helper to call any ATTOM endpoint (non-/property/detail ones).
    Uses simple requests with no retry since these are supplementary.
    """
    if not ATTOM_API_KEY:
        raise ValueError("ATTOM_API_KEY not configured.")
    headers = {"Accept": "application/json", "apikey": ATTOM_API_KEY}
    url = f"{ATTOM_BASE_URL}/{endpoint}"
    logger.info(f"Calling ATTOM extended endpoint: {url} params={params}")
    response = requests.get(url, headers=headers, params=params, timeout=15)
    if response.status_code == 429:
        logger.warning(f"ATTOM rate limit hit for {endpoint}")
        return {}
    if response.status_code in (400, 404):
        logger.info(f"ATTOM {endpoint} returned {response.status_code}: {response.text[:200]}")
        return {}
    response.raise_for_status()
    return response.json()


def enrich_property_extended(db: Session, property_id: str) -> Dict[str, Any]:
    """
    Secondary enrichment — fetches verified financial + ownership data from
    dedicated ATTOM endpoints that are not available in the basic /property/detail call.

    Endpoints called (in order):
      1. /property/detailowner  → real mailing address, co-owners, corporate flag
      2. /avm/detail            → AVM estimated value with confidence range
      3. /assessment/detail     → assessed value, market value, land, improvement, tax
      4. /sale/detail           → last sale price/date
      5. /property/saleshistory → full transfer history list  (→ sales_history_json)
      6. /assessment/history    → multi-year tax history      (→ tax_history_json)
      7. /permit                → building permits            (→ permits_json)

    Requires the property to have an attom_id (from basic enrichment).
    """
    prop = db.query(PropertyDetails).filter(PropertyDetails.property_id == property_id).first()
    if not prop:
        logger.error(f"Property not found for extended enrichment: {property_id}")
        return {"status": "error", "message": "Property not found", "property_id": property_id}

    if not prop.attom_id:
        logger.info(f"Property {property_id} has no attom_id — run basic enrichment first.")
        return {"status": "skipped", "message": "No attom_id. Run basic enrichment first.", "property_id": property_id}

    attom_id = prop.attom_id
    core_updates: Dict[str, Any] = {}   # Written directly to property_details scalar columns
    jsonb_updates: Dict[str, Any] = {}  # Written to JSONB columns
    from datetime import datetime as _dt

    def _cache_get(key: str):
        if redis_client:
            try:
                v = redis_client.get(key)
                if v:
                    return json.loads(v)
            except Exception:
                pass
        return None

    def _cache_set(key: str, value: Any):
        if redis_client and value:
            try:
                redis_client.setex(key, CACHE_TTL_SECONDS, json.dumps(value, default=str))
            except Exception:
                pass

    # ── Synchronous Cache Check & Parallel Fetching ───────────────────────────
    owner_cache_key = f"attom:ext:owner:{attom_id}"
    avm_cache_key = f"attom:ext:avm:{attom_id}"
    assess_cache_key = f"attom:ext:assess:{attom_id}"
    sale_cache_key = f"attom:ext:sale:{attom_id}"
    sales_cache_key = f"attom:ext:sales:{attom_id}"
    tax_cache_key = f"attom:ext:taxhistory:{attom_id}"
    permits_cache_key = f"attom:ext:permits:{attom_id}"

    # Get from cache
    owner_raw = _cache_get(owner_cache_key)
    avm_raw = _cache_get(avm_cache_key)
    assess_raw = _cache_get(assess_cache_key)
    sale_raw = _cache_get(sale_cache_key)
    sales_data = _cache_get(sales_cache_key)
    tax_data = _cache_get(tax_cache_key)
    permits_data = _cache_get(permits_cache_key)

    jobs = []
    if owner_raw is None:
        jobs.append(("owner", "property/detailowner", lambda resp: resp["property"][0].get("owner", {}) if resp.get("property") else {}, owner_cache_key))
    if avm_raw is None:
        jobs.append(("avm", "avm/detail", lambda resp: resp["property"][0].get("avm", {}) if resp.get("property") else {}, avm_cache_key))
    if assess_raw is None:
        jobs.append(("assess", "assessment/detail", lambda resp: resp["property"][0].get("assessment", {}) if resp.get("property") else {}, assess_cache_key))
    if sale_raw is None:
        jobs.append(("sale", "sale/detail", lambda resp: resp["property"][0].get("sale", {}) if resp.get("property") else {}, sale_cache_key))
    if sales_data is None:
        def parse_sales(resp):
            sales_list = resp.get("property", [{}])[0].get("salehistory", []) if resp.get("property") else []
            return [
                {
                    "sale_date": s.get("saleTransDate"),
                    "sale_amount": s.get("saleAmt"),
                    "buyer_name": s.get("buyerName") or s.get("buyer1FullName"),
                    "seller_name": s.get("sellerName") or s.get("seller1FullName"),
                    "deed_type": s.get("deedType"),
                    "recording_date": s.get("recordingDate"),
                    "document_number": s.get("documentNumber"),
                }
                for s in sales_list
            ] if sales_list else []
        jobs.append(("sales", "property/saleshistory", parse_sales, sales_cache_key))
    if tax_data is None:
        def parse_tax(resp):
            tax_list = resp.get("assessmenthistory", []) if resp else []
            return [
                {
                    "year": t.get("taxYear"),
                    "assessed_value": (t.get("assessed") or {}).get("assdTtlValue"),
                    "land_value": (t.get("assessed") or {}).get("assdLandValue"),
                    "improvement_value": (t.get("assessed") or {}).get("assdImprValue"),
                    "tax_amount": (t.get("tax") or {}).get("taxAmt"),
                    "market_value": (t.get("market") or {}).get("mktTtlValue"),
                }
                for t in tax_list
            ] if tax_list else []
        jobs.append(("tax", "assessment/history", parse_tax, tax_cache_key))
    if permits_data is None:
        def parse_permits(resp):
            permits_list = resp.get("permit", []) if resp else []
            return [
                {
                    "permit_date": p.get("effectiveDate") or p.get("issuedDate"),
                    "status": p.get("status"),
                    "description": p.get("description") or p.get("jobDescription"),
                    "type": p.get("type"),
                    "estimated_cost": p.get("estimatedCost") or p.get("jobCost"),
                    "contractor": p.get("contractorCompanyName") or p.get("contractor"),
                    "permit_number": p.get("number") or p.get("permitNumber"),
                }
                for p in permits_list
            ] if permits_list else []
        jobs.append(("permits", "permit", parse_permits, permits_cache_key))

    if jobs:
        def run_job(job):
            name, endpoint, parser, cache_key = job
            try:
                resp = _fetch_attom_endpoint(endpoint, {"attomId": attom_id})
                parsed_val = parser(resp)
                if parsed_val:
                    _cache_set(cache_key, parsed_val)
                return name, parsed_val
            except Exception as e:
                logger.error(f"Failed to fetch {endpoint} for {attom_id}: {e}")
                return name, {} if name in ("owner", "avm", "assess", "sale") else []

        max_workers = min(len(jobs), 7)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = list(executor.map(run_job, jobs))
            
        for name, value in results:
            if name == "owner":
                owner_raw = value
            elif name == "avm":
                avm_raw = value
            elif name == "assess":
                assess_raw = value
            elif name == "sale":
                sale_raw = value
            elif name == "sales":
                sales_data = value
            elif name == "tax":
                tax_data = value
            elif name == "permits":
                permits_data = value

    # ── Post-Processing & Normalization ───────────────────────────────────────

    # 1. Owner Details
    if owner_raw:
        mailing_line = (
            owner_raw.get("mailingaddressoneline")
            or owner_raw.get("mailingAddress1")
            or owner_raw.get("mailingAddressOneLine")
        )
        if mailing_line:
            core_updates["owner_address"] = mailing_line.strip()

        o1 = owner_raw.get("owner1") or {}
        owner_name = o1.get("fullname") or o1.get("fullName")
        if owner_name and not prop.owner_name:
            core_updates["owner_name"] = owner_name

        absentee_raw = owner_raw.get("absenteeownerstatus")

        existing_ej = prop.extended_owner_json or {}
        extended_owner = {
            **existing_ej,
            "owner1": {
                "full_name": o1.get("fullname") or o1.get("fullName"),
                "last_name": o1.get("lastname") or o1.get("lastName"),
                "first_name": o1.get("firstname") or o1.get("firstName") or o1.get("firstnameandmi"),
            },
            "owner2": {
                "full_name": (owner_raw.get("owner2") or {}).get("fullname"),
                "last_name": (owner_raw.get("owner2") or {}).get("lastname"),
                "first_name": (owner_raw.get("owner2") or {}).get("firstname"),
            } if (owner_raw.get("owner2") or {}).get("fullname") else existing_ej.get("owner2"),
            "owner3": (owner_raw.get("owner3") or {}).get("fullname"),
            "owner4": (owner_raw.get("owner4") or {}).get("fullname"),
            "corporate_indicator": owner_raw.get("corporateindicator") or owner_raw.get("corporateIndicator"),
            "absentee_owner_status": absentee_raw,
            "absentee_indicator": (
                "ABSENTEE" if absentee_raw == "A"
                else "OWNER OCCUPIED" if absentee_raw == "O"
                else existing_ej.get("absentee_indicator")
            ),
            "mailing_address": {
                "one_line": mailing_line,
            },
        }
        if extended_owner["owner1"] and not any(extended_owner["owner1"].values()):
            extended_owner["owner1"] = None
        if extended_owner.get("owner2") and not any((extended_owner["owner2"] or {}).values()):
            extended_owner["owner2"] = None

        core_updates["extended_owner_json"] = extended_owner
        jsonb_updates["extended_owner_json"] = extended_owner

    # 2. AVM
    if avm_raw:
        avm_amount = avm_raw.get("amount", {})
        avm_value = avm_amount.get("value")
        avm_change = avm_raw.get("AVMChange", {})
        avm_calcs = avm_raw.get("calculations", {})

        if avm_value:
            core_updates["estimated_value"] = avm_value

        avm_block = {
            "value": avm_value,
            "high": avm_amount.get("high"),
            "low": avm_amount.get("low"),
            "confidence_score": avm_amount.get("scr"),
            "value_range": avm_amount.get("valueRange"),
            "price_per_sqft": avm_calcs.get("perSizeUnit"),
            "range_pct_of_value": avm_calcs.get("rangePctOfValue"),
            "last_month_value": avm_change.get("avmlastmonthvalue"),
            "change_amount": avm_change.get("avmamountchange"),
            "change_pct": avm_change.get("avmpercentchange"),
            "event_date": avm_raw.get("eventDate"),
            "condition_ranges": avm_raw.get("condition", {}),
        }
        ej = core_updates.get("extended_owner_json", prop.extended_owner_json or {})
        ej["avm_snapshot"] = avm_block
        core_updates["extended_owner_json"] = ej

    # 3. Assessment Detail
    if assess_raw:
        assessed_block = assess_raw.get("assessed", {})
        market_block = assess_raw.get("market", {})
        tax_block = assess_raw.get("tax", {})
        calcs_block = assess_raw.get("calculations", {})

        if assessed_block.get("assdttlvalue"):
            core_updates["assessed_value"] = assessed_block["assdttlvalue"]
        if market_block.get("mktlandvalue"):
            core_updates["land_value"] = market_block["mktlandvalue"]
        if market_block.get("mktimprvalue"):
            core_updates["improvement_value"] = market_block["mktimprvalue"]
        if tax_block.get("taxamt"):
            core_updates["tax_amount"] = tax_block["taxamt"]
        if tax_block.get("taxyear"):
            core_updates["tax_year"] = tax_block["taxyear"]

        if not core_updates.get("estimated_value") and calcs_block.get("calcttlvalue"):
            core_updates["estimated_value"] = calcs_block["calcttlvalue"]

    # 4. Sale Detail
    if sale_raw:
        sale_amount = sale_raw.get("amount", {})
        sale_price = sale_amount.get("saleamt") or sale_amount.get("saleAmt")
        sale_date_raw = sale_raw.get("salesearchdate") or sale_raw.get("saleTransDate") or sale_amount.get("saledisclosuretype")

        if sale_price and isinstance(sale_price, (int, float)) and sale_price > 0:
            core_updates["last_sale_price"] = sale_price

        if isinstance(sale_date_raw, str) and len(sale_date_raw) >= 10:
            try:
                core_updates["last_sale_date"] = _dt.strptime(sale_date_raw[:10], "%Y-%m-%d").date()
            except ValueError:
                pass

    # 5. Sales History
    jsonb_updates["sales_history_json"] = sales_data or []

    # 6. Assessment History
    jsonb_updates["tax_history_json"] = tax_data or []

    # 7. Building Permits
    jsonb_updates["permits_json"] = permits_data or []

    # ── Persist: merge all updates into one DB write ──────────────────────────
    all_updates = {**core_updates, **jsonb_updates}
    # core_updates already has extended_owner_json; jsonb_updates may overwrite — merge carefully
    if "extended_owner_json" in jsonb_updates:
        del jsonb_updates["extended_owner_json"]  # already in core_updates

    all_updates = {k: v for k, v in {**core_updates, **jsonb_updates}.items() if v is not None}

    if all_updates:
        try:
            db.query(PropertyDetails).filter(PropertyDetails.id == prop.id).update(all_updates)
            db.commit()
            logger.info(
                f"Extended enrichment persisted for {property_id}: "
                f"{[k for k in all_updates if k not in ('extended_owner_json',)]} "
                f"+ extended_owner_json"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist extended enrichment for {property_id}: {e}")
            return {"status": "error", "message": str(e), "property_id": property_id}

    return {
        "status": "success",
        "property_id": property_id,
        "attom_id": attom_id,
        "fields_updated": list(all_updates.keys()),
        "avm_value": core_updates.get("estimated_value"),
        "assessed_value": core_updates.get("assessed_value"),
        "tax_amount": core_updates.get("tax_amount"),
        "mailing_address": core_updates.get("owner_address"),
    }

