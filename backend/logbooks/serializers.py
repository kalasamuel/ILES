from rest_framework import serializers
from .models import WeeklyLog, LogAttachment


class LogAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogAttachment
        fields = '__all__'


class WeeklyLogSerializer(serializers.ModelSerializer):
    attachments = LogAttachmentSerializer(source='logattachment_set', many=True, read_only=True)

    def validate(self, attrs):
        status_value = attrs.get('status', getattr(self.instance, 'status', 'draft'))
        scheduled_submission_at = attrs.get(
            'scheduled_submission_at',
            getattr(self.instance, 'scheduled_submission_at', None),
        )

        if status_value == 'scheduled' and not scheduled_submission_at:
            raise serializers.ValidationError({
                'scheduled_submission_at': 'Scheduled logs need a send time.'
            })

        return attrs

    class Meta:
        model = WeeklyLog
        fields = '__all__'