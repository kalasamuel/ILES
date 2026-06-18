"""
Comprehensive seeding script to populate ILES database with realistic long-term data.
Creates multiple students, supervisors, organizations, and internship placements
spanning 2+ years with complete weekly logs, evaluations, and reviews.

Usage (from backend dir): python manage.py shell
Then in shell: exec(open('../data_generation/seed_realistic_longterm_data.py').read())
"""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Django setup already done if running from manage.py shell

from django.db import transaction
from django.utils import timezone
from django.db.models import Prefetch

from accounts.models import User, Student, Supervisor, Role, Department
from organizations.models import Organization
from placements.models import InternshipPlacement
from logbooks.models import WeeklyLog
from evaluations.models import Evaluation, EvaluationCriteria, EvaluationScore, ScoreBreakdown
from reviews.models import LogReview

try:
    print("🚀 ILES REALISTIC LONG-TERM DATA SEEDER 🚀")
    print("=" * 70)

    # Check database connection
    try:
        user_count = User.objects.count()
        db_host = os.environ.get('DATABASE_URL', 'localhost').split('@')[-1].split('?')[0] if '@' in os.environ.get('DATABASE_URL', '') else 'localhost'
        print(f"📌 Database Host: {db_host}")
        print(f"📌 Existing Users: {user_count}\n")
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        raise
except Exception as e:
    print(f"\n❌ Error during initial setup: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ============================================================================
# 1. Setup Roles
# ============================================================================
print("1️⃣ Setting up Roles...")
roles_data = [
    {'role_name': 'Admin'},
    {'role_name': 'Student'},
    {'role_name': 'Academic Supervisor'},
    {'role_name': 'Workplace Supervisor'},
]

roles = {}
for role_data in roles_data:
    role, _ = Role.objects.get_or_create(**role_data)
    roles[role_data['role_name']] = role

print("✅ Roles ready\n")

# ============================================================================
# 2. Setup Departments
# ============================================================================
print("2️⃣ Setting up Departments...")
departments_data = [
    {'department_name': 'School of Computing and Informatics', 'faculty': 'Computing', 'university': 'University of Nairobi'},
    {'department_name': 'School of Engineering', 'faculty': 'Engineering', 'university': 'University of Nairobi'},
    {'department_name': 'School of Business', 'faculty': 'Business', 'university': 'University of Nairobi'},
    {'department_name': 'School of Nursing', 'faculty': 'Health', 'university': 'University of Nairobi'},
]

departments = {}
for dept_data in departments_data:
    dept, _ = Department.objects.get_or_create(**dept_data)
    departments[dept_data['department_name']] = dept

print("✅ Departments ready\n")

# ============================================================================
# 3. Create Multiple Academic Supervisors
# ============================================================================
print("3️⃣ Creating Academic Supervisors...")
supervisors_data = [
    {
        'user': {'first_name': 'Dr. Samuel', 'last_name': 'Kala', 'email': 'mesamkala@gmail.com', 'phone_number': '+254700000001'},
        'department': departments['School of Computing and Informatics'],
    },
    {
        'user': {'first_name': 'Prof. Mary', 'last_name': 'Ouma', 'email': 'mary.ouma@university.ac.ke', 'phone_number': '+254700000002'},
        'department': departments['School of Computing and Informatics'],
    },
    {
        'user': {'first_name': 'Dr. James', 'last_name': 'Kipchoge', 'email': 'james.kipchoge@university.ac.ke', 'phone_number': '+254700000003'},
        'department': departments['School of Engineering'],
    },
    {
        'user': {'first_name': 'Prof. Grace', 'last_name': 'Mwangi', 'email': 'grace.mwangi@university.ac.ke', 'phone_number': '+254700000004'},
        'department': departments['School of Business'],
    },
]

academic_supervisors = []
for sup_data in supervisors_data:
    user_data = sup_data['user']
    user, _ = User.objects.get_or_create(
        email=user_data['email'],
        defaults={
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'phone_number': user_data['phone_number'],
            'role': roles['Academic Supervisor'],
            'department': sup_data['department'],
        }
    )
    if not user.has_usable_password():
        user.set_password('TempPassword123')
        user.save()
    
    supervisor, _ = Supervisor.objects.get_or_create(
        user=user,
        defaults={
            'supervisor_type': 'academic',
            'department': sup_data['department'],
        }
    )
    academic_supervisors.append(supervisor)
    print(f"✅ Academic Supervisor: {user.email}")

print()

# ============================================================================
# 4. Create Multiple Students
# ============================================================================
print("4️⃣ Creating Multiple Students...")

students_data = [
    # 2020 Cohort (some graduated)
    {'first_name': 'Samuel', 'last_name': 'Kala', 'email': 'kalasamuel79@gmail.com', 'registration': 'BSC2020/0234', 'year': 3, 'cohort': 2020},
    {'first_name': 'Alice', 'last_name': 'Mwangi', 'email': 'alice.mwangi@student.ac.ke', 'registration': 'BSC2020/0145', 'year': 4, 'cohort': 2020},
    {'first_name': 'David', 'last_name': 'Kipchoge', 'email': 'david.kipchoge@student.ac.ke', 'registration': 'BSC2020/0089', 'year': 4, 'cohort': 2020},
    # 2021 Cohort
    {'first_name': 'Jane', 'last_name': 'Njoroge', 'email': 'jane.njoroge@student.ac.ke', 'registration': 'BSC2021/0234', 'year': 3, 'cohort': 2021},
    {'first_name': 'Michael', 'last_name': 'Owuor', 'email': 'michael.owuor@student.ac.ke', 'registration': 'BSC2021/0145', 'year': 3, 'cohort': 2021},
    # 2022 Cohort
    {'first_name': 'Sarah', 'last_name': 'Kariuki', 'email': 'sarah.kariuki@student.ac.ke', 'registration': 'BSC2022/0234', 'year': 2, 'cohort': 2022},
    {'first_name': 'Peter', 'last_name': 'Mwangi', 'email': 'peter.mwangi@student.ac.ke', 'registration': 'BSC2022/0145', 'year': 2, 'cohort': 2022},
    # 2023 Cohort
    {'first_name': 'Emma', 'last_name': 'Gitau', 'email': 'emma.gitau@student.ac.ke', 'registration': 'BSC2023/0234', 'year': 1, 'cohort': 2023},
]

students = []
for student_data in students_data:
    user, _ = User.objects.get_or_create(
        email=student_data['email'],
        defaults={
            'first_name': student_data['first_name'],
            'last_name': student_data['last_name'],
            'role': roles['Student'],
            'department': departments['School of Computing and Informatics'],
            'date_joined': timezone.now() - timedelta(days=365*(2025-student_data['cohort'])),
        }
    )
    if not user.has_usable_password():
        user.set_password('StudentPass123')
        user.save()
    
    student, _ = Student.objects.get_or_create(
        user=user,
        defaults={
            'registration_number': student_data['registration'],
            'program': 'BSc Software Engineering',
            'year_of_study': student_data['year'],
            'academic_supervisor': academic_supervisors[0],  # Default to first supervisor
        }
    )
    students.append(student)
    print(f"✅ Student: {user.email} ({student_data['registration']})")

print()

# ============================================================================
# 5. Create Multiple Organizations
# ============================================================================
print("5️⃣ Creating Multiple Organizations...")

organizations_data = [
    {'name': 'Google Africa', 'industry': 'Technology', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'hr@google.co.ke', 'contact_phone': '+254711000001'},
    {'name': 'Microsoft East Africa', 'industry': 'Technology', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@microsoft.com', 'contact_phone': '+254711000002'},
    {'name': 'Safaricom Ltd', 'industry': 'Telecommunications', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@safaricom.co.ke', 'contact_phone': '+254711000003'},
    {'name': 'Equity Bank Group', 'industry': 'Finance', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@equitybank.co.ke', 'contact_phone': '+254711000004'},
    {'name': 'iHub Innovation Hub', 'industry': 'Startup Accelerator', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'info@ihub.co.ke', 'contact_phone': '+254711000005'},
    {'name': 'Kenya Red Cross Society', 'industry': 'NGO', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@redcross.or.ke', 'contact_phone': '+254711000006'},
    {'name': 'IBM East Africa', 'industry': 'Technology', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@ibm.com', 'contact_phone': '+254711000007'},
    {'name': 'Craft Silicon', 'industry': 'Software Development', 'city': 'Nairobi', 'country': 'Kenya', 'contact_email': 'careers@craftsilicon.com', 'contact_phone': '+254711000008'},
]

organizations = []
for org_data in organizations_data:
    org, _ = Organization.objects.get_or_create(
        name=org_data['name'],
        defaults={
            'industry': org_data['industry'],
            'address': f"Innovation Hub, {org_data['city']}, {org_data['country']}",
            'city': org_data['city'],
            'country': org_data['country'],
            'contact_email': org_data['contact_email'],
            'contact_phone': org_data['contact_phone'],
        }
    )
    organizations.append(org)
    print(f"✅ Organization: {org.name}")

print()

# ============================================================================
# 6. Create Workplace Supervisors for Each Organization
# ============================================================================
print("6️⃣ Creating Workplace Supervisors...")

workplace_supervisors_data = [
    {'org': organizations[0], 'name': ('John', 'Smith'), 'email': 'john.smith@google.com'},
    {'org': organizations[0], 'name': ('Emily', 'Johnson'), 'email': 'emily.johnson@google.com'},
    {'org': organizations[1], 'name': ('Robert', 'Williams'), 'email': 'robert.williams@microsoft.com'},
    {'org': organizations[2], 'name': ('Margaret', 'Kipchoge'), 'email': 'margaret.kipchoge@safaricom.co.ke'},
    {'org': organizations[3], 'name': ('Daniel', 'Kariuki'), 'email': 'daniel.kariuki@equitybank.co.ke'},
    {'org': organizations[4], 'name': ('Patricia', 'Ouma'), 'email': 'patricia.ouma@ihub.co.ke'},
    {'org': organizations[5], 'name': ('Charles', 'Mwangi'), 'email': 'charles.mwangi@redcross.or.ke'},
    {'org': organizations[6], 'name': ('Lucy', 'Njoroge'), 'email': 'lucy.njoroge@ibm.com'},
    {'org': organizations[7], 'name': ('Benjamin', 'Kipchoge'), 'email': 'benjamin.kipchoge@craftsilicon.com'},
]

workplace_supervisors = []
for ws_data in workplace_supervisors_data:
    user, _ = User.objects.get_or_create(
        email=ws_data['email'],
        defaults={
            'first_name': ws_data['name'][0],
            'last_name': ws_data['name'][1],
            'role': roles['Workplace Supervisor'],
            'institution_name': ws_data['org'].name,
            'phone_number': f"+254700{len(workplace_supervisors):06d}",
        }
    )
    if not user.has_usable_password():
        user.set_password('WorkplacePass123')
        user.save()
    
    supervisor, _ = Supervisor.objects.get_or_create(
        user=user,
        defaults={
            'supervisor_type': 'workplace',
            'organization': ws_data['org'],
        }
    )
    workplace_supervisors.append(supervisor)
    print(f"✅ Workplace Supervisor: {user.email} @ {ws_data['org'].name}")

print()

# ============================================================================
# 7. Create Multiple Internship Placements (Historical & Current)
# ============================================================================
print("7️⃣ Creating Multiple Internship Placements...")

placements_data = []

# Historical placements (2023-2024, all completed)
start_date_2023 = datetime(2023, 6, 15).date()
for idx, student in enumerate(students[:3]):  # First 3 students have historical data
    for placement_idx in range(2):  # Each has 1-2 completed placements
        start = start_date_2023 + timedelta(days=30*placement_idx)
        placements_data.append({
            'student': student,
            'organization': organizations[idx % len(organizations)],
            'workplace_supervisor': workplace_supervisors[idx % len(workplace_supervisors)],
            'academic_supervisor': academic_supervisors[idx % len(academic_supervisors)],
            'position_title': ['Software Engineer Intern', 'Data Analyst Intern', 'QA Engineer Intern', 'DevOps Intern', 'Backend Developer Intern'][idx % 5],
            'start_date': start,
            'end_date': start + timedelta(days=84),  # 12 weeks
            'status': 'completed',
            'weeks': 12,
        })

# Current/ongoing placements (2025)
for idx, student in enumerate(students[3:6]):  # Students 3-5 have ongoing placements
    start = datetime(2026, 3, 15).date()  # Started 3 months ago
    placements_data.append({
        'student': student,
        'organization': organizations[(idx+2) % len(organizations)],
        'workplace_supervisor': workplace_supervisors[(idx+2) % len(workplace_supervisors)],
        'academic_supervisor': academic_supervisors[(idx+1) % len(academic_supervisors)],
        'position_title': ['Full Stack Developer Intern', 'Machine Learning Intern', 'Systems Engineer Intern'][idx % 3],
        'start_date': start,
        'end_date': start + timedelta(days=84),
        'status': 'approved',
        'weeks': 13,  # Currently on week 13
    })

# Pending placements
for idx, student in enumerate(students[6:]):  # Last students have pending
    start = datetime(2026, 7, 1).date()
    placements_data.append({
        'student': student,
        'organization': organizations[(idx+4) % len(organizations)],
        'workplace_supervisor': workplace_supervisors[(idx+3) % len(workplace_supervisors)],
        'academic_supervisor': academic_supervisors[(idx+2) % len(academic_supervisors)],
        'position_title': 'Software Developer Intern',
        'start_date': start,
        'end_date': start + timedelta(days=84),
        'status': 'pending',
        'weeks': 0,
    })

placements = []
for placement_data in placements_data:
    placement, _ = InternshipPlacement.objects.get_or_create(
        student=placement_data['student'],
        organization=placement_data['organization'],
        start_date=placement_data['start_date'],
        defaults={
            'workplace_supervisor': placement_data['workplace_supervisor'],
            'academic_supervisor': placement_data['academic_supervisor'],
            'workplace_supervisor_email': placement_data['workplace_supervisor'].user.email,
            'end_date': placement_data['end_date'],
            'position_title': placement_data['position_title'],
            'status': placement_data['status'],
            'is_submitted': placement_data['status'] == 'completed',
            'submitted_at': timezone.now() if placement_data['status'] == 'completed' else None,
        }
    )
    placements.append((placement, placement_data['weeks']))
    print(f"✅ Placement: {placement.student.user.email} @ {placement.organization.name} ({placement.status})")

print(f"\n📊 Total Placements Created: {len(placements)}\n")

# ============================================================================
# 8. Create Weekly Logs for Each Placement
# ============================================================================
print("8️⃣ Creating Weekly Logs...")

activities = [
    "Developed REST API endpoints using Django REST Framework",
    "Implemented JWT authentication and token management",
    "Conducted unit testing with pytest and coverage analysis",
    "Optimized database queries using select_related and prefetch_related",
    "Participated in code review sessions with team lead",
    "Debugged production issues and deployed hotfixes",
    "Wrote comprehensive API documentation using Swagger",
    "Implemented caching strategies using Redis",
    "Set up CI/CD pipeline using GitHub Actions",
    "Collaborated with frontend team on API integration",
    "Refactored legacy code to improve maintainability",
    "Conducted performance testing and optimization",
]

challenges = [
    "Initial difficulty understanding the codebase structure",
    "Struggled with complex database relationships",
    "Timezone handling issues across multiple regions",
    "Performance optimization for large datasets",
    "Coordinating with multiple team members",
]

solutions = [
    "Thoroughly reviewed code documentation and asked questions",
    "Studied Django ORM best practices",
    "Implemented timezone-aware datetime handling",
    "Used database profiling tools to identify bottlenecks",
    "Scheduled regular team syncs",
]

weekly_logs_created = 0
for placement, weeks_to_create in placements:
    for week_num in range(1, min(weeks_to_create + 1, 13)):
        # Calculate dates
        log_start = placement.start_date + timedelta(days=(week_num-1)*7)
        log_end = log_start + timedelta(days=6)
        
        # Skip if dates are in future
        if log_start > timezone.now().date():
            continue
        
        log, created = WeeklyLog.objects.get_or_create(
            placement=placement,
            week_number=week_num,
            defaults={
                'start_date': log_start,
                'end_date': log_end,
                'activities_performed': "\n".join(random.sample(activities, 3)),
                'skills_learned': "API Development, Database Optimization, Testing, DevOps",
                'challenges': random.choice(challenges),
                'solutions': random.choice(solutions),
                'hours_worked': Decimal(str(round(random.uniform(35, 45), 1))),
                'status': random.choice(['submitted', 'approved', 'reviewed']),
                'submitted_at': timezone.now() - timedelta(days=random.randint(1, 30)),
            }
        )
        if created:
            weekly_logs_created += 1

print(f"✅ Created {weekly_logs_created} weekly logs\n")

# ============================================================================
# 9. Create Evaluations for Completed Placements
# ============================================================================
print("9️⃣ Creating Evaluations...")

# Get or create evaluation criteria
criteria_data = [
    {'name': 'Technical Skills', 'description': 'Proficiency with programming languages and tools', 'weight_percentage': Decimal('30.00'), 'max_score': Decimal('100.00')},
    {'name': 'Problem Solving', 'description': 'Ability to identify and solve complex problems', 'weight_percentage': Decimal('25.00'), 'max_score': Decimal('100.00')},
    {'name': 'Communication', 'description': 'Clarity in written and verbal communication', 'weight_percentage': Decimal('20.00'), 'max_score': Decimal('100.00')},
    {'name': 'Teamwork', 'description': 'Collaboration and interpersonal skills', 'weight_percentage': Decimal('15.00'), 'max_score': Decimal('100.00')},
    {'name': 'Professionalism', 'description': 'Work ethic, reliability, and attitude', 'weight_percentage': Decimal('10.00'), 'max_score': Decimal('100.00')},
]

criteria = []
for crit_data in criteria_data:
    crit, _ = EvaluationCriteria.objects.get_or_create(**crit_data)
    criteria.append(crit)

print("✅ Evaluation criteria ready")

# Create evaluations for completed placements
evaluations_created = 0
for placement, _ in placements:
    if placement.status == 'completed':
        evaluation, created = Evaluation.objects.get_or_create(
            placement=placement,
            defaults={
                'evaluator': placement.academic_supervisor,
                'evaluation_date': placement.end_date + timedelta(days=7),
                'total_score': Decimal(str(round(random.uniform(75, 95), 2))),
                'grade': random.choice(['A', 'A-', 'B+', 'B', 'B-', 'C+']),
                'comments': "Excellent technical skills demonstrated. Good problem solving abilities. Could improve communication in team settings.",
            }
        )
        
        if created:
            # Create evaluation scores
            total_score = evaluation.total_score
            for crit in criteria:
                score_value = Decimal(str(round(float(total_score) * random.uniform(0.85, 1.05), 2)))
                score_value = min(score_value, Decimal('100.00'))
                
                EvaluationScore.objects.get_or_create(
                    evaluation=evaluation,
                    criteria=crit,
                    defaults={'score': score_value}
                )
            
            evaluations_created += 1

print(f"✅ Created {evaluations_created} evaluations\n")

# ============================================================================
# 10. Create Score Breakdowns
# ============================================================================
print("🔟 Creating Score Breakdowns...")

score_breakdowns_created = 0
for placement, _ in placements:
    if placement.status == 'completed':
        score_breakdown, created = ScoreBreakdown.objects.get_or_create(
            placement=placement,
            defaults={
                'supervisor_score': Decimal(str(round(random.uniform(80, 95), 2))),
                'academic_score': Decimal(str(round(random.uniform(75, 90), 2))),
                'logbook_score': Decimal(str(round(random.uniform(78, 92), 2))),
                'final_score': Decimal(str(round(random.uniform(75, 95), 2))),
                'grade': random.choice(['A', 'A-', 'B+', 'B', 'B-', 'C+']),
            }
        )
        if created:
            score_breakdowns_created += 1

print(f"✅ Created {score_breakdowns_created} score breakdowns\n")

# ============================================================================
# 11. Create Log Reviews
# ============================================================================
print("1️⃣1️⃣ Creating Log Reviews...")

reviews_created = 0
for placement, _ in placements:
    if placement.status in ['completed', 'approved']:
        # Get weekly logs for this placement
        weekly_logs = WeeklyLog.objects.filter(placement=placement, status__in=['submitted', 'approved'])
        
        # Create reviews for some logs
        for log in weekly_logs[:8]:  # Review first 8 weeks
            review, created = LogReview.objects.get_or_create(
                log=log,
                supervisor=placement.academic_supervisor,
                defaults={
                    'comments': "Good progress. Keep up the excellent work!",
                    'rating': Decimal(str(round(random.uniform(4.0, 5.0), 1))),
                    'status': random.choice(['approved', 'approved', 'needs_revision']),
                    'reviewed_at': log.submitted_at + timedelta(days=random.randint(1, 5)),
                }
            )
            if created:
                reviews_created += 1

print(f"✅ Created {reviews_created} log reviews\n")

# ============================================================================
# Summary
# ============================================================================
print("=" * 70)
print("✨ REALISTIC LONG-TERM DATA SEEDING COMPLETE! ✨")
print("=" * 70)

summary_stats = {
    'Students': Student.objects.count(),
    'Academic Supervisors': Supervisor.objects.filter(supervisor_type='academic').count(),
    'Workplace Supervisors': Supervisor.objects.filter(supervisor_type='workplace').count(),
    'Organizations': Organization.objects.count(),
    'Internship Placements': InternshipPlacement.objects.count(),
    'Weekly Logs': WeeklyLog.objects.count(),
    'Evaluations': Evaluation.objects.count(),
    'Log Reviews': LogReview.objects.count(),
}

print("\n📊 SYSTEM STATE:")
print("-" * 70)
for key, value in summary_stats.items():
    print(f"  {key:<30}: {value}")

print("\n" + "=" * 70)
print("✅ Your database now has realistic long-term data!")
print("=" * 70)

except Exception as e:
    print(f"\n❌ Error during seeding: {e}")
    import traceback
    traceback.print_exc()
