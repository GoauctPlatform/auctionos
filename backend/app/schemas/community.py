from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class CommunityUpdateBase(BaseModel):
    date: Optional[str] = None
    tag: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None

class CommunityUpdateCreate(CommunityUpdateBase):
    title: str
    content: str

class CommunityUpdateUpdate(CommunityUpdateBase):
    pass

class CommunityUpdate(CommunityUpdateBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
