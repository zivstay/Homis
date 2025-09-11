#!/usr/bin/env python3
"""
Migration script to add budget auto-reset fields to boards table.
This script adds budget_auto_reset, budget_reset_day, and budget_last_reset columns to the boards table.
"""

import os
import sys
from flask import Flask

# Set environment to development before importing config
os.environ['FLASK_ENV'] = 'development'

from config import config
from postgres_models import db

def create_app_for_migration():
    """Create a Flask app instance for migration"""
    app = Flask(__name__)
    
    # Get configuration
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app

def run_migration():
    """Add budget auto-reset fields to boards table"""
    
    print("🔄 Starting migration: Adding budget auto-reset fields to boards table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if budget_auto_reset column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_auto_reset';
            """))
            
            budget_auto_reset_exists = result.fetchone() is not None
            
            # Check if budget_reset_day column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_reset_day';
            """))
            
            budget_reset_day_exists = result.fetchone() is not None
            
            # Check if budget_last_reset column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_last_reset';
            """))
            
            budget_last_reset_exists = result.fetchone() is not None
            
            if budget_auto_reset_exists and budget_reset_day_exists and budget_last_reset_exists:
                print("✅ Budget auto-reset fields already exist in boards table")
                return True
            
            # Add budget_auto_reset column if it doesn't exist
            if not budget_auto_reset_exists:
                print("➕ Adding budget_auto_reset column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_auto_reset BOOLEAN DEFAULT FALSE;
                """))
                print("✅ Added budget_auto_reset column")
            else:
                print("ℹ️  budget_auto_reset column already exists")
            
            # Add budget_reset_day column if it doesn't exist
            if not budget_reset_day_exists:
                print("➕ Adding budget_reset_day column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_reset_day INTEGER;
                """))
                print("✅ Added budget_reset_day column")
            else:
                print("ℹ️  budget_reset_day column already exists")
            
            # Add budget_last_reset column if it doesn't exist
            if not budget_last_reset_exists:
                print("➕ Adding budget_last_reset column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_last_reset TIMESTAMP WITH TIME ZONE;
                """))
                print("✅ Added budget_last_reset column")
            else:
                print("ℹ️  budget_last_reset column already exists")
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully added budget auto-reset fields to boards table")
            print("📝 Column details:")
            print("   - budget_auto_reset: BOOLEAN (default: FALSE)")
            print("   - budget_reset_day: INTEGER (nullable)")
            print("   - budget_last_reset: TIMESTAMP WITH TIME ZONE (nullable)")
            
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n🎉 Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)
