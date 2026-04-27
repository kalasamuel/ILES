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