#!/usr/bin/env python3
"""
Script to delete a user from PostgreSQL database by email
Simply change the EMAIL_TO_DELETE variable below and run the script
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

# CHANGE THIS TO THE EMAIL YOU WANT TO DELETE
EMAIL_TO_DELETE = "zivsarusi96@gmail.com"  # Replace with actual email

# DATABASE CONNECTION - You can set this directly here instead of using .env file
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL = os.getenv('DATABASE_URL') or "postgresql://postgres:123456@localhost:5432/homis_db"

print(f"🔧 EMAIL_TO_DELETE: {EMAIL_TO_DELETE}")
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

def get_user_info(engine, email):
    """Get user information from database"""
    try:
        with engine.connect() as conn:
            # Get user details
            query = text("""
                SELECT id, email, username, first_name, last_name, 
                       created_at, is_active, email_verified
                FROM users 
                WHERE email = :email
            """)
            
            result = conn.execute(query, {"email": email.lower()})
            user = result.fetchone()
            
            if user:
                print(f"📋 User found:")
                print(f"   ID: {user.id}")
                print(f"   Email: {user.email}")
                print(f"   Username: {user.username}")
                print(f"   Name: {user.first_name} {user.last_name}")
                print(f"   Created: {user.created_at}")
                print(f"   Active: {user.is_active}")
                print(f"   Email Verified: {user.email_verified}")
                return user
            else:
                print(f"❌ User with email '{email}' not found!")
                return None
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return None

def get_user_boards(engine, user_id):
    """Get boards where user is a member"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT b.id, b.name, bm.role, bm.is_default_board
                FROM board_members bm
                JOIN boards b ON bm.board_id = b.id
                WHERE bm.user_id = :user_id
                ORDER BY bm.is_default_board DESC, b.created_at DESC
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            boards = result.fetchall()
            
            if boards:
                print(f"📋 User is member of {len(boards)} board(s):")
                for board in boards:
                    default_mark = " (Default)" if board.is_default_board else ""
                    print(f"   - {board.name} ({board.role}){default_mark}")
                return boards
            else:
                print("📋 User is not a member of any boards")
                return []
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return []

def get_user_owned_boards(engine, user_id):
    """Get boards owned by user"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT id, name, created_at
                FROM boards 
                WHERE owner_id = :user_id
                ORDER BY created_at DESC
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            boards = result.fetchall()
            
            if boards:
                print(f"📋 User owns {len(boards)} board(s):")
                for board in boards:
                    print(f"   - {board.name} (ID: {board.id})")
                return boards
            else:
                print("📋 User does not own any boards")
                return []
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return []

def get_user_expenses(engine, user_id):
    """Get expenses created by user"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT COUNT(*) as count
                FROM expenses 
                WHERE created_by = :user_id
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            count = result.fetchone().count
            
            if count > 0:
                print(f"📋 User has created {count} expense(s)")
                return count
            else:
                print("📋 User has not created any expenses")
                return 0
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return 0

def get_user_categories(engine, user_id):
    """Get categories created by user"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT COUNT(*) as count
                FROM categories 
                WHERE created_by = :user_id
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            count = result.fetchone().count
            
            if count > 0:
                print(f"📋 User has created {count} categor(ies)")
                return count
            else:
                print("📋 User has not created any categories")
                return 0
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return 0

def get_user_notifications(engine, user_id):
    """Get notifications for or created by user"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT COUNT(*) as count
                FROM notifications 
                WHERE user_id = :user_id OR created_by = :user_id
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            count = result.fetchone().count
            
            if count > 0:
                print(f"📋 User has {count} notification(s)")
                return count
            else:
                print("📋 User has no notifications")
                return 0
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return 0

def get_user_invitations(engine, user_id):
    """Get invitations sent by user"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT COUNT(*) as count
                FROM invitations 
                WHERE invited_by = :user_id
            """)
            
            result = conn.execute(query, {"user_id": user_id})
            count = result.fetchone().count
            
            if count > 0:
                print(f"📋 User has sent {count} invitation(s)")
                return count
            else:
                print("📋 User has not sent any invitations")
                return 0
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return 0

def confirm_deletion(email, user_info, boards, owned_boards, expenses_count, categories_count, notifications_count, invitations_count):
    """Ask for confirmation before deletion"""
    print(f"\n⚠️  WARNING: You are about to delete user '{email}'")
    print(f"   This action will:")
    print(f"   - Delete the user account")
    
    if owned_boards:
        print(f"   - DELETE {len(owned_boards)} board(s) owned by the user")
        print(f"     (This will also delete all expenses, categories, and members in those boards)")
    
    print(f"   - Remove user from {len(boards)} board(s) where they are a member")
    print(f"   - Delete {expenses_count} expense(s) created by the user")
    print(f"   - Delete {categories_count} categor(ies) created by the user")
    print(f"   - Delete {notifications_count} notification(s)")
    print(f"   - Delete {invitations_count} invitation(s) sent by the user")
    print(f"   - This action is IRREVERSIBLE!")
    
    while True:
        response = input(f"\n❓ Are you sure you want to delete user '{email}'? (yes/no): ").lower().strip()
        
        if response in ['yes', 'y']:
            return True
        elif response in ['no', 'n']:
            return False
        else:
            print("Please enter 'yes' or 'no'")

