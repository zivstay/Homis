#!/usr/bin/env python3
"""
Migration script to add push_tokens table for Expo Push Notifications
Stores user device tokens for sending push notifications
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
    """Create push_tokens table"""
    
    print("🔄 Starting migration: Creating push_tokens table...")
    
    # Initialize PostgreSQL app
    app = create_app_for_migration()
    
    with app.app_context():
        try:
            # Check if table already exists
            result = db.session.execute(db.text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'push_tokens';
            """))
            
            if result.fetchone():
                print("✅ Table 'push_tokens' already exists")
                return True
            
            # Create the table
            db.session.execute(db.text("""
                CREATE TABLE push_tokens (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    expo_push_token VARCHAR(500) NOT NULL UNIQUE,
                    device_id VARCHAR(255) NOT NULL,
                    device_name VARCHAR(255),
                    device_os VARCHAR(50),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """))
            
            # Create indexes for better performance
            db.session.execute(db.text("""
                CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
            """))
            
            db.session.execute(db.text("""
                CREATE INDEX idx_push_tokens_expo_push_token ON push_tokens(expo_push_token);
            """))
            
            db.session.execute(db.text("""
                CREATE INDEX idx_push_tokens_is_active ON push_tokens(is_active);
            """))
            
            # Commit the transaction
            db.session.commit()
            
            print("✅ Successfully created push_tokens table")
            print("📝 Table details:")
            print("   - Table name: push_tokens")
            print("   - Columns:")
            print("     * id (VARCHAR, PRIMARY KEY)")
            print("     * user_id (VARCHAR, NOT NULL, FOREIGN KEY -> users)")
            print("     * expo_push_token (VARCHAR(500), NOT NULL, UNIQUE)")
            print("     * device_id (VARCHAR(255), NOT NULL)")
            print("     * device_name (VARCHAR(255), NULLABLE)")
            print("     * device_os (VARCHAR(50), NULLABLE)")
            print("     * is_active (BOOLEAN, NOT NULL, DEFAULT TRUE)")
            print("     * created_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)")
            print("     * updated_at (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)")
            print("   - Indexes:")
            print("     * idx_push_tokens_user_id (user_id)")
            print("     * idx_push_tokens_expo_push_token (expo_push_token)")
            print("     * idx_push_tokens_is_active (is_active)")
            
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

