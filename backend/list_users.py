#!/usr/bin/env python3
"""
Script to list all users from PostgreSQL database
Displays user count, activity statistics, and a table with user details including last activity
Shows when users last performed actions like adding expenses, creating boards, etc.
"""

import os
import sys
from datetime import datetime

print("🔧 Script starting...")
print("🔧 Python version:", sys.version)
print("🔧 Current directory:", os.getcwd())

try:
    from dotenv import load_dotenv
    print("✅ dotenv imported successfully")
except ImportError as e:
    print(f"❌ dotenv import failed: {e}")
    sys.exit(1)

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError
    print("✅ SQLAlchemy imported successfully")
except ImportError as e:
    print(f"❌ SQLAlchemy import failed: {e}")
    print("💡 Please install required packages:")
    print("   pip install sqlalchemy psycopg2-binary python-dotenv")
    sys.exit(1)

# Load environment variables
print("🔧 Loading environment variables...")
load_dotenv()

# DATABASE CONNECTION - You can set this directly here instead of using .env file
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL = os.getenv('DATABASE_URL') or "postgresql://postgres:123456@localhost:5432/homis_db"

print(f"🔧 DATABASE_URL: {DATABASE_URL}")

def get_database_url():
    """Get database URL from environment variables or use default"""
    database_url = DATABASE_URL
    
    if not database_url:
        print("❌ No database URL configured!")
        print("💡 Please either:")
        print("   1. Set DATABASE_URL environment variable")
        print("   2. Or modify the DATABASE_URL variable in this script")
        print("💡 Example: postgresql://username:password@localhost:5432/database_name")
        return None
    
    # Fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    print(f"🔧 Using database URL: {database_url}")
    return database_url

def create_database_connection(database_url):
    """Create database connection"""
    try:
        # Try different driver options
        drivers_to_try = [
            database_url,
            database_url.replace('postgresql://', 'postgresql+psycopg2://'),
            database_url.replace('postgresql://', 'postgresql+pg8000://'),
        ]
        
        for driver_url in drivers_to_try:
            try:
                print(f"🔧 Trying to connect with: {driver_url}")
                engine = create_engine(driver_url, echo=False)
                
                # Test connection
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    print("✅ Database connection successful!")
                    return engine
                    
            except Exception as e:
                print(f"❌ Failed with {driver_url}: {e}")
                continue
        
        print("❌ All connection attempts failed!")
        return None
        
    except Exception as e:
        print(f"❌ Failed to create database connection: {e}")
        return None

def get_users_count(engine):
    """Get total count of users"""
    try:
        with engine.connect() as conn:
            # Count total users
            total_query = text("SELECT COUNT(*) as count FROM users")
            total_result = conn.execute(total_query)
            total_count = total_result.fetchone().count
            
            # Count active users
            active_query = text("SELECT COUNT(*) as count FROM users WHERE is_active = true")
            active_result = conn.execute(active_query)
            active_count = active_result.fetchone().count
            
            # Count inactive users
            inactive_count = total_count - active_count
            
            # Count email verified users
            verified_query = text("SELECT COUNT(*) as count FROM users WHERE email_verified = true")
            verified_result = conn.execute(verified_query)
            verified_count = verified_result.fetchone().count
            
            print(f"📊 User Statistics:")
            print(f"   Total users: {total_count}")
            print(f"   Active users: {active_count}")
            print(f"   Inactive users: {inactive_count}")
            print(f"   Email verified: {verified_count}")
            print(f"   Email unverified: {total_count - verified_count}")
            
            return {
                'total': total_count,
                'active': active_count,
                'inactive': inactive_count,
                'verified': verified_count,
                'unverified': total_count - verified_count
            }
            
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return None

def get_all_users(engine):
    """Get all users from database with their last activity"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT u.id, u.email, u.username, u.first_name, u.last_name, 
                       u.created_at, u.is_active, u.email_verified,
                       GREATEST(
                           COALESCE(MAX(e.created_at), '1900-01-01'::timestamp),
                           COALESCE(MAX(e.updated_at), '1900-01-01'::timestamp),
                           COALESCE(MAX(b.created_at), '1900-01-01'::timestamp),
                           COALESCE(MAX(b.updated_at), '1900-01-01'::timestamp),
                           COALESCE(MAX(n.created_at), '1900-01-01'::timestamp)
                       ) as last_activity
                FROM users u
                LEFT JOIN expenses e ON (u.id = e.created_by OR u.id = e.paid_by)
                LEFT JOIN boards b ON u.id = b.owner_id
                LEFT JOIN notifications n ON u.id = n.created_by
                GROUP BY u.id, u.email, u.username, u.first_name, u.last_name, 
                         u.created_at, u.is_active, u.email_verified
                ORDER BY last_activity DESC NULLS LAST, u.created_at DESC
            """)
            
            result = conn.execute(query)
            users = result.fetchall()
            
            return users
            
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return []

