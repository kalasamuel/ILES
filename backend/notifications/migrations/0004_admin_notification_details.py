from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_add_log_reference'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='details',
            field=models.JSONField(blank=True, default=dict),
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
                    ('system_health_update', 'System Health Update'),
                    ('server_status_update', 'Server Status Update'),
                    ('pending_updates', 'Pending Updates'),
                    ('system_alert', 'System Alert'),
                    ('new_company_added', 'New Company Added'),
                ],
                max_length=50,
            ),
        ),
    ]
