#!/usr/bin/env python3
"""
Clean database script - removes all data except users
"""

import sys
import os

# Add the current directory to Python path so we can import from backend
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from backend.models import DatabaseManager
    print("✅ Successfully imported DatabaseManager")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("📁 Current working directory:", os.getcwd())
    print("📁 Script directory:", current_dir)
    print("📁 Looking for backend in:", os.path.join(current_dir, 'backend'))
    sys.exit(1)

def clean_database():
    """Clean all tables except users"""
    db_path = os.path.join(current_dir, 'backend', 'database.json')
    print(f"🔍 Looking for database at: {db_path}")
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        print(f"📁 Checked path: {db_path}")
        return
    
    print("🔧 Initializing database manager...")
    db_manager = DatabaseManager(db_path)
    
    # Get current user count before cleaning
    users_before = len(db_manager.users_table.all())
    print(f"👥 Found {users_before} users (will be preserved)")
    
    # Clean all tables except users
    tables_to_clean = [
        ('boards_table', 'לוחות'),
        ('board_members_table', 'חברי לוחות'), 
        ('expenses_table', 'הוצאות'),
        ('debts_table', 'התחשבנויות'),
        ('categories_table', 'קטגוריות'),
        ('notifications_table', 'התראות'),
        ('invitations_table', 'הזמנות')
    ]
    
    for table_name, hebrew_name in tables_to_clean:
        try:
            table = getattr(db_manager, table_name)
            count_before = len(table.all())
            if count_before > 0:
                table.truncate()  # Clear all records from table
                print(f"🗑️  נוקה: {hebrew_name} ({count_before} רשומות)")
            else:
                print(f"✅ ריק: {hebrew_name}")
        except Exception as e:
            print(f"❌ שגיאה בניקוי {hebrew_name}: {e}")
    
    # Verify users are still there
    users_after = len(db_manager.users_table.all())
    print(f"👥 משתמשים אחרי ניקוי: {users_after}")
    
    if users_after == users_before:
        print("✅ הניקוי הושלם בהצלחה! המשתמשים נשמרו.")
    else:
        print("❌ שגיאה: חלק מהמשתמשים נמחקו!")
    
    print("\n🎯 המסד נתונים נקי וכולל רק משתמשים.")
    print("🚀 כעת תוכל לבדוק חישובי התחשבנויות עם נתונים חדשים.")

if __name__ == "__main__":
    print("🧹 מנקה מסד נתונים...")
    try:
        clean_database()
    except Exception as e:
        print(f"❌ שגיאה: {e}")
        import traceback
        traceback.print_exc() 