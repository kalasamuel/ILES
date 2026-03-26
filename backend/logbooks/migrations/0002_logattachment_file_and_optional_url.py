from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logbooks', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='logattachment',
            name='file_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='logattachment',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='log_attachments/'),
        ),
    ]
