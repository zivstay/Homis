#!/usr/bin/env python3
"""
Script to delete a board from PostgreSQL database by name
Simply change the BOARD_NAME_TO_DELETE variable below and run the script
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

# CHANGE THIS TO THE BOARD NAME YOU WANT TO DELETE
BOARD_NAME_TO_DELETE = "הבית של אור"  # Replace with actual board name

# DATABASE CONNECTION - You can set this directly here instead of using .env file
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL = os.getenv('DATABASE_URL') or "postgresql://postgres:123456@localhost:5432/homis_db"

print(f"🔧 BOARD_NAME_TO_DELETE: {BOARD_NAME_TO_DELETE}")
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

def get_board_info(engine, board_name):
    """Get board information from database"""
    try:
        with engine.connect() as conn:
            # Get board details
            query = text("""
                SELECT b.id, b.name, b.created_at, b.owner_id, 
                       u.email as owner_email, u.username as owner_username
                FROM boards b
                JOIN users u ON b.owner_id = u.id
                WHERE LOWER(b.name) = LOWER(:board_name)
            """)
            
            result = conn.execute(query, {"board_name": board_name.strip()})
            board = result.fetchone()
            
            if board:
                print(f"📋 Board found:")
                print(f"   ID: {board.id}")
                print(f"   Name: {board.name}")
                print(f"   Created: {board.created_at}")
                print(f"   Owner: {board.owner_email} ({board.owner_username})")
                return board
            else:
                print(f"❌ Board with name '{board_name}' not found!")
                return None
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return None

def get_board_members(engine, board_id):
    """Get members of the board"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT u.email, u.username, bm.role, bm.is_default_board
                FROM board_members bm
                JOIN users u ON bm.user_id = u.id
                WHERE bm.board_id = :board_id
                ORDER BY bm.role, u.email
            """)
            
            result = conn.execute(query, {"board_id": board_id})
            members = result.fetchall()
            
            if members:
                print(f"📋 Board has {len(members)} member(s):")
                for member in members:
                    default_mark = " (Default Board)" if member.is_default_board else ""
                    print(f"   - {member.email} ({member.role}){default_mark}")
                return members
            else:
                print("📋 Board has no members")
                return []
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return []

def get_board_data_counts(engine, board_id):
    """Get counts of data associated with the board"""
    try:
        with engine.connect() as conn:
            # Count expenses
            expenses_result = conn.execute(
                text("SELECT COUNT(*) as count FROM expenses WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            expenses_count = expenses_result.fetchone().count
            
            # Count categories
            categories_result = conn.execute(
                text("SELECT COUNT(*) as count FROM categories WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            categories_count = categories_result.fetchone().count
            
            # Count debts
            debts_result = conn.execute(
                text("SELECT COUNT(*) as count FROM debts WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            debts_count = debts_result.fetchone().count
            
            # Count notifications
            notifications_result = conn.execute(
                text("SELECT COUNT(*) as count FROM notifications WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            notifications_count = notifications_result.fetchone().count
            
            print(f"📊 Board data:")
            print(f"   - {expenses_count} expense(s)")
            print(f"   - {categories_count} categor(ies)")
            print(f"   - {debts_count} debt(s)")
            print(f"   - {notifications_count} notification(s)")
            
            return {
                'expenses': expenses_count,
                'categories': categories_count,
                'debts': debts_count,
                'notifications': notifications_count
            }
            
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return {
            'expenses': 0,
            'categories': 0,
            'debts': 0,
            'notifications': 0
        }

def confirm_board_deletion(board_name, board_info, members, data_counts):
    """Ask for confirmation before board deletion"""
    print(f"\n⚠️  WARNING: You are about to delete board '{board_name}'")
    print(f"   This action will:")
    print(f"   - DELETE the board permanently")
    print(f"   - Remove all {len(members)} member(s) from the board")
    print(f"   - DELETE {data_counts['expenses']} expense(s)")
    print(f"   - DELETE {data_counts['categories']} categor(ies)")
    print(f"   - DELETE {data_counts['debts']} debt(s)")
    print(f"   - DELETE {data_counts['notifications']} notification(s)")
    print(f"   - This action is IRREVERSIBLE!")
    
    # Show members whose default board this is
    default_board_members = [m for m in members if m.is_default_board]
    if default_board_members:
        print(f"   ⚠️  This is the default board for {len(default_board_members)} user(s):")
        for member in default_board_members:
            print(f"      - {member.email}")
        print(f"      These users will need to select a new default board!")
    
    while True:
        response = input(f"\n❓ Are you sure you want to delete board '{board_name}'? (yes/no): ").lower().strip()
        
        if response in ['yes', 'y']:
            return True
        elif response in ['no', 'n']:
            return False
        else:
            print("Please enter 'yes' or 'no'")

def delete_board_by_name(engine, board_name):
    """Delete a board and all related data by board name"""
    print(f"🔧 Homis Board Deletion Tool")
    print("=" * 40)
    print(f"🎯 Target board: {board_name}")
    print()
    
    # Get board information
    board_info = get_board_info(engine, board_name)
    if not board_info:
        print("❌ Cannot proceed - board not found")
        return False
    
    board_id = board_info.id
    
    # Get board members
    members = get_board_members(engine, board_id)
    
    # Get data counts
    data_counts = get_board_data_counts(engine, board_id)
    
    print()
    
    # Confirm deletion
    if not confirm_board_deletion(board_name, board_info, members, data_counts):
        print("❌ Board deletion cancelled by user")
        return False
    
    # Delete board
    print()
    try:
        with engine.begin() as conn:
            print(f"🗑️  Starting board deletion process...")
            
            # Start transaction
            print("   - Starting database transaction...")
            
            # Delete debts in this board
            print("   - Deleting debts...")
            debts_result = conn.execute(
                text("DELETE FROM debts WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {debts_result.rowcount} debt(s)")
            
            # Delete expenses in this board
            print("   - Deleting expenses...")
            expenses_result = conn.execute(
                text("DELETE FROM expenses WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {expenses_result.rowcount} expense(s)")
            
            # Delete categories in this board
            print("   - Deleting categories...")
            categories_result = conn.execute(
                text("DELETE FROM categories WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {categories_result.rowcount} categor(ies)")
            
            # Delete notifications for this board
            print("   - Deleting notifications...")
            notifications_result = conn.execute(
                text("DELETE FROM notifications WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {notifications_result.rowcount} notification(s)")
            
            # Delete board members for this board
            print("   - Removing board members...")
            board_members_result = conn.execute(
                text("DELETE FROM board_members WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Removed {board_members_result.rowcount} member(s)")
            
            # Delete the board itself
            print("   - Deleting board...")
            board_result = conn.execute(
                text("DELETE FROM boards WHERE id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted board")
            
            # Commit transaction
            print("   - Committing changes...")
            # Transaction is automatically committed when exiting the context
            
            print("✅ Board deletion completed successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Database error during deletion: {e}")
        print("   Transaction rolled back - no changes were made")
        return False

def main():
    """Main function"""
    print("🔧 Starting main function...")
    
    board_name = BOARD_NAME_TO_DELETE.strip()
    
    print("🔧 Homis Board Deletion Tool")
    print("=" * 40)
    print(f"🎯 Target board: {board_name}")
    print()
    
    # Get database URL
    database_url = get_database_url()
    if not database_url:
        sys.exit(1)
    
    # Create database connection
    engine = create_database_connection(database_url)
    if not engine:
        sys.exit(1)
    
    # Delete board
    success = delete_board_by_name(engine, board_name)
    
    if success:
        print(f"\n🎉 Board '{board_name}' has been successfully deleted!")
        print("   All related data has been removed from the database.")
    else:
        print(f"\n❌ Failed to delete board '{board_name}'")
        sys.exit(1)

if __name__ == '__main__':
    print("🔧 Script entry point reached")
    main()
    print("🔧 Script finished")
