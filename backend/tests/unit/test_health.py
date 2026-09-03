"""
Basic health check test for the root endpoint.
Uses TestClient directly to avoid conftest DB dependency.
"""
from fastapi.testclient import TestClient


def test_root_endpoint_returns_ok():
    """The root endpoint must return a 200 with a valid JSON body."""
    # Import app directly here to avoid conftest's DB connection
    from app.main import app
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    # Must have a 'message' key with non-empty value
    assert "message" in body
    assert len(body["message"]) > 0
