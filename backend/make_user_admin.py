#!/usr/bin/env python3
"""
Script to make a user an admin
Usage: python make_user_admin.py <email>
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


def remove_admin(email: str):
    """Remove admin privileges from a user"""
    
    print(f"🔍 Looking for admin user with email: {email}")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Find user
            user = User.query.filter_by(email=email).first()
            
            if not user:
                print(f"❌ User not found with email: {email}")
                return False
            
            if not hasattr(user, 'is_admin'):
                print("⚠️  Warning: is_admin column doesn't exist")
                return False
            
            # Check if already not admin
            if not user.is_admin:
                print(f"✅ User {email} is already not an admin")
                return True
            
            # Remove admin
            user.is_admin = False
            db.session.commit()
            
            print(f"✅ Successfully removed admin privileges from {email}")
            
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
    ADMIN_EMAIL = "sarusiziv96@gmail.com"  # ← Change this to your email
    
    # ==========================================
    # AUTO-EXECUTION
    # ==========================================
    
    # Check if email is set
    if ADMIN_EMAIL == "your_email@example.com":
        print("⚠️  Please set your email in the ADMIN_EMAIL variable at the top of the script")
        print(f"   Current value: {ADMIN_EMAIL}")
        print("   Example: ADMIN_EMAIL = \"admin@homis.com\"")
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
    else:
        print("=" * 50)
        print("💥 Admin setup failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure the email exists in the database")
        print("   2. Run migration first: python add_admin_field_migration.py")
        print("   3. Check database connection")
    
    sys.exit(0 if success else 1)
    
    # ==========================================
    # MANUAL USAGE (commented out)
    # ==========================================
    # Uncomment the lines below if you want to use command line arguments instead
    # 
    # if len(sys.argv) < 2:
    #     print("Usage:")
    #     print("  python make_user_admin.py <email>           # Make user admin")
    #     print("  python make_user_admin.py --remove <email>  # Remove admin")
    #     print("  python make_user_admin.py --list            # List all admins")
    #     sys.exit(1)
    # 
    # if sys.argv[1] == '--list':
    #     success = list_admins()
    # elif sys.argv[1] == '--remove':
    #     if len(sys.argv) < 3:
    #         print("❌ Error: Email required")
    #         print("Usage: python make_user_admin.py --remove <email>")
    #         sys.exit(1)
    #     success = remove_admin(sys.argv[2])
    # else:
    #     success = make_admin(sys.argv[1])
    # 
    # if success:
    #     sys.exit(0)
    # else:
    #     sys.exit(1)
