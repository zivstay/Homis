#!/usr/bin/env python3
"""
Script to add push tokens to the database
Uses the same approach as existing scripts in the project
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from postgres_models import db, User, PushToken


def create_app():
    """Create a Flask app instance"""
    app = Flask(__name__)
    
    # Set database URL - try environment variable first, then default
    DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://postgres:123456@localhost:5432/homis_db'
    
    # Fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    print(f"🔧 Using database URL: {DATABASE_URL}")
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app


def generate_expo_token():
    """Generate a sample Expo push token"""
    random_id = str(uuid.uuid4()).replace('-', '')[:22]
    return f"ExponentPushToken[{random_id}]"


def add_sample_tokens():
    """Add sample push tokens for testing"""
    app = create_app()
    
    with app.app_context():
        try:
            # Test database connection
            db.session.execute(db.text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Check if push_tokens table exists
            result = db.session.execute(db.text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'push_tokens';
            """))
            
            if not result.fetchone():
                print("❌ push_tokens table does not exist. Please run the migration first:")
                print("   python add_push_tokens_migration.py")
                return
            
            print("✅ push_tokens table exists")
            
            # Get first few active users
            users = User.query.filter_by(is_active=True).limit(3).all()
            
            if not users:
                print("❌ No active users found. Please create users first.")
                print("💡 You can create a user using the existing scripts in this directory.")
                return
            
            print(f"🔄 Adding push tokens for {len(users)} users...")
            
            added_count = 0
            for i, user in enumerate(users):
                # Generate unique token
                expo_token = generate_expo_token()
                device_id = f"device_{uuid.uuid4().hex[:8]}"
                
                # Check if token already exists
                existing = PushToken.query.filter_by(expo_push_token=expo_token).first()
                if existing:
                    print(f"⚠️ Token already exists, skipping: {expo_token}")
                    continue
                
                # Create push token
                push_token = PushToken(
                    user_id=user.id,
                    expo_push_token=expo_token,
                    device_id=device_id,
                    device_name=f"{user.first_name}'s Device",
                    device_os="iOS 15.0" if i % 2 == 0 else "Android 12",
                    is_active=True
                )
                
                db.session.add(push_token)
                print(f"✅ Added token for {user.first_name} {user.last_name}: {expo_token}")
                added_count += 1
            
            db.session.commit()
            print(f"\n🎉 Successfully added {added_count} push tokens!")
            
            # Show current count
            total_tokens = PushToken.query.filter_by(is_active=True).count()
            print(f"📊 Total active push tokens: {total_tokens}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            print("💡 Make sure your database is running and accessible.")
            print("💡 You can set DATABASE_URL environment variable if using a different database.")


def list_tokens():
    """List all push tokens"""
    app = create_app()
    
    with app.app_context():
        try:
            tokens = PushToken.query.filter_by(is_active=True).all()
            print(f"\n🔔 Found {len(tokens)} active push tokens:")
            print("-" * 80)
            
            for token in tokens:
                user = User.query.get(token.user_id)
                user_name = f"{user.first_name} {user.last_name}" if user else "Unknown User"
                print(f"User: {user_name}")
                print(f"Token: {token.expo_push_token}")
                print(f"Device: {token.device_name} ({token.device_os})")
                print(f"Created: {token.created_at}")
                print("-" * 80)
                
        except Exception as e:
            print(f"❌ Error: {e}")


def list_users():
    """List all users"""
    app = create_app()
    
    with app.app_context():
        try:
            users = User.query.filter_by(is_active=True).all()
            print(f"\n👥 Found {len(users)} active users:")
            print("-" * 80)
            
            for user in users:
                print(f"ID: {user.id}")
                print(f"Name: {user.first_name} {user.last_name}")
                print(f"Email: {user.email}")
                print(f"Username: {user.username}")
                print("-" * 80)
                
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'list-tokens':
            list_tokens()
        elif command == 'list-users':
            list_users()
        elif command == 'add':
            add_sample_tokens()
        else:
            print("❌ Invalid command. Available commands:")
            print("  add         - Add sample push tokens")
            print("  list-tokens - List all push tokens")
            print("  list-users  - List all users")
    else:
        print("🚀 Push Token Management Script")
        print("=" * 40)
        print("Available commands:")
        print("  python add_tokens.py add         - Add sample push tokens")
        print("  python add_tokens.py list-tokens - List all push tokens")
        print("  python add_tokens.py list-users  - List all users")
        print("\nRunning 'add' command by default...")
        add_sample_tokens()
