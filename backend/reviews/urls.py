from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogReviewViewSet, WorkflowHistoryViewSet

router = DefaultRouter()
router.register(r'reviews', LogReviewViewSet)
router.register(r'history', WorkflowHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]