#!/usr/bin/env python3
"""
Migration script to add is_admin column to users table
This allows marking users as administrators with special privileges
"""

import os
import sys
from flask import Flask
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
    """Add is_admin column to users table"""
    
    print("🔄 Starting migration: Adding is_admin column to users table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'is_admin';
            """))
            
            if result.fetchone():
                print("✅ Column 'is_admin' already exists in users table")
                return True
            
            # Add the column
            db.session.execute(db.text("""
                ALTER TABLE users 
                ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
            """))
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully added is_admin column to users table")
            print("📝 Column details:")
            print("   - Name: is_admin")
            print("   - Type: BOOLEAN")
            print("   - Default: FALSE")
            print("   - NOT NULL: TRUE")
            print("\n💡 To make a user admin, run:")
            print("   python make_user_admin.py <email>")
            
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
