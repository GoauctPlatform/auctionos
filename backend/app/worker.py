import os
from celery import Celery

def get_redis_url():
    pwd = os.getenv("REDISPASSWORD")
    host = os.getenv("REDISHOST")
    port = os.getenv("REDISPORT", "6379")
    if pwd and host:
        return f"redis://:{pwd}@{host}:{port}/0"
    return os.getenv("REDIS_URL", "redis://redis:6379/0")

resolved_url = get_redis_url()

# Railway sets REDIS_URL globally with password auth. Local docker-compose sets CELERY_BROKER_URL explicitly.
broker_url = os.getenv("CELERY_BROKER_URL", resolved_url)
backend_url = os.getenv("CELERY_RESULT_BACKEND", resolved_url)

from celery.schedules import crontab

celery_app = Celery(
    "worker",
    broker=broker_url,
    backend=backend_url,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "reconcile-property-statuses-daily": {
            "task": "app.tasks.reconcile_property_statuses_task",
            "schedule": crontab(hour=4, minute=0),
        },
        "run-database-backup-daily": {
            "task": "app.tasks.run_scheduled_backup_task",
            "schedule": crontab(hour=4, minute=30),  # 04:30 UTC daily
        },
        "check-watchlists-daily": {
            "task": "app.tasks.check_watchlists_task",
            "schedule": crontab(hour=5, minute=0),
        },
        "check-expired-tasks-hourly": {
            "task": "app.tasks.revert_expired_tasks_task",
            "schedule": crontab(minute=0),
        },
    },
)
