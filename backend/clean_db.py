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
    from flask import Flask
    from postgres_models import db, PostgreSQLDatabaseManager, User, Board, BoardMember, Expense, Debt, Category, Notification, Invitation
    from config import config
    print("✅ Successfully imported PostgreSQL models")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("📁 Current working directory:", os.getcwd())
    print("📁 Script directory:", current_dir)
    sys.exit(1)

def clean_database():
    """Clean all tables except users"""
    print("🔧 Initializing Flask app and database connection...")
    
    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config['development'])
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        # Get current user count before cleaning
        users_before = User.query.count()
        print(f"👥 Found {users_before} users (will be preserved)")
        
        # Clean all tables except users (in order to respect foreign keys)
        tables_to_clean = [
            (Debt, 'התחשבנויות'),
            (Expense, 'הוצאות'),
            (Notification, 'התראות'),
            (Category, 'קטגוריות (לא ברירת מחדל)'),
            (Invitation, 'הזמנות'),
            (BoardMember, 'חברי לוחות'),
            (Board, 'לוחות (לא ברירת מחדל)')
        ]
        
        for model_class, hebrew_name in tables_to_clean:
            try:
                if model_class == Category:
                    # Only delete non-default categories
                    count_before = model_class.query.filter_by(is_default=False).count()
                    if count_before > 0:
                        model_class.query.filter_by(is_default=False).delete()
                        print(f"🗑️  נוקה: {hebrew_name} ({count_before} רשומות)")
                    else:
                        print(f"✅ ריק: {hebrew_name}")
                elif model_class == Board:
                    # Only delete non-global boards
                    count_before = model_class.query.filter(Board.board_type != 'global').count()
                    if count_before > 0:
                        model_class.query.filter(Board.board_type != 'global').delete()
                        print(f"🗑️  נוקה: {hebrew_name} ({count_before} רשומות)")
                    else:
                        print(f"✅ ריק: {hebrew_name}")
                else:
                    count_before = model_class.query.count()
                    if count_before > 0:
                        model_class.query.delete()
                        print(f"🗑️  נוקה: {hebrew_name} ({count_before} רשומות)")
                    else:
                        print(f"✅ ריק: {hebrew_name}")
                
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                print(f"❌ שגיאה בניקוי {hebrew_name}: {e}")
        
        # Verify users are still there
        users_after = User.query.count()
        print(f"👥 משתמשים אחרי ניקוי: {users_after}")
        
        if users_after == users_before:
            print("✅ הניקוי הושלם בהצלחה! המשתמשים נשמרו.")
        else:
            print("❌ שגיאה: חלק מהמשתמשים נמחקו!")
        
        print("\n🎯 המסד נתונים נקי וכולל רק משתמשים וקטגוריות ברירת מחדל.")
        print("🚀 כעת תוכל לבדוק חישובי התחשבנויות עם נתונים חדשים.")

if __name__ == "__main__":
    print("🧹 מנקה מסד נתונים...")
    try:
        clean_database()
    except Exception as e:
        print(f"❌ שגיאה: {e}")
        import traceback
        traceback.print_exc() 