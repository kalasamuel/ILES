from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import User
from notifications.models import Notification
from .models import Organization


@receiver(post_save, sender=Organization)
def notify_admins_on_new_company(sender, instance, created, **kwargs):
    if not created:
        return

    admins = User.objects.filter(is_active=True, role__role_name__iexact='admin')
    for admin in admins:
        Notification.objects.create(
            user=admin,
            message=f"New company added: {instance.name}",
            notification_type='new_company_added',
            details={
                'organization_id': str(instance.organization_id),
                'name': instance.name,
                'industry': instance.industry,
                'city': instance.city,
                'country': instance.country,
                'contact_email': instance.contact_email,
                'contact_phone': instance.contact_phone,
            },
            is_read=False,
        )
