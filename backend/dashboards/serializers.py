from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = '__all__' 