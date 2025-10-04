#!/usr/bin/env python3
"""
Auto JWT Token Script - Set credentials directly in code
Usage: Just run the script after setting USER_EMAIL and USER_PASSWORD
"""

import os
import sys
import requests
import json
from datetime import datetime


def get_jwt_token(email: str, password: str, base_url: str = "http://localhost:5000"):
    """Get JWT token by logging in"""
    print(f"🔐 Attempting to login as: {email}")
    print(f"🌐 Server URL: {base_url}")
    
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
                print("✅ Login successful!")
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


def test_admin_endpoints(token: str, base_url: str = "http://localhost:5000"):
    """Test admin endpoints with JWT token"""
    print("\n🧪 Testing admin endpoints...")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test 1: Get notification stats
    print("\n📊 Testing: GET /api/admin/stats/notifications")
    try:
        response = requests.get(f"{base_url}/api/admin/stats/notifications", headers=headers, timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print("✅ Stats endpoint working!")
            print(f"   Total users: {stats.get('total_users', 0)}")
            print(f"   Users with notifications: {stats.get('users_with_notifications', 0)}")
            print(f"   Coverage: {stats.get('coverage_percentage', 0)}%")
        else:
            print(f"❌ Stats endpoint failed: {response.status_code}")
            if response.status_code == 403:
                print("   ⚠️  User is not an admin!")
    except Exception as e:
        print(f"❌ Stats test failed: {e}")
    
    # Test 2: Send test broadcast
    print("\n📢 Testing: POST /api/admin/broadcast-notification")
    try:
        test_data = {
            "title": "🧪 Test from Auto Script",
            "body": f"Test notification sent at {datetime.now().strftime('%H:%M:%S')}",
            "data": {"type": "test", "source": "auto_script"}
        }
        
        response = requests.post(
            f"{base_url}/api/admin/broadcast-notification",
            json=test_data,
            headers={**headers, 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Broadcast endpoint working!")
            print(f"   Sent to {result.get('unique_users', 0)} users")
            print(f"   Devices: {result.get('devices_sent', 0)}")
        else:
            print(f"❌ Broadcast endpoint failed: {response.status_code}")
            if response.status_code == 403:
                print("   ⚠️  User is not an admin!")
    except Exception as e:
        print(f"❌ Broadcast test failed: {e}")


if __name__ == "__main__":
    # ==========================================
    # CONFIGURATION - Set your credentials here
    # ==========================================
    USER_EMAIL = "sarusiziv96@gmail.com"      # ← Change this to your email
    USER_PASSWORD = "Sarusiziv"            # ← Change this to your password
    BACKEND_URL = "http://localhost:5000"     # ← Change this if needed
    AUTO_TEST = True                           # ← Set to True to test endpoints automatically
    AUTO_SAVE = True                           # ← Set to True to save token to file
    
    # ==========================================
    # AUTO-EXECUTION
    # ==========================================
    
    # Check if credentials are set
    if USER_EMAIL == "your_email@example.com" or USER_PASSWORD == "your_password":
        print("⚠️  Please set your credentials in the script:")
        print(f"   USER_EMAIL = \"your_email@example.com\"      ← Current: {USER_EMAIL}")
        print(f"   USER_PASSWORD = \"your_password\"            ← Current: {USER_PASSWORD}")
        print(f"   BACKEND_URL = \"http://localhost:5000\"     ← Current: {BACKEND_URL}")
        print("\n📝 How to use:")
        print("   1. Open this file in a text editor")
        print("   2. Replace the email and password values")
        print("   3. Save and run: python get_jwt_token_auto.py")
        print("\n💡 You can also use command line arguments:")
        print("   python get_jwt_token.py <email> <password> --test --save")
        sys.exit(1)
    
    print(f"🔐 Auto-executing JWT token request...")
    print(f"📧 Email: {USER_EMAIL}")
    print(f"🌐 Server: {BACKEND_URL}")
    print("=" * 50)
    
    # Get token
    token = get_jwt_token(USER_EMAIL, USER_PASSWORD, BACKEND_URL)
    
    if not token:
        print("\n💥 Failed to get JWT token!")
        print("🔧 Troubleshooting:")
        print("   1. Check email and password")
        print("   2. Verify server is running")
        print("   3. Check network connection")
        sys.exit(1)
    
    # Auto-test if enabled
    if AUTO_TEST:
        test_admin_endpoints(token, BACKEND_URL)
    
    print(f"\n🔑 Your JWT token:")
    print(f"{token}")
    print(f"\n📋 Use it in curl commands:")
    print(f"curl -H 'Authorization: Bearer {token}' {BACKEND_URL}/api/admin/stats/notifications")
    print(f"\n🚀 Ready to send broadcasts:")
    print(f"python send_broadcast_auto.py")
