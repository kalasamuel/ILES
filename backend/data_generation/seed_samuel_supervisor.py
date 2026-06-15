import os
import django
import random
from datetime import timedelta
from django.utils import timezone
from decimal import Decimal
from faker import Faker

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')
django.setup()

from django.conf import settings
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

from accounts.models import User, Role, Student, Supervisor, Department
from organizations.models import Organization
from placements.models import InternshipPlacement
from logbooks.models import WeeklyLog, FinalReport
from reviews.models import LogReview

fake = Faker()

def seed_supervisor_data():
    email = "samuelkala2003@gmail.com"
    password = "kalasam123"
    
    print(f"🌱 Seeding data for supervisor: {email}")
    
    # 1. Ensure Roles exist
    student_role, _ = Role.objects.get_or_create(role_name='Student')
    workplace_role, _ = Role.objects.get_or_create(role_name='Workplace Supervisor')
    academic_role, _ = Role.objects.get_or_create(role_name='Academic Supervisor')
    
    # 2. Get or create the User
    user, created = User.objects.get_or_create(email=email)
    user.set_password(password)
    user.first_name = "Samuel"
    user.last_name = "Kala"
    user.role = workplace_role
    user.save()
    
    if created:
        print(f"Created new user: {email}")
    else:
        print(f"Updated existing user: {email}")

    # 3. Ensure Organization exists
    org, _ = Organization.objects.get_or_create(
        name="Kala Tech Solutions",
        defaults={
            "industry": "Software Engineering",
            "address": "Plot 45, Kampala Road",
            "city": "Kampala",
            "country": "Uganda",
            "contact_email": "info@kalatech.com",
            "contact_phone": "+256700000001"
        }
    )

    # 4. Create/Update Supervisor profile
    supervisor, _ = Supervisor.objects.get_or_create(
        user=user,
        defaults={
            "supervisor_type": "workplace",
            "organization": org
        }
    )
    supervisor.organization = org
    supervisor.supervisor_type = "workplace"
    supervisor.save()

    # 5. Create some Academic Supervisors for placements
    dept, _ = Department.objects.get_or_create(
        department_name="Computer Science",
        faculty="Computing",
        university="Makerere University"
    )
    
    academic_supers = []
    for i in range(2):
        a_user, _ = User.objects.get_or_create(
            email=f"academic_test_{i}@iles.com",
            defaults={
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "role": academic_role,
                "department": dept
            }
        )
        a_super, _ = Supervisor.objects.get_or_create(
            user=a_user,
            defaults={"supervisor_type": "academic", "department": dept}
        )
        academic_supers.append(a_super)

    # 6. Create Interns and Placements
    print("Generating 5 interns and placements...")
    for i in range(5):
        s_email = f"intern_{i}_{fake.unique.random_int()}@gmail.com"
        s_user = User.objects.create_user(
            email=s_email,
            password="password123",
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=student_role,
            department=dept
        )
        student = Student.objects.create(
            user=s_user,
            registration_number=f"22/U/{fake.unique.random_int(1000, 9999)}",
            program="BSc Software Engineering",
            year_of_study=3,
            expected_graduation=date(2027, 6, 30)
        )
        
        placement = InternshipPlacement.objects.create(
            student=student,
            organization=org,
            workplace_supervisor=supervisor,
            academic_supervisor=random.choice(academic_supers),
            workplace_supervisor_email=email,
            start_date=timezone.now().date() - timedelta(weeks=10),
            end_date=timezone.now().date() + timedelta(weeks=2),
            position_title=random.choice(["Frontend Developer", "Backend Developer", "Data Analyst", "UI/UX Designer"]),
            status='approved'
        )
        
        # 7. Create Weekly Logs for each intern
        print(f"  Setting up logs for {s_email}...")
        for week in range(1, 9):
            log = WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                start_date=placement.start_date + timedelta(weeks=week-1),
                end_date=placement.start_date + timedelta(weeks=week-1, days=6),
                activities_performed=fake.paragraph(),
                skills_learned=fake.paragraph(),
                challenges=fake.paragraph(),
                solutions=fake.paragraph(),
                hours_worked=Decimal("40.00"),
                status='approved'
            )
            
            # Review by Samuel
            LogReview.objects.create(
                log=log,
                supervisor=supervisor,
                comments=fake.sentence(),
                rating=Decimal(random.randint(4, 5)),
                status='approved'
            )
            
        # 8. Upload a Final Report for 3 of the interns
        if i < 3:
            FinalReport.objects.create(
                placement=placement,
                file="final_reports/sample_report.pdf", # Dummy path
                status='submitted'
            )

    print("✅ Successfully seeded data for Samuel Kala!")

if __name__ == "__main__":
    from datetime import date
    seed_supervisor_data()
