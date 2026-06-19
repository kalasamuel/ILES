from rest_framework import serializers
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown
from placements.serializers import InternshipPlacementSerializer


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriteria
        fields = '__all__'


class EvaluationScoreSerializer(serializers.ModelSerializer):
    criteria_details = EvaluationCriteriaSerializer(source='criteria', read_only=True)

    class Meta:
        model = EvaluationScore
        fields = '__all__'


class SimplePlacementSerializer(serializers.ModelSerializer):
    """Minimal placement serializer for nested use in lists (avoids N+1 queries)"""
    student_name = serializers.SerializerMethodField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    def get_student_name(self, obj):
        if obj.student and obj.student.user:
            return f"{obj.student.user.first_name} {obj.student.user.last_name}"
        return "N/A"
    
    class Meta:
        from placements.models import InternshipPlacement
        model = InternshipPlacement
        fields = ['placement_id', 'start_date', 'end_date', 'position_title', 'status', 'student_name', 'organization_name']


class EvaluationMinimalSerializer(serializers.ModelSerializer):
    """Ultra-minimal serializer for dashboard lists - only total_score"""
    class Meta:
        model = Evaluation
        fields = ['evaluation_id', 'total_score', 'grade', 'placement']


class EvaluationSerializer(serializers.ModelSerializer):
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)
    placement_details = SimplePlacementSerializer(source='placement', read_only=True)

    class Meta:
        model = Evaluation
        fields = '__all__'


class EvaluationDetailSerializer(serializers.ModelSerializer):
    """Full detailed serializer for retrieve operations"""
    scores = EvaluationScoreSerializer(source='evaluationscore_set', many=True, read_only=True)
    placement_details = InternshipPlacementSerializer(source='placement', read_only=True)

    class Meta:
        model = Evaluation
        fields = '__all__'


class ScoreBreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoreBreakdown
        fields = '__all__'