import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import Role, User, Student, Department, Supervisor
from organizations.models import Organization
from placements.models import InternshipPlacement
from evaluations.models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown


class Command(BaseCommand):
    help = 'Populate database with test evaluation data'

    def handle(self, *args, **options):
        self.stdout.write('Starting database population...')

        # Create or get roles
        student_role, _ = Role.objects.get_or_create(role_name='Student')
        supervisor_role, _ = Role.objects.get_or_create(role_name='Supervisor')

        # Create or get departments
        dept, _ = Department.objects.get_or_create(
            department_name='Computer Science',
            defaults={'faculty': 'Engineering', 'university': 'Test University'}
        )

        # Create evaluation criteria
        criteria_data = [
            {'name': 'Technical Skills', 'description': 'Assessment of technical competencies', 'weight': Decimal('25.00'), 'max_score': Decimal('100.00')},
            {'name': 'Communication', 'description': 'Quality of written and verbal communication', 'weight': Decimal('25.00'), 'max_score': Decimal('100.00')},
            {'name': 'Professionalism', 'description': 'Conduct and professionalism in workplace', 'weight': Decimal('25.00'), 'max_score': Decimal('100.00')},
            {'name': 'Problem Solving', 'description': 'Ability to identify and solve problems', 'weight': Decimal('25.00'), 'max_score': Decimal('100.00')},
        ]

        criteria_objects = {}
        for criteria in criteria_data:
            obj, created = EvaluationCriteria.objects.get_or_create(
                name=criteria['name'],
                defaults={
                    'description': criteria['description'],
                    'weight_percentage': criteria['weight'],
                    'max_score': criteria['max_score']
                }
            )
            criteria_objects[criteria['name']] = obj
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {criteria['name']}")

        # Create test users and students
        test_students = []
        for i in range(5):
            email = f'student{i+1}@test.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': f'Student{i+1}',
                    'last_name': f'Test{i+1}',
                    'role': student_role,
                    'department': dept,
                    'is_active': True
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            student, created = Student.objects.get_or_create(
                user=user,
                defaults={
                    'registration_number': f'REG{i+1:05d}',
                    'program': 'Bachelor of Science in Computer Science',
                    'year_of_study': 3,
                    'expected_graduation': timezone.now().date() + timedelta(days=365)
                }
            )
            test_students.append(student)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {user.first_name} {user.last_name}")

        # Create test supervisors
        test_supervisors = []
        for i in range(3):
            email = f'supervisor{i+1}@test.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': f'Supervisor{i+1}',
                    'last_name': f'Test{i+1}',
                    'role': supervisor_role,
                    'department': dept,
                    'is_active': True
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            supervisor_type = 'academic' if i % 2 == 0 else 'workplace'
            supervisor, created = Supervisor.objects.get_or_create(
                user=user,
                defaults={'supervisor_type': supervisor_type}
            )
            test_supervisors.append(supervisor)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {user.first_name} {user.last_name}")

        # Create test organizations
        orgs = []
        org_names = ['Tech Corp', 'Innovation Labs', 'Digital Solutions']
        for org_name in org_names:
            org, created = Organization.objects.get_or_create(
                name=org_name,
                defaults={
                    'industry': 'Technology',
                    'address': f'123 {org_name} Street',
                    'city': 'San Francisco',
                    'country': 'USA',
                    'contact_email': f'contact@{org_name.lower().replace(" ", "")}.com',
                    'contact_phone': '555-0100'
                }
            )
            orgs.append(org)
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: {org_name}")

        # Create test placements and evaluations
        for student_idx, student in enumerate(test_students):
            org = orgs[student_idx % len(orgs)]
            workplace_supervisor = test_supervisors[0]
            academic_supervisor = test_supervisors[1 if len(test_supervisors) > 1 else 0]

            placement, created = InternshipPlacement.objects.get_or_create(
                student=student,
                organization=org,
                defaults={
                    'workplace_supervisor': workplace_supervisor,
                    'academic_supervisor': academic_supervisor,
                    'start_date': timezone.now().date() - timedelta(days=90),
                    'end_date': timezone.now().date() + timedelta(days=90),
                    'position_title': 'Software Development Intern',
                    'status': 'approved'
                }
            )
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f"  {status}: Placement for {student.user.first_name}")

            # Create evaluation if it doesn't exist
            evaluation, created = Evaluation.objects.get_or_create(
                placement=placement,
                defaults={
                    'evaluator': academic_supervisor,
                    'evaluation_date': timezone.now().date(),
                    'comments': 'Good performance overall. Shows strong technical aptitude and collaboration skills.'
                }
            )

            if created:
                # Generate random scores for each criteria
                total_weighted_score = Decimal('0')
                total_weight = Decimal('0')

                for criteria_name, criteria_obj in criteria_objects.items():
                    # Generate score between 70-95
                    score = Decimal(random.randint(70, 95))
                    
                    EvaluationScore.objects.get_or_create(
                        evaluation=evaluation,
                        criteria=criteria_obj,
                        defaults={'score': score}
                    )
                    
                    # Calculate weighted contribution
                    percentage = (score / criteria_obj.max_score) * Decimal('100')
                    total_weighted_score += percentage * (criteria_obj.weight_percentage / Decimal('100'))
                    total_weight += criteria_obj.weight_percentage

                # Set evaluation total score and grade
                avg_score = total_weighted_score if total_weight > 0 else Decimal('0')
                evaluation.total_score = avg_score.quantize(Decimal('0.01'))
                
                if avg_score >= 90:
                    evaluation.grade = 'A'
                elif avg_score >= 80:
                    evaluation.grade = 'B'
                elif avg_score >= 70:
                    evaluation.grade = 'C'
                else:
                    evaluation.grade = 'D'
                
                evaluation.save()
                self.stdout.write(f"    Created evaluation with score: {evaluation.total_score}% (Grade: {evaluation.grade})")

            # Create score breakdown
            score_breakdown, created = ScoreBreakdown.objects.get_or_create(
                placement=placement,
                defaults={
                    'supervisor_score': evaluation.total_score,
                    'academic_score': Decimal(random.randint(70, 95)),
                    'logbook_score': Decimal(random.randint(70, 95)),
                    'final_score': evaluation.total_score,
                    'grade': evaluation.grade
                }
            )
            if created:
                self.stdout.write(f"    Created score breakdown")

        self.stdout.write(self.style.SUCCESS('✓ Database population completed successfully!'))
