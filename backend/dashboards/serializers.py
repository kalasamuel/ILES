from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import DashboardMetric
from evaluations.models import Evaluation, EvaluationCriteria, EvaluationScore, ScoreBreakdown

class DashboardMetricSerializer(serializers.ModelSerializer):
    """
    Serializer for DashboardMetric.
    - Only exposes relevant fields.
    - Protects read-only fields from being modified via API.
    - Validates metric values.
    """

    class Meta:
        model = DashboardMetric
        fields = '__all__'
        read_only_fields = ['metric_id', 'calculated_at', 'created_at', 'updated_at']

    def validate_value(self, value):
        """
        Ensure the metric value is non-negative.
        """
        if value < 0:
            raise serializers.ValidationError("Metric value cannot be negative.")
        return value


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = '__all__'


class EvaluationScoreSerializer(serializers.ModelSerializer):
    criteria_details = EvaluationCriteriaSerializer(source='criteria', read_only=True)

    class Meta:
        model = EvaluationScore
        fields = '__all__'


class EvaluationSerializer(serializers.ModelSerializer):
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)
    score_inputs = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of objects containing 'criteria' (UUID or string) and 'score' (Decimal)"
    )

    class Meta:
        model = Evaluation
        fields = '__all__'
        read_only_fields = ['total_score', 'grade', 'evaluator', 'created_at', 'updated_at']

    def validate_evaluation_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError("Evaluation date cannot be in the future.")
        return value

    def validate_score_inputs(self, value):
        """
        Validate that all active criteria are scored and payload structure is correct.
        """
        if not value:
            return value
            
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
        scores_data = validated_data.pop('score_inputs', [])
        evaluation = super().create(validated_data)
        
        for score_data in scores_data:
            criteria_id = score_data['criteria']
            score_val = score_data['score']
            score_serializer = EvaluationScoreSerializer(data={
                'evaluation': str(evaluation.evaluation_id),
                'criteria': str(criteria_id),
                'score': score_val
            })
            score_serializer.is_valid(raise_exception=True)
            score_serializer.save()
            
        return evaluation


class ScoreBreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoreBreakdown
        fields = '__all__'
        read_only_fields = ['final_score', 'grade', 'created_at', 'updated_at']