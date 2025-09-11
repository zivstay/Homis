#!/usr/bin/env python3
"""
Migration script to add budget_reset_time field to boards table
"""

import os
import sys
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLAlchemy
db = SQLAlchemy()

def create_app_for_migration():
    """Create Flask app for migration purposes"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app

def run_migration():
    """Add budget_reset_time field to boards table"""
    
    print("🔄 Starting migration: Adding budget_reset_time field to boards table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if budget_reset_time column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_reset_time';
            """))
            
            budget_reset_time_exists = result.fetchone() is not None
            
            if budget_reset_time_exists:
                print("ℹ️  budget_reset_time column already exists")
                return True
            
            # Add budget_reset_time column
            print("➕ Adding budget_reset_time column...")
            db.session.execute(db.text("""
                ALTER TABLE boards 
                ADD COLUMN budget_reset_time TIME;
            """))
            print("✅ Added budget_reset_time column")
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully added budget_reset_time field to boards table")
            print("📝 Column details:")
            print("   - budget_reset_time: TIME (nullable)")
            print("   - Format: HH:MM (24-hour format)")
            print("   - Example: 09:00, 14:30, 23:59")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during migration: {str(e)}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("🎉 Migration completed successfully!")
        sys.exit(0)
    else:
        print("💥 Migration failed!")
        sys.exit(1)
