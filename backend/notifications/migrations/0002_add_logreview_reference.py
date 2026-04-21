# Generated migration for adding log_review field to Notification

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0001_initial'),
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='log_review',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='reviews.logreview'),
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
                ],
                max_length=50
            ),
        ),
    ]
