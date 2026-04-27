from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = '__all__' 

class EvaluationScoreSerializer(serializers.ModelSerializer):
    criteria_details = EvaluationCriteriaSerializer(source='criteria', read_only=True)

    class Meta:
        model = EvaluationScore
        fields = '__all__'

    def validate(self, data):
        criteria = data.get('criteria') or (self.instance.criteria if self.instance else None)
        score = data.get('score') or (self.instance.score if self.instance else None)

        if criteria and score is not None and score > criteria.max_score:
            raise serializers.ValidationError({
                'score': f'Score {score} exceeds the maximum allowed score of {criteria.max_score} for "{criteria.name}".'
            })
        if score is not None and score < 0:
            raise serializers.ValidationError({
                'score': 'Score cannot be negative.'
            })
        return data
class EvaluationSerializer(serializers.ModelSerializer):
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)
    
    # Writable field for nested scores during creation/update
    # required=False so PATCH requests without scores still work
    score_inputs = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of objects containing 'criteria' (UUID or string) and 'score' (Decimal)"
    )

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
    def validate(self, data):
        """
        On creation, require that ALL active criteria are provided.
        On update, score_inputs is optional; if supplied, validate structure only.
        """
        score_inputs = data.get('score_inputs', [])
        is_create = self.instance is None

        for item in score_inputs:
            if 'criteria' not in item or 'score' not in item:
                raise serializers.ValidationError(
                    {'score_inputs': "Each score input must contain 'criteria' and 'score'."}
                )
        if is_create and score_inputs is not None:
            provided_criteria_ids = {str(item['criteria']) for item in score_inputs}
            all_criteria_ids = {
                str(c) for c in EvaluationCriteria.objects.filter(is_active=True).values_list('criteria_id', flat=True)
            }
            missing_criteria = all_criteria_ids - provided_criteria_ids
            if missing_criteria:
                raise serializers.ValidationError(
                    {'score_inputs': f"Missing scores for criteria IDs: {', '.join(missing_criteria)}."}
                )

        return data
    
    @transaction.atomic
    def create(self, validated_data):
        # score_inputs is required=False; default to [] to avoid KeyError
        scores_data = validated_data.pop('score_inputs', [])

        # Create the main evaluation record
        evaluation = super().create(validated_data)

