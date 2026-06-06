from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Role, Student, Supervisor
import uuid

class SupervisorAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create roles
        self.admin_role = Role.objects.create(role_name='Admin')
        self.student_role = Role.objects.create(role_name='Student')
        self.academic_role = Role.objects.create(role_name='Academic Supervisor')
        
        # Create admin
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            first_name='Admin',
            last_name='User',
            role=self.admin_role
        )
        
        # Create students
        self.student_users = []
        self.students = []
        for i in range(3):
            user = User.objects.create_user(
                email=f'student{i}@example.com',
                password='password123',
                first_name=f'Student',
                last_name=f'{i}',
                role=self.student_role
            )
            student = Student.objects.create(
                user=user,
                registration_number=f'REG{i}',
                program='CS',
                year_of_study=1,
                expected_graduation='2027-01-01'
            )
            self.student_users.append(user)
            self.students.append(student)
            
        # Create academic supervisor
        self.supervisor_user = User.objects.create_user(
            email='supervisor@example.com',
            password='password123',
            first_name='Supervisor',
            last_name='User',
            role=self.academic_role
        )
        self.supervisor = Supervisor.objects.create(
            user=self.supervisor_user,
            supervisor_type='academic'
        )

    def test_admin_bulk_assign_supervisor(self):
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('student-bulk-assign-supervisor')
        student_ids = [str(s.student_id) for s in self.students]
        
        data = {
            'student_ids': student_ids,
            'supervisor_id': str(self.supervisor.supervisor_id)
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_count'], 3)
        
        # Verify in DB
        for student in self.students:
            student.refresh_from_db()
            self.assertEqual(student.academic_supervisor, self.supervisor)

    def test_non_admin_cannot_bulk_assign(self):
        self.client.force_authenticate(user=self.student_users[0])
        
        url = reverse('student-bulk-assign-supervisor')
        data = {
            'student_ids': [str(self.students[0].student_id)],
            'supervisor_id': str(self.supervisor.supervisor_id)
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
