#!/usr/bin/env python3
"""
Python script to check admin status and notification stats
Usage: python check_admin_status.py [--token-file <file>] [--token <token>]
"""

import os
import sys
import requests
import json


def load_token_from_file(filename: str = "jwt_token.txt"):
    """Load JWT token from file"""
    try:
        with open(filename, 'r') as f:
            token = f.read().strip()
        return token
    except FileNotFoundError:
        print(f"❌ Token file not found: {filename}")
        return None
    except Exception as e:
        print(f"❌ Failed to load token: {e}")
        return None


def check_admin_status(token: str, base_url: str = "http://localhost:5000"):
    """
    Check if user is admin and get notification stats
    
    Args:
        token: JWT token
        base_url: Backend server URL
        
    Returns:
        Admin status and stats
    """
    
    print(f"🔍 Checking admin status...")
    print(f"🌐 Server: {base_url}")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json'
    }
    
    # Test 1: Check notification stats (admin only)
    print("\n📊 Testing admin access...")
    try:
        response = requests.get(f"{base_url}/api/admin/stats/notifications", headers=headers, timeout=10)
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Admin access confirmed!")
            print(f"👥 Total users: {stats.get('total_users', 0)}")
            print(f"📱 Users with notifications: {stats.get('users_with_notifications', 0)}")
            print(f"❌ Users without notifications: {stats.get('users_without_notifications', 0)}")
            print(f"📲 Total active devices: {stats.get('total_active_devices', 0)}")
            print(f"📈 Coverage: {stats.get('coverage_percentage', 0)}%")
            
            return True, stats
        elif response.status_code == 403:
            print("❌ Access denied - User is not an admin!")
            return False, None
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Error checking admin status: {e}")
        return False, None


def get_user_info(token: str, base_url: str = "http://localhost:5000"):
    """Get current user information"""
    
    print("\n👤 Getting user information...")
    
    try:
        response = requests.get(f"{base_url}/api/auth/me", headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }, timeout=10)
        
        if response.status_code == 200:
            user_data = response.json()
            print("✅ User info retrieved!")
            print(f"📧 Email: {user_data.get('email', 'Unknown')}")
            print(f"👤 Name: {user_data.get('first_name', '')} {user_data.get('last_name', '')}")
            print(f"🆔 User ID: {user_data.get('id', 'Unknown')}")
            print(f"🔐 Is Admin: {user_data.get('is_admin', False)}")
            return user_data
        else:
            print(f"❌ Failed to get user info: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting user info: {e}")
        return None


def test_broadcast_capability(token: str, base_url: str = "http://localhost:5000"):
    """Test if user can send broadcast notifications"""
    
    print("\n📢 Testing broadcast capability...")
    
    try:
        # Try to send a test broadcast (dry run)
        test_data = {
            "title": "🧪 Admin Test",
            "body": "Testing admin broadcast capability",
            "data": {"type": "test", "dry_run": True}
        }
        
        response = requests.post(
            f"{base_url}/api/admin/broadcast-notification",
            json=test_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Broadcast capability confirmed!")
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


def main():
    """Main function"""
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python check_admin_status.py")
        print("  python check_admin_status.py --token-file <file>")
        print("  python check_admin_status.py --token <jwt_token>")
        print("")
        print("Examples:")
        print("  python check_admin_status.py")
        print("  python check_admin_status.py --token-file jwt_token.txt")
        print("  python check_admin_status.py --token eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...")
        print("")
        print("Environment variables:")
        print("  BACKEND_URL=http://your-server.com  # Override default localhost:5000")
        sys.exit(1)
    
    # Get backend URL from environment or use default
    base_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
    
    # Get token
    token = None
    
    # Check for token options
    if '--token-file' in sys.argv:
        token_file_index = sys.argv.index('--token-file')
        if token_file_index + 1 < len(sys.argv):
            token_file = sys.argv[token_file_index + 1]
            token = load_token_from_file(token_file)
        else:
            print("❌ --token-file requires a filename")
            sys.exit(1)
    elif '--token' in sys.argv:
        token_index = sys.argv.index('--token')
        if token_index + 1 < len(sys.argv):
            token = sys.argv[token_index + 1]
        else:
            print("❌ --token requires a JWT token")
            sys.exit(1)
    else:
        # Try to load from default file
        token = load_token_from_file()
    
    if not token:
        print("❌ No token provided!")
        print("Options:")
        print("  1. Use --token-file <file> to load from file")
        print("  2. Use --token <jwt_token> to provide token directly")
        print("  3. Save token to jwt_token.txt file first")
        print("  4. Run: python get_jwt_token.py <email> <password> --save")
        sys.exit(1)
    
    print(f"🔑 Using token: {token[:50]}...")
    
    # Get user info
    user_info = get_user_info(token, base_url)
    
    # Check admin status
    is_admin, stats = check_admin_status(token, base_url)
    
    # Test broadcast capability
    can_broadcast = test_broadcast_capability(token, base_url)
    
    # Summary
    print(f"\n📋 Summary:")
    print(f"👤 User: {user_info.get('email', 'Unknown') if user_info else 'Unknown'}")
    print(f"🔐 Is Admin: {'✅ Yes' if is_admin else '❌ No'}")
    print(f"📢 Can Broadcast: {'✅ Yes' if can_broadcast else '❌ No'}")
    
    if stats:
        print(f"📊 Notification Coverage: {stats.get('coverage_percentage', 0)}%")
        print(f"👥 Total Users: {stats.get('total_users', 0)}")
    
    if is_admin and can_broadcast:
        print(f"\n🎉 You have full admin privileges!")
        print(f"💡 You can send broadcast notifications to all users")
        print(f"📝 Use: python send_broadcast.py <title> <body>")
    elif is_admin:
        print(f"\n⚠️  You are an admin but broadcast is not working")
        print(f"🔧 Check server logs for errors")
    else:
        print(f"\n❌ You don't have admin privileges")
        print(f"🔧 Contact an admin to get admin access")
        print(f"💡 Run: python make_user_admin.py <your_email>")


if __name__ == "__main__":
    main()
