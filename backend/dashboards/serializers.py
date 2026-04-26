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
    def validate_score_inputs(self, value):
        """
        Validate that all active criteria are scored and payload structure is correct.
        """
        for item in value:
            if 'criteria' not in item or 'score' not in item:
                raise serializers.ValidationError("Each score input must contain 'criteria' and 'score'.")
        provided_criteria_ids = {str(item['criteria']) for item in value}
        all_criteria_ids = {str(c) for c in EvaluationCriteria.objects.values_list('criteria_id', flat=True)}
        
        missing_criteria = all_criteria_ids - provided_criteria_ids
        if missing_criteria:
            raise serializers.ValidationError(
                f"Missing scores for criteria IDs: {', '.join(missing_criteria)}."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        scores_data = validated_data.pop('score_inputs')
        # Create the main evaluation record
        evaluation = super().create(validated_data)
        # Create all associated scores
        for score_data in scores_data:
            criteria_id = score_data['criteria']
            score_val = score_data['score']

             # Use the existing score serializer to maintain all validation logic
            score_serializer = EvaluationScoreSerializer(data={
                'evaluation': str(evaluation.evaluation_id),
                'criteria': str(criteria_id),
                'score': score_val
            })
            score_serializer.is_valid(raise_exception=True)
            score_serializer.save()
            
        return evaluation

            


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

  
    