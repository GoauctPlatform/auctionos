from app.core.security import verify_password
import sys

hashed = "$2b$12$dzp17KFRccbgytGEs6cgZ.E2EvCeF0KtYRHzfh3Zwlr/j9sOr7An6"
pwd = "password"

match = verify_password(pwd, hashed)
print(f"Verify 'password': {match}")
