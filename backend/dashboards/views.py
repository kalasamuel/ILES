from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Avg
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import DashboardMetric
from .serializers import DashboardMetricSerializer
from placements.models import InternshipPlacement
from accounts.models import Role, Student, Supervisor, User
from evaluations.models import ScoreBreakdown
from reviews.models import LogReview
from logbooks.models import WeeklyLog
from notifications.models import Notification
from organizations.models import Organization


class DashboardMetricViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage DashboardMetric entries.

    Standard CRUD operations:
    - list, retrieve, create, update, partial_update, destroy

    Custom actions:
    - refresh_metrics: Recalculates key dashboard metrics and updates the database.
    """
    queryset = DashboardMetric.objects.all().order_by('metric_type')
    serializer_class = DashboardMetricSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='bootstrap-my-student-data')
    def bootstrap_my_student_data(self, request):
        user = request.user
        role_name = (user.role.role_name if user.role else '').strip().lower()

        if 'student' not in role_name:
            return Response({'error': 'Only students can bootstrap student data.'}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'registration_number': f"TEMP-{str(user.user_id).replace('-', '')[:8].upper()}",
                    'program': user.department.department_name if user.department else 'Not Set',
                    'year_of_study': 1,
                    'expected_graduation': (user.date_joined.date() if user.date_joined else timezone.now().date()) + timedelta(days=365 * 4),
                },
            )

            existing = InternshipPlacement.objects.filter(student=student).exists()
            if existing:
                return Response({
                    'message': 'Student data already exists.',
                    'placements': InternshipPlacement.objects.filter(student__user=user).count(),
                    'logs': WeeklyLog.objects.filter(placement__student__user=user).count(),
                    'notifications': Notification.objects.filter(user=user).count(),
                }, status=status.HTTP_200_OK)

            org, _ = Organization.objects.get_or_create(
                name='Starter Organization',
                defaults={
                    'industry': 'Technology',
                    'address': '123 Starter Avenue',
                    'city': 'Nairobi',
                    'country': 'Kenya',
                    'contact_email': 'contact@starter-org.test',
                    'contact_phone': '+254700000000',
                },
            )

            workplace_role, _ = Role.objects.get_or_create(role_name='Workplace Supervisor')
            academic_role, _ = Role.objects.get_or_create(role_name='Academic Supervisor')

            workplace_user, _ = User.objects.get_or_create(
                email='workplace.supervisor@iles.local',
                defaults={
                    'first_name': 'Workplace',
                    'last_name': 'Supervisor',
                    'role': workplace_role,
                    'department': user.department,
                },
            )
            if not workplace_user.has_usable_password():
                workplace_user.set_unusable_password()
                workplace_user.save(update_fields=['password'])

            academic_user, _ = User.objects.get_or_create(
                email='academic.supervisor@iles.local',
                defaults={
                    'first_name': 'Academic',
                    'last_name': 'Supervisor',
                    'role': academic_role,
                    'department': user.department,
                },
            )
            if not academic_user.has_usable_password():
                academic_user.set_unusable_password()
                academic_user.save(update_fields=['password'])

            workplace_supervisor, _ = Supervisor.objects.get_or_create(
                user=workplace_user,
                defaults={
                    'supervisor_type': 'workplace',
                    'organization': org,
                    'department': None,
                },
            )

            academic_supervisor, _ = Supervisor.objects.get_or_create(
                user=academic_user,
                defaults={
                    'supervisor_type': 'academic',
                    'organization': None,
                    'department': user.department,
                },
            )

            placement = InternshipPlacement.objects.create(
                student=student,
                organization=org,
                workplace_supervisor=workplace_supervisor,
                academic_supervisor=academic_supervisor,
                start_date=timezone.now().date() - timedelta(days=28),
                end_date=timezone.now().date() + timedelta(days=56),
                position_title='Software Intern',
                status='approved',
            )

            for week in range(1, 5):
                start_date = placement.start_date + timedelta(days=(week - 1) * 7)
                end_date = start_date + timedelta(days=6)
                WeeklyLog.objects.create(
                    placement=placement,
                    week_number=week,
                    start_date=start_date,
                    end_date=end_date,
                    activities_performed='Worked on assigned internship tasks and documented progress.',
                    skills_learned='Communication, software development workflows, and debugging.',
                    challenges='Time management and understanding project requirements.',
                    solutions='Improved planning and regular supervisor check-ins.',
                    hours_worked=Decimal('40.00'),
                    status='submitted' if week == 4 else 'approved',
                    submitted_at=timezone.now() - timedelta(days=max(0, 4 - week)),
                )

            Notification.objects.get_or_create(
                user=user,
                message='Welcome to ILES! Your starter placement is now active.',
                notification_type='placement_approved',
                defaults={'is_read': False},
            )

        return Response({
            'message': 'Starter student data created.',
            'placements': InternshipPlacement.objects.filter(student__user=user).count(),
            'logs': WeeklyLog.objects.filter(placement__student__user=user).count(),
            'notifications': Notification.objects.filter(user=user).count(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bootstrap-my-supervisor-data')
    def bootstrap_my_supervisor_data(self, request):
        user = request.user
        role_name = (user.role.role_name if user.role else '').strip().lower().replace('-', ' ').replace('_', ' ')

        if 'supervisor' not in role_name and 'academic' not in role_name and 'workplace' not in role_name:
            return Response({'error': 'Only supervisors can bootstrap supervisor data.'}, status=status.HTTP_403_FORBIDDEN)

        default_supervisor_type = 'academic' if 'academic' in role_name else 'workplace'
        supervisor, _ = Supervisor.objects.get_or_create(
            user=user,
            defaults={
                'supervisor_type': default_supervisor_type,
                'department': user.department if default_supervisor_type == 'academic' else None,
            },
        )

        existing_placements_count = InternshipPlacement.objects.filter(
            Q(workplace_supervisor=supervisor) | Q(academic_supervisor=supervisor)
        ).distinct().count()
        existing_reviews_count = LogReview.objects.filter(supervisor=supervisor).count()
        existing_pending_logs_count = WeeklyLog.objects.filter(
            status='submitted'
        ).filter(
            Q(placement__workplace_supervisor=supervisor) | Q(placement__academic_supervisor=supervisor)
        ).distinct().count()

        if existing_placements_count > 0 or existing_reviews_count > 0 or existing_pending_logs_count > 0:
            return Response({
                'message': 'Supervisor data already exists.',
                'placements': existing_placements_count,
                'reviews': existing_reviews_count,
                'pending_logs': existing_pending_logs_count,
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            org, _ = Organization.objects.get_or_create(
                name='Starter Organization',
                defaults={
                    'industry': 'Technology',
                    'address': '123 Starter Avenue',
                    'city': 'Nairobi',
                    'country': 'Kenya',
                    'contact_email': 'contact@starter-org.test',
                    'contact_phone': '+254700000000',
                },
            )

            student_role, _ = Role.objects.get_or_create(role_name='Student')
            student_email = f"student.{str(user.user_id).replace('-', '')[:10].lower()}@iles.local"
            student_user, _ = User.objects.get_or_create(
                email=student_email,
                defaults={
                    'first_name': 'Starter',
                    'last_name': 'Student',
                    'role': student_role,
                    'department': user.department,
                },
            )
            if not student_user.has_usable_password():
                student_user.set_unusable_password()
                student_user.save(update_fields=['password'])

            registration_number = f"TEMP-{str(student_user.user_id).replace('-', '')[:8].upper()}"
            student, _ = Student.objects.get_or_create(
                user=student_user,
                defaults={
                    'registration_number': registration_number,
                    'program': user.department.department_name if user.department else 'Not Set',
                    'year_of_study': 1,
                    'expected_graduation': timezone.now().date() + timedelta(days=365 * 4),
                },
            )

            workplace_role, _ = Role.objects.get_or_create(role_name='Workplace Supervisor')
            academic_role, _ = Role.objects.get_or_create(role_name='Academic Supervisor')

            if supervisor.supervisor_type == 'workplace':
                workplace_supervisor = supervisor
                academic_user, _ = User.objects.get_or_create(
                    email=f"starter.academic.{str(user.user_id).replace('-', '')[:8].lower()}@iles.local",
                    defaults={
                        'first_name': 'Starter',
                        'last_name': 'Academic',
                        'role': academic_role,
                        'department': user.department,
                    },
                )
                if not academic_user.has_usable_password():
                    academic_user.set_unusable_password()
                    academic_user.save(update_fields=['password'])

                academic_supervisor, _ = Supervisor.objects.get_or_create(
                    user=academic_user,
                    defaults={
                        'supervisor_type': 'academic',
                        'department': user.department,
                    },
                )
            else:
                academic_supervisor = supervisor
                workplace_user, _ = User.objects.get_or_create(
                    email=f"starter.workplace.{str(user.user_id).replace('-', '')[:8].lower()}@iles.local",
                    defaults={
                        'first_name': 'Starter',
                        'last_name': 'Workplace',
                        'role': workplace_role,
                        'department': user.department,
                    },
                )
                if not workplace_user.has_usable_password():
                    workplace_user.set_unusable_password()
                    workplace_user.save(update_fields=['password'])

                workplace_supervisor, _ = Supervisor.objects.get_or_create(
                    user=workplace_user,
                    defaults={
                        'supervisor_type': 'workplace',
                        'organization': org,
                    },
                )

            placement = InternshipPlacement.objects.create(
                student=student,
                organization=org,
                workplace_supervisor=workplace_supervisor,
                academic_supervisor=academic_supervisor,
                start_date=timezone.now().date() - timedelta(days=14),
                end_date=timezone.now().date() + timedelta(days=70),
                position_title='Software Intern',
                status='approved',
            )

            WeeklyLog.objects.create(
                placement=placement,
                week_number=1,
                start_date=placement.start_date,
                end_date=placement.start_date + timedelta(days=6),
                activities_performed='Completed onboarding and environment setup.',
                skills_learned='Team communication and task tracking.',
                challenges='Understanding codebase modules.',
                solutions='Received walkthrough from team members.',
                hours_worked=Decimal('40.00'),
                status='approved',
                submitted_at=timezone.now() - timedelta(days=7),
            )

            WeeklyLog.objects.create(
                placement=placement,
                week_number=2,
                start_date=placement.start_date + timedelta(days=7),
                end_date=placement.start_date + timedelta(days=13),
                activities_performed='Implemented assigned feature and wrote tests.',
                skills_learned='Debugging and API integration.',
                challenges='API validation errors.',
                solutions='Worked through validation constraints and retried payloads.',
                hours_worked=Decimal('40.00'),
                status='submitted',
                submitted_at=timezone.now() - timedelta(days=1),
            )

            Notification.objects.get_or_create(
                user=user,
                message='Starter supervisor data is ready. You have logs to review.',
                notification_type='log_submitted',
                defaults={'is_read': False},
            )

        placements_count = InternshipPlacement.objects.filter(
            Q(workplace_supervisor=supervisor) | Q(academic_supervisor=supervisor)
        ).distinct().count()
        reviews_count = LogReview.objects.filter(supervisor=supervisor).count()
        pending_logs_count = WeeklyLog.objects.filter(
            status='submitted'
        ).filter(
            Q(placement__workplace_supervisor=supervisor) | Q(placement__academic_supervisor=supervisor)
        ).distinct().count()

        return Response({
            'message': 'Starter supervisor data created.',
            'placements': placements_count,
            'reviews': reviews_count,
            'pending_logs': pending_logs_count,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-data-context')
    def my_data_context(self, request):
        user = request.user
        role_name = (user.role.role_name if user.role else '').strip()

        is_student_profile = Student.objects.filter(user=user).exists()
        is_supervisor_profile = Supervisor.objects.filter(user=user).exists()

        supervisor_pending_logs = WeeklyLog.objects.filter(status='submitted').filter(
            Q(placement__workplace_supervisor__user=user) | Q(placement__academic_supervisor__user=user)
        ).distinct().count()

        context = {
            'user_id': str(user.user_id),
            'email': user.email,
            'role_name': role_name,
            'has_student_profile': is_student_profile,
            'has_supervisor_profile': is_supervisor_profile,
            'student_owned': {
                'placements': InternshipPlacement.objects.filter(student__user=user).count(),
                'logs': WeeklyLog.objects.filter(placement__student__user=user).count(),
                'reviews': LogReview.objects.filter(log__placement__student__user=user).count(),
                'notifications': Notification.objects.filter(user=user).count(),
            },
            'supervisor_owned': {
                'placements_workplace': InternshipPlacement.objects.filter(workplace_supervisor__user=user).count(),
                'placements_academic': InternshipPlacement.objects.filter(academic_supervisor__user=user).count(),
                'reviews': LogReview.objects.filter(supervisor__user=user).count(),
                'pending_logs': supervisor_pending_logs,
            },
        }

        return Response(context, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='public-stats', permission_classes=[AllowAny])
    def public_stats(self, request):
        """Return public, aggregate metrics used on the landing page."""
        metrics = {
            'students_count': Student.objects.count(),
            'organizations_count': Organization.objects.count(),
            'departments_count': User.objects.exclude(department__isnull=True).values('department').distinct().count(),
        }
        return Response(metrics, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='refresh-metrics')
    def refresh_metrics(self, request):
        """
        Recalculate and update dashboard metrics:
        - internships_completed
        - total_students
        - active_placements
        - average_score
        - pending_reviews

        Returns all updated metrics in serialized form.
        """
        with transaction.atomic():
            metrics_data = {
                'internships_completed': InternshipPlacement.objects.filter(status='completed').count(),
                'total_students': Student.objects.count(),
                'active_placements': InternshipPlacement.objects.filter(status__in=['pending', 'approved']).count(),
                'average_score': ScoreBreakdown.objects.aggregate(avg=Avg('final_score'))['avg'] or 0,
                'pending_reviews': LogReview.objects.filter(status='needs_revision').count(),
            }

            # Update or create metrics
            for metric_type, value in metrics_data.items():
                DashboardMetric.objects.update_or_create(
                    metric_type=metric_type,
                    defaults={'value': value}
                )

        # Fetch updated metrics and serialize
        metrics = DashboardMetric.objects.all().order_by('metric_type')
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)