"""
Notifications REST API — GoAuct
Serves user-specific notifications from the `notifications` table
(populated by Celery watchlist task in tasks.py).

GET /api/v1/notifications/         → list unread notifications (newest first)
POST /api/v1/notifications/{id}/read → mark a notification as read
POST /api/v1/notifications/read-all  → mark all as read for current user
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api import deps
from app.models.user import User

router = APIRouter()


@router.get("/")
def get_notifications(
    limit: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Return the most recent notifications for the current user, unread first."""
    rows = db.execute(
        text("""
            SELECT id, type, message, property_id, auction_id, is_read, created_at
            FROM notifications
            WHERE user_id = :uid
            ORDER BY is_read ASC, created_at DESC
            LIMIT :limit
        """),
        {"uid": current_user.id, "limit": limit},
    ).fetchall()

    return [dict(r._mapping) for r in rows]


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Return the count of unread notifications for the bell badge."""
    row = db.execute(
        text("SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = :uid AND is_read = false"),
        {"uid": current_user.id},
    ).fetchone()
    return {"unread": row.cnt if row else 0}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark a single notification as read."""
    result = db.execute(
        text("""
            UPDATE notifications
            SET is_read = true
            WHERE id = :id AND user_id = :uid
        """),
        {"id": notification_id, "uid": current_user.id},
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Mark all notifications for the current user as read."""
    db.execute(
        text("UPDATE notifications SET is_read = true WHERE user_id = :uid AND is_read = false"),
        {"uid": current_user.id},
    )
    db.commit()
    return {"ok": True}