def delete_user(engine, email, user_id):
    """Delete user and all related data"""
    try:
        with engine.begin() as conn:
            print(f"🗑️  Starting deletion process...")
            
            # Start transaction
            print("   - Starting database transaction...")
            
            # First, get all boards owned by this user to delete their data
            print("   - Getting boards owned by user...")
            owned_boards_result = conn.execute(
                text("SELECT id FROM boards WHERE owner_id = :user_id"),
                {"user_id": user_id}
            )
            owned_board_ids = [row.id for row in owned_boards_result.fetchall()]
            
            if owned_board_ids:
                print(f"     Found {len(owned_board_ids)} owned board(s)")
                
                # Delete all data from owned boards first
                for board_id in owned_board_ids:
                    print(f"     - Deleting data from board {board_id}...")
                    
                    # Delete debts in this board
                    debts_result = conn.execute(
                        text("DELETE FROM debts WHERE board_id = :board_id"),
                        {"board_id": board_id}
                    )
                    print(f"       Deleted {debts_result.rowcount} debt(s)")
                    
                    # Delete expenses in this board
                    expenses_result = conn.execute(
                        text("DELETE FROM expenses WHERE board_id = :board_id"),
                        {"board_id": board_id}
                    )
                    print(f"       Deleted {expenses_result.rowcount} expense(s)")
                    
                    # Delete categories in this board
                    categories_result = conn.execute(
                        text("DELETE FROM categories WHERE board_id = :board_id"),
                        {"board_id": board_id}
                    )
                    print(f"       Deleted {categories_result.rowcount} categor(ies)")
                    
                    # Delete notifications for this board
                    notifications_result = conn.execute(
                        text("DELETE FROM notifications WHERE board_id = :board_id"),
                        {"board_id": board_id}
                    )
                    print(f"       Deleted {notifications_result.rowcount} notification(s)")
                    
                    # Delete board members for this board
                    board_members_result = conn.execute(
                        text("DELETE FROM board_members WHERE board_id = :board_id"),
                        {"board_id": board_id}
                    )
                    print(f"       Deleted {board_members_result.rowcount} board member(s)")
                
                # Now delete the owned boards
                print("   - Deleting boards owned by the user...")
                owned_boards_delete_result = conn.execute(
                    text("DELETE FROM boards WHERE owner_id = :user_id"),
                    {"user_id": user_id}
                )
                print(f"     Deleted {owned_boards_delete_result.rowcount} board(s)")
            
            # Delete user's debts in other boards
            print("   - Deleting user's debts in other boards...")
            debts_result = conn.execute(
                text("DELETE FROM debts WHERE from_user_id = :user_id OR to_user_id = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted {debts_result.rowcount} debt(s)")
            
            # Delete user's expenses in other boards
            print("   - Deleting user's expenses in other boards...")
            expenses_result = conn.execute(
                text("DELETE FROM expenses WHERE created_by = :user_id OR paid_by = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted {expenses_result.rowcount} expense(s)")
            
            # Delete user's categories in other boards
            print("   - Deleting user's categories in other boards...")
            categories_result = conn.execute(
                text("DELETE FROM categories WHERE created_by = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted {categories_result.rowcount} categor(ies)")
            
            # Delete user's notifications
            print("   - Deleting user's notifications...")
            notifications_result = conn.execute(
                text("DELETE FROM notifications WHERE user_id = :user_id OR created_by = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted {notifications_result.rowcount} notification(s)")
            
            # Delete user's invitations
            print("   - Deleting user's invitations...")
            invitations_result = conn.execute(
                text("DELETE FROM invitations WHERE invited_by = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted {invitations_result.rowcount} invitation(s)")
            
            # Remove user from board memberships in other boards
            print("   - Removing user from other boards...")
            board_members_result = conn.execute(
                text("DELETE FROM board_members WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Removed from {board_members_result.rowcount} board(s)")
            
            # Delete user account
            print("   - Deleting user account...")
            user_result = conn.execute(
                text("DELETE FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            )
            print(f"     Deleted user account")
            
            # Commit transaction
            print("   - Committing changes...")
            # Transaction is automatically committed when exiting the context
            
            print("✅ User deletion completed successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Database error during deletion: {e}")
        print("   Transaction rolled back - no changes were made")
        return False

def main():
    """Main function"""
    print("🔧 Starting main function...")
    
    email = EMAIL_TO_DELETE.strip()
    
    print("🔧 Homis User Deletion Tool")
    print("=" * 40)
    print(f"🎯 Target email: {email}")
    print()
    
    # Get database URL
    database_url = get_database_url()
    if not database_url:
        sys.exit(1)
    
    # Create database connection
    engine = create_database_connection(database_url)
    if not engine:
        sys.exit(1)
    
    # Get user information
    user_info = get_user_info(engine, email)
    if not user_info:
        print("❌ Cannot proceed - user not found")
        sys.exit(1)
    
    # Get user's boards (where they are a member)
    boards = get_user_boards(engine, user_info.id)
    
    # Get boards owned by user
    owned_boards = get_user_owned_boards(engine, user_info.id)
    
    # Get user's expenses
    expenses_count = get_user_expenses(engine, user_info.id)
    
    # Get user's categories
    categories_count = get_user_categories(engine, user_info.id)
    
    # Get user's notifications
    notifications_count = get_user_notifications(engine, user_info.id)
    
    # Get user's invitations
    invitations_count = get_user_invitations(engine, user_info.id)
    
    print()
    
    # Confirm deletion
    if not confirm_deletion(email, user_info, boards, owned_boards, expenses_count, categories_count, notifications_count, invitations_count):
        print("❌ Deletion cancelled by user")
        sys.exit(0)
    
    # Delete user
    print()
    success = delete_user(engine, email, user_info.id)
    
    if success:
        print(f"\n🎉 User '{email}' has been successfully deleted!")
        print("   All related data has been removed from the database.")
    else:
        print(f"\n❌ Failed to delete user '{email}'")
        sys.exit(1)

if __name__ == '__main__':
    print("🔧 Script entry point reached")
    main()
    print("🔧 Script finished") 