from rest_framework import serializers
from .models import Notification, Deadline
from .models import PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    log_review_details = serializers.SerializerMethodField(read_only=True)
    log_details = serializers.SerializerMethodField(read_only=True)
    admin_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Notification
        fields = '__all__'

    def get_log_review_details(self, obj):
        """Return log and review details if a log_review is associated (for student feedback)"""
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

    def get_log_details(self, obj):
        """Return log and student details if a log is associated (for supervisor log submission)"""
        if obj.log:
            student = obj.log.placement.student
            return {
                'log_id': str(obj.log.log_id),
                'week_number': obj.log.week_number,
                'status': obj.log.status,
                'submitted_at': obj.log.submitted_at,
                'hours_worked': float(obj.log.hours_worked or 0),
                'activities_summary': obj.log.activities_performed[:200] if obj.log.activities_performed else '',
                'student_id': str(student.student_id),
                'student_name': f"{student.user.first_name} {student.user.last_name}",
                'student_email': student.user.email,
                'student_registration_number': student.registration_number,
                'organization_name': obj.log.placement.organization.name if obj.log.placement.organization else 'N/A',
            }
        return None

    def get_admin_details(self, obj):
        if obj.notification_type in {
            'system_health_update',
            'server_status_update',
            'pending_updates',
            'system_alert',
            'new_company_added',
        }:
            return obj.details or {}
        return None


class DeadlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deadline
        fields = '__all__'


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ('subscription_id', 'endpoint', 'p256dh', 'auth', 'created_at')
        read_only_fields = ('subscription_id', 'created_at')