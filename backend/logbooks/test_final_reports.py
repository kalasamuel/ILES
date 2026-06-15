from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Role, User, Student, Supervisor
from placements.models import InternshipPlacement, Organization
from logbooks.models import FinalReport
from datetime import date
import uuid

class FinalReportTests(APITestCase):
    def setUp(self):
        self.student_role = Role.objects.create(role_name='Student')
        self.supervisor_role = Role.objects.create(role_name='Supervisor')
        self.admin_role = Role.objects.create(role_name='Admin')

        self.organization = Organization.objects.create(name='Test Org')

        self.student_user = User.objects.create_user(
            email='student@test.com', password='password', role=self.student_role
        )
        self.supervisor_user = User.objects.create_user(
            email='supervisor@test.com', password='password', role=self.supervisor_role
        )
        self.admin_user = User.objects.create_user(
            email='admin@test.com', password='password', role=self.admin_role
        )

        self.student = Student.objects.create(
            user=self.student_user, 
            registration_number='S1',
            year_of_study=3,
            expected_graduation=date(2027, 6, 30)
        )
        self.supervisor = Supervisor.objects.create(user=self.supervisor_user, supervisor_type='workplace', organization=self.organization)

        self.placement = InternshipPlacement.objects.create(
            student=self.student,
            organization=self.organization,
            workplace_supervisor=self.supervisor,
            academic_supervisor=self.supervisor,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 6, 1),
            status='approved'
        )

    def test_student_can_upload_report(self):
        self.client.force_authenticate(user=self.student_user)
        pdf_content = b'%PDF-1.4 test report content'
        pdf_file = SimpleUploadedFile('report.pdf', pdf_content, content_type='application/pdf')
        
        response = self.client.post('/api/logbooks/final-reports/', {
            'placement': self.placement.placement_id,
            'file': pdf_file
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FinalReport.objects.count(), 1)
        self.assertEqual(FinalReport.objects.first().placement, self.placement)

    def test_student_cannot_upload_for_others(self):
        other_user = User.objects.create_user(email='other@test.com', password='password', role=self.student_role)
        self.client.force_authenticate(user=other_user)
        
        pdf_file = SimpleUploadedFile('report.pdf', b'content', content_type='application/pdf')
        response = self.client.post('/api/logbooks/final-reports/', {
            'placement': self.placement.placement_id,
            'file': pdf_file
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_supervisor_can_view_assigned_report(self):
        FinalReport.objects.create(placement=self.placement, file='test.pdf')
        self.client.force_authenticate(user=self.supervisor_user)
        
        response = self.client.get('/api/logbooks/final-reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results') if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_admin_can_view_all_reports(self):
        FinalReport.objects.create(placement=self.placement, file='test.pdf')
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/logbooks/final-reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results') if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
