from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EvaluationCriteriaViewSet, EvaluationViewSet, EvaluationScoreViewSet, ScoreBreakdownViewSet

router = DefaultRouter()
router.register(r'criteria', EvaluationCriteriaViewSet)
router.register(r'evaluations', EvaluationViewSet)
router.register(r'scores', EvaluationScoreViewSet)
router.register(r'breakdowns', ScoreBreakdownViewSet)

urlpatterns = [
    path('', include(router.urls)),
]