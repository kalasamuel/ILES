from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeeklyLogViewSet, LogAttachmentViewSet, FinalReportViewSet

router = DefaultRouter()
router.register(r'logs', WeeklyLogViewSet)
router.register(r'attachments', LogAttachmentViewSet)
router.register(r'final-reports', FinalReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
]