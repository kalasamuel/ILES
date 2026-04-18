from rest_framework import serializers
from .models import Notification, Deadline


class NotificationSerializer(serializers.ModelSerializer):
    log_review_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'

    def get_log_review_details(self, obj):
        """Return log and review details if a log_review is associated"""
        if obj.log_review:
            return {
                'review_id': str(obj.log_review.review_id),
                'log_id': str(obj.log_review.log.log_id),
                'week_number': obj.log_review.log.week_number,
                'comments': obj.log_review.comments,
                'rating': obj.log_review.rating,
                'status': obj.log_review.status,
                'supervisor_name': f"{obj.log_review.supervisor.user.first_name} {obj.log_review.supervisor.user.last_name}",
            }
        return None


class DeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deadline
        fields = '__all__'