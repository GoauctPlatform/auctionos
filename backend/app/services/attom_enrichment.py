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
    Mapeia agressivamente os dados extras da ATTOM para a DB (somente mapeia se estiver na lista missing_fields).
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
    utilities = p_data.get("utilities", {})
    assessment = p_data.get("assessment", {})
    assessed = assessment.get("assessed", {})
    tax = assessment.get("tax", {})
    sale = p_data.get("sale", {})

    update_data = {}

    def set_if_missing(field, value):
        if value is not None and value != "" and field in missing_fields:
            update_data[field] = value

    # Identifiers
    set_if_missing("attom_id", str(identifier.get("attomId")) if identifier.get("attomId") else None)
    set_if_missing("apn_unformatted", identifier.get("apn"))
    set_if_missing("county_fips", identifier.get("fips"))

    # Location
    set_if_missing("latitude", float(location.get("latitude")) if location.get("latitude") else None)
    set_if_missing("longitude", float(location.get("longitude")) if location.get("longitude") else None)

    # Summary
    set_if_missing("property_type_detail", summary.get("propsubtype") or summary.get("propSubType") or summary.get("propclass"))
    set_if_missing("legal_description", summary.get("legal1"))

    # Building details
    # yearbuilt can be in summary or building
    set_if_missing("year_built", summary.get("yearbuilt") or building.get("yearBuilt") or b_summary.get("yearbuilteffective"))
    set_if_missing("bedrooms", b_rooms.get("beds"))
    set_if_missing("bathrooms", b_rooms.get("bathstotal") or b_rooms.get("bathsTotal"))
    set_if_missing("sqft", b_size.get("livingsize") or b_size.get("livingSize") or b_size.get("bldgsize"))
    set_if_missing("building_area_sqft", b_size.get("bldgsize") or b_size.get("bldgSize"))
    set_if_missing("num_stories", b_summary.get("levels"))
    set_if_missing("num_units", b_summary.get("unitscount") or b_summary.get("unitsCount"))
    set_if_missing("structure_style", b_construction.get("condition") or b_summary.get("propclass") or summary.get("propclass"))

    # Lot size
    set_if_missing("lot_acres", lot.get("lotsize1") or lot.get("lotSize1"))
    set_if_missing("lot_sqft", lot.get("lotsize2") or lot.get("lotSize2"))
    set_if_missing("lot_size", lot.get("lotsize2") or lot.get("lotSize2"))
    set_if_missing("zoning", lot.get("zoningtype") or lot.get("zoningType") or lot.get("zoning"))
    # In ATTOM, subdivision is often in area.subdname
    area = p_data.get("area", {})
    set_if_missing("subdivision", area.get("subdname") or lot.get("subdivisionName"))

    # Values (AVM e Assessment)
    set_if_missing("estimated_value", avm.get("amount", {}).get("value"))
    set_if_missing("assessed_value", assessed.get("assdttlvalue") or assessed.get("assdTtlValue") or assessed.get("assessedValue"))
    set_if_missing("land_value", assessed.get("assdlandvalue") or assessed.get("assdLandValue"))
    set_if_missing("improvement_value", assessed.get("assdimprvalue") or assessed.get("assdImprValue"))
    
    set_if_missing("tax_amount", tax.get("taxamt") or tax.get("taxAmt") or tax.get("taxAmount"))
    set_if_missing("tax_year", tax.get("taxyear") or tax.get("taxYear"))

    # Sales info
    from datetime import datetime
    raw_date = sale.get("saleTransDate") or sale.get("saleSearchDate")
    if raw_date and isinstance(raw_date, str) and raw_date.strip() and "last_sale_date" in missing_fields:
        try:
            # Pega o YYYY-MM-DD
            update_data["last_sale_date"] = datetime.strptime(raw_date, "%Y-%m-%d").date()
        except ValueError:
            pass
    set_if_missing("last_sale_price", sale.get("saleAmt"))

    # Owners
    set_if_missing("owner_name", owner.get("owner1", {}).get("fullName"))
    set_if_missing("owner_occupied", owner.get("ownerOccupied"))
    set_if_missing("occupancy", owner.get("ownerOccupied"))

    # Utilities
    set_if_missing("water_type", utilities.get("waterType"))
    set_if_missing("sewer_type", utilities.get("sewerType"))

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
        addr = prop.address or ""
        # Check if address is suspiciously short (like just a state code 'AL')
        if len(addr.strip()) <= 3:
            logger.warning(f"Endereço '{addr}' parece inválido para busca. Abortando enriquecimento por endereço.")
            return {"status": "skipped", "message": "Invalid address for search", "property_id": property_id}
            
        city_state = f"{prop.county or ''} {prop.state or ''}" 
        full_address = f"{addr} {city_state}".strip().lower()
        
        addr_hash = hashlib.md5(full_address.encode('utf-8')).hexdigest()
        cache_key = f"attom:property:addr:{addr_hash}"
        query_params = {
            "address1": prop.address,
            "address2": city_state
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
                redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(attom_data))
                
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
