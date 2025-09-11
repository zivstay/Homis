#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from add_category_image_url_migration import run_migration
    print("Running migration...")
    success = run_migration()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
