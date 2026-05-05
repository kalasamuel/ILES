from rest_framework import serializers
from .models import LogReview, WorkflowHistory
from accounts.serializers import UserSerializer
from accounts.models import Supervisor


class LogReviewSerializer(serializers.ModelSerializer):
    supervisor_details = UserSerializer(source='supervisor.user', read_only=True)
    supervisor = serializers.PrimaryKeyRelatedField(queryset=Supervisor.objects.all(), required=False, write_only=True)

    class Meta:
        model = LogReview
        fields = '__all__'
        read_only_fields = ['review_id', 'supervisor', 'reviewed_at']


class WorkflowHistorySerializer(serializers.ModelSerializer):
    changed_by_details = UserSerializer(source='changed_by', read_only=True)

    class Meta:
        model = WorkflowHistory
        fields = '__all__'