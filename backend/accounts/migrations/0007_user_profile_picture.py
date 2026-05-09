from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_usersettings_login_alerts'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_picture',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='profile_pictures/',
                validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp', 'gif'])],
            ),
        ),
    ]
