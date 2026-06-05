import os
from sqlalchemy import create_engine, text

local_url = "postgresql://user:password@localhost:5433/auctionos"
remote_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

print("Comparing local and remote schemas...")
try:
    local_engine = create_engine(local_url)
    remote_engine = create_engine(remote_url)
    
    # 1. Get remote columns
    with remote_engine.connect() as r_conn:
        r_cols = r_conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'property_details'
        """)).fetchall()
        
    remote_columns = {r[0]: (r[1], r[2]) for r in r_cols}
    
    # 2. Get local columns
    with local_engine.connect() as l_conn:
        l_cols = l_conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'property_details'
        """)).fetchall()
        
    local_columns = {l[0] for l in l_cols}
    
    # 3. Find missing columns
    missing_columns = []
    for col, (dtype, length) in remote_columns.items():
        if col not in local_columns:
            missing_columns.append((col, dtype, length))
            
    print(f"Found {len(missing_columns)} missing columns in local database.")
    
    # 4. Add missing columns locally
    if missing_columns:
        with local_engine.connect() as l_conn:
            for col, dtype, length in missing_columns:
                # Map info schema type to SQL definition
                sql_type = dtype
                if dtype == 'character varying' and length:
                    sql_type = f"VARCHAR({length})"
                
                alter_query = f"ALTER TABLE property_details ADD COLUMN IF NOT EXISTS {col} {sql_type}"
                try:
                    l_conn.execute(text(alter_query))
                    l_conn.commit()
                    print(f"  Added column: {col} ({sql_type})")
                except Exception as alter_err:
                    l_conn.rollback()
                    print(f"  Failed to add column {col}: {alter_err}")
                    
            print("Local schema synchronization complete!")
    else:
        print("No missing columns found locally.")

except Exception as e:
    print(f"Error: {e}")
