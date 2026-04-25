from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import UserSettings

from .models import Notification


REVIEW_ALERT_TYPES = {
    'feedback_added',
    'log_review_pending',
    'evaluation_completed',
    'placement_approved',
    'placement_rejected',
}


def _can_email_notification(notification):
    user_settings, _ = UserSettings.objects.get_or_create(user=notification.user)

    if not user_settings.email_notifications:
        return False

    notification_type = notification.notification_type

    if notification_type == 'submission_deadline' and not user_settings.log_reminders:
        return False

    if notification_type in REVIEW_ALERT_TYPES and not user_settings.review_alerts:
        return False

    if notification_type == 'weekly_summary' and not user_settings.weekly_summary:
        return False

    return True


@receiver(post_save, sender=Notification)
def send_notification_email(sender, instance, created, **kwargs):
    if not created:
        return

    recipient = (instance.user.email or '').strip()
    if not recipient:
        return

    if not _can_email_notification(instance):
        return

    subject = f"New ILES Notification: {instance.get_notification_type_display()}"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    notifications_url = f"{frontend_url}/app/notifications"
    message = (
        f"Hello {instance.user.first_name},\n\n"
        f"You have a new notification in ILES.\n\n"
        f"Type: {instance.get_notification_type_display()}\n"
        f"Message: {instance.message}\n\n"
        f"View it here: {notifications_url}\n\n"
        "— ILES Support Team"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=True,
    )
