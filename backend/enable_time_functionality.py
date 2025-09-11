#!/usr/bin/env python3
"""
Manual script to add budget_reset_time column to database
Run this when you want to enable the time functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLAlchemy
db = SQLAlchemy()
db.init_app(app)

def add_budget_reset_time_column():
    """Add budget_reset_time column to boards table"""
    
    print("🔄 Adding budget_reset_time column to boards table...")
    
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_reset_time';
            """))
            
            exists = result.fetchone() is not None
            
            if exists:
                print("ℹ️  budget_reset_time column already exists")
                return True
            
            # Add the column
            print("➕ Adding budget_reset_time column...")
            db.session.execute(db.text("""
                ALTER TABLE boards 
                ADD COLUMN budget_reset_time TIME;
            """))
            
            db.session.commit()
            print("✅ Column added successfully!")
            print("📝 Column details:")
            print("   - budget_reset_time: TIME (nullable)")
            print("   - Format: HH:MM (24-hour format)")
            print("   - Example: 09:00, 14:30, 23:59")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    success = add_budget_reset_time_column()
    if success:
        print("🎉 Migration completed successfully!")
        print("💡 You can now uncomment the time-related code in:")
        print("   - backend/postgres_models.py")
        print("   - services/api.ts") 
        print("   - components/BudgetEditModal.tsx")
        print("   - screens/HomeScreen.tsx")
        sys.exit(0)
    else:
        print("💥 Migration failed!")
        sys.exit(1)
