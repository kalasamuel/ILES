from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Department, Role, Student, Supervisor, User
from evaluations.models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown
from organizations.models import Organization
from placements.models import InternshipPlacement


class Command(BaseCommand):
    help = 'Seed evaluation data for the academic dashboard scope used by Samuel'

    def handle(self, *args, **options):
        supervisor_email = 'kalasamuel79@gmail.com'
        supervisor = User.objects.select_related('role', 'department').filter(email=supervisor_email).first()
        if not supervisor:
            self.stdout.write(self.style.ERROR(f'Supervisor user not found: {supervisor_email}'))
            return

        if not supervisor.department:
            self.stdout.write(self.style.ERROR('Supervisor has no department assigned.'))
            return

        academic_role, _ = Role.objects.get_or_create(role_name='Academic Supervisor')
        student_role, _ = Role.objects.get_or_create(role_name='Student')
        workplace_role, _ = Role.objects.get_or_create(role_name='Supervisor')

        academic_supervisor, _ = Supervisor.objects.get_or_create(
            user=supervisor,
            defaults={
                'supervisor_type': 'academic',
                'department': supervisor.department,
            },
        )
        if academic_supervisor.department_id != supervisor.department_id:
            academic_supervisor.department = supervisor.department
            academic_supervisor.supervisor_type = 'academic'
            academic_supervisor.save(update_fields=['department', 'supervisor_type'])

        org, _ = Organization.objects.get_or_create(
            name='Samuel Academic Dashboard Org',
            defaults={
                'industry': 'Technology',
                'address': '10 Dashboard Way',
                'city': 'Kampala',
                'country': 'Uganda',
                'contact_email': 'dashboard@example.com',
                'contact_phone': '+256700000000',
            },
        )

        workplace_user, _ = User.objects.get_or_create(
            email='dashboard.workplace.supervisor@example.com',
            defaults={
                'first_name': 'Workplace',
                'last_name': 'Supervisor',
                'role': workplace_role,
                'department': supervisor.department,
                'is_active': True,
            },
        )
        workplace_supervisor, _ = Supervisor.objects.get_or_create(
            user=workplace_user,
            defaults={
                'supervisor_type': 'workplace',
                'organization': org,
                'department': supervisor.department,
            },
        )
        if workplace_supervisor.organization_id != org.organization_id or workplace_supervisor.department_id != supervisor.department_id:
            workplace_supervisor.organization = org
            workplace_supervisor.department = supervisor.department
            workplace_supervisor.supervisor_type = 'workplace'
            workplace_supervisor.save(update_fields=['organization', 'department', 'supervisor_type'])

        criteria_specs = [
            ('Technical Skills', 'Practical and technical execution', Decimal('25.00'), Decimal('100.00')),
            ('Communication', 'Clarity and professionalism in communication', Decimal('25.00'), Decimal('100.00')),
            ('Professionalism', 'Work ethic and conduct', Decimal('25.00'), Decimal('100.00')),
            ('Problem Solving', 'Analytical and problem-solving ability', Decimal('25.00'), Decimal('100.00')),
        ]
        criteria_map = {}
        for name, description, weight, max_score in criteria_specs:
            criteria_map[name], _ = EvaluationCriteria.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'weight_percentage': weight,
                    'max_score': max_score,
                },
            )

        student_specs = [
            ('samuel.dashboard.student1@example.com', 'SamuelDashStudent1', 'SD-001', 'pending', None, 'Pending review awaiting supervisor input'),
            ('samuel.dashboard.student2@example.com', 'SamuelDashStudent2', 'SD-002', 'approved', Decimal('86.25'), 'Strong performance across all criteria'),
            ('samuel.dashboard.student3@example.com', 'SamuelDashStudent3', 'SD-003', 'approved', Decimal('78.50'), 'Good progress and communication skills'),
            ('samuel.dashboard.student4@example.com', 'SamuelDashStudent4', 'SD-004', 'approved', Decimal('91.00'), 'Excellent internship execution'),
        ]

        for index, (email, first_name, reg_no, eval_status, score_value, comment) in enumerate(student_specs, start=1):
            student_user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': 'Demo',
                    'role': student_role,
                    'department': supervisor.department,
                    'is_active': True,
                },
            )
            if student_user.department_id != supervisor.department_id:
                student_user.department = supervisor.department
                student_user.role = student_role
                student_user.save(update_fields=['department', 'role'])

            student, _ = Student.objects.get_or_create(
                user=student_user,
                defaults={
                    'registration_number': reg_no,
                    'program': 'Bachelor of Science in Computer Science',
                    'year_of_study': 3,
                    'expected_graduation': timezone.now().date().replace(year=timezone.now().date().year + 1),
                },
            )

            placement, _ = InternshipPlacement.objects.get_or_create(
                student=student,
                organization=org,
                defaults={
                    'workplace_supervisor': workplace_supervisor,
                    'academic_supervisor': academic_supervisor,
                    'start_date': timezone.now().date().replace(month=1, day=15),
                    'end_date': timezone.now().date().replace(month=8, day=15),
                    'position_title': f'Academic Dashboard Intern {index}',
                    'status': 'approved',
                },
            )
            placement.workplace_supervisor = workplace_supervisor
            placement.academic_supervisor = academic_supervisor
            placement.position_title = f'Academic Dashboard Intern {index}'
            placement.status = 'approved'
            placement.save(update_fields=['workplace_supervisor', 'academic_supervisor', 'position_title', 'status'])

            evaluation_defaults = {
                'evaluator': academic_supervisor,
                'evaluation_date': timezone.now().date(),
                'comments': comment,
            }
            evaluation, _ = Evaluation.objects.get_or_create(
                placement=placement,
                defaults=evaluation_defaults,
            )
            if score_value is not None:
                evaluation.total_score = score_value
                evaluation.grade = 'A' if score_value >= 90 else 'B' if score_value >= 80 else 'C' if score_value >= 70 else 'D'
                evaluation.comments = comment
                evaluation.evaluator = academic_supervisor
                evaluation.save(update_fields=['total_score', 'grade', 'comments', 'evaluator'])

                score_breakdown_defaults = {
                    'supervisor_score': score_value - Decimal('5.00'),
                    'academic_score': score_value,
                    'logbook_score': score_value - Decimal('8.00'),
                    'final_score': score_value,
                    'grade': evaluation.grade,
                }
                ScoreBreakdown.objects.update_or_create(
                    placement=placement,
                    defaults=score_breakdown_defaults,
                )

                for criteria_name, criteria in criteria_map.items():
                    criteria_score = Decimal('0')
                    if criteria_name == 'Technical Skills':
                        criteria_score = score_value - Decimal('2.00')
                    elif criteria_name == 'Communication':
                        criteria_score = score_value - Decimal('4.00')
                    elif criteria_name == 'Professionalism':
                        criteria_score = score_value - Decimal('1.00')
                    elif criteria_name == 'Problem Solving':
                        criteria_score = score_value - Decimal('3.00')

                    EvaluationScore.objects.update_or_create(
                        evaluation=evaluation,
                        criteria=criteria,
                        defaults={'score': max(criteria_score, Decimal('0.00'))},
                    )
            else:
                evaluation.total_score = None
                evaluation.grade = None
                evaluation.comments = comment
                evaluation.evaluator = academic_supervisor
                evaluation.save(update_fields=['comments', 'evaluator', 'total_score', 'grade'])

        self.stdout.write(self.style.SUCCESS('Seeded academic dashboard evaluation data for Samuel.'))
