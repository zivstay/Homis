#!/usr/bin/env python3
"""
Simple database cleaner - removes all data except users from JSON file
"""

import json
import os

def clean_database():
    """Clean database JSON file, keeping only users"""
    db_path = 'backend/database.json'
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        return
    
    print(f"🔍 Found database at: {db_path}")
    
    # Read current database
    try:
        with open(db_path, 'r', encoding='utf-8') as f:
            db_data = json.load(f)
        print("✅ Database loaded successfully")
    except Exception as e:
        print(f"❌ Error reading database: {e}")
        return
    
    # Show current state
    print("\n📊 Current database contents:")
    for table_name, table_data in db_data.items():
        count = len(table_data) if isinstance(table_data, list) else 0
        print(f"  {table_name}: {count} records")
    
    # Keep only users table
    users_data = db_data.get('users', [])
    user_count = len(users_data)
    
    # Create clean database with only users
    clean_db = {
        'users': users_data,
        'boards': [],
        'board_members': [],
        'expenses': [],
        'debts': [],
        'categories': [],
        'notifications': [],
        'invitations': []
    }
    
    # Backup original file
    backup_path = db_path + '.backup'
    try:
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
        print(f"💾 Backup saved to: {backup_path}")
    except Exception as e:
        print(f"⚠️  Could not create backup: {e}")
    
    # Write clean database
    try:
        with open(db_path, 'w', encoding='utf-8') as f:
            json.dump(clean_db, f, ensure_ascii=False, indent=2)
        print("✅ Database cleaned successfully!")
    except Exception as e:
        print(f"❌ Error writing clean database: {e}")
        return
    
    print(f"\n🎯 Results:")
    print(f"  👥 Users preserved: {user_count}")
    print(f"  🗑️  Other tables cleared")
    print(f"\n🚀 Database is now clean and ready for testing!")

if __name__ == "__main__":
    print("🧹 Cleaning database (keeping only users)...")
    clean_database() 