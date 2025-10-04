#!/usr/bin/env python3
"""
Complete Admin Setup Script - Set email and password directly in code
This script will:
1. Make user admin
2. Get JWT token
3. Test admin access
4. Show next steps
"""

import os
import sys
import requests
from flask import Flask
from config import config
from postgres_models import db, User


def create_app():
    """Create a Flask app instance"""
    app = Flask(__name__)
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    db.init_app(app)
    return app


def make_admin(email: str):
    """Make a user an admin by email"""
    print(f"🔍 Making {email} an admin...")
    
    app = create_app()
    with app.app_context():
        try:
            user = User.query.filter_by(email=email).first()
            
            if not user:
                print(f"❌ User not found with email: {email}")
                return False
            
            if hasattr(user, 'is_admin') and user.is_admin:
                print(f"✅ User {email} is already an admin")
                return True
            
            if not hasattr(user, 'is_admin'):
                print("⚠️  Warning: is_admin column doesn't exist. Run migration first:")
                print("   python add_admin_field_migration.py")
                return False
            
            user.is_admin = True
            db.session.commit()
            
            print(f"✅ Successfully made {email} an admin")
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False


def get_jwt_token(email: str, password: str, base_url: str = "http://localhost:5000"):
    """Get JWT token by logging in"""
    print(f"🔐 Getting JWT token for {email}...")
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": email, "password": password},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            
            if token:
                print("✅ JWT token obtained successfully!")
                print(f"🔑 Token: {token[:50]}...")
                
                # Save token to file
                with open('jwt_token.txt', 'w') as f:
                    f.write(token)
                print("💾 Token saved to jwt_token.txt")
                
                return token
            else:
                print("❌ No access token in response")
                return None
        else:
            print(f"❌ Login failed with status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Network error: {e}")
        return None


def test_admin_access(token: str, base_url: str = "http://localhost:5000"):
    """Test admin access with JWT token"""
    print("🧪 Testing admin access...")
    
    try:
        response = requests.get(
            f"{base_url}/api/admin/stats/notifications",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Admin access confirmed!")
            print(f"👥 Total users: {stats.get('total_users', 0)}")
            print(f"📱 Users with notifications: {stats.get('users_with_notifications', 0)}")
            print(f"📈 Coverage: {stats.get('coverage_percentage', 0)}%")
            return True
        elif response.status_code == 403:
            print("❌ Access denied - User is not an admin!")
            return False
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing admin access: {e}")
        return False


def test_broadcast(token: str, base_url: str = "http://localhost:5000"):
    """Test broadcast capability"""
    print("📢 Testing broadcast capability...")
    
    try:
        response = requests.post(
            f"{base_url}/api/admin/broadcast-notification",
            json={
                "title": "🧪 Admin Test",
                "body": "Testing admin broadcast capability",
                "data": {"type": "test", "source": "setup_script"}
            },
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Broadcast test successful!")
            print(f"📱 Would reach {result.get('unique_users', 0)} users")
            print(f"📲 On {result.get('devices_sent', 0)} devices")
            return True
        elif response.status_code == 403:
            print("❌ Broadcast denied - User is not an admin!")
            return False
        else:
            print(f"❌ Broadcast test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing broadcast: {e}")
        return False


if __name__ == "__main__":
    # ==========================================
    # CONFIGURATION - Set your credentials here
    # ==========================================
    ADMIN_EMAIL = "your_email@example.com"      # ← Change this to your email
    ADMIN_PASSWORD = "your_password"            # ← Change this to your password
    BACKEND_URL = "http://localhost:5000"       # ← Change this if needed
    
    # ==========================================
    # VALIDATION
    # ==========================================
    
    if ADMIN_EMAIL == "your_email@example.com" or ADMIN_PASSWORD == "your_password":
        print("⚠️  Please set your credentials in the script:")
        print(f"   ADMIN_EMAIL = \"your_email@example.com\"  ← Current: {ADMIN_EMAIL}")
        print(f"   ADMIN_PASSWORD = \"your_password\"          ← Current: {ADMIN_PASSWORD}")
        print("\n📝 How to use:")
        print("   1. Open this file in a text editor")
        print("   2. Replace the email and password values")
        print("   3. Save and run: python complete_admin_setup.py")
        sys.exit(1)
    
    print("🚀 Complete Admin Setup")
    print("=" * 50)
    print(f"📧 Email: {ADMIN_EMAIL}")
    print(f"🌐 Server: {BACKEND_URL}")
    print("=" * 50)
    
    # Step 1: Make user admin
    print("\n📋 Step 1: Making user admin...")
    admin_success = make_admin(ADMIN_EMAIL)
    
    if not admin_success:
        print("\n💥 Failed to make user admin!")
        print("🔧 Troubleshooting:")
        print("   1. Run migration: python add_admin_field_migration.py")
        print("   2. Check if email exists in database")
        print("   3. Verify database connection")
        sys.exit(1)
    
    # Step 2: Get JWT token
    print("\n📋 Step 2: Getting JWT token...")
    token = get_jwt_token(ADMIN_EMAIL, ADMIN_PASSWORD, BACKEND_URL)
    
    if not token:
        print("\n💥 Failed to get JWT token!")
        print("🔧 Troubleshooting:")
        print("   1. Check email and password")
        print("   2. Verify server is running")
        print("   3. Check network connection")
        sys.exit(1)
    
    # Step 3: Test admin access
    print("\n📋 Step 3: Testing admin access...")
    access_success = test_admin_access(token, BACKEND_URL)
    
    if not access_success:
        print("\n💥 Admin access test failed!")
        print("🔧 Troubleshooting:")
        print("   1. Check if user is really an admin")
        print("   2. Verify server endpoints")
        sys.exit(1)
    
    # Step 4: Test broadcast
    print("\n📋 Step 4: Testing broadcast capability...")
    broadcast_success = test_broadcast(token, BACKEND_URL)
    
    # Final summary
    print("\n" + "=" * 50)
    print("🎉 ADMIN SETUP COMPLETED!")
    print("=" * 50)
    
    if admin_success and token and access_success and broadcast_success:
        print("✅ All tests passed!")
        print(f"👤 {ADMIN_EMAIL} is now a fully functional admin")
        print("\n🚀 Ready to use commands:")
        print(f"   python send_broadcast.py \"Test\" \"Hello World!\"")
        print(f"   python check_admin_status.py")
        print(f"   python send_broadcast.py --stats")
        print("\n💡 Your JWT token is saved in jwt_token.txt")
    else:
        print("⚠️  Setup completed with warnings:")
        print(f"   Admin: {'✅' if admin_success else '❌'}")
        print(f"   Token: {'✅' if token else '❌'}")
        print(f"   Access: {'✅' if access_success else '❌'}")
        print(f"   Broadcast: {'✅' if broadcast_success else '❌'}")
    
    print("\n🎯 You can now send broadcast notifications to all users!")
