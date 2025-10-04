#!/usr/bin/env python3
"""
Script to make a user an admin - AUTO MODE
Usage: Just run the script after setting ADMIN_EMAIL
"""

import os
import sys
from flask import Flask
from config import config
from postgres_models import db, User


def create_app():
    """Create a Flask app instance"""
    app = Flask(__name__)
    
    # Get configuration
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app


def make_admin(email: str):
    """Make a user an admin by email"""
    
    print(f"🔍 Looking for user with email: {email}")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Find user
            user = User.query.filter_by(email=email).first()
            
            if not user:
                print(f"❌ User not found with email: {email}")
                return False
            
            # Check if already admin
            if hasattr(user, 'is_admin') and user.is_admin:
                print(f"✅ User {email} is already an admin")
                return True
            
            # Make admin
            if not hasattr(user, 'is_admin'):
                print("⚠️  Warning: is_admin column doesn't exist. Run migration first:")
                print("   python add_admin_field_migration.py")
                return False
            
            user.is_admin = True
            db.session.commit()
            
            print(f"✅ Successfully made {email} an admin")
            print(f"👤 User details:")
            print(f"   - ID: {user.id}")
            print(f"   - Name: {user.first_name} {user.last_name}")
            print(f"   - Email: {user.email}")
            print(f"   - Username: {user.username}")
            print(f"   - Is Admin: {user.is_admin}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False


def list_admins():
    """List all admin users"""
    
    print("🔍 Listing all admin users...")
    
    app = create_app()
    
    with app.app_context():
        try:
            if not hasattr(User, 'is_admin'):
                print("⚠️  Warning: is_admin column doesn't exist. Run migration first:")
                print("   python add_admin_field_migration.py")
                return False
            
            # Find all admins
            admins = User.query.filter_by(is_admin=True, is_active=True).all()
            
            if not admins:
                print("❌ No admin users found")
                return True
            
            print(f"\n✅ Found {len(admins)} admin user(s):\n")
            
            for admin in admins:
                print(f"👤 {admin.first_name} {admin.last_name}")
                print(f"   Email: {admin.email}")
                print(f"   Username: {admin.username}")
                print(f"   ID: {admin.id}")
                print()
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False


if __name__ == "__main__":
    # ==========================================
    # CONFIGURATION - Set your email here
    # ==========================================
    ADMIN_EMAIL = "your_email@example.com"  # ← Change this to your email
    
    # ==========================================
    # AUTO-EXECUTION
    # ==========================================
    
    # Check if email is set
    if ADMIN_EMAIL == "your_email@example.com":
        print("⚠️  Please set your email in the ADMIN_EMAIL variable at the top of the script")
        print(f"   Current value: {ADMIN_EMAIL}")
        print("   Example: ADMIN_EMAIL = \"admin@homis.com\"")
        print("\n📝 How to use:")
        print("   1. Open this file in a text editor")
        print("   2. Find the line: ADMIN_EMAIL = \"your_email@example.com\"")
        print("   3. Replace with your actual email")
        print("   4. Save and run: python make_user_admin_auto.py")
        sys.exit(1)
    
    print(f"🎯 Auto-executing admin setup for: {ADMIN_EMAIL}")
    print("=" * 50)
    
    # Make user admin
    success = make_admin(ADMIN_EMAIL)
    
    if success:
        print("=" * 50)
        print("🎉 Admin setup completed successfully!")
        print(f"✅ {ADMIN_EMAIL} is now an admin")
        print("\n💡 Next steps:")
        print("   1. Get JWT token: python get_jwt_token.py <email> <password> --save")
        print("   2. Test admin access: python check_admin_status.py")
        print("   3. Send broadcast: python send_broadcast.py <title> <body>")
        print("\n🚀 Quick commands:")
        print(f"   python get_jwt_token.py {ADMIN_EMAIL} <password> --save")
        print(f"   python check_admin_status.py")
        print(f"   python send_broadcast.py \"Test\" \"Hello World!\"")
    else:
        print("=" * 50)
        print("💥 Admin setup failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure the email exists in the database")
        print("   2. Run migration first: python add_admin_field_migration.py")
        print("   3. Check database connection")
        print("   4. Verify the email is correct")
    
    sys.exit(0 if success else 1)
