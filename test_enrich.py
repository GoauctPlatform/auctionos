import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Get DB URL from .env or just use the local one
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auctionos"
# check if it exists or parse .env
with open("backend/.env", "r") as f:
    for line in f:
        if line.startswith("DATABASE_URL="):
            DATABASE_URL = line.strip().split("=", 1)[1]
            break

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.attom_enrichment import enrich_property

try:
    result = enrich_property(db, '003-511-161-000')
    print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")

