from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Role, User


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
	@patch('accounts.views.get_random_string', return_value='a' * 64)
	def test_forgot_password_sends_reset_link(self, mock_token):
		response = self.client.post(
			'/api/accounts/users/forgot-password/',
			{'email': self.user.email},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(
			response.data['message'],
			'If that email is registered, a reset link has been sent.',
		)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('Reset Your ILES Password', mail.outbox[0].subject)
		self.assertIn(
			'http://localhost:5173/reset-password?token=' + ('a' * 64),
			mail.outbox[0].body,
		)
		self.assertEqual(cache.get(f'password_reset_{"a" * 64}'), self.user.user_id)
		mock_token.assert_called_once_with(64)

	@override_settings(
		EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
		FRONTEND_URL='http://localhost:5173',
	)
	@patch('accounts.views.get_random_string', return_value='b' * 64)
	def test_reset_password_changes_password_and_invalidates_token(self, mock_token):
		self.client.post(
			'/api/accounts/users/forgot-password/',
			{'email': self.user.email},
			format='json',
		)

		response = self.client.post(
			'/api/accounts/users/reset-password/',
			{
				'token': 'b' * 64,
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
		self.assertIsNone(cache.get(f'password_reset_{"b" * 64}'))
		mock_token.assert_called_once_with(64)

	def test_reset_password_rejects_invalid_token(self):
		response = self.client.post(
			'/api/accounts/users/reset-password/',
			{
				'token': 'invalid-token',
				'new_password': 'NewPassword123',
				'confirm_password': 'NewPassword123',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['error'], 'Reset link is invalid or has expired.')
