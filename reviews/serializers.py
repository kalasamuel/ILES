from rest_framework import serializers
from .models import LogReview, WorkflowHistory
from accounts.serializers import UserSerializer


class LogReviewSerializer(serializers.ModelSerializer):
    supervisor_details = UserSerializer(source='supervisor.user', read_only=True)

    class Meta:
        model = LogReview
        fields = '__all__'


class WorkflowHistorySerializer(serializers.ModelSerializer):
    changed_by_details = UserSerializer(source='changed_by', read_only=True)

    class Meta:
        model = WorkflowHistory
        fields = '__all__'