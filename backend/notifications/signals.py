import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import UserSettings

from .models import Notification


logger = logging.getLogger(__name__)


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

    if notification_type == 'login_alert' and not user_settings.login_alerts:
        return False

    return True


@receiver(post_save, sender=Notification)
def send_notification_email(sender, instance, created, **kwargs):
    if not created:
        return

    recipient = (instance.user.email or '').strip()
    
    send_to_user = bool(recipient and _can_email_notification(instance))

    from accounts.models import User
    admin_emails = list(
        User.objects.filter(is_active=True, role__role_name__iexact='admin')
        .values_list('email', flat=True)
    )

    if not send_to_user and not admin_emails:
        return

    subject = f"New ILES Notification: {instance.get_notification_type_display()}"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    notifications_url = f"{frontend_url}/app/notifications"

    if send_to_user:
        message = (
            f"Hello {instance.user.first_name},\n\n"
            f"You have a new notification in ILES.\n\n"
            f"Type: {instance.get_notification_type_display()}\n"
            f"Message: {instance.message}\n\n"
            f"View it here: {notifications_url}\n\n"
            "— ILES Support Team"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception:
            logger.exception('Failed to send notification email to %s for notification %s', recipient, instance.notification_id)

    admin_recipients = [email for email in admin_emails if email and email != recipient]
    
    if admin_recipients:
        admin_message = (
            f"Hello Admin,\n\n"
            f"A new notification was generated in ILES for user {instance.user.first_name} {instance.user.last_name} ({instance.user.email}).\n\n"
            f"Type: {instance.get_notification_type_display()}\n"
            f"Message: {instance.message}\n\n"
            f"View it here: {notifications_url}\n\n"
            "— ILES System"
        )
        try:
            send_mail(
                subject=f"[Admin Copy] {subject}",
                message=admin_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_recipients,
                fail_silently=False,
            )
        except Exception:
            logger.exception('Failed to send admin notification email for notification %s', instance.notification_id)
