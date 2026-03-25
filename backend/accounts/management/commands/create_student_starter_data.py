from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Role, Student, Supervisor, User
from logbooks.models import WeeklyLog
from notifications.models import Notification
from organizations.models import Organization
from placements.models import InternshipPlacement


class Command(BaseCommand):
    help = "Create starter placement/log/notification data for an existing student user"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Student user email")
        parser.add_argument("--weeks", type=int, default=4, help="Number of weekly logs to create (default: 4)")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        weeks = max(options["weeks"], 1)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f"No user found with email: {email}")

        role_name = (user.role.role_name if user.role else "").strip().lower()
        if "student" not in role_name:
            raise CommandError(f"User {email} is not a student role. Current role: {user.role.role_name if user.role else 'None'}")

        student, created_student = Student.objects.get_or_create(
            user=user,
            defaults={
                "registration_number": f"TEMP-{user.user_id.hex[:8].upper()}",
                "program": user.department.department_name if user.department else "Not Set",
                "year_of_study": 1,
                "expected_graduation": timezone.now().date() + timedelta(days=365 * 4),
            },
        )

        if InternshipPlacement.objects.filter(student=student).exists():
            self.stdout.write(self.style.WARNING("Student already has placement data. No new placement created."))
            self.stdout.write(self.style.SUCCESS("Done. Existing records remain unchanged."))
            return

        org, _ = Organization.objects.get_or_create(
            name="Starter Organization",
            defaults={
                "industry": "Technology",
                "address": "123 Starter Avenue",
                "city": "Nairobi",
                "country": "Kenya",
                "contact_email": "contact@starter-org.test",
                "contact_phone": "+254700000000",
            },
        )

        workplace_role, _ = Role.objects.get_or_create(role_name="Workplace Supervisor")
        academic_role, _ = Role.objects.get_or_create(role_name="Academic Supervisor")

        workplace_user, _ = User.objects.get_or_create(
            email="workplace.supervisor@iles.local",
            defaults={
                "first_name": "Workplace",
                "last_name": "Supervisor",
                "role": workplace_role,
                "department": user.department,
            },
        )
        if not workplace_user.has_usable_password():
            workplace_user.set_unusable_password()
            workplace_user.save(update_fields=["password"])

        academic_user, _ = User.objects.get_or_create(
            email="academic.supervisor@iles.local",
            defaults={
                "first_name": "Academic",
                "last_name": "Supervisor",
                "role": academic_role,
                "department": user.department,
            },
        )
        if not academic_user.has_usable_password():
            academic_user.set_unusable_password()
            academic_user.save(update_fields=["password"])

        workplace_supervisor, _ = Supervisor.objects.get_or_create(
            user=workplace_user,
            defaults={
                "supervisor_type": "workplace",
                "organization": org,
                "department": None,
            },
        )

        academic_supervisor, _ = Supervisor.objects.get_or_create(
            user=academic_user,
            defaults={
                "supervisor_type": "academic",
                "organization": None,
                "department": user.department,
            },
        )

        placement = InternshipPlacement.objects.create(
            student=student,
            organization=org,
            workplace_supervisor=workplace_supervisor,
            academic_supervisor=academic_supervisor,
            start_date=timezone.now().date() - timedelta(days=28),
            end_date=timezone.now().date() + timedelta(days=56),
            position_title="Software Intern",
            status="approved",
        )

        for week in range(1, weeks + 1):
            start_date = placement.start_date + timedelta(days=(week - 1) * 7)
            end_date = start_date + timedelta(days=6)
            WeeklyLog.objects.create(
                placement=placement,
                week_number=week,
                start_date=start_date,
                end_date=end_date,
                activities_performed="Worked on assigned internship tasks and documented progress.",
                skills_learned="Communication, software development workflows, and debugging.",
                challenges="Time management and understanding project requirements.",
                solutions="Improved planning and regular supervisor check-ins.",
                hours_worked=Decimal("40.00"),
                status="submitted" if week == weeks else "approved",
                submitted_at=timezone.now() - timedelta(days=max(0, weeks - week)),
            )

        Notification.objects.get_or_create(
            user=user,
            message="Welcome to ILES! Your starter placement is now active.",
            notification_type="placement_approved",
            defaults={"is_read": False},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Starter data created for {email}: student_created={created_student}, placement_id={placement.placement_id}, weeks={weeks}"
            )
        )
