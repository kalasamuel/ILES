from unittest.mock import patch
from io import BytesIO

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.models import Notification

from .models import Department, Role, User


class PasswordResetWorkflowTests(APITestCase):
	def setUp(self):
		cache.clear()
		self.role = Role.objects.create(role_name='Student')
		self.user = User.objects.create_user(
			email='student@example.com',
			password='OldPassword123',
			first_name='Test',
			last_name='User',
			role=self.role,
		)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		FRONTEND_URL='http://localhost:5173',
	)
	@patch('accounts.views.get_random_string', return_value='123456')
	def test_forgot_password_sends_reset_link(self, mock_token):
		response = self.client.post(
			'/api/accounts/users/forgot-password/',
			{'email': self.user.email},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response.data['message'],
			'If that email is registered, a verification code has been sent.',
		)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Your ILES Password Verification Code', mail.outbox[0].subject)
		self.assertIn('123456', mail.outbox[0].body)
		self.assertIn('http://localhost:5173/reset-password', mail.outbox[0].body)
		self.assertEqual(cache.get('password_reset_123456'), self.user.user_id)
		mock_token.assert_called_once_with(6, allowed_chars='0123456789')

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		FRONTEND_URL='http://localhost:5173',
	)
	@patch('accounts.views.get_random_string', return_value='654321')
	def test_reset_password_changes_password_and_invalidates_token(self, mock_token):
		self.client.post(
			'/api/accounts/users/forgot-password/',
			{'email': self.user.email},
			format='json',
		)

		response = self.client.post(
			'/api/accounts/users/reset-password/',
			{
				'verification_code': '654321',
				'new_password': 'NewPassword123',
				'confirm_password': 'NewPassword123',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response.data['message'],
			'Password reset successfully. You can now log in.',
		)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('NewPassword123'))
		self.assertIsNone(cache.get('password_reset_654321'))
		mock_token.assert_called_once_with(6, allowed_chars='0123456789')

	def test_reset_password_rejects_invalid_token(self):
		response = self.client.post(
			'/api/accounts/users/reset-password/',
			{
				'verification_code': 'invalid-code',
				'new_password': 'NewPassword123',
				'confirm_password': 'NewPassword123',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error'], 'Verification code is invalid or has expired.')


class UserSettingsWorkflowTests(APITestCase):
	def setUp(self):
		self.role = Role.objects.create(role_name='Student')
		self.department = Department.objects.create(
			department_name='Computer Science',
			faculty='Science',
			university='Makerere University',
		)
		self.user = User.objects.create_user(
			email='settings-user@example.com',
			password='OldPassword123',
			first_name='Settings',
			last_name='User',
			role=self.role,
		)
		self.client.force_authenticate(user=self.user)

	def _make_image_upload(self, name='avatar.png', size=(256, 256), image_format='PNG'):
		buffer = BytesIO()
		Image.new('RGB', size=size, color=(30, 144, 255)).save(buffer, format=image_format)
		return SimpleUploadedFile(name, buffer.getvalue(), content_type=f'image/{image_format.lower()}')

	def test_me_settings_get_creates_default_settings(self):
		response = self.client.get('/api/accounts/users/me/settings/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('email_notifications', response.data)
		self.assertIn('profile_visible', response.data)

	def test_profile_update_persists_profile_fields(self):
		response = self.client.patch(
			'/api/accounts/users/me/',
			{
				'first_name': 'Updated',
				'last_name': 'Name',
				'email': 'updated-user@example.com',
				'phone_number': '+256700000123',
				'department_id': str(self.department.department_id),
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.user.refresh_from_db()
		self.assertEqual(self.user.first_name, 'Updated')
		self.assertEqual(self.user.last_name, 'Name')
		self.assertEqual(self.user.email, 'updated-user@example.com')
		self.assertEqual(self.user.phone_number, '+256700000123')
		self.assertEqual(self.user.department_id, self.department.department_id)

	def test_profile_update_rejects_duplicate_email(self):
		User.objects.create_user(
			email='taken@example.com',
			password='AnotherPassword123',
			first_name='Taken',
			last_name='User',
			role=self.role,
		)

		response = self.client.patch(
			'/api/accounts/users/me/',
			{'email': 'taken@example.com'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error'], 'That email is already in use.')

	def test_profile_picture_upload_and_remove(self):
		upload = self._make_image_upload(name='avatar.png', size=(300, 300), image_format='PNG')

		upload_response = self.client.patch(
			'/api/accounts/users/me/',
			{'profile_picture': upload},
			format='multipart',
		)

		self.assertEqual(upload_response.status_code, status.HTTP_200_OK)
		self.user.refresh_from_db()
		self.assertTrue(bool(self.user.profile_picture))
		self.assertIn('profile_pictures/', self.user.profile_picture.name)
		self.assertIsNotNone(upload_response.data.get('profile_picture_url'))

		remove_response = self.client.patch(
			'/api/accounts/users/me/',
			{'remove_profile_picture': 'true'},
			format='multipart',
		)

		self.assertEqual(remove_response.status_code, status.HTTP_200_OK)
		self.user.refresh_from_db()
		self.assertFalse(bool(self.user.profile_picture))
		self.assertIsNone(remove_response.data.get('profile_picture_url'))

	def test_profile_picture_rejects_too_small_dimensions(self):
		upload = self._make_image_upload(name='tiny.png', size=(32, 32), image_format='PNG')

		response = self.client.patch(
			'/api/accounts/users/me/',
			{'profile_picture': upload},
			format='multipart',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('profile_picture', response.data)
		self.assertIn('too small', str(response.data['profile_picture'][0]).lower())

	def test_profile_picture_rejects_file_larger_than_5mb(self):
		upload = self._make_image_upload(name='large.png', size=(512, 512), image_format='PNG')
		upload.size = 5 * 1024 * 1024 + 1

		response = self.client.patch(
			'/api/accounts/users/me/',
			{'profile_picture': upload},
			format='multipart',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('profile_picture', response.data)
		self.assertIn('5mb', str(response.data['profile_picture'][0]).lower())

	def test_settings_update_persists_notification_and_privacy_preferences(self):
		response = self.client.patch(
			'/api/accounts/users/me/settings/',
			{
				'email_notifications': False,
				'push_notifications': False,
				'log_reminders': False,
				'review_alerts': False,
				'weekly_summary': True,
				'profile_visible': False,
				'show_email': True,
				'show_phone': True,
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertFalse(response.data['email_notifications'])
		self.assertFalse(response.data['profile_visible'])
		self.assertTrue(response.data['show_email'])

	def test_change_password_validates_and_updates_password(self):
		invalid_response = self.client.post(
			'/api/accounts/users/me/change-password/',
			{
				'current_password': 'WrongPassword123',
				'new_password': 'ValidNewPassword123',
				'confirm_password': 'ValidNewPassword123',
			},
			format='json',
		)

		self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(invalid_response.data['error'], 'Current password is incorrect.')

		valid_response = self.client.post(
			'/api/accounts/users/me/change-password/',
			{
				'current_password': 'OldPassword123',
				'new_password': 'ValidNewPassword123',
				'confirm_password': 'ValidNewPassword123',
			},
			format='json',
		)

		self.assertEqual(valid_response.status_code, status.HTTP_200_OK)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('ValidNewPassword123'))


class LoginNotificationWorkflowTests(APITestCase):
	def setUp(self):
		self.role = Role.objects.create(role_name='Student')
		self.user = User.objects.create_user(
			email='login-user@example.com',
			password='StrongPassword123',
			first_name='Login',
			last_name='User',
			role=self.role,
		)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	@patch('accounts.views.get_location_from_ip')
	@patch('accounts.views.extract_device_info')
	def test_login_sends_email_and_creates_notification(self, mock_device_info, mock_location_info):
		mock_device_info.return_value = {
			'device_name': 'Chrome on Windows',
			'device_type': 'desktop',
			'browser': 'Chrome',
			'operating_system': 'Windows',
		}
		mock_location_info.return_value = {
			'location': 'Kampala, UG',
			'country': 'Uganda',
			'city': 'Kampala',
			'latitude': None,
			'longitude': None,
		}

		response = self.client.post(
			'/api/accounts/users/login/',
			{
				'email': self.user.email,
				'password': 'StrongPassword123',
			},
			format='json',
			HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(Notification.objects.filter(user=self.user, notification_type='login_alert').count(), 1)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('New ILES Login Alert', mail.outbox[0].subject)
		self.assertEqual(mail.outbox[0].to, [self.user.email])
		self.assertIn('A new sign-in to your ILES account was detected.', mail.outbox[0].body)
