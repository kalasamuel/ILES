from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, DepartmentViewSet, UserViewSet, StudentViewSet, SupervisorViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'users', UserViewSet)
router.register(r'students', StudentViewSet)
router.register(r'supervisors', SupervisorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]