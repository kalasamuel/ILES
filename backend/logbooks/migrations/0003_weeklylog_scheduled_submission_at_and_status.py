from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logbooks', '0002_logattachment_file_and_optional_url'),
    ]

    operations = [
        migrations.AlterField(
            model_name='weeklylog',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('scheduled', 'Scheduled'), ('submitted', 'Submitted'), ('reviewed', 'Reviewed'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='draft', max_length=20),
        ),
        migrations.AddField(
            model_name='weeklylog',
            name='scheduled_submission_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]