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
    if instance.status != 'submitted' or not instance.submitted_at:
        return

    placement = instance.placement
    student_user = placement.student.user
    student_name = f"{student_user.first_name} {student_user.last_name}".strip()
    supervisor_message = f"New log submission from {student_name} - Week {instance.week_number}"
    student_message = (
        f"Your log for Week {instance.week_number} was successfully submitted to the lecturer."
    )

    Notification.objects.get_or_create(
        user=student_user,
        log=instance,
        notification_type='log_submitted',
        defaults={
            'message': student_message,
            'is_read': False,
        }
    )

    # Notify each assigned supervisor so both in-app alerts and emails are sent.
    for supervisor in (placement.workplace_supervisor, placement.academic_supervisor):
        if not supervisor:
            continue

        Notification.objects.get_or_create(
            user=supervisor.user,
            log=instance,
            notification_type='log_submitted',
            defaults={
                'message': supervisor_message,
                'is_read': False,
            }
        )

