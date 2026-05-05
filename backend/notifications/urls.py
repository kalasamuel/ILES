from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, DeadlineViewSet, PushSubscriptionViewSet, LoginHistoryViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet)
router.register(r'deadlines', DeadlineViewSet)
router.register(r'push-subscriptions', PushSubscriptionViewSet)
router.register(r'login-history', LoginHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]