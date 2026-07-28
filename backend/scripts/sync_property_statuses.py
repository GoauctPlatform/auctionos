import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

if len(sys.argv) > 1:
    CSV_FILE = sys.argv[1]
else:
    CSV_FILE = "backend/data/postgres_property_details.csv"

# Accepted status values (strict — no 'sold' or others)
VALID_STATUSES = {'available', 'unavailable'}

# Maps any CSV variant to canonical DB value
STATUS_MAP = {
    'available': 'available',
    'Available': 'available',
    'AVAILABLE': 'available',
    '1': 'available',
    'true': 'available',
    'yes': 'available',
    'unavailable': 'unavailable',
    'Unavailable': 'unavailable',
    'UNAVAILABLE': 'unavailable',
    'not available': 'unavailable',
    'Not Available': 'unavailable',
    'sold': 'unavailable',       # Legacy: treat 'sold' as unavailable
    'Sold': 'unavailable',
    'SOLD': 'unavailable',
    'inactive': 'unavailable',
    'Inactive': 'unavailable',
}


def sync_statuses():
    if not os.path.exists(CSV_FILE):
        print(f"ERROR: {CSV_FILE} not found.")
        return

    print(f"\n--- SYNCING PROPERTY STATUSES FROM {CSV_FILE} ---\n")

    chunk_size = 500
    updated_available = 0
    updated_unavailable = 0
    total_processed = 0
    skipped = 0

    with engine.connect() as conn:
        for chunk in pd.read_csv(CSV_FILE, chunksize=chunk_size, dtype=str):
            status_map = {}
            for _, row in chunk.iterrows():
                p_id = row.get('parcel_id')
                if not p_id:
                    skipped += 1
                    continue

                # Try both possible CSV column names for availability
                raw_status = (
                    row.get('availability_status')
                    or row.get('availability')
                    or row.get('status')
                    or ''
                ).strip()

                canonical = STATUS_MAP.get(raw_status)
                if canonical:
                    status_map[p_id.strip()] = canonical
                else:
                    skipped += 1

            if not status_map:
                continue

            for pid, status in status_map.items():
                result = conn.execute(text("""
                    UPDATE property_details
                    SET availability_status = :status
                    WHERE parcel_id = :pid AND availability_status != :status
                """), {"pid": pid, "status": status})

                if result.rowcount > 0:
                    if status == 'available':
                        updated_available += result.rowcount
                    else:
                        updated_unavailable += result.rowcount

            conn.commit()
            total_processed += len(chunk)
            print(
                f"Processed: {total_processed} | "
                f"→available: {updated_available} | "
                f"→unavailable: {updated_unavailable} | "
                f"Skipped (no match): {skipped}"
            )

    print(f"\n--- COMPLETE ---")
    print(f"Total processed: {total_processed}")
    print(f"Updated → available:   {updated_available}")
    print(f"Updated → unavailable: {updated_unavailable}")
    print(f"Skipped (unknown status or missing parcel_id): {skipped}")


if __name__ == "__main__":
    sync_statuses()
