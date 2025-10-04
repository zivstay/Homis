#!/usr/bin/env python3
"""
Script to add push tokens using direct SQL queries
This script can work with any PostgreSQL database connection
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    print("✅ psycopg2 imported successfully")
except ImportError as e:
    print(f"❌ psycopg2 import failed: {e}")
    print("💡 Please install psycopg2: pip install psycopg2-binary")
    sys.exit(1)


def get_database_connection():
    """Get database connection"""
    # Try different database URLs
    database_urls = [
        os.getenv('DATABASE_URL'),
        'postgresql://postgres:123456@localhost:5432/homis_db',
        'postgresql://postgres:password@localhost:5432/homis_db',
        'postgresql://homis:homis@localhost:5432/homis_db',
    ]
    
    for db_url in database_urls:
        if not db_url:
            continue
            
        try:
            print(f"🔧 Trying database URL: {db_url}")
            conn = psycopg2.connect(db_url)
            print(f"✅ Connected to database successfully!")
            return conn
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            continue
    
    print("❌ Could not connect to any database")
    print("💡 Please set DATABASE_URL environment variable or ensure PostgreSQL is running")
    return None


def generate_expo_token():
    """Generate a sample Expo push token"""
    random_id = str(uuid.uuid4()).replace('-', '')[:22]
    return f"ExponentPushToken[{random_id}]"


def check_tables_exist(conn):
    """Check if required tables exist"""
    try:
        with conn.cursor() as cur:
            # Check if users table exists
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users';
            """)
            if not cur.fetchone():
                print("❌ users table does not exist")
                return False
            
            # Check if push_tokens table exists
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'push_tokens';
            """)
            if not cur.fetchone():
                print("❌ push_tokens table does not exist")
                print("💡 Please run: python add_push_tokens_migration.py")
                return False
            
            print("✅ Required tables exist")
            return True
            
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False


def get_active_users(conn):
    """Get active users from database"""
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, first_name, last_name, email, username 
                FROM users 
                WHERE is_active = true 
                LIMIT 5
            """)
            users = cur.fetchall()
            return users
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return []


def add_push_token(conn, user_id, expo_token, device_id, device_name, device_os):
    """Add a push token to the database"""
    try:
        with conn.cursor() as cur:
            # Check if token already exists
            cur.execute("SELECT id FROM push_tokens WHERE expo_push_token = %s", (expo_token,))
            if cur.fetchone():
                print(f"⚠️ Token already exists: {expo_token}")
                return False
            
            # Insert new token
            cur.execute("""
                INSERT INTO push_tokens 
                (id, user_id, expo_push_token, device_id, device_name, device_os, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                user_id,
                expo_token,
                device_id,
                device_name,
                device_os,
                True,
                datetime.utcnow(),
                datetime.utcnow()
            ))
            
            conn.commit()
            return True
            
    except Exception as e:
        print(f"❌ Error adding push token: {e}")
        conn.rollback()
        return False


def add_sample_tokens():
    """Add sample push tokens"""
    conn = get_database_connection()
    if not conn:
        return
    
    try:
        # Check if tables exist
        if not check_tables_exist(conn):
            return
        
        # Get active users
        users = get_active_users(conn)
        if not users:
            print("❌ No active users found")
            return
        
        print(f"🔄 Adding push tokens for {len(users)} users...")
        
        added_count = 0
        for i, user in enumerate(users):
            expo_token = generate_expo_token()
            device_id = f"device_{uuid.uuid4().hex[:8]}"
            device_name = f"{user['first_name']}'s Device"
            device_os = "iOS 15.0" if i % 2 == 0 else "Android 12"
            
            if add_push_token(conn, user['id'], expo_token, device_id, device_name, device_os):
                print(f"✅ Added token for {user['first_name']} {user['last_name']}: {expo_token}")
                added_count += 1
        
        print(f"\n🎉 Successfully added {added_count} push tokens!")
        
        # Show total count
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM push_tokens WHERE is_active = true")
            total_count = cur.fetchone()[0]
            print(f"📊 Total active push tokens: {total_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()


def list_tokens():
    """List all push tokens"""
    conn = get_database_connection()
    if not conn:
        return
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT pt.*, u.first_name, u.last_name, u.email
                FROM push_tokens pt
                JOIN users u ON pt.user_id = u.id
                WHERE pt.is_active = true
                ORDER BY pt.created_at DESC
            """)
            tokens = cur.fetchall()
            
            print(f"\n🔔 Found {len(tokens)} active push tokens:")
            print("-" * 80)
            
            for token in tokens:
                print(f"User: {token['first_name']} {token['last_name']} ({token['email']})")
                print(f"Token: {token['expo_push_token']}")
                print(f"Device: {token['device_name']} ({token['device_os']})")
                print(f"Created: {token['created_at']}")
                print("-" * 80)
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()


def list_users():
    """List all users"""
    conn = get_database_connection()
    if not conn:
        return
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, first_name, last_name, email, username, is_active
                FROM users
                ORDER BY created_at DESC
            """)
            users = cur.fetchall()
            
            print(f"\n👥 Found {len(users)} users:")
            print("-" * 80)
            
            for user in users:
                status = "Active" if user['is_active'] else "Inactive"
                print(f"ID: {user['id']}")
                print(f"Name: {user['first_name']} {user['last_name']}")
                print(f"Email: {user['email']}")
                print(f"Username: {user['username']}")
                print(f"Status: {status}")
                print("-" * 80)
                
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()


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
        print("🚀 Push Token Management Script (SQL Version)")
        print("=" * 50)
        print("Available commands:")
        print("  python add_tokens_sql.py add         - Add sample push tokens")
        print("  python add_tokens_sql.py list-tokens - List all push tokens")
        print("  python add_tokens_sql.py list-users  - List all users")
        print("\nRunning 'add' command by default...")
        add_sample_tokens()
