import os
import sys
import subprocess
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found.")
    sys.exit(1)

# Files
AUCTIONS_CSV = os.path.abspath("backend/data/postgres_auction_events.csv")
PROPERTIES_CSV = os.path.abspath("backend/data/postgres_property_details.csv")
HISTORY_CSV = os.path.abspath("backend/data/postgres_property_auction_history.csv")

def run_psql_command(command):
    cmd = ["psql", DATABASE_URL, "-c", command]
    subprocess.run(cmd, check=True)

def run_bulk_import():
    print("--- INICIANDO IMPORTAÇÃO BULK (CABO DE GUERRA CORRIGIDO) ---")
    
    # 0. CLEAN START
    print("Limpando tabelas para recarga fresca...")
    run_psql_command("TRUNCATE TABLE auction_events, property_details, property_auction_history, client_list_property, client_notes, client_attachments, property_deeds, property_boundary RESTART IDENTITY CASCADE;")
    
    # 1. IMPORT AUCTIONS
    # CSV: id,name,short_name,auction_date,time,location,county,county_code,state,tax_status,parcels_count,notes,search_link,register_date,register_link,list_link,purchase_info_link,created_at,updated_at
    # DB Mapping: id, name, short_name, auction_date, time, location, county, county_code, state, tax_status, parcels_count, notes, search_link, register_date, register_link, list_link, purchase_info_link, created_at, updated_at
    print("Pre-processando auction_events (Garantindo tax_status canônico)...")
    import pandas as pd
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from app.utils.auction_classifier import infer_canonical_tax_status
        df_auc = pd.read_csv(AUCTIONS_CSV, dtype=str)
        df_auc['tax_status'] = df_auc.apply(
            lambda r: infer_canonical_tax_status(
                tax_status=r.get('tax_status'),
                name=r.get('name'),
                short_name=r.get('short_name'),
                notes=r.get('notes')
            ),
            axis=1
        )
        CLEANED_AUCTIONS_CSV = AUCTIONS_CSV.replace(".csv", "_cleaned.csv")
        df_auc.to_csv(CLEANED_AUCTIONS_CSV, index=False)
        TARGET_AUCTIONS_CSV = CLEANED_AUCTIONS_CSV
        print(f"Leilões padronizados salvos em {CLEANED_AUCTIONS_CSV}")
    except Exception as e:
        print(f"Aviso ao padronizar tax_status: {e}")
        TARGET_AUCTIONS_CSV = AUCTIONS_CSV

    print("Importando auction_events...")
    auc_copy = f"\\copy auction_events(id, name, short_name, auction_date, time, location, county, county_code, state, tax_status, parcels_count, notes, search_link, register_date, register_link, list_link, purchase_info_link, created_at, updated_at) FROM '{TARGET_AUCTIONS_CSV}' WITH (FORMAT csv, HEADER true, QUOTE '\"', DELIMITER ',');"
    subprocess.run(["psql", DATABASE_URL, "-c", auc_copy], check=True)

    # 2. IMPORT PROPERTIES
    # CSV: property_id,parcel_id,address,county,state,lot_acres,property_type,amount_due,assessed_value,tax_year,owner_address,status,availability_status,property_category,is_processed
    print("Pre-processando property_details (Removendo duplicatas de parcel_id)...")
    import pandas as pd
    try:
        df_prop = pd.read_csv(PROPERTIES_CSV, dtype=str)
        # Manter apenas a primeira ocorrência de cada parcel_id
        df_prop = df_prop.drop_duplicates(subset=['parcel_id'], keep='first')
        CLEANED_PROPERTIES_CSV = PROPERTIES_CSV.replace(".csv", "_cleaned.csv")
        df_prop.to_csv(CLEANED_PROPERTIES_CSV, index=False)
        print(f"Propriedades limpas salvas em {CLEANED_PROPERTIES_CSV}")
    except Exception as e:
        print(f"Erro ao limpar CSV: {e}")
        CLEANED_PROPERTIES_CSV = PROPERTIES_CSV

    print("Importando property_details...")
    # Remapear 'unavailable' -> 'sold' para manter fidelidade com o sistema
    try:
        df_prop = pd.read_csv(CLEANED_PROPERTIES_CSV, dtype=str)
        df_prop['availability_status'] = df_prop['availability_status'].replace('unavailable', 'sold')
        df_prop.to_csv(CLEANED_PROPERTIES_CSV, index=False)
        print("Status 'unavailable' remapped to 'sold'.")
    except Exception as e:
        print(f"Erro ao remapear status: {e}")

    prop_copy = f"\\copy property_details(property_id, parcel_id, address, county, state, lot_acres, property_type, amount_due, assessed_value, tax_year, owner_address, status, availability_status, property_category, is_processed) FROM '{CLEANED_PROPERTIES_CSV}' WITH (FORMAT csv, HEADER true, QUOTE '\"', DELIMITER ',');"
    subprocess.run(["psql", DATABASE_URL, "-c", prop_copy], check=True)

    # 3. IMPORT HISTORY
    # CSV: property_id,auction_eventId,created_at
    # DB Columns: property_id, auction_id, created_at
    print("Importando property_auction_history...")
    hist_copy = f"\\copy property_auction_history(property_id, auction_id, created_at) FROM '{HISTORY_CSV}' WITH (FORMAT csv, HEADER true, QUOTE '\"', DELIMITER ',');"
    subprocess.run(["psql", DATABASE_URL, "-c", hist_copy], check=True)

    # 3.5 SYNC DATES FOR FIDELITY
    print("Sincronizando datas de vínculo para fidelidade de contagem...")
    run_psql_command("UPDATE property_auction_history pah SET auction_date = ae.auction_date FROM auction_events ae WHERE pah.auction_id = ae.id AND pah.auction_date IS NULL;")

    # 4. RESET SEQUENCES
    print("Resetando sequências...")
    run_psql_command("SELECT setval('auction_events_id_seq', (SELECT max(id) FROM auction_events));")
    run_psql_command("SELECT setval('property_details_id_seq', (SELECT max(id) FROM property_details));")
    run_psql_command("SELECT setval('property_auction_history_id_seq', (SELECT max(id) FROM property_auction_history));")

    print("--- SUCESSO: RECARGA COMPLETA ---")

if __name__ == "__main__":
    run_bulk_import()
