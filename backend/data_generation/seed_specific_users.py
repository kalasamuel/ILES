import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add the project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')
django.setup()

from django.conf import settings
from faker import Faker
from accounts.models import Role, Department, User, Student, Supervisor, UserSettings
from organizations.models import Organization
from placements.models import InternshipPlacement
from logbooks.models import WeeklyLog
from evaluations.models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown

fake = Faker()

def seed_specific_users():
    """Seed database with specific test users and realistic data."""
    print("\n🚀 ILES SPECIFIC USERS SEEDER 🚀")
    print("=" * 60)
    
    # Ensure we're connected to Neon
    db_host = settings.DATABASES['default'].get('HOST', '')
    print(f"📌 Database Host: {db_host}\n")
    
    # 1. Create/Get Roles
    print("1️⃣ Setting up Roles...")
    admin_role, _ = Role.objects.get_or_create(role_name="Admin")
    student_role, _ = Role.objects.get_or_create(role_name="Student")
    academic_supervisor_role, _ = Role.objects.get_or_create(role_name="Academic Supervisor")
    workplace_supervisor_role, _ = Role.objects.get_or_create(role_name="Workplace Supervisor")
    print("✅ Roles ready\n")
    
    # 2. Create/Get Department
    print("2️⃣ Setting up Department...")
    department, _ = Department.objects.get_or_create(
        department_name='School of Computing and Informatics',
        faculty='Computing',
        university='Makerere University',
        defaults={
            'department_name': 'School of Computing and Informatics',
            'faculty': 'Computing',
            'university': 'Makerere University'
        }
    )
    print(f"✅ Department: {department.department_name}\n")
    
    # 3. Create Admin User
    print("3️⃣ Creating Admin User...")
    admin_user, admin_created = User.objects.get_or_create(
        email='samuelkala2003@gmail.com',
        defaults={
            'first_name': 'Samuel',
            'last_name': 'Kala',
            'role': admin_role,
            'is_staff': True,
            'is_superuser': True,
            'institution_name': 'Makerere University',
            'institution_email': 'kala@mak.ac.ug'
        }
    )
    if admin_created:
        admin_user.set_password('Kalasam@123')
        admin_user.save()
        UserSettings.objects.get_or_create(user=admin_user)
        print(f"✅ Admin user created: {admin_user.email}")
    else:
        print(f"ℹ️  Admin user already exists: {admin_user.email}")
    print()
    
    # 4. Create Academic Supervisor
    print("4️⃣ Creating Academic Supervisor...")
    supervisor_user, supervisor_created = User.objects.get_or_create(
        email='mesamkala@gmail.com',
        defaults={
            'first_name': 'Dr. Mesam',
            'last_name': 'Kala',
            'role': academic_supervisor_role,
            'department': department,
            'institution_name': 'Makerere University',
            'institution_email': 'mesamkala@mak.ac.ug',
            'phone_number': '+256701234567'
        }
    )
    if supervisor_created:
        supervisor_user.set_password('Kalasam@123')
        supervisor_user.save()
        UserSettings.objects.get_or_create(user=supervisor_user)
        print(f"✅ Academic Supervisor created: {supervisor_user.email}")
    else:
        print(f"ℹ️  Academic Supervisor already exists: {supervisor_user.email}")
    
    # Create Supervisor profile if not exists
    academic_supervisor, _ = Supervisor.objects.get_or_create(
        user=supervisor_user,
        defaults={
            'supervisor_type': 'academic',
            'department': department
        }
    )
    print(f"✅ Supervisor profile: {academic_supervisor.supervisor_type}\n")
    
    # 5. Create Student User and Profile
    print("5️⃣ Creating Student User and Profile...")
    student_user, student_created = User.objects.get_or_create(
        email='kalasamuel79@gmail.com',
        defaults={
            'first_name': 'Samuel',
            'last_name': 'Kala',
            'role': student_role,
            'department': department,
            'institution_name': 'Makerere University',
            'institution_email': 'kalasamuel79@mak.ac.ug',
            'phone_number': '+256788234567'
        }
    )
    if student_created:
        student_user.set_password('Kalasam@123')
        student_user.save()
        UserSettings.objects.get_or_create(user=student_user)
        print(f"✅ Student user created: {student_user.email}")
    else:
        print(f"ℹ️  Student user already exists: {student_user.email}")
    
    # Create Student profile
    student_profile, student_profile_created = Student.objects.get_or_create(
        user=student_user,
        defaults={
            'registration_number': 'BSC2020/0234',
            'program': 'Bachelor of Science in Software Engineering',
            'year_of_study': 3,
            'expected_graduation': datetime.now().date() + timedelta(days=365)
        }
    )
    if student_profile_created:
        print(f"✅ Student profile created: {student_profile.registration_number}")
    else:
        print(f"ℹ️  Student profile already exists: {student_profile.registration_number}")
    print()
    
    # 6. Create Workplace Organization and Supervisor
    print("6️⃣ Creating Organization and Workplace Supervisor...")
    organization, org_created = Organization.objects.get_or_create(
        name='Google Africa',
        defaults={
            'industry': 'Software Engineering',
            'address': 'Plot 14, Jinja Road',
            'city': 'Kampala',
            'country': 'Uganda',
            'contact_email': 'hr@google-africa.com',
            'contact_phone': '+256414506000'
        }
    )
    if org_created:
        print(f"✅ Organization created: {organization.name}")
    else:
        print(f"ℹ️  Organization already exists: {organization.name}")
    
    # Create Workplace Supervisor
    workplace_supervisor_user, _ = User.objects.get_or_create(
        email='supervisor@google-africa.com',
        defaults={
            'first_name': 'John',
            'last_name': 'Doe',
            'role': workplace_supervisor_role,
            'institution_name': 'Google Africa',
            'phone_number': '+256701999999'
        }
    )
    workplace_supervisor_user.set_password('TempPassword123')
    workplace_supervisor_user.save()
    
    workplace_supervisor, _ = Supervisor.objects.get_or_create(
        user=workplace_supervisor_user,
        defaults={
            'supervisor_type': 'workplace',
            'organization': organization
        }
    )
    print(f"✅ Workplace Supervisor created\n")
    
    # 7. Create Internship Placement
    print("7️⃣ Creating Internship Placement...")
    start_date = datetime.now().date() - timedelta(days=120)
    end_date = start_date + timedelta(days=84)  # 12 weeks
    
    placement, placement_created = InternshipPlacement.objects.get_or_create(
        student=student_profile,
        academic_supervisor=academic_supervisor,
        position_title='Software Engineering Intern',
        defaults={
            'organization': organization,
            'workplace_supervisor': workplace_supervisor,
            'workplace_supervisor_email': 'supervisor@google-africa.com',
            'start_date': start_date,
            'end_date': end_date,
            'status': 'approved',
            'is_submitted': True,
            'submitted_at': datetime.now()
        }
    )
    if placement_created:
        print(f"✅ Placement created: {placement.position_title}")
    else:
        print(f"ℹ️  Placement already exists\n")
    print()
    
    # 8. Create Weekly Logs
    print("8️⃣ Creating Weekly Logs with Real-World Activities...")
    activities_templates = [
        {
            'activity': 'Implemented user authentication module with JWT tokens',
            'skills': 'Python, Django REST Framework, PostgreSQL, Security best practices',
            'challenges': 'Handling token expiration and refresh mechanisms',
            'solution': 'Implemented sliding window token refresh with Redis caching'
        },
        {
            'activity': 'Developed REST API endpoints for user management',
            'skills': 'API design, RESTful principles, Django serializers, Database optimization',
            'challenges': 'Performance issues with complex queries',
            'solution': 'Implemented select_related and prefetch_related for query optimization'
        },
        {
            'activity': 'Created unit tests for core business logic',
            'skills': 'Unit testing, Pytest, Test-driven development, Mocking',
            'challenges': 'Testing asynchronous operations and external API calls',
            'solution': 'Used pytest-asyncio and mock libraries for isolation'
        },
        {
            'activity': 'Fixed critical bug in payment processing module',
            'skills': 'Debugging, code review, version control, Git bisect',
            'challenges': 'Reproducing intermittent race conditions',
            'solution': 'Added comprehensive logging and used concurrency testing tools'
        },
        {
            'activity': 'Participated in code review of 15+ pull requests',
            'skills': 'Code quality assessment, Best practices, Mentoring',
            'challenges': 'Balancing feedback with team dynamics',
            'solution': 'Used structured feedback framework and pair programming sessions'
        },
        {
            'activity': 'Optimized database queries reducing API response time by 60%',
            'skills': 'Database optimization, Query analysis, EXPLAIN plans',
            'challenges': 'Identifying N+1 queries in complex data structures',
            'solution': 'Refactored queries and implemented efficient caching strategies'
        },
        {
            'activity': 'Deployed application to production using Docker and Kubernetes',
            'skills': 'DevOps, Docker, Kubernetes, CI/CD pipelines, Cloud platforms',
            'challenges': 'Managing environment-specific configurations',
            'solution': 'Implemented ConfigMaps and Secrets for secure configuration management'
        },
        {
            'activity': 'Created comprehensive API documentation using Swagger/OpenAPI',
            'skills': 'Technical writing, API documentation, Tools (Swagger, Postman)',
            'challenges': 'Keeping documentation up-to-date with rapid changes',
            'solution': 'Automated documentation generation from code annotations'
        },
        {
            'activity': 'Implemented caching strategy using Redis for frequently accessed data',
            'skills': 'Redis, Caching patterns, Cache invalidation strategies',
            'challenges': 'Handling cache coherency across distributed systems',
            'solution': 'Implemented event-driven cache invalidation pattern'
        },
        {
            'activity': 'Conducted performance benchmarking and load testing',
            'skills': 'Load testing tools (JMeter, Locust), Performance analysis, Metrics',
            'challenges': 'Simulating realistic user behavior patterns',
            'solution': 'Created test scenarios based on real production traffic patterns'
        },
        {
            'activity': 'Mentored junior developers on best practices and design patterns',
            'skills': 'Mentoring, Software architecture, Design patterns, Communication',
            'challenges': 'Adapting teaching style for different learning levels',
            'solution': 'Used pair programming and code walkthrough sessions'
        },
        {
            'activity': 'Migrated legacy system to microservices architecture',
            'skills': 'Microservices, API Gateway, Message queues, System design',
            'challenges': 'Managing distributed transactions and data consistency',
            'solution': 'Implemented saga pattern for distributed transaction management'
        }
    ]
    
    logs_created = 0
    for week in range(1, 13):  # Create 12 weeks of logs
        week_start = start_date + timedelta(weeks=week-1)
        week_end = week_start + timedelta(days=6)
        
        template = activities_templates[(week - 1) % len(activities_templates)]
        
        log, created = WeeklyLog.objects.get_or_create(
            placement=placement,
            week_number=week,
            defaults={
                'start_date': week_start,
                'end_date': week_end,
                'activities_performed': template['activity'],
                'skills_learned': template['skills'],
                'challenges': template['challenges'],
                'solutions': template['solution'],
                'hours_worked': Decimal(str(random.randint(35, 45))),
                'status': 'approved' if week <= 10 else 'submitted',
                'submitted_at': datetime.now() - timedelta(days=week*7)
            }
        )
        if created:
            logs_created += 1
    
    print(f"✅ Created {logs_created} weekly logs\n")
    
    # 9. Create Evaluation Criteria
    print("9️⃣ Setting up Evaluation Criteria...")
    criteria_data = [
        {
            'name': 'Technical Skills',
            'description': 'Demonstrates proficiency in required programming languages and frameworks',
            'weight': Decimal('30.00'),
            'max_score': Decimal('100.00')
        },
        {
            'name': 'Problem Solving',
            'description': 'Ability to analyze problems and implement effective solutions',
            'weight': Decimal('25.00'),
            'max_score': Decimal('100.00')
        },
        {
            'name': 'Teamwork',
            'description': 'Collaborates effectively with team members and supervisors',
            'weight': Decimal('20.00'),
            'max_score': Decimal('100.00')
        },
        {
            'name': 'Communication',
            'description': 'Communicates ideas clearly through written and verbal means',
            'weight': Decimal('15.00'),
            'max_score': Decimal('100.00')
        },
        {
            'name': 'Professionalism',
            'description': 'Demonstrates professional conduct and work ethic',
            'weight': Decimal('10.00'),
            'max_score': Decimal('100.00')
        }
    ]
    
    criteria_list = []
    for crit_data in criteria_data:
        crit, _ = EvaluationCriteria.objects.get_or_create(
            name=crit_data['name'],
            defaults={
                'description': crit_data['description'],
                'weight_percentage': crit_data['weight'],
                'max_score': crit_data['max_score']
            }
        )
        criteria_list.append(crit)
    
    print(f"✅ {len(criteria_list)} evaluation criteria ready\n")
    
    # 10. Create Evaluation and Scores
    print("🔟 Creating Evaluation and Scores...")
    evaluation, eval_created = Evaluation.objects.get_or_create(
        placement=placement,
        defaults={
            'evaluator': workplace_supervisor,
            'evaluation_date': end_date,
            'comments': 'Excellent performance throughout the internship. Samuel demonstrated strong technical skills, excellent problem-solving abilities, and professional conduct. He was an asset to our team and we would be delighted to have him back for future projects.'
        }
    )
    
    if eval_created or not EvaluationScore.objects.filter(evaluation=evaluation).exists():
        scores_data = [
            Decimal('92.00'),  # Technical Skills
            Decimal('88.00'),  # Problem Solving
            Decimal('95.00'),  # Teamwork
            Decimal('90.00'),  # Communication
            Decimal('93.00')   # Professionalism
        ]
        
        total = Decimal('0.00')
        for criteria, score in zip(criteria_list, scores_data):
            EvaluationScore.objects.get_or_create(
                evaluation=evaluation,
                criteria=criteria,
                defaults={'score': score}
            )
            total += score
        
        avg_score = total / len(criteria_list)
        evaluation.total_score = avg_score
        
        # Calculate grade
        if avg_score >= Decimal('90'):
            evaluation.grade = 'A'
        elif avg_score >= Decimal('80'):
            evaluation.grade = 'B'
        elif avg_score >= Decimal('70'):
            evaluation.grade = 'C'
        else:
            evaluation.grade = 'D'
        
        evaluation.save()
        print(f"✅ Evaluation created with average score: {avg_score}")
    else:
        print(f"ℹ️  Evaluation already exists")
    
    # 11. Create Score Breakdown
    print()
    print("1️⃣1️⃣ Creating Score Breakdown...")
    score_breakdown, sb_created = ScoreBreakdown.objects.get_or_create(
        placement=placement,
        defaults={
            'supervisor_score': Decimal('91.00'),
            'academic_score': Decimal('88.00'),
            'logbook_score': Decimal('89.50'),
            'final_score': Decimal('89.50'),
            'grade': 'B+'
        }
    )
    
    if sb_created:
        print(f"✅ Score breakdown created with final grade: {score_breakdown.grade}")
    else:
        print(f"ℹ️  Score breakdown already exists")
    
    # Final Summary
    print("\n" + "=" * 60)
    print("✨ SEEDING COMPLETE! ✨")
    print("=" * 60)
    print("\n📋 USER CREDENTIALS:")
    print("-" * 60)
    print("Admin User:")
    print("  Email: samuelkala2003@gmail.com")
    print("  Password: Kalasam@123")
    print()
    print("Academic Supervisor:")
    print("  Email: mesamkala@gmail.com")
    print("  Password: Kalasam@123")
    print()
    print("Student:")
    print("  Email: kalasamuel79@gmail.com")
    print("  Password: Kalasam@123")
    print()
    print("Workplace Supervisor (Auto-generated):")
    print("  Email: supervisor@google-africa.com")
    print("  Password: TempPassword123")
    print()
    print("📊 DATA CREATED:")
    print("-" * 60)
    print(f"✓ 3 User Accounts (Admin, Student, Academic Supervisor)")
    print(f"✓ 1 Student Profile with registration number: BSC2020/0234")
    print(f"✓ 1 Internship Placement at Google Africa")
    print(f"✓ 12 Weekly Logs with comprehensive activities and skills")
    print(f"✓ 5 Evaluation Criteria")
    print(f"✓ 1 Complete Evaluation with scores and grade: A")
    print(f"✓ 1 Score Breakdown")
    print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    try:
        seed_specific_users()
        print("✅ All done! Your database is now populated with specific test users.")
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
