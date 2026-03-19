from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardMetricViewSet

router = DefaultRouter()
router.register(r'metrics', DashboardMetricViewSet)

urlpatterns = [
    path('', include(router.urls)),
]