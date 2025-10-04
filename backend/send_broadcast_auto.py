#!/usr/bin/env python3
"""
Auto Broadcast Script - Set broadcast details directly in code
Usage: Just run the script after setting BROADCAST_TITLE and BROADCAST_BODY
"""

import os
import sys
import requests
import json
from datetime import datetime


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


def send_broadcast_notification(
    title: str,
    body: str,
    token: str,
    data: dict = None,
    base_url: str = "http://localhost:5000"
):
    """Send broadcast notification to all users"""
    
    print(f"📢 Sending broadcast notification...")
    print(f"📝 Title: {title}")
    print(f"📄 Body: {body}")
    print(f"🌐 Server: {base_url}")
    
    if data:
        print(f"📊 Data: {json.dumps(data, indent=2)}")
    
    try:
        url = f"{base_url}/api/admin/broadcast-notification"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        payload = {
            "title": title,
            "body": body,
            "data": data or {"type": "broadcast", "timestamp": datetime.now().isoformat()}
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Broadcast sent successfully!")
            print(f"👥 Users reached: {result.get('unique_users', 0)}")
            print(f"📱 Devices: {result.get('devices_sent', 0)}")
            print(f"📊 Result: {result.get('result', {})}")
            return True, result
        else:
            print(f"❌ Broadcast failed with status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
                if response.status_code == 403:
                    print("⚠️  User is not an admin!")
            except:
                print(f"Response: {response.text}")
            return False, None
            
    except requests.RequestException as e:
        print(f"❌ Network error: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, None


def get_notification_stats(token: str, base_url: str = "http://localhost:5000"):
    """Get notification statistics"""
    
    print("📊 Getting notification statistics...")
    
    try:
        url = f"{base_url}/api/admin/stats/notifications"
        headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Statistics retrieved!")
            print(f"👥 Total users: {stats.get('total_users', 0)}")
            print(f"📱 Users with notifications: {stats.get('users_with_notifications', 0)}")
            print(f"❌ Users without notifications: {stats.get('users_without_notifications', 0)}")
            print(f"📲 Total active devices: {stats.get('total_active_devices', 0)}")
            print(f"📈 Coverage: {stats.get('coverage_percentage', 0)}%")
            return stats
        else:
            print(f"❌ Failed to get stats: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
        return None


if __name__ == "__main__":
    # ==========================================
    # CONFIGURATION - Set your broadcast details here
    # ==========================================
    BROADCAST_TITLE = "עדכון חשוב !!"                    # ← Change this to your title
    BROADCAST_BODY = "זו הודעה לכל המשתמשים@"           # ← Change this to your body
    BACKEND_URL = "http://localhost:5000"             # ← Change this if needed
    TOKEN_FILE = "jwt_token.txt"                       # ← Token file path
    AUTO_STATS = True                                  # ← Set to True to show stats after broadcast
    
    # ==========================================
    # AUTO-EXECUTION
    # ==========================================
    
    # Check if title and body are set
    if BROADCAST_TITLE == "עדכון חשוב!" and BROADCAST_BODY == "זו הודעה לכל המשתמשים":
        print("⚠️  Please set your broadcast details in the script:")
        print(f"   BROADCAST_TITLE = \"עדכון חשוב!\"                    ← Current: {BROADCAST_TITLE}")
        print(f"   BROADCAST_BODY = \"זו הודעה לכל המשתמשים\"           ← Current: {BROADCAST_BODY}")
        print(f"   BACKEND_URL = \"http://localhost:5000\"             ← Current: {BACKEND_URL}")
        print("\n📝 How to use:")
        print("   1. Open this file in a text editor")
        print("   2. Replace the title and body values")
        print("   3. Save and run: python send_broadcast_auto.py")
        print("\n💡 You can also use command line arguments:")
        print("   python send_broadcast.py <title> <body> --token-file jwt_token.txt")
        sys.exit(1)
    
    print(f"📢 Auto-executing broadcast...")
    print(f"📝 Title: {BROADCAST_TITLE}")
    print(f"📄 Body: {BROADCAST_BODY}")
    print(f"🌐 Server: {BACKEND_URL}")
    print("=" * 50)
    
    # Load token from file
    token = load_token_from_file(TOKEN_FILE)
    
    if not token:
        print(f"❌ No token found in {TOKEN_FILE}")
        print("🔧 Troubleshooting:")
        print("   1. Run: python get_jwt_token_auto.py")
        print("   2. Or use: python send_broadcast.py <title> <body> --token <your_token>")
        sys.exit(1)
    
    # Prepare data payload
    data = {
        "type": "broadcast",
        "source": "python_script_auto",
        "timestamp": datetime.now().isoformat(),
        "title": BROADCAST_TITLE,
        "body": BROADCAST_BODY
    }
    
    # Send broadcast
    success, result = send_broadcast_notification(BROADCAST_TITLE, BROADCAST_BODY, token, data, BACKEND_URL)
    
    if success:
        print("\n" + "=" * 50)
        print("🎉 Broadcast completed successfully!")
        print("=" * 50)
        print(f"📊 Summary:")
        print(f"   - Users reached: {result.get('unique_users', 0)}")
        print(f"   - Devices: {result.get('devices_sent', 0)}")
        print(f"   - Success rate: {result.get('result', {}).get('sent', 0)}/{result.get('result', {}).get('sent', 0) + result.get('result', {}).get('failed', 0)}")
        
        # Show stats if enabled
        if AUTO_STATS:
            print("\n📊 Getting notification statistics...")
            stats = get_notification_stats(token, BACKEND_URL)
            if stats:
                print(f"📈 Total coverage: {stats.get('coverage_percentage', 0)}%")
    else:
        print("\n" + "=" * 50)
        print("💥 Broadcast failed!")
        print("=" * 50)
        print("🔧 Troubleshooting:")
        print("   1. Check if user is admin")
        print("   2. Verify server is running")
        print("   3. Check token validity")
        sys.exit(1)
