"""
Unit test conftest — intentionally minimal.

Unit tests must NOT depend on the full FastAPI app (which pulls in
resend, Redis, DB connections). This conftest provides only what's
needed for pure unit tests that import individual service modules directly.
"""
# No imports needed — unit tests import services directly without app bootstrap.
