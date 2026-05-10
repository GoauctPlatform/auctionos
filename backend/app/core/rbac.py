from typing import List
from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.api.deps import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {', '.join(self.allowed_roles)}"
            )
        return user

# Convenience instances
allow_admin_only = RoleChecker(["admin", "superuser"])
allow_managers = RoleChecker(["admin", "superuser", "client", "manager"])
allow_agents = RoleChecker(["admin", "superuser", "client", "manager", "agent"])
allow_realtors = RoleChecker(["realtor"])
allow_all_internal = RoleChecker(["admin", "superuser", "client", "manager", "agent"])
