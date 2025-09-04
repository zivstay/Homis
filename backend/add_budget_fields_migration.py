#!/usr/bin/env python3
"""
Migration script to add budget fields to boards table.
This script adds budget_amount and budget_alerts columns to the boards table.
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
    """Add budget fields to boards table"""
    
    print("🔄 Starting migration: Adding budget fields to boards table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if budget_amount column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_amount';
            """))
            
            budget_amount_exists = result.fetchone() is not None
            
            # Check if budget_alerts column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_alerts';
            """))
            
            budget_alerts_exists = result.fetchone() is not None
            
            if budget_amount_exists and budget_alerts_exists:
                print("✅ Budget fields already exist in boards table")
                return True
            
            # Add budget_amount column if it doesn't exist
            if not budget_amount_exists:
                print("➕ Adding budget_amount column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_amount REAL;
                """))
                print("✅ Added budget_amount column")
            else:
                print("ℹ️  budget_amount column already exists")
            
            # Add budget_alerts column if it doesn't exist
            if not budget_alerts_exists:
                print("➕ Adding budget_alerts column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_alerts JSON DEFAULT '[]'::json;
                """))
                print("✅ Added budget_alerts column")
            else:
                print("ℹ️  budget_alerts column already exists")
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully added budget fields to boards table")
            print("📝 Column details:")
            print("   - budget_amount: REAL (nullable)")
            print("   - budget_alerts: JSON (default: [])")
            
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
