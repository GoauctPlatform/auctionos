import sqlite3

db_path = "/Users/gustavo/Downloads/auctionos/sql_app.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT version_num FROM alembic_version")
    version = cursor.fetchone()
    print("Alembic current version:", version)
except Exception as e:
    print("Error querying alembic_version:", e)

conn.close()
