import os
import sys
import django
import random
from datetime import timedelta
from django.utils import timezone
from faker import Faker
from decimal import Decimal

# Add the project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')
django.setup()

from django.conf import settings

# Force dummy email backend to prevent SMTP limits during generation
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Import models
from accounts.models import Role, Department, User, Student, Supervisor
from organizations.models import Organization
from placements.models import InternshipPlacement
from logbooks.models import WeeklyLog
from reviews.models import LogReview
from evaluations.models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

fake = Faker()

def seed_student(email, password):
    print(f"🎯 Seeding data for student: {email}")

    # 1. Base Setup (Role & Dept)
    student_role, _ = Role.objects.get_or_create(role_name="Student")
    academic_role, _ = Role.objects.get_or_create(role_name="Academic Supervisor")
    workplace_role, _ = Role.objects.get_or_create(role_name="Workplace Supervisor")
    
    dept, _ = Department.objects.get_or_create(
        department_name="Software Engineering Department",
        defaults={'faculty': 'Engineering', 'university': 'Makerere University'}
    )

    # 2. Create/Update User & Student
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'first_name': 'Samuel',
            'last_name': 'Kala',
            'role': student_role,
            'department': dept,
            'is_active': True
        }
    )
    user.set_password(password)
    user.save()

    student, _ = Student.objects.get_or_create(
        user=user,
        defaults={
            'registration_number': f"REG/{random.randint(1000,9999)}/22",
            'program': 'Bachelor of Science in Software Engineering',
            'year_of_study': 3,
            'expected_graduation': timezone.now().date() + timedelta(days=365)
        }
    )

    # 3. Create Supporting Entities for Placement
    org = Organization.objects.create(
        name="Global Tech Solutions Uganda",
        industry="Software Development",
        address="Plot 45, Kampala Road",
        city="Kampala",
        country="Uganda",
        contact_email="hr@globaltech.ug",
        contact_phone="+256770000000"
    )

    # Academic Supervisor
    a_user = User.objects.create_user(
        email=f"academic_supervisor_{random.randint(100,999)}@gmail.com",
        password="password123",
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        role=academic_role,
        department=dept
    )
    academic_super = Supervisor.objects.create(user=a_user, supervisor_type='academic', department=dept)

    # Workplace Supervisor
    w_user = User.objects.create_user(
        email=f"workplace_supervisor_{random.randint(100,999)}@gmail.com",
        password="password123",
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        role=workplace_role
    )
    workplace_super = Supervisor.objects.create(user=w_user, supervisor_type='workplace', organization=org)

    # 4. Placement
    placement = InternshipPlacement.objects.create(
        student=student,
        organization=org,
        academic_supervisor=academic_super,
        workplace_supervisor=workplace_super,
        workplace_supervisor_email=w_user.email,
        start_date=timezone.now().date() - timedelta(weeks=12),
        end_date=timezone.now().date() + timedelta(weeks=2),
        position_title="Junior Software Engineer Intern",
        status='approved',
        is_submitted=True,
        submitted_at=timezone.now()
    )

    # 5. 12 Weeks of Logs & Reviews
    print("Generating 12 weeks of logbook history...")
    for week in range(1, 13):
        log = WeeklyLog.objects.create(
            placement=placement,
            week_number=week,
            start_date=placement.start_date + timedelta(weeks=week-1),
            end_date=placement.start_date + timedelta(weeks=week-1, days=6),
            activities_performed=f"Performed tasks for week {week}. Included {fake.sentence()} and {fake.sentence()}.",
            skills_learned=f"Learned {fake.word()} and improved on {fake.word()}.",
            challenges=fake.sentence(),
            solutions=fake.sentence(),
            hours_worked=Decimal("40.00"),
            status='approved'
        )
        
        LogReview.objects.create(
            log=log,
            supervisor=workplace_super,
            comments=f"Great work in week {week}! Focused and systematic.",
            rating=Decimal(random.randint(4, 5)),
            status='approved'
        )

    # 6. Final Evaluation
    print("Generating final evaluation...")
    criteria_names = ["Professionalism", "Technical Skills", "Teamwork", "Attendance"]
    evaluation = Evaluation.objects.create(
        placement=placement,
        evaluator=academic_super,
        evaluation_date=timezone.now().date(),
        total_score=Decimal("88.50"),
        grade='A',
        comments="Samuel has shown exceptional growth and technical competence during this internship."
    )

    for name in criteria_names:
        crit, _ = EvaluationCriteria.objects.get_or_create(
            name=name,
            defaults={'description': fake.sentence(), 'weight_percentage': Decimal("25.00"), 'max_score': Decimal("100.00")}
        )
        EvaluationScore.objects.create(
            evaluation=evaluation,
            criteria=crit,
            score=Decimal(random.randint(85, 95))
        )

    ScoreBreakdown.objects.create(
        placement=placement,
        supervisor_score=Decimal("90.00"),
        academic_score=Decimal("87.00"),
        logbook_score=Decimal("95.00"),
        final_score=Decimal("90.67"),
        grade='A'
    )

    print(f"✅ Successfully seeded full history for {email}")

if __name__ == "__main__":
    seed_student("kalasamuel79@gmail.com", "kalasam123")
