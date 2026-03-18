from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyLogViewSet, LogAttachmentViewSet

router = DefaultRouter()
router.register(r'logs', WeeklyLogViewSet)
router.register(r'attachments', LogAttachmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]