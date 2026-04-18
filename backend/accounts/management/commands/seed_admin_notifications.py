from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from logbooks.models import WeeklyLog
from placements.models import InternshipPlacement
from reviews.models import LogReview
from notifications.models import Notification


class Command(BaseCommand):
    help = "Create/update admin system notifications (health, server status, pending updates, alerts)"

    @staticmethod
    def _upsert_notification(user, notification_type, message, details):
        existing = Notification.objects.filter(
            user=user,
            notification_type=notification_type,
            is_read=False,
        ).order_by('-created_at').first()

        if existing:
            existing.message = message
            existing.details = details
            existing.save(update_fields=['message', 'details'])
            return False

        Notification.objects.create(
            user=user,
            message=message,
            notification_type=notification_type,
            details=details,
            is_read=False,
        )
        return True

    @transaction.atomic
    def handle(self, *args, **options):
        pending_log_reviews = WeeklyLog.objects.filter(status='submitted').count()
        pending_placements = InternshipPlacement.objects.filter(status='pending').count()
        pending_revision_reviews = LogReview.objects.filter(status='needs_revision').count()
        rejected_reviews = LogReview.objects.filter(status='rejected').count()

        pending_updates_total = pending_log_reviews + pending_placements + pending_revision_reviews
        alerts_total = rejected_reviews + pending_revision_reviews
        health_score = max(55, 100 - (pending_updates_total + alerts_total) * 4)

        admins = User.objects.filter(is_active=True, role__role_name__iexact='admin')
        if not admins.exists():
            self.stdout.write(self.style.WARNING('No admin users found. Nothing to seed.'))
            return

        created_count = 0
        updated_count = 0

        for admin in admins:
            created = self._upsert_notification(
                admin,
                'server_status_update',
                'Server status: Operational',
                {'status': 'operational'},
            )
            created_count += int(created)
            updated_count += int(not created)

            created = self._upsert_notification(
                admin,
                'system_health_update',
                f'System health score is {health_score}%',
                {
                    'health_score': health_score,
                    'pending_updates': pending_updates_total,
                    'alerts': alerts_total,
                },
            )
            created_count += int(created)
            updated_count += int(not created)

            created = self._upsert_notification(
                admin,
                'pending_updates',
                f'Pending updates: {pending_updates_total}',
                {
                    'pending_log_reviews': pending_log_reviews,
                    'pending_placements': pending_placements,
                    'reviews_needing_revision': pending_revision_reviews,
                    'total_pending_updates': pending_updates_total,
                },
            )
            created_count += int(created)
            updated_count += int(not created)

            created = self._upsert_notification(
                admin,
                'system_alert',
                (
                    'Security/system alerts detected.'
                    if alerts_total > 0
                    else 'No critical security or system alerts detected.'
                ),
                {
                    'alerts_total': alerts_total,
                    'rejected_reviews': rejected_reviews,
                    'reviews_needing_revision': pending_revision_reviews,
                    'severity': 'high' if alerts_total >= 5 else 'low',
                },
            )
            created_count += int(created)
            updated_count += int(not created)

        self.stdout.write(
            self.style.SUCCESS(
                f'Admin notifications seeded. Created={created_count}, Updated={updated_count}, Admins={admins.count()}'
            )
        )
