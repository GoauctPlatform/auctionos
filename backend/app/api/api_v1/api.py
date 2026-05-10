from fastapi import APIRouter
from app.api.api_v1.endpoints import (
    auth, users, properties, dashboard, auctions, gis, admin, counties, announcements,
    client_data, states, scores, marketing, companies, realtors, user_properties,
    realtor_tasks, investor_tasks, realtor_economy, billing, agent_tasks
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(auctions.router, prefix="/auctions", tags=["auctions"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(gis.router, prefix="/gis", tags=["gis"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(counties.router, prefix="/counties", tags=["counties"])
api_router.include_router(announcements.router, prefix="/admin/announcements", tags=["announcements"])
api_router.include_router(client_data.router, prefix="/client-data", tags=["client_portal"])
api_router.include_router(states.router, prefix="/states", tags=["states"])
api_router.include_router(scores.router, prefix="/scores", tags=["scores"])
api_router.include_router(user_properties.router, prefix="/user-properties", tags=["user_properties"])
api_router.include_router(marketing.router, prefix="/leads", tags=["marketing"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(realtors.router, prefix="/realtors", tags=["realtors"])
api_router.include_router(realtor_tasks.router, prefix="/realtor-tasks", tags=["realtor_tasks"])
api_router.include_router(investor_tasks.router, prefix="/investor", tags=["investor_tasks"])
api_router.include_router(realtor_economy.router, prefix="/realtor-economy", tags=["realtor_economy"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(agent_tasks.router, prefix="/agent", tags=["agent"])
