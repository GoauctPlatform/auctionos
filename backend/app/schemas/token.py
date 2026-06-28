from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None  # Returned on login; used to get new access tokens

class TokenPayload(BaseModel):
    sub: Optional[int] = None
    session_id: Optional[str] = None
    type: Optional[str] = None  # "access" or "refresh"
