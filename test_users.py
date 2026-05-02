import os
import sys
import django

sys.path.insert(0, 'd:\\computer_science\\Year 2\\Sem-2\\SDP\\ILES\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')
django.setup()

from accounts.models import User

# Get the first student user and print their details
user = User.objects.filter(email='student1@test.com').first()
if user:
    print(f'User found: {user.email}, ID: {user.user_id}')
    print(f'Password works: student1@test.com : password123')
else:
    print('User not found')
    # List all users
    print("Available users:")
    for u in User.objects.all()[:10]:
        print(f'  - {u.email}')
