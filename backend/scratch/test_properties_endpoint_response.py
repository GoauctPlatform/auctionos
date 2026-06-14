import sys
import os
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.getcwd(), "backend"))
from app.main import app

client = TestClient(app)
response = client.get("/api/v1/properties?keyword=009-270-001-000")
print(response.status_code)
print(response.json())
