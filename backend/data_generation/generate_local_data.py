import os
import sys
import django

# Add the project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iles.settings')
django.setup()

from data_generation.data_factory import generate_all_data

def main():
    print("--- ILES LOCAL DATA GENERATOR ---")
    print("This script will populate your LOCAL database with 75 realistic samples per entity.")
    
    try:
        generate_all_data(count=80)  # Exceeding the 70 threshold for safety
        print("\n✨ Local database successfully populated!")
    except Exception as e:
        print(f"\n❌ Error during data generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
