import sys
import os
import uuid
import asyncio
import logging

# 1. Environment Handling (MUST happen before app imports)
if "DATABASE_URL" in os.environ:
    print(f"Using DATABASE_URL from environment.")
elif len(sys.argv) > 2 and sys.argv[2].startswith("postgresql"):
    os.environ["DATABASE_URL"] = sys.argv[2]
    print(f"Using DATABASE_URL from command line argument.")

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.import_service import import_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_import(file_path: str, import_type: str = "properties", skip_rows: int = 0):
    if not os.path.exists(file_path):
        # Try relative to app root
        root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alt_path = os.path.join(root_path, file_path)
        if os.path.exists(alt_path):
            file_path = alt_path
        else:
            print(f"Error: File not found at {file_path}")
            sys.exit(1)

    job_id = f"remote-{str(uuid.uuid4())[:8]}"
    print(f"Starting REMOTE import for {file_path}")
    print(f"Job ID: {job_id}")
    print(f"Target DB: {os.environ.get('DATABASE_URL', 'Default from config')}")
    
    # 2. Simple connectivity check
    try:
        from app.db.session import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Connected to database successfully.")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)
    
    try:
        if import_type == "auctions":
            with open(file_path, "rb") as f:
                content = f.read()
            print("Processing as AUCTIONS...")
            await import_service.process_auctions_csv(content, job_id)
        elif import_type == "history":
            with open(file_path, "rb") as f:
                content = f.read()
            print("Processing as HISTORY...")
            await import_service.process_history_mapping_csv(content, job_id)
        else:
            if skip_rows > 0:
                print(f"Processing as PROPERTIES (skipping first {skip_rows} rows)...")
            else:
                print("Processing as PROPERTIES...")
            await import_service.process_properties_csv_file(file_path, job_id, skip_rows=skip_rows)
        print("\nRemote import process completed successfully.")
    except Exception as e:
        print(f"Failed to run remote import: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Option A: DATABASE_URL='url' python scripts/remote_db_import.py data/file.csv [--type auctions]")
        sys.exit(1)
    
    # Simple argparse for --type
    import_type = "properties"
    if "--type" in sys.argv:
        idx = sys.argv.index("--type")
        import_type = sys.argv[idx+1]
        sys.argv.pop(idx+1)
        sys.argv.pop(idx)
        
    skip_rows = 0
    if "--skip" in sys.argv:
        idx = sys.argv.index("--skip")
        skip_rows = int(sys.argv[idx+1])
        sys.argv.pop(idx+1)
        sys.argv.pop(idx)
        
    file_path = sys.argv[1]
    asyncio.run(run_import(file_path, import_type, skip_rows))
