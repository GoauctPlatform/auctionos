import sys
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "sqlite:////Users/gustavo/Downloads/auctionos/sql_app.db"

def test_query():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            cursor = conn.execute(text("PRAGMA table_info(properties)"))
            columns = cursor.fetchall()
            print("properties columns:")
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    test_query()
