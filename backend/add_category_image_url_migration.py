#!/usr/bin/env python3
"""
Migration script to add image_url field to categories table
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
    """Add image_url field to categories table"""
    
    print("🔄 Starting migration: Adding image_url field to categories table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if image_url column already exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'categories' AND column_name = 'image_url';
            """))
            
            image_url_exists = result.fetchone() is not None
            
            if image_url_exists:
                print("ℹ️  image_url column already exists")
                return True
            
            # Add image_url column
            print("➕ Adding image_url column...")
            db.session.execute(db.text("""
                ALTER TABLE categories 
                ADD COLUMN image_url VARCHAR(500);
            """))
            print("✅ Added image_url column")
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully added image_url field to categories table")
            print("📝 Column details:")
            print("   - image_url: VARCHAR(500) (nullable)")
            print("   - Used to store uploaded category image URLs")
            
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
