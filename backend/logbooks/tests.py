from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from datetime import date
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from datetime import timedelta

from accounts.models import Department, Role, Student, Supervisor, User
from notifications.models import Notification
from placements.models import InternshipPlacement
from organizations.models import Organization
from .models import WeeklyLog


class WeeklyLogSubmissionNotificationTests(APITestCase):
	def setUp(self):
		self.student_role = Role.objects.create(role_name='Student')
		self.supervisor_role = Role.objects.create(role_name='Supervisor')
		self.department = Department.objects.create(
			department_name='Computer Science',
			faculty='Science',
			university='Makerere University',
		)
		self.organization = Organization.objects.create(
			name='Tech Hub Ltd',
			industry='Technology',
			address='Plot 1 Industrial Area',
			city='Kampala',
			country='Uganda',
			contact_email='hr@techhub.example',
			contact_phone='+256700000001',
		)
		self.student_user = User.objects.create_user(
			email='student@example.com',
			password='StudentPassword123',
			first_name='Student',
			last_name='One',
			role=self.student_role,
		)
		self.workplace_user = User.objects.create_user(
			email='workplace.supervisor@example.com',
			password='SupervisorPassword123',
			first_name='Workplace',
			last_name='Supervisor',
			role=self.supervisor_role,
		)
		self.academic_user = User.objects.create_user(
			email='academic.supervisor@example.com',
			password='SupervisorPassword123',
			first_name='Academic',
			last_name='Supervisor',
			role=self.supervisor_role,
		)
		self.student = Student.objects.create(
			user=self.student_user,
			registration_number='STU-001',
			program='BSc Computer Science',
			year_of_study=3,
			expected_graduation=date(2027, 6, 30),
		)
		self.workplace_supervisor = Supervisor.objects.create(
			user=self.workplace_user,
			supervisor_type='workplace',
			organization=self.organization,
		)
		self.academic_supervisor = Supervisor.objects.create(
			user=self.academic_user,
			supervisor_type='academic',
			department=self.department,
		)
		self.placement = InternshipPlacement.objects.create(
			student=self.student,
			organization=self.organization,
			workplace_supervisor=self.workplace_supervisor,
			academic_supervisor=self.academic_supervisor,
			start_date=date(2026, 1, 1),
			end_date=date(2026, 6, 30),
			position_title='Software Intern',
			status='approved',
		)
		self.log = WeeklyLog.objects.create(
			placement=self.placement,
			week_number=1,
			start_date=date(2026, 4, 20),
			end_date=date(2026, 4, 26),
			activities_performed='Built weekly report drafts.',
			skills_learned='Django notifications.',
			challenges='Debugging email flow.',
			solutions='Added integration coverage.',
			hours_worked=Decimal('40.00'),
		)
		self.client.force_authenticate(user=self.student_user)

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_submit_creates_student_confirmation_and_supervisor_emails(self):
		response = self.client.post(f'/api/logbooks/logs/{self.log.log_id}/submit/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['message'], 'Log submitted')

		self.log.refresh_from_db()
		self.assertEqual(self.log.status, 'submitted')
		self.assertIsNotNone(self.log.submitted_at)

		notifications = Notification.objects.filter(log=self.log, notification_type='log_submitted')
		self.assertEqual(notifications.count(), 3)
		self.assertTrue(
			notifications.filter(user=self.student_user, message__icontains='successfully submitted').exists()
		)
		self.assertTrue(
			notifications.filter(user=self.workplace_user, message__icontains='New log submission').exists()
		)
		self.assertTrue(
			notifications.filter(user=self.academic_user, message__icontains='New log submission').exists()
		)

		recipients = sorted(email.to[0] for email in mail.outbox)
		self.assertEqual(
			recipients,
			[
				'academic.supervisor@example.com',
				'student@example.com',
				'workplace.supervisor@example.com',
			],
		)
		self.assertTrue(any('Your log for Week 1 was successfully submitted' in email.body for email in mail.outbox))
		self.assertTrue(any('New log submission from Student One - Week 1' in email.body for email in mail.outbox))

	@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
	def test_schedule_defers_submission_until_management_command_runs(self):
		future_time = timezone.now() + timedelta(hours=2)
		response = self.client.post(
			f'/api/logbooks/logs/{self.log.log_id}/schedule/',
			{'scheduled_submission_at': future_time.isoformat()},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.log.refresh_from_db()
		self.assertEqual(self.log.status, 'scheduled')
		self.assertIsNotNone(self.log.scheduled_submission_at)
		self.assertIsNone(self.log.submitted_at)
		self.assertEqual(mail.outbox, [])

		self.log.scheduled_submission_at = timezone.now() - timedelta(minutes=1)
		self.log.save(update_fields=['scheduled_submission_at'])
		call_command('process_scheduled_logs')

		self.log.refresh_from_db()
		self.assertEqual(self.log.status, 'submitted')
		self.assertIsNotNone(self.log.submitted_at)
		self.assertGreaterEqual(len(mail.outbox), 3)