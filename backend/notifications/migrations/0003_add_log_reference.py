# Generated migration for adding log field to Notification

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('logbooks', '0002_logattachment_file_and_optional_url'),
        ('notifications', '0002_add_logreview_reference'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='log',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='logbooks.weeklylog'),
        ),
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('log_review_pending', 'Log Review Pending'),
                    ('submission_deadline', 'Submission Deadline'),
                    ('evaluation_completed', 'Evaluation Completed'),
                    ('placement_approved', 'Placement Approved'),
                    ('placement_rejected', 'Placement Rejected'),
                    ('feedback_added', 'Feedback Added'),
                    ('log_submitted', 'Log Submitted'),
                ],
                max_length=50
            ),
        ),
    ]
