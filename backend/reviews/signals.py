from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LogReview
from notifications.models import Notification


@receiver(post_save, sender=LogReview)
def create_feedback_notification(sender, instance, created, **kwargs):
    """
    Signal handler that creates a notification when a new LogReview is created.
    This notifies the student that their supervisor has provided feedback.
    """
    if created:
        # Get the student from the placement
        student_user = instance.log.placement.student.user

        # Create a notification for the student
        supervisor_name = f"{instance.supervisor.user.first_name} {instance.supervisor.user.last_name}"
        message = f"You have new feedback from {supervisor_name} on Week {instance.log.week_number}'s log"

        Notification.objects.create(
            user=student_user,
            message=message,
            notification_type='feedback_added',
            log_review=instance,
        )
