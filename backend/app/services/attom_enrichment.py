import os
import json
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
        if hasattr(prop, field) and (getattr(prop, field) is None or getattr(prop, field) == ""):
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
    skip_trace_block = {
        "owner1": {
            "full_name": owner1.get("fullName"),
            "first_name": owner1.get("firstName") or owner1.get("firstNameAndMi"),
            "last_name": owner1.get("lastName"),
        },
        "owner2": {
            "full_name": owner2.get("fullName"),
            "first_name": owner2.get("firstName") or owner2.get("firstNameAndMi"),
            "last_name": owner2.get("lastName"),
        } if owner2 else None,
        "corporate_indicator": owner.get("corporateIndicator"),
        "owner_occupied": owner.get("ownerOccupied"),
        "mailing_address": {
            "one_line": mailing_one_line,
            "street": mailing.get("line1") or mailing.get("address1"),
            "city": mailing.get("locality") or mailing.get("city"),
            "state": mailing.get("countrySubd") or mailing.get("state"),
            "zip": mailing.get("postal1") or mailing.get("zip"),
        },
        "last_transfer_date": sale.get("saleTransDate"),
        "last_transfer_amount": sale.get("saleAmt"),
    }
    # Remove fully empty sub-blocks
    if skip_trace_block["owner1"] and not any(skip_trace_block["owner1"].values()):
        skip_trace_block["owner1"] = None
    if skip_trace_block["owner2"] and not any(skip_trace_block["owner2"].values()):
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


def enrich_property(db: Session, property_id: str) -> Dict[str, Any]:
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

    return {
        "status": "success",
        "enriched_fields": update_data if 'update_data' in locals() else {},
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
    Secondary enrichment function that fetches extended ATTOM data:
    - Sales/Transfer History  (/property/saleshistory)
    - Tax & Assessment History  (/property/assessmenthistory)
    - Building Permits  (/property/permit)

    Requires the property to have a valid attom_id (captured during basic enrichment).
    Results stored in JSONB columns: sales_history_json, tax_history_json, permits_json.
    """
    prop = db.query(PropertyDetails).filter(PropertyDetails.property_id == property_id).first()
    if not prop:
        logger.error(f"Property not found for extended enrichment: {property_id}")
        return {"status": "error", "message": "Property not found", "property_id": property_id}

    if not prop.attom_id:
        logger.info(f"Property {property_id} has no attom_id — run basic enrichment first.")
        return {"status": "skipped", "message": "No attom_id. Run basic enrichment first.", "property_id": property_id}

    attom_id = prop.attom_id
    fetched = {}

    # ── 1. Sales History ──────────────────────────────────────────────────────
    sales_cache_key = f"attom:ext:sales:{attom_id}"
    sales_data = None
    if redis_client:
        try:
            cached = redis_client.get(sales_cache_key)
            if cached:
                sales_data = json.loads(cached)
        except Exception:
            pass

    if not sales_data:
        try:
            raw = _fetch_attom_endpoint("property/saleshistory", {"attomId": attom_id})
            sales_list = raw.get("property", [{}])[0].get("salehistory", []) if raw.get("property") else []
            sales_data = [
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
            if redis_client and sales_data:
                try:
                    redis_client.setex(sales_cache_key, CACHE_TTL_SECONDS, json.dumps(sales_data))
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Failed to fetch sales history for {attom_id}: {e}")
            sales_data = []

    if sales_data is not None:
        fetched["sales_history_json"] = sales_data

    # ── 2. Tax / Assessment History ───────────────────────────────────────────
    tax_cache_key = f"attom:ext:taxhistory:{attom_id}"
    tax_data = None
    if redis_client:
        try:
            cached = redis_client.get(tax_cache_key)
            if cached:
                tax_data = json.loads(cached)
        except Exception:
            pass

    if not tax_data:
        try:
            raw = _fetch_attom_endpoint("assessment/history", {"attomId": attom_id})
            tax_list = raw.get("assessmenthistory", []) if raw else []
            tax_data = [
                {
                    "year": t.get("taxYear"),
                    "assessed_value": t.get("assessed", {}).get("assdTtlValue") or t.get("assessedValue"),
                    "land_value": t.get("assessed", {}).get("assdLandValue"),
                    "improvement_value": t.get("assessed", {}).get("assdImprValue"),
                    "tax_amount": t.get("tax", {}).get("taxAmt") or t.get("taxAmount"),
                    "market_value": t.get("market", {}).get("mktTtlValue"),
                }
                for t in tax_list
            ] if tax_list else []
            if redis_client and tax_data:
                try:
                    redis_client.setex(tax_cache_key, CACHE_TTL_SECONDS, json.dumps(tax_data))
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Failed to fetch tax history for {attom_id}: {e}")
            tax_data = []

    if tax_data is not None:
        fetched["tax_history_json"] = tax_data

    # ── 3. Building Permits ───────────────────────────────────────────────────
    permits_cache_key = f"attom:ext:permits:{attom_id}"
    permits_data = None
    if redis_client:
        try:
            cached = redis_client.get(permits_cache_key)
            if cached:
                permits_data = json.loads(cached)
        except Exception:
            pass

    if not permits_data:
        try:
            raw = _fetch_attom_endpoint("permit", {"attomId": attom_id})
            permits_list = raw.get("permit", []) if raw else []
            permits_data = [
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
            if redis_client and permits_data:
                try:
                    redis_client.setex(permits_cache_key, CACHE_TTL_SECONDS, json.dumps(permits_data))
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Failed to fetch permits for {attom_id}: {e}")
            permits_data = []

    if permits_data is not None:
        fetched["permits_json"] = permits_data

    # ── Persist all fetched extended data ─────────────────────────────────────
    if fetched:
        try:
            db.query(PropertyDetails).filter(PropertyDetails.id == prop.id).update(fetched)
            db.commit()
            logger.info(f"Extended enrichment saved for {property_id}: {list(fetched.keys())}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist extended enrichment for {property_id}: {e}")
            return {"status": "error", "message": str(e), "property_id": property_id}

    return {
        "status": "success",
        "property_id": property_id,
        "attom_id": attom_id,
        "extended_data_fetched": {k: len(v) if isinstance(v, list) else "loaded" for k, v in fetched.items()},
    }
