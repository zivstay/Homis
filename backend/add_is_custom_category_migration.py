#!/usr/bin/env python3
"""
Migration to add is_custom field to categories table
"""

import os
import sys
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from postgres_models import db, Category
from config import Config
from flask import Flask

def create_app_for_migration():
    """Create Flask app for migration"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app

def add_is_custom_field():
    """Add is_custom field to categories table"""
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            print("🔄 Starting migration: Add is_custom field to categories table")
            
            # Check if the field already exists
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('categories')]
            
            if 'is_custom' in columns:
                print("✅ Field 'is_custom' already exists in categories table")
                return True
            
            # Add the is_custom column
            print("📝 Adding is_custom column to categories table...")
            db.engine.execute(text("ALTER TABLE categories ADD COLUMN is_custom BOOLEAN DEFAULT FALSE"))
            
            # Update existing categories to set is_custom based on is_default
            print("🔄 Updating existing categories...")
            db.engine.execute(text("UPDATE categories SET is_custom = NOT is_default"))
            
            # Commit the changes
            db.session.commit()
            
            print("✅ Migration completed successfully!")
            print("📊 Summary:")
            print("   - Added is_custom field to categories table")
            print("   - Set is_custom = TRUE for all non-default categories")
            print("   - Set is_custom = FALSE for all default categories")
            
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

def rollback_migration():
    """Rollback the migration by removing the is_custom field"""
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            print("🔄 Rolling back migration: Remove is_custom field from categories table")
            
            from sqlalchemy import text, inspect
            
            # Check if the field exists
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('categories')]
            
            if 'is_custom' not in columns:
                print("✅ Field 'is_custom' does not exist in categories table")
                return True
            
            # Remove the is_custom column
            print("📝 Removing is_custom column from categories table...")
            db.engine.execute(text("ALTER TABLE categories DROP COLUMN is_custom"))
            
            # Commit the changes
            db.session.commit()
            
            print("✅ Rollback completed successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Rollback failed: {str(e)}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Add is_custom field to categories table')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    else:
        success = add_is_custom_field()
    
    sys.exit(0 if success else 1)
