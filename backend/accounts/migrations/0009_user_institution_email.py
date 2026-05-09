from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_user_institution_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='institution_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]
