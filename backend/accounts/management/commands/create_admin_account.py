from django.core.management.base import BaseCommand

from accounts.models import Role, User


class Command(BaseCommand):
    help = "Create or update an admin account for API login"

    def add_arguments(self, parser):
        parser.add_argument("--email", default="admin@iles.local", help="Admin email")
        parser.add_argument("--password", default="Admin@123", help="Admin password")
        parser.add_argument("--first-name", default="System", help="Admin first name")
        parser.add_argument("--last-name", default="Admin", help="Admin last name")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options["password"]
        first_name = options["first_name"].strip() or "System"
        last_name = options["last_name"].strip() or "Admin"

        admin_role, _ = Role.objects.get_or_create(role_name="Admin")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "role": admin_role,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        changed_fields = []
        if user.first_name != first_name:
            user.first_name = first_name
            changed_fields.append("first_name")
        if user.last_name != last_name:
            user.last_name = last_name
            changed_fields.append("last_name")
        if user.role_id != admin_role.role_id:
            user.role = admin_role
            changed_fields.append("role")
        if not user.is_staff:
            user.is_staff = True
            changed_fields.append("is_staff")
        if not user.is_superuser:
            user.is_superuser = True
            changed_fields.append("is_superuser")

        user.set_password(password)
        changed_fields.append("password")

        user.save(update_fields=changed_fields)

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} admin account: {email}"))
        self.stdout.write(self.style.SUCCESS("Password set successfully."))
