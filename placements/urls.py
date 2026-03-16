from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InternshipPlacementViewSet, PlacementDocumentViewSet

router = DefaultRouter()
router.register(r'placements', InternshipPlacementViewSet)
router.register(r'documents', PlacementDocumentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]