from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_profile_picture'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='institution_name',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
