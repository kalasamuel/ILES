from django.core.management.base import BaseCommand
from django.utils import timezone

from logbooks.models import WeeklyLog
from reviews.models import WorkflowHistory


class Command(BaseCommand):
    help = 'Submit scheduled weekly logs whose send time has arrived.'

    def handle(self, *args, **options):
        due_logs = WeeklyLog.objects.filter(
            status='scheduled',
            scheduled_submission_at__isnull=False,
            scheduled_submission_at__lte=timezone.now(),
        )

        processed = 0

        for log in due_logs:
            previous_status = log.status
            log.status = 'submitted'
            log.submitted_at = timezone.now()
            log.scheduled_submission_at = None
            log.save(update_fields=['status', 'submitted_at', 'scheduled_submission_at'])

            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status=previous_status,
                new_status='submitted',
                changed_by=log.placement.student.user,
            )
            processed += 1

        self.stdout.write(self.style.SUCCESS(f'Processed {processed} scheduled log(s).'))