#!/usr/bin/env python3
"""
Python script to get JWT token for admin operations
Usage: python get_jwt_token.py <email> <password>
"""

import os
import sys
import requests
import json
from datetime import datetime


def get_jwt_token(email: str, password: str, base_url: str = "http://localhost:5000"):
    """
    Get JWT token by logging in with email and password
    
    Args:
        email: User email
        password: User password
        base_url: Backend server URL
        
    Returns:
        JWT token string or None if failed
    """
    
    print(f"🔐 Attempting to login as: {email}")
    print(f"🌐 Server URL: {base_url}")
    
    try:
        # Login endpoint
        login_url = f"{base_url}/api/auth/login"
        
        # Login data
        login_data = {
            "email": email,
            "password": password
        }
        
        # Send login request
        response = requests.post(
            login_url,
            json=login_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if 'access_token' in data:
                token = data['access_token']
                user_info = data.get('user', {})
                
                print("✅ Login successful!")
                print(f"👤 User: {user_info.get('first_name', '')} {user_info.get('last_name', '')}")
                print(f"📧 Email: {user_info.get('email', '')}")
                print(f"🔑 Token: {token[:50]}...")
                print(f"⏰ Token expires: {data.get('expires_in', 'Unknown')} seconds")
                
                return token
            else:
                print("❌ No access token in response")
                print(f"Response: {data}")
                return None
                
        else:
            print(f"❌ Login failed with status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"Response: {response.text}")
            return None
            
    except requests.RequestException as e:
        print(f"❌ Network error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None


def test_admin_endpoints(token: str, base_url: str = "http://localhost:5000"):
    """
    Test admin endpoints with the JWT token
    
    Args:
        token: JWT token
        base_url: Backend server URL
    """
    
    print("\n🧪 Testing admin endpoints...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
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
    
    # Test 2: List users
    print("\n👥 Testing: GET /api/admin/users")
    try:
        response = requests.get(f"{base_url}/api/admin/users?page=1&per_page=5", headers=headers, timeout=10)
        if response.status_code == 200:
            users_data = response.json()
            print("✅ Users endpoint working!")
            print(f"   Found {len(users_data.get('users', []))} users (page 1)")
            print(f"   Total users: {users_data.get('total', 0)}")
        else:
            print(f"❌ Users endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Users test failed: {e}")
    
    # Test 3: Send test broadcast
    print("\n📢 Testing: POST /api/admin/broadcast-notification")
    try:
        test_data = {
            "title": "🧪 Test from Python Script",
            "body": f"Test notification sent at {datetime.now().strftime('%H:%M:%S')}",
            "data": {
                "type": "test",
                "source": "python_script",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        response = requests.post(
            f"{base_url}/api/admin/broadcast-notification",
            json=test_data,
            headers=headers,
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


def save_token_to_file(token: str, filename: str = "jwt_token.txt"):
    """
    Save JWT token to file for later use
    
    Args:
        token: JWT token
        filename: File to save token to
    """
    try:
        with open(filename, 'w') as f:
            f.write(token)
        print(f"\n💾 Token saved to: {filename}")
        print("   You can use this token in other scripts or curl commands")
    except Exception as e:
        print(f"❌ Failed to save token: {e}")


def load_token_from_file(filename: str = "jwt_token.txt"):
    """
    Load JWT token from file
    
    Args:
        filename: File to load token from
        
    Returns:
        JWT token string or None if failed
    """
    try:
        with open(filename, 'r') as f:
            token = f.read().strip()
        print(f"📁 Token loaded from: {filename}")
        return token
    except FileNotFoundError:
        print(f"❌ Token file not found: {filename}")
        return None
    except Exception as e:
        print(f"❌ Failed to load token: {e}")
        return None


def main():
    """Main function"""
    
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
        print("   3. Save and run: python get_jwt_token.py")
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
    
    # Auto-save if enabled
    if AUTO_SAVE:
        save_token_to_file(token)
    
    # Auto-test if enabled
    if AUTO_TEST:
        test_admin_endpoints(token, BACKEND_URL)
    
    print(f"\n🔑 Your JWT token:")
    print(f"{token}")
    print(f"\n📋 Use it in curl commands:")
    print(f"curl -H 'Authorization: Bearer {token}' {BACKEND_URL}/api/admin/stats/notifications")
    
    # ==========================================
    # MANUAL USAGE (commented out)
    # ==========================================
    # Uncomment the lines below if you want to use command line arguments instead
    # 
    # if len(sys.argv) < 3:
    #     print("Usage:")
    #     print("  python get_jwt_token.py <email> <password>                    # Login and get token")
    #     print("  python get_jwt_token.py <email> <password> --test             # Login and test endpoints")
    #     print("  python get_jwt_token.py <email> <password> --save              # Login and save token")
    #     print("  python get_jwt_token.py --load                                 # Load token from file")
    #     print("  python get_jwt_token.py --load --test                         # Load token and test")
    #     print("")
    #     print("Environment variables:")
    #     print("  BACKEND_URL=http://your-server.com  # Override default localhost:5000")
    #     sys.exit(1)
    # 
    # # Get backend URL from environment or use default
    # base_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
    # 
    # # Handle different command line options
    # if sys.argv[1] == '--load':
    #     # Load token from file
    #     token = load_token_from_file()
    #     if not token:
    #         sys.exit(1)
    #     
    #     if len(sys.argv) > 2 and sys.argv[2] == '--test':
    #         test_admin_endpoints(token, base_url)
    #     else:
    #         print(f"🔑 Token: {token}")
    # else:
    #     # Login with email and password
    #     email = sys.argv[1]
    #     password = sys.argv[2]
    #     
    #     # Get token
    #     token = get_jwt_token(email, password, base_url)
    #     
    #     if not token:
    #         print("\n💥 Failed to get JWT token!")
    #         sys.exit(1)
    #     
    #     # Handle additional options
    #     if len(sys.argv) > 3:
    #         if '--test' in sys.argv:
    #             test_admin_endpoints(token, base_url)
    #         
    #         if '--save' in sys.argv:
    #             save_token_to_file(token)
    #     
    #     print(f"\n🔑 Your JWT token:")
    #     print(f"{token}")
    #     print(f"\n📋 Use it in curl commands:")
    #     print(f"curl -H 'Authorization: Bearer {token}' {base_url}/api/admin/stats/notifications")


if __name__ == "__main__":
    main()
