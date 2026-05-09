from django.core import mail
from django.test import TestCase, override_settings

from accounts.models import Role, User, UserSettings
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
	def test_login_alert_email_sent_when_notification_created(self):
		Notification.objects.create(
			user=self.user,
			message='New login detected on Chrome for Windows.',
			notification_type='login_alert',
		)

		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Login Alert', mail.outbox[0].subject)
		self.assertIn('New login detected on Chrome for Windows.', mail.outbox[0].body)
		self.assertEqual(mail.outbox[0].to, [self.user.email])

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_email_not_sent_when_email_notifications_disabled(self):
		settings_obj, _ = UserSettings.objects.get_or_create(user=self.user)
		settings_obj.email_notifications = False
		settings_obj.save(update_fields=['email_notifications'])

		Notification.objects.create(
			user=self.user,
			message='A new placement update is available.',
			notification_type='placement_approved',
		)

		self.assertEqual(len(mail.outbox), 0)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_email_not_sent_when_review_alerts_disabled_for_review_types(self):
		settings_obj, _ = UserSettings.objects.get_or_create(user=self.user)
		settings_obj.review_alerts = False
		settings_obj.save(update_fields=['review_alerts'])

		Notification.objects.create(
			user=self.user,
			message='Your log has feedback from supervisor.',
			notification_type='feedback_added',
		)

		self.assertEqual(len(mail.outbox), 0)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_email_not_sent_when_log_reminders_disabled_for_deadline_type(self):
		settings_obj, _ = UserSettings.objects.get_or_create(user=self.user)
		settings_obj.log_reminders = False
		settings_obj.save(update_fields=['log_reminders'])

		Notification.objects.create(
			user=self.user,
			message='Submit your weekly log before Friday.',
			notification_type='submission_deadline',
		)

		self.assertEqual(len(mail.outbox), 0)

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

