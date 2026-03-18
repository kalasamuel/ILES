from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, DeadlineViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet)
router.register(r'deadlines', DeadlineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]