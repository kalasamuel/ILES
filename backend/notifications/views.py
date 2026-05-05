from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification, Deadline, LoginHistory
from .serializers import NotificationSerializer, DeadlineSerializer
from .serializers import PushSubscriptionSerializer, LoginHistorySerializer
from .models import PushSubscription
from accounts.models import User
from logbooks.models import WeeklyLog
from placements.models import InternshipPlacement
from reviews.models import LogReview
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
import json
try:
    from pywebpush import webpush
except Exception:
    webpush = None


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications for the current user"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all unread notifications as read for the current user"""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'marked_as_read': updated})

    def _is_admin(self, user):
        role_name = (user.role.role_name if user.role else '').strip().lower()
        return user.is_superuser or role_name == 'admin'

    def _upsert_admin_notification(self, user, notification_type, message, details):
        now = timezone.now()
        recent = Notification.objects.filter(
            user=user,
            notification_type=notification_type,
            created_at__gte=now - timedelta(hours=6),
        ).order_by('-created_at').first()

        if recent:
            recent.message = message
            recent.details = details
            recent.is_read = False
            recent.save(update_fields=['message', 'details', 'is_read'])
            return recent

        return Notification.objects.create(
            user=user,
            message=message,
            notification_type=notification_type,
            is_read=False,
            details=details,
        )

    @action(detail=False, methods=['post'])
    def send_test(self, request):
        """Send a test notification to the current user.

        Creates a Notification object and attempts push delivery if subscriptions
        and VAPID keys are configured. Returns created notification and push results.
        """
        user = request.user
        payload = request.data.get('payload', {'title': 'ILES - Test', 'body': 'This is a test notification'})
        notif = Notification.objects.create(
            user=user,
            message=payload.get('body', 'Test notification'),
            notification_type=payload.get('type', 'system_health_update'),
            is_read=False,
            details=payload,
        )

        push_results = []
        subscriptions = PushSubscription.objects.filter(user=user)
        vapid_private = getattr(settings, 'WEBPUSH_VAPID_PRIVATE_KEY', None)
        vapid_public = getattr(settings, 'WEBPUSH_VAPID_PUBLIC_KEY', None)
        vapid_email = getattr(settings, 'WEBPUSH_CONTACT_EMAIL', settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else None)

        if webpush and vapid_private and vapid_public and subscriptions.exists():
            for sub in subscriptions:
                sub_info = {
                    'endpoint': sub.endpoint,
                    'keys': {
                        'p256dh': sub.p256dh,
                        'auth': sub.auth,
                    }
                }
                try:
                    webpush(
                        subscription_info=sub_info,
                        data=json.dumps(payload),
                        vapid_private_key=vapid_private,
                        vapid_claims={"sub": f"mailto:{vapid_email}"},
                    )
                    push_results.append({'endpoint': sub.endpoint, 'status': 'sent'})
                except Exception as e:
                    push_results.append({'endpoint': sub.endpoint, 'status': 'error', 'detail': str(e)})
        else:
            if not subscriptions.exists():
                push_results.append({'status': 'no_subscriptions'})
            elif not webpush:
                push_results.append({'status': 'pywebpush_not_installed'})
            else:
                push_results.append({'status': 'vapid_not_configured'})

        serializer = NotificationSerializer(notif)
        return Response({'notification': serializer.data, 'push': push_results})

    @action(detail=False, methods=['post'])
    def admin_system_snapshot(self, request):
        """Generate/update admin notifications for current system status."""
        if not self._is_admin(request.user):
            return Response({'detail': 'Only admins can trigger this action.'}, status=status.HTTP_403_FORBIDDEN)

        pending_log_reviews = WeeklyLog.objects.filter(status='submitted').count()
        pending_placements = InternshipPlacement.objects.filter(status='pending').count()
        pending_revision_reviews = LogReview.objects.filter(status='needs_revision').count()
        rejected_reviews = LogReview.objects.filter(status='rejected').count()

        pending_updates_total = pending_log_reviews + pending_placements + pending_revision_reviews
        alerts_total = rejected_reviews + pending_revision_reviews
        health_score = max(55, 100 - (pending_updates_total + alerts_total) * 4)

        admins = User.objects.filter(is_active=True).filter(role__role_name__iexact='admin')
        if not admins.filter(user_id=request.user.user_id).exists():
            admins = admins | User.objects.filter(user_id=request.user.user_id)

        created_or_updated = 0
        for admin in admins.distinct():
            self._upsert_admin_notification(
                admin,
                'server_status_update',
                'Server status: Operational',
                {
                    'status': 'operational',
                    'updated_at': timezone.now().isoformat(),
                },
            )
            created_or_updated += 1

            self._upsert_admin_notification(
                admin,
                'system_health_update',
                f'System health score is {health_score}%',
                {
                    'health_score': health_score,
                    'pending_updates': pending_updates_total,
                    'alerts': alerts_total,
                },
            )
            created_or_updated += 1

            self._upsert_admin_notification(
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
            created_or_updated += 1

            self._upsert_admin_notification(
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
            created_or_updated += 1

        return Response({'notifications_created_or_updated': created_or_updated})


class DeadlineViewSet(viewsets.ModelViewSet):
    queryset = Deadline.objects.all()
    serializer_class = DeadlineSerializer
    permission_classes = [IsAuthenticated]


class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """Create / list / delete push subscriptions for the current user."""
    queryset = PushSubscription.objects.all()
    serializer_class = PushSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LoginHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """View login history for the current user."""
    queryset = LoginHistory.objects.all()
    serializer_class = LoginHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return login history for the current user, ordered by most recent first."""
        return self.queryset.filter(user=self.request.user).order_by('-logged_in_at')

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get the 10 most recent login events for the current user."""
        logins = self.get_queryset()[:10]
        serializer = self.get_serializer(logins, many=True)
        return Response(serializer.data)


