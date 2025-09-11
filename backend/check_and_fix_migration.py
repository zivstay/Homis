#!/usr/bin/env python3
"""
Simple script to check and add budget_reset_time column if needed
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

def check_and_add_column():
    """Check if budget_reset_time column exists and add it if needed"""
    
    print("🔄 Checking budget_reset_time column...")
    
    with app.app_context():
        try:
            # Check if column exists
            result = db.session.execute(db.text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_reset_time';
            """))
            
            exists = result.fetchone() is not None
            print(f"📊 budget_reset_time column exists: {exists}")
            
            if not exists:
                print("➕ Adding budget_reset_time column...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_reset_time TIME;
                """))
                db.session.commit()
                print("✅ Column added successfully!")
            else:
                print("ℹ️  Column already exists")
                
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    success = check_and_add_column()
    if success:
        print("🎉 Migration check completed successfully!")
        sys.exit(0)
    else:
        print("💥 Migration check failed!")
        sys.exit(1)
