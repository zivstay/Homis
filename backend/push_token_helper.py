#!/usr/bin/env python3
"""
Manual Push Token Creation Script
This script provides multiple ways to add push tokens to your database
"""

import os
import sys
import uuid
from datetime import datetime

def generate_expo_token():
    """Generate a sample Expo push token"""
    random_id = str(uuid.uuid4()).replace('-', '')[:22]
    return f"ExponentPushToken[{random_id}]"


def create_sql_insert_script():
    """Create SQL insert statements for push tokens"""
    print("🔧 Creating SQL insert statements for push tokens...")
    
    # Generate sample tokens
    tokens = []
    for i in range(5):
        token = generate_expo_token()
        device_id = f"device_{uuid.uuid4().hex[:8]}"
        user_id = f"user_{i+1}"  # Placeholder user IDs
        device_name = f"Test Device {i+1}"
        device_os = "iOS 15.0" if i % 2 == 0 else "Android 12"
        
        tokens.append({
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'expo_push_token': token,
            'device_id': device_id,
            'device_name': device_name,
            'device_os': device_os
        })
    
    # Create SQL file
    sql_content = """-- Push Token Insert Statements
-- Run these SQL statements in your PostgreSQL database

-- First, make sure you have users in your database
-- Replace the user_id values below with actual user IDs from your users table

"""
    
    for token in tokens:
        sql_content += f"""INSERT INTO push_tokens (
    id, user_id, expo_push_token, device_id, device_name, device_os, is_active, created_at, updated_at
) VALUES (
    '{token['id']}',
    '{token['user_id']}',  -- Replace with actual user ID
    '{token['expo_push_token']}',
    '{token['device_id']}',
    '{token['device_name']}',
    '{token['device_os']}',
    true,
    NOW(),
    NOW()
);

"""
    
    # Write to file
    with open('push_tokens_insert.sql', 'w') as f:
        f.write(sql_content)
    
    print("✅ Created push_tokens_insert.sql file")
    print("📝 Edit the file to replace user_id values with actual user IDs from your database")
    print("💡 Then run: psql -d your_database -f push_tokens_insert.sql")


def create_sample_tokens():
    """Create sample push tokens with actual user IDs"""
    print("🔧 Creating sample push tokens...")
    
    # Sample tokens with realistic data
    sample_tokens = [
        {
            'expo_push_token': generate_expo_token(),
            'device_name': "iPhone 12 Pro",
            'device_os': "iOS 15.0",
            'device_id': f"device_{uuid.uuid4().hex[:8]}"
        },
        {
            'expo_push_token': generate_expo_token(),
            'device_name': "Samsung Galaxy S21",
            'device_os': "Android 12",
            'device_id': f"device_{uuid.uuid4().hex[:8]}"
        },
        {
            'expo_push_token': generate_expo_token(),
            'device_name': "iPad Pro",
            'device_os': "iOS 15.0",
            'device_id': f"device_{uuid.uuid4().hex[:8]}"
        },
        {
            'expo_push_token': generate_expo_token(),
            'device_name': "Google Pixel 6",
            'device_os': "Android 12",
            'device_id': f"device_{uuid.uuid4().hex[:8]}"
        },
        {
            'expo_push_token': generate_expo_token(),
            'device_name': "iPhone 13",
            'device_os': "iOS 15.0",
            'device_id': f"device_{uuid.uuid4().hex[:8]}"
        }
    ]
    
    print("\n📱 Sample Push Tokens:")
    print("=" * 80)
    
    for i, token in enumerate(sample_tokens, 1):
        print(f"Token {i}:")
        print(f"  Expo Token: {token['expo_push_token']}")
        print(f"  Device: {token['device_name']} ({token['device_os']})")
        print(f"  Device ID: {token['device_id']}")
        print("-" * 80)
    
    return sample_tokens


