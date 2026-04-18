from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import WeeklyLog
from notifications.models import Notification


@receiver(post_save, sender=WeeklyLog)
def create_log_submission_notification(sender, instance, created, **kwargs):
    """
    Signal handler that creates notifications when a log is submitted.
    This notifies the assigned supervisors (workplace and/or academic) 
    that a student has submitted a new log for review.
    """
    # Only notify on submission (when status changes to 'submitted')
    # Check if this is a status update to 'submitted'
    if instance.status == 'submitted' and instance.submitted_at:
        placement = instance.placement
        student_name = f"{placement.student.user.first_name} {placement.student.user.last_name}"
        message = f"New log submission from {student_name} - Week {instance.week_number}"

        # Notify workplace supervisor if assigned
        if placement.workplace_supervisor:
            supervisor_user = placement.workplace_supervisor.user
            Notification.objects.create(
                user=supervisor_user,
                message=message,
                notification_type='log_submitted',
                log=instance,
            )

        # Notify academic supervisor if assigned
        if placement.academic_supervisor:
            supervisor_user = placement.academic_supervisor.user
            Notification.objects.create(
                user=supervisor_user,
                message=message,
                notification_type='log_submitted',
                log=instance,
            )
