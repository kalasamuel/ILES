from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Department, Role, Student, Supervisor, User
from notifications.models import Notification
from organizations.models import Organization
from .models import InternshipPlacement, PlacementDocument


class PlacementSubmissionWorkflowTests(APITestCase):
	def setUp(self):
		student_role = Role.objects.create(role_name='Student')
		academic_role = Role.objects.create(role_name='Academic Supervisor')
		workplace_role = Role.objects.create(role_name='Workplace Supervisor')
		self.department = Department.objects.create(
			department_name='Computer Science',
			faculty='Science',
			university='ILES University',
		)
		self.student_user = User.objects.create_user(
			email='student@example.com',
			password='StudentPassword123',
			first_name='Student',
			last_name='Example',
			role=student_role,
			department=self.department,
		)
		self.student = Student.objects.create(
			user=self.student_user,
			registration_number='STU-001',
			program='Computer Science',
			year_of_study=3,
			expected_graduation='2027-06-30',
		)
		academic_user = User.objects.create_user(
			email='academic@example.com',
			password='AcademicPassword123',
			first_name='Academic',
			last_name='Supervisor',
			role=academic_role,
			department=self.department,
		)
		self.academic_supervisor = Supervisor.objects.create(
			user=academic_user,
			supervisor_type='academic',
			department=self.department,
		)
		self.organization = Organization.objects.create(
			name='Acme Labs',
			industry='Technology',
			address='1 Innovation Way',
			city='Dar es Salaam',
			country='Tanzania',
			contact_email='hr@acme.example',
			contact_phone='+255700000000',
		)
		workplace_user = User.objects.create_user(
			email='supervisor@acme.example',
			password='WorkplacePassword123',
			first_name='Workplace',
			last_name='Supervisor',
			role=workplace_role,
		)
		self.workplace_supervisor = Supervisor.objects.create(
			user=workplace_user,
			supervisor_type='workplace',
			organization=self.organization,
		)
		self.client.force_authenticate(user=self.student_user)

	def _placement_letter(self):
		return SimpleUploadedFile(
			'acceptance-letter.pdf',
			b'%PDF-1.4 fake placement letter',
			content_type='application/pdf',
		)

	def test_student_can_submit_placement_with_letter_and_supervisor_email(self):
		response = self.client.post(
			'/api/placements/placements/',
			{
				'organization': str(self.organization.organization_id),
				'position_title': 'Software Engineering Intern',
				'start_date': '2026-06-01',
				'end_date': '2026-08-31',
				'workplace_supervisor_email': 'supervisor@acme.example',
				'acceptance_letter': self._placement_letter(),
			},
			format='multipart',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		placement = InternshipPlacement.objects.get(placement_id=response.data['placement_id'])
		self.assertTrue(placement.is_submitted)
		self.assertIsNotNone(placement.submitted_at)
		self.assertTrue(PlacementDocument.objects.filter(placement=placement, document_type='acceptance_letter').exists())
		self.assertTrue(Supervisor.objects.filter(user__email='supervisor@acme.example', supervisor_type='workplace').exists())
		self.assertEqual(Notification.objects.filter(notification_type='placement_submitted', user=self.student_user).count(), 1)
		self.assertEqual(Notification.objects.filter(notification_type='placement_submitted').count(), 3)

	def test_locked_placement_rejects_student_updates_until_letter_deleted(self):
		placement = InternshipPlacement.objects.create(
			student=self.student,
			organization=self.organization,
			workplace_supervisor=self.workplace_supervisor,
			academic_supervisor=self.academic_supervisor,
			workplace_supervisor_email='supervisor@acme.example',
			start_date='2026-06-01',
			end_date='2026-08-31',
			position_title='Software Engineering Intern',
			is_submitted=True,
		)
		PlacementDocument.objects.create(
			placement=placement,
			document_type='acceptance_letter',
			file_url=self._placement_letter(),
		)

		update_response = self.client.patch(
			f'/api/placements/placements/{placement.placement_id}/',
			{'position_title': 'Updated Role Title'},
			format='json',
		)

		self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('acceptance_letter', update_response.data)

		document = placement.placementdocument_set.get(document_type='acceptance_letter')
		delete_response = self.client.delete(f'/api/placements/documents/{document.document_id}/')

		self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
		placement.refresh_from_db()
		self.assertFalse(placement.is_submitted)
		self.assertFalse(placement.placementdocument_set.filter(document_type='acceptance_letter').exists())

		reopened_response = self.client.patch(
			f'/api/placements/placements/{placement.placement_id}/',
			{'position_title': 'Updated Role Title'},
			format='json',
		)

		self.assertIn(reopened_response.status_code, {status.HTTP_200_OK, status.HTTP_202_ACCEPTED})
