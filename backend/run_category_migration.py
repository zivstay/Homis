#!/usr/bin/env python3
"""
Simple script to run the category image_url migration
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from add_category_image_url_migration import run_migration
    print("🔄 Running category image_url migration...")
    success = run_migration()
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)
except Exception as e:
    print(f"❌ Error running migration: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
