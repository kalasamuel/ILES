from rest_framework import serializers
from .models import WeeklyLog, LogAttachment


class LogAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogAttachment
        fields = '__all__'


class WeeklyLogSerializer(serializers.ModelSerializer):
    attachments = LogAttachmentSerializer(source='logattachment_set', many=True, read_only=True)

    class Meta:
        model = WeeklyLog
        fields = '__all__'