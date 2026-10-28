import sys
import os
import pandas as pd
from sqlalchemy import text, create_engine

# Database setup
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

FILES = {
    "auctions": "backend/data/postgres_auction_events.csv",
    "properties": "backend/data/postgres_property_details.csv",
    "history": "backend/data/postgres_property_auction_history.csv"
}

def import_master_data():
    print("-" * 60)
    print("ULTIMATE FINAL RESOLUTION: MASTER ALIGNMENT V8")
    print("-" * 60)
    
    with engine.begin() as conn:
        # 1. CLEANUP
        print("Truncating tables (Atomic Transaction)...")
        conn.execute(text("TRUNCATE property_auction_history CASCADE"))
        conn.execute(text("TRUNCATE auction_events CASCADE"))
        conn.execute(text("TRUNCATE property_details CASCADE"))

        # 2. IMPORT AUCTIONS
        print(f"Importing Auctions from {FILES['auctions']}...")
        df_auc = pd.read_csv(FILES['auctions'], dtype=str)
        df_auc.columns.values[0] = 'id'
        df_auc['id'] = pd.to_numeric(df_auc['id'], errors='coerce').astype(int)
        df_auc['parcels_count'] = pd.to_numeric(df_auc['parcels_count'], errors='coerce').fillna(0).astype(int)
        
        # Verify Levy ID 597
        levy_row = df_auc[df_auc['id'] == 597]
        if not levy_row.empty:
            print(f"ID 597 in logic will be: {levy_row.iloc[0]['name']}")

        # Ensure canonical tax_status ('Foreclosure', 'Deed', 'Lien')
        try:
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from app.utils.auction_classifier import infer_canonical_tax_status
            df_auc['tax_status'] = df_auc.apply(
                lambda r: infer_canonical_tax_status(
                    tax_status=r.get('tax_status'),
                    name=r.get('name'),
                    short_name=r.get('short_name'),
                    notes=r.get('notes')
                ),
                axis=1
            )
        except Exception as e:
            print(f"Aviso ao padronizar tax_status: {e}")

        df_auc.to_sql('auction_events', conn, if_exists='append', index=False, method='multi', chunksize=500)
        conn.execute(text("SELECT setval(pg_get_serial_sequence('auction_events', 'id'), (SELECT MAX(id) FROM auction_events))"))
        print(f"Done: {len(df_auc):,} auctions imported.")

        # 3. IMPORT PROPERTIES
        print(f"Importing Properties from {FILES['properties']}...")
        df_prop = pd.read_csv(FILES['properties'], dtype=str)
        
        # COLUMN MAPPING FIX: 'pin' -> 'pin_ppin'
        if 'pin' in df_prop.columns:
            print("Mapping 'pin' to 'pin_ppin'...")
            df_prop = df_prop.rename(columns={'pin': 'pin_ppin'})

        # Drop duplicates by parcel_id
        df_prop = df_prop.drop_duplicates(subset=['parcel_id'], keep='first')
        
        # Numeric conversions
        num_cols = ['land_value', 'building_value', 'amount_due', 'assessed_value', 'lot_acres', 'tax_year']
        for col in num_cols:
            if col in df_prop.columns:
                df_prop[col] = pd.to_numeric(df_prop[col], errors='coerce')

        # FILTER ONLY COLUMNS THAT EXIST IN DB
        # We'll fetch DB columns dynamically to be 100% sure
        db_cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'property_details'")).fetchall()
        db_col_names = [r[0] for r in db_cols]
        df_prop = df_prop[[col for col in df_prop.columns if col in db_col_names]]

        df_prop.to_sql('property_details', conn, if_exists='append', index=False, method='multi', chunksize=1000)
        print(f"Done: {len(df_prop):,} properties imported.")

        # 4. IMPORT HISTORY
        print(f"Importing History from {FILES['history']}...")
        df_hist = pd.read_csv(FILES['history'], dtype=str)
        if 'auction_eventId' in df_hist.columns:
            df_hist = df_hist.rename(columns={'auction_eventId': 'auction_id'})
        
        df_hist['auction_id'] = pd.to_numeric(df_hist['auction_id'], errors='coerce').astype(int)
        
        # Filter valid links
        valid_p_ids = set(df_prop['property_id'].values)
        df_hist = df_hist[df_hist['property_id'].isin(valid_p_ids)]
        df_hist = df_hist.drop_duplicates(subset=['property_id', 'auction_id'], keep='first')
        
        df_hist.to_sql('property_auction_history', conn, if_exists='append', index=False, method='multi', chunksize=2000)
        print(f"Done: {len(df_hist):,} links imported.")

    print("-" * 60)
    print("REALIGNMENT SUCCESSFUL - NO MORE LOOP")
    print("-" * 60)

if __name__ == "__main__":
    try:
        import_master_data()
    except Exception as e:
        print(f"Error during master realignment: {e}")
        import traceback
        traceback.print_exc()
