import os
import sys
import django

# Add the project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')

# Ensure we are in production mode settings-wise
# The iles/settings.py already checks for DATABASE_URL
django.setup()

from data_generation.data_factory import generate_all_data
from django.conf import settings
from accounts.models import User

def main():
    is_auto = "--auto" in sys.argv
    
    print("--- ⚠️ ILES LIVE DATA GENERATOR ⚠️ ---")
    
    # Safety Gate for automation
    if is_auto:
        user_count = User.objects.count()
        if user_count > 5:
            print(f"✅ Database already has {user_count} users. Skipping automatic seeding to prevent duplicates.")
            return
        print("🤖 Automation Mode: No existing data found. Proceeding with initial seeding...")
    else:
        print("This script will populate the LIVE database (on Render) with 75 realistic samples per entity.")
        print(f"Current DB Host: {settings.DATABASES['default'].get('HOST')}")
        
        if 'onrender.com' not in settings.DATABASES['default'].get('HOST', ''):
            print("WARNING: This script doesn't seem to be pointing to the LIVE Render database.")
            print("Please ensure your local environment has the production DATABASE_URL set.")
        
        confirm = input("\nARE YOU ABSOLUTELY SURE? This will add hundreds of records to production. (type 'YES' to proceed): ")
        
        if confirm != 'YES':
            print("Aborted.")
            return

    try:
        generate_all_data(count=80) 
        print("\n✨ LIVE database successfully populated!")
    except Exception as e:
        print(f"\n❌ Error during data generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
