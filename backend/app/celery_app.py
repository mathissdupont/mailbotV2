from celery import Celery
from .settings import settings

celery_app = Celery(
    "sponsorbot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
)

celery_app.autodiscover_tasks(["app"])
