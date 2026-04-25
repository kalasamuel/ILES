from django.core import mail
from django.test import TestCase, override_settings

from accounts.models import Role, User
from .models import Notification


class NotificationEmailTests(TestCase):
	def setUp(self):
		role = Role.objects.create(role_name='Student')
		self.user = User.objects.create_user(
			email='notify-user@example.com',
			password='StrongPassword123',
			first_name='Notify',
			last_name='User',
			role=role,
		)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_email_sent_when_notification_created(self):
		Notification.objects.create(
			user=self.user,
			message='Your weekly log was approved.',
			notification_type='feedback_added',
		)

		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('New ILES Notification', mail.outbox[0].subject)
		self.assertIn('Your weekly log was approved.', mail.outbox[0].body)
		self.assertEqual(mail.outbox[0].to, [self.user.email])

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_email_not_sent_when_notification_updated(self):
		notification = Notification.objects.create(
			user=self.user,
			message='Initial message',
			notification_type='feedback_added',
		)
		mail.outbox.clear()

		notification.message = 'Updated message'
		notification.save(update_fields=['message'])

		self.assertEqual(len(mail.outbox), 0)

