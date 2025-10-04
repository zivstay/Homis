#!/usr/bin/env python3
"""
Script to add push tokens to the database for testing purposes
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from postgres_models import db, User, PushToken, PostgreSQLDatabaseManager
from flask import Flask
from config import Config


def create_app_for_script():
    """Create Flask app for script execution"""
    app = Flask(__name__)
    
    # Load configuration
    config_class = Config()
    app.config.from_object(config_class)
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app


def generate_sample_expo_token():
    """Generate a sample Expo push token for testing"""
    # Expo tokens have a specific format: ExponentPushToken[xxxxx] or ExpoPushToken[xxxxx]
    random_id = str(uuid.uuid4()).replace('-', '')[:22]  # 22 chars for the token
    return f"ExponentPushToken[{random_id}]"


def list_users():
    """List all users in the database"""
    users = User.query.all()
    print(f"\n📋 Found {len(users)} users in database:")
    print("-" * 80)
    for user in users:
        print(f"ID: {user.id}")
        print(f"Name: {user.first_name} {user.last_name}")
        print(f"Email: {user.email}")
        print(f"Username: {user.username}")
        print(f"Active: {user.is_active}")
        print(f"Virtual: {user.is_virtual}")
        print(f"Admin: {user.is_admin}")
        print("-" * 80)
    return users


def list_push_tokens():
    """List all push tokens in the database"""
    tokens = PushToken.query.all()
    print(f"\n🔔 Found {len(tokens)} push tokens in database:")
    print("-" * 80)
    for token in tokens:
        print(f"ID: {token.id}")
        print(f"User ID: {token.user_id}")
        print(f"Token: {token.expo_push_token}")
        print(f"Device ID: {token.device_id}")
        print(f"Device Name: {token.device_name}")
        print(f"Device OS: {token.device_os}")
        print(f"Active: {token.is_active}")
        print(f"Created: {token.created_at}")
        print("-" * 80)
    return tokens


def add_push_token_for_user(user_id: str, device_name: str = "Test Device", device_os: str = "iOS 15.0"):
    """Add a push token for a specific user"""
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            print(f"❌ User with ID {user_id} not found")
            return False
        
        # Generate sample token
        expo_token = generate_sample_expo_token()
        device_id = f"device_{uuid.uuid4().hex[:8]}"
        
        # Check if token already exists
        existing_token = PushToken.query.filter_by(expo_push_token=expo_token).first()
        if existing_token:
            print(f"⚠️ Token already exists: {expo_token}")
            return False
        
        # Create new push token
        push_token = PushToken(
            user_id=user_id,
            expo_push_token=expo_token,
            device_id=device_id,
            device_name=device_name,
            device_os=device_os,
            is_active=True
        )
        
        db.session.add(push_token)
        db.session.commit()
        
        print(f"✅ Added push token for user {user.first_name} {user.last_name}")
        print(f"   Token: {expo_token}")
        print(f"   Device: {device_name} ({device_os})")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding push token: {e}")
        return False


def add_push_tokens_for_all_users():
    """Add push tokens for all active users"""
    users = User.query.filter_by(is_active=True).all()
    
    if not users:
        print("❌ No active users found")
        return
    
    print(f"🔄 Adding push tokens for {len(users)} active users...")
    
    success_count = 0
    for user in users:
        device_name = f"{user.first_name}'s Device"
        device_os = "iOS 15.0" if user.id[0] in '0123456789abcdef' else "Android 12"
        
        if add_push_token_for_user(user.id, device_name, device_os):
            success_count += 1
    
    print(f"\n✅ Successfully added {success_count} push tokens out of {len(users)} users")


def add_multiple_tokens_for_user(user_id: str, count: int = 3):
    """Add multiple push tokens for a single user (simulating multiple devices)"""
    try:
        user = User.query.get(user_id)
        if not user:
            print(f"❌ User with ID {user_id} not found")
            return False
        
        print(f"🔄 Adding {count} push tokens for user {user.first_name} {user.last_name}...")
        
        success_count = 0
        for i in range(count):
            device_name = f"{user.first_name}'s Device {i+1}"
            device_os = "iOS 15.0" if i % 2 == 0 else "Android 12"
            
            if add_push_token_for_user(user_id, device_name, device_os):
                success_count += 1
        
        print(f"✅ Successfully added {success_count} push tokens")
        return True
        
    except Exception as e:
        print(f"❌ Error adding multiple tokens: {e}")
        return False


def interactive_mode():
    """Interactive mode for adding push tokens"""
    print("\n🎯 Interactive Push Token Management")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. List all users")
        print("2. List all push tokens")
        print("3. Add push token for specific user")
        print("4. Add push tokens for all active users")
        print("5. Add multiple tokens for a user")
        print("6. Exit")
        
        choice = input("\nEnter your choice (1-6): ").strip()
        
        if choice == '1':
            list_users()
        
        elif choice == '2':
            list_push_tokens()
        
        elif choice == '3':
            user_id = input("Enter user ID: ").strip()
            device_name = input("Enter device name (or press Enter for default): ").strip() or "Test Device"
            device_os = input("Enter device OS (or press Enter for default): ").strip() or "iOS 15.0"
            add_push_token_for_user(user_id, device_name, device_os)
        
        elif choice == '4':
            add_push_tokens_for_all_users()
        
        elif choice == '5':
            user_id = input("Enter user ID: ").strip()
            count = input("Enter number of tokens to add (default 3): ").strip()
            count = int(count) if count.isdigit() else 3
            add_multiple_tokens_for_user(user_id, count)
        
        elif choice == '6':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please try again.")


def main():
    """Main function"""
    print("🚀 Push Token Management Script")
    print("=" * 40)
    
    # Create Flask app
    app = create_app_for_script()
    
    with app.app_context():
        try:
            # Check database connection
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
            
            # Check command line arguments
            if len(sys.argv) > 1:
                command = sys.argv[1].lower()
                
                if command == 'list-users':
                    list_users()
                
                elif command == 'list-tokens':
                    list_push_tokens()
                
                elif command == 'add-all':
                    add_push_tokens_for_all_users()
                
                elif command == 'add-user' and len(sys.argv) > 2:
                    user_id = sys.argv[2]
                    device_name = sys.argv[3] if len(sys.argv) > 3 else "Test Device"
                    device_os = sys.argv[4] if len(sys.argv) > 4 else "iOS 15.0"
                    add_push_token_for_user(user_id, device_name, device_os)
                
                elif command == 'add-multiple' and len(sys.argv) > 2:
                    user_id = sys.argv[2]
                    count = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 3
                    add_multiple_tokens_for_user(user_id, count)
                
                else:
                    print("❌ Invalid command or missing arguments")
                    print_usage()
            
            else:
                # Interactive mode
                interactive_mode()
                
        except Exception as e:
            print(f"❌ Database error: {e}")
            return


def print_usage():
    """Print usage information"""
    print("\n📖 Usage:")
    print("python add_push_token_script.py [command] [args]")
    print("\nCommands:")
    print("  list-users                    - List all users")
    print("  list-tokens                   - List all push tokens")
    print("  add-all                       - Add push tokens for all active users")
    print("  add-user <user_id> [device] [os] - Add push token for specific user")
    print("  add-multiple <user_id> [count]   - Add multiple tokens for a user")
    print("  (no command)                  - Interactive mode")
    print("\nExamples:")
    print("  python add_push_token_script.py list-users")
    print("  python add_push_token_script.py add-all")
    print("  python add_push_token_script.py add-user abc123 'iPhone 12' 'iOS 15.0'")
    print("  python add_push_token_script.py add-multiple abc123 5")


if __name__ == '__main__':
    main()
