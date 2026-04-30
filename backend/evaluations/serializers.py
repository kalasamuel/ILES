from rest_framework import serializers
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


class EvaluationSerializer(serializers.ModelSerializer):
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)

    class Meta:
        model = Evaluation
        fields = '__all__'


class ScoreBreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoreBreakdown
        fields = '__all__'