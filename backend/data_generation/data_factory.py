import os
import random
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from faker import Faker
from tqdm import tqdm
from decimal import Decimal

# Import models
from accounts.models import Role, Department, User, Student, Supervisor
from organizations.models import Organization
from placements.models import InternshipPlacement, PlacementDocument
from logbooks.models import WeeklyLog, LogAttachment
from reviews.models import LogReview, WorkflowHistory
from evaluations.models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

fake = Faker()

def generate_all_data(count=75):
    """Generates synthetic data for all entities."""
    print(f"🚀 Starting synthetic data generation ({count} samples per entity)...")

    # 1. Roles
    print("Creating Roles...")
    roles = {}
    for role_name in ["Admin", "Student", "Academic Supervisor", "Workplace Supervisor"]:
        role, _ = Role.objects.get_or_create(role_name=role_name)
        roles[role_name] = role

    # 2. Departments
    print("Creating Departments...")
    departments = []
    universities = ["Makerere University", "Kyambogo University", "Mbarara University", "Busitema University"]
    faculties = ["Engineering", "Computing", "Science", "Business"]
    for _ in tqdm(range(count)):
        dept = Department.objects.create(
            department_name=f"{fake.job()} Department",
            faculty=random.choice(faculties),
            university=random.choice(universities)
        )
        departments.append(dept)

    # 3. Organizations
    print("Creating Organizations...")
    organizations = []
    industries = ["Software Engineering", "Civil Engineering", "Health", "Telecom", "Finance"]
    for _ in tqdm(range(count)):
        org = Organization.objects.create(
            name=fake.company(),
            industry=random.choice(industries),
            address=fake.address(),
            city=fake.city(),
            country="Uganda",
            contact_email=fake.company_email(),
            contact_phone=fake.phone_number()[:15]
        )
        organizations.append(org)

    # 4. Users & Students/Supervisors
    print("Creating Users (Students & Supervisors)...")
    students = []
    academic_supervisors = []
    workplace_supervisors = []
    
    password = "ILES_test_2026"

    for i in tqdm(range(count)):
        # Students
        s_user = User.objects.create_user(
            email=f"student{i}{fake.unique.random_int()}@gmail.com",
            password=password,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=roles["Student"],
            department=random.choice(departments)
        )
        student = Student.objects.create(
            user=s_user,
            registration_number=f"REG/{fake.unique.random_int(1000, 9999)}/{fake.unique.random_int(10, 99)}",
            program=fake.catch_phrase(),
            year_of_study=random.randint(1, 4),
            expected_graduation=fake.date_between(start_date="+1y", end_date="+4y")
        )
        students.append(student)

        # Academic Supervisors
        a_user = User.objects.create_user(
            email=f"academic{i}{fake.unique.random_int()}@gmail.com",
            password=password,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=roles["Academic Supervisor"],
            department=random.choice(departments)
        )
        academic_super = Supervisor.objects.create(
            user=a_user,
            supervisor_type='academic',
            department=a_user.department
        )
        academic_supervisors.append(academic_super)

        # Workplace Supervisors
        w_user = User.objects.create_user(
            email=f"workplace{i}{fake.unique.random_int()}@gmail.com",
            password=password,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            role=roles["Workplace Supervisor"]
        )
        workplace_super = Supervisor.objects.create(
            user=w_user,
            supervisor_type='workplace',
            organization=random.choice(organizations)
        )
        workplace_supervisors.append(workplace_super)

    # 5. Evaluation Criteria
    print("Creating Evaluation Criteria...")
    criteria_list = []
    criteria_names = ["Professionalism", "Technical Skills", "Communication", "Punctuality", "Critical Thinking"]
    for name in criteria_names:
        crit = EvaluationCriteria.objects.create(
            name=name,
            description=fake.sentence(),
            weight_percentage=Decimal("20.00"),
            max_score=Decimal("100.00")
        )
        criteria_list.append(crit)

    # 6. Placements
    print("Creating Placements...")
    placements = []
    for i in tqdm(range(count)):
        student = students[i]
        org = random.choice(organizations)
        academic = random.choice(academic_supervisors)
        workplace = random.choice(workplace_supervisors)
        
        placement = InternshipPlacement.objects.create(
            student=student,
            organization=org,
            academic_supervisor=academic,
            workplace_supervisor=workplace,
            workplace_supervisor_email=workplace.user.email,
            start_date=fake.date_between(start_date="-3m", end_date="-2m"),
            end_date=fake.date_between(start_date="+1m", end_date="+2m"),
            position_title=fake.job(),
            status='approved',
            is_submitted=True,
            submitted_at=timezone.now()
        )
        placements.append(placement)

    # 7. Logbooks & Reviews
    print("Creating Weekly Logs & Reviews...")
    for placement in tqdm(placements):
        for week in range(1, 5):
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
            
            # Review for each log
            LogReview.objects.create(
                log=log,
                supervisor=placement.workplace_supervisor,
                comments=fake.sentence(),
                rating=Decimal(random.randint(3, 5)),
                status='approved'
            )

    # 8. Evaluations
    print("Creating Evaluations...")
    for placement in tqdm(placements):
        # Evaluation by Academic Supervisor
        evaluation = Evaluation.objects.create(
            placement=placement,
            evaluator=placement.academic_supervisor,
            evaluation_date=timezone.now().date(),
            total_score=Decimal(random.randint(60, 95)),
            grade='B+',
            comments=fake.paragraph()
        )
        
        # Save scores for each criteria
        for crit in criteria_list:
            EvaluationScore.objects.create(
                evaluation=evaluation,
                criteria=crit,
                score=Decimal(random.randint(70, 100))
            )
            
        # Global Score Breakdown
        ScoreBreakdown.objects.create(
            placement=placement,
            supervisor_score=Decimal(random.randint(70, 100)),
            academic_score=Decimal(random.randint(70, 100)),
            logbook_score=Decimal(random.randint(70, 100)),
            final_score=Decimal(random.randint(70, 100)),
            grade='A-'
        )

    print("✅ Synthetic data generation complete!")

if __name__ == "__main__":
    # This block allows the script to be importable
    pass
