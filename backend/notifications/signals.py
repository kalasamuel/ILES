from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification


@receiver(post_save, sender=Notification)
def send_notification_email(sender, instance, created, **kwargs):
    if not created:
        return

    recipient = (instance.user.email or '').strip()
    if not recipient:
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
