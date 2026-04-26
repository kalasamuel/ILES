from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import DashboardMetric

class DashboardMetricSerializer(serializers.ModelSerializer):
    """
    Serializer for DashboardMetric.
    - Only exposes relevant fields.
    - Protects read-only fields from being modified via API.
    - Validates metric values.
    """

    class Meta:
        model = Evaluation
        fields = '__all__'
        # total_score and grade are computed/set by business logic, not raw API input.
        # evaluator is set automatically from the request context in the view.
        read_only_fields = ['total_score', 'grade', 'evaluator']

    def validate_evaluation_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Evaluation date cannot be in the future.")
        return value    


    def validate_value(self, value):
        """
        Ensure the metric value is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Metric value cannot be negative.")
        return value  

class EvaluationSerializer(serializers.ModelSerializer):
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)
      # Writable field for nested scores during creation
    score_inputs = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True,
        help_text="List of objects containing 'criteria' (UUID or string) and 'score' (Decimal)"
    )

  
    