def create_python_script():
    """Create a Python script to add tokens"""
    python_script = '''#!/usr/bin/env python3
"""
Script to add push tokens to database
Set your DATABASE_URL environment variable before running
"""

import os
import uuid
from datetime import datetime
import psycopg2

# Set your database URL here or as environment variable
DATABASE_URL = os.getenv('DATABASE_URL') or 'postgresql://username:password@host:port/database'

def add_push_tokens():
    """Add push tokens to database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Sample tokens
        tokens = [
            {
                'expo_push_token': 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
                'device_name': 'iPhone 12 Pro',
                'device_os': 'iOS 15.0',
                'device_id': 'device_12345678'
            },
            {
                'expo_push_token': 'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]',
                'device_name': 'Samsung Galaxy S21',
                'device_os': 'Android 12',
                'device_id': 'device_87654321'
            }
        ]
        
        # Get first user ID (replace with actual user ID)
        cur.execute("SELECT id FROM users WHERE is_active = true LIMIT 1")
        user_result = cur.fetchone()
        if not user_result:
            print("❌ No active users found")
            return
        
        user_id = user_result[0]
        print(f"✅ Using user ID: {user_id}")
        
        # Insert tokens
        for token in tokens:
            cur.execute("""
                INSERT INTO push_tokens 
                (id, user_id, expo_push_token, device_id, device_name, device_os, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                user_id,
                token['expo_push_token'],
                token['device_id'],
                token['device_name'],
                token['device_os'],
                True,
                datetime.utcnow(),
                datetime.utcnow()
            ))
        
        conn.commit()
        print(f"✅ Added {len(tokens)} push tokens")
        
        # Show total count
        cur.execute("SELECT COUNT(*) FROM push_tokens WHERE is_active = true")
        total = cur.fetchone()[0]
        print(f"📊 Total active push tokens: {total}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    add_push_tokens()
'''
    
    with open('add_tokens_manual.py', 'w') as f:
        f.write(python_script)
    
    print("✅ Created add_tokens_manual.py")
    print("💡 Edit the script to set your DATABASE_URL and run it")


def show_instructions():
    """Show instructions for adding push tokens"""
    print("\n📖 Instructions for Adding Push Tokens")
    print("=" * 50)
    
    print("\n1. 🗄️  Database Setup:")
    print("   - Make sure PostgreSQL is running")
    print("   - Ensure push_tokens table exists (run migration if needed)")
    print("   - Have at least one active user in the database")
    
    print("\n2. 🔧 Environment Setup:")
    print("   - Set DATABASE_URL environment variable:")
    print("     export DATABASE_URL='postgresql://username:password@host:port/database'")
    print("   - Or edit the scripts to include your database connection details")
    
    print("\n3. 📱 Push Token Format:")
    print("   - Expo tokens start with 'ExponentPushToken[' or 'ExpoPushToken['")
    print("   - They contain a unique identifier")
    print("   - Example: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")
    
    print("\n4. 🚀 Running Scripts:")
    print("   - Use the SQL script: psql -d your_database -f push_tokens_insert.sql")
    print("   - Use the Python script: python add_tokens_manual.py")
    print("   - Use the existing scripts: python add_tokens.py or python add_tokens_sql.py")
    
    print("\n5. 🔍 Verification:")
    print("   - Check tokens: python add_tokens_sql.py list-tokens")
    print("   - Check users: python add_tokens_sql.py list-users")


def main():
    """Main function"""
    print("🚀 Push Token Creation Helper")
    print("=" * 40)
    
    while True:
        print("\nOptions:")
        print("1. Create SQL insert statements")
        print("2. Show sample tokens")
        print("3. Create Python script")
        print("4. Show instructions")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == '1':
            create_sql_insert_script()
        
        elif choice == '2':
            create_sample_tokens()
        
        elif choice == '3':
            create_python_script()
        
        elif choice == '4':
            show_instructions()
        
        elif choice == '5':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please try again.")


if __name__ == '__main__':
    main()
