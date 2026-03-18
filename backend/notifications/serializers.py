from rest_framework import serializers
from .models import Notification, Deadline


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class DeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deadline
        fields = '__all__'