def display_users_table(users):
    """Display users in a formatted table"""
    if not users:
        print("❌ No users found in database")
        return
    
    print(f"\n👥 Users List ({len(users)} users):")
    print("=" * 140)
    
    # Table header
    print(f"{'ID':<5} {'Email':<30} {'First Name':<15} {'Last Name':<15} {'Username':<15} {'Active':<8} {'Verified':<10} {'Created':<12} {'Last Activity':<20}")
    print("-" * 140)
    
    # Table rows
    for user in users:
        # Handle None values
        first_name = user.first_name or "-"
        last_name = user.last_name or "-"
        username = user.username or "-"
        email = user.email or "-"
        
        # Truncate long values
        if len(email) > 28:
            email = email[:25] + "..."
        if len(first_name) > 13:
            first_name = first_name[:10] + "..."
        if len(last_name) > 13:
            last_name = last_name[:10] + "..."
        if len(username) > 13:
            username = username[:10] + "..."
        
        # Format status
        active_status = "✅ Yes" if user.is_active else "❌ No"
        verified_status = "✅ Yes" if user.email_verified else "❌ No"
        
        # Format dates
        created_date = user.created_at.strftime("%Y-%m-%d") if user.created_at else "-"
        
        # Format last activity
        if hasattr(user, 'last_activity') and user.last_activity:
            # Check if last_activity is not the default '1900-01-01' timestamp
            if user.last_activity.year > 1900:
                last_activity = user.last_activity.strftime("%Y-%m-%d %H:%M")
            else:
                last_activity = "Never"
        else:
            last_activity = "Never"
        
        print(f"{user.id:<5} {email:<30} {first_name:<15} {last_name:<15} {username:<15} {active_status:<8} {verified_status:<10} {created_date:<12} {last_activity:<20}")
    
    print("-" * 140)

def display_detailed_users(users, limit=10):
    """Display detailed user information for first N users"""
    if not users:
        return
    
    print(f"\n📋 Detailed User Information (showing first {min(limit, len(users))} users):")
    print("=" * 80)
    
    for i, user in enumerate(users[:limit]):
        print(f"\n👤 User #{i+1}:")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Username: {user.username or 'Not set'}")
        print(f"   First Name: {user.first_name or 'Not set'}")
        print(f"   Last Name: {user.last_name or 'Not set'}")
        print(f"   Active: {'✅ Yes' if user.is_active else '❌ No'}")
        print(f"   Email Verified: {'✅ Yes' if user.email_verified else '❌ No'}")
        print(f"   Created: {user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else 'Unknown'}")
        
        # Display last activity
        if hasattr(user, 'last_activity') and user.last_activity:
            if user.last_activity.year > 1900:
                print(f"   Last Activity: {user.last_activity.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                print(f"   Last Activity: Never")
        else:
            print(f"   Last Activity: Never")
    
    if len(users) > limit:
        print(f"\n... and {len(users) - limit} more users")

def get_user_activity_stats(engine):
    """Get user activity statistics"""
    try:
        with engine.connect() as conn:
            # Get activity statistics
            query = text("""
                SELECT 
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT CASE WHEN e.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as active_7_days,
                    COUNT(DISTINCT CASE WHEN e.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as active_30_days,
                    COUNT(DISTINCT CASE WHEN b.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as created_board_7_days,
                    COUNT(DISTINCT CASE WHEN b.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as created_board_30_days
                FROM users u
                LEFT JOIN expenses e ON (u.id = e.created_by OR u.id = e.paid_by)
                LEFT JOIN boards b ON u.id = b.owner_id
            """)
            
            result = conn.execute(query)
            stats = result.fetchone()
            
            print(f"\n📊 User Activity Statistics:")
            print("=" * 50)
            print(f"Total Users: {stats.total_users}")
            print(f"Active in last 7 days: {stats.active_7_days}")
            print(f"Active in last 30 days: {stats.active_30_days}")
            print(f"Created boards in last 7 days: {stats.created_board_7_days}")
            print(f"Created boards in last 30 days: {stats.created_board_30_days}")
            print("=" * 50)
            
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")

def get_user_board_counts(engine):
    """Get board membership counts for users"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT u.email, u.first_name, u.last_name,
                       COUNT(bm.board_id) as board_count,
                       COUNT(CASE WHEN b.owner_id = u.id THEN 1 END) as owned_boards
                FROM users u
                LEFT JOIN board_members bm ON u.id = bm.user_id
                LEFT JOIN boards b ON u.id = b.owner_id
                GROUP BY u.id, u.email, u.first_name, u.last_name
                ORDER BY board_count DESC, owned_boards DESC
            """)
            
            result = conn.execute(query)
            user_boards = result.fetchall()
            
            print(f"\n📊 User Board Statistics:")
            print("=" * 80)
            print(f"{'Email':<30} {'Name':<25} {'Member Of':<10} {'Owns':<6}")
            print("-" * 80)
            
            for user_board in user_boards:
                email = user_board.email or "-"
                first_name = user_board.first_name or ""
                last_name = user_board.last_name or ""
                full_name = f"{first_name} {last_name}".strip() or "-"
                
                # Truncate long values
                if len(email) > 28:
                    email = email[:25] + "..."
                if len(full_name) > 23:
                    full_name = full_name[:20] + "..."
                
                print(f"{email:<30} {full_name:<25} {user_board.board_count:<10} {user_board.owned_boards:<6}")
            
            print("-" * 80)
            
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")

def main():
    """Main function"""
    print("🔧 Starting main function...")
    
    print("🔧 Homis Users List Tool")
    print("=" * 40)
    print()
    
    # Get database URL
    database_url = get_database_url()
    if not database_url:
        sys.exit(1)
    
    # Create database connection
    engine = create_database_connection(database_url)
    if not engine:
        sys.exit(1)
    
    # Get users count
    print("\n🔍 Getting user statistics...")
    user_stats = get_users_count(engine)
    if not user_stats:
        print("❌ Failed to get user statistics")
        sys.exit(1)
    
    # Get all users
    print("\n🔍 Fetching all users...")
    users = get_all_users(engine)
    if not users:
        print("❌ No users found or failed to fetch users")
        sys.exit(1)
    
    # Display users table
    display_users_table(users)
    
    # Display detailed information for first few users
    display_detailed_users(users, limit=30)
    
    # Display activity statistics
    get_user_activity_stats(engine)
    
    # Display board statistics
    get_user_board_counts(engine)
    
    print(f"\n✅ Successfully listed {len(users)} users!")

if __name__ == '__main__':
    print("🔧 Script entry point reached")
    main()
    print("🔧 Script finished")
