#!/usr/bin/env python3
"""
Script to clear a specific board from all debts, expenses, and related data
Simply change the BOARD_NAME_TO_CLEAR variable below and run the script
"""

import os
import sys
from datetime import datetime

print("🔧 Board Clearing Script starting...")
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

# CHANGE THIS TO THE BOARD NAME YOU WANT TO CLEAR
BOARD_NAME_TO_CLEAR = "זיו ספיר ואברהם"  # Replace with actual board name

# DATABASE CONNECTION - You can set this directly here instead of using .env file
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL = os.getenv('DATABASE_URL') or "postgresql://postgres:123456@localhost:5432/homis_db"

print(f"🔧 BOARD_NAME_TO_CLEAR: {BOARD_NAME_TO_CLEAR}")
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

def find_board_by_name(engine, board_name):
    """Find board by name (case-insensitive search)"""
    try:
        with engine.connect() as conn:
            # Search for board by name (case-insensitive)
            query = text("""
                SELECT id, name, description, owner_id, created_at, 
                       currency, timezone, board_type
                FROM boards 
                WHERE LOWER(name) LIKE LOWER(:board_name)
                ORDER BY created_at DESC
            """)
            
            result = conn.execute(query, {"board_name": f"%{board_name}%"})
            boards = result.fetchall()
            
            if not boards:
                print(f"❌ No boards found matching name '{board_name}'")
                return None
            
            if len(boards) > 1:
                print(f"🔍 Found {len(boards)} board(s) matching '{board_name}':")
                for i, board in enumerate(boards):
                    print(f"   {i+1}. {board.name} (ID: {board.id}) - Created: {board.created_at}")
                
                while True:
                    try:
                        choice = input(f"\n❓ Select board number (1-{len(boards)}): ").strip()
                        choice_num = int(choice)
                        if 1 <= choice_num <= len(boards):
                            selected_board = boards[choice_num - 1]
                            print(f"✅ Selected: {selected_board.name}")
                            return selected_board
                        else:
                            print(f"Please enter a number between 1 and {len(boards)}")
                    except ValueError:
                        print("Please enter a valid number")
            else:
                # Only one board found
                board = boards[0]
                print(f"✅ Found board: {board.name}")
                return board
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return None

def get_board_members(engine, board_id):
    """Get board members"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT bm.user_id, bm.role, bm.is_default_board,
                       u.first_name, u.last_name, u.email
                FROM board_members bm
                JOIN users u ON bm.user_id = u.id
                WHERE bm.board_id = :board_id
                ORDER BY bm.is_default_board DESC, bm.joined_at ASC
            """)
            
            result = conn.execute(query, {"board_id": board_id})
            members = result.fetchall()
            
            if members:
                print(f"📋 Board has {len(members)} member(s):")
                for member in members:
                    default_mark = " (Default)" if member.is_default_board else ""
                    print(f"   - {member.first_name} {member.last_name} ({member.email}) - {member.role}{default_mark}")
                return members
            else:
                print("📋 Board has no members")
                return []
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return []

def get_board_data_counts(engine, board_id):
    """Get counts of data in the board"""
    try:
        with engine.connect() as conn:
            # Count debts
            debts_result = conn.execute(
                text("SELECT COUNT(*) as count FROM debts WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            debts_count = debts_result.fetchone().count
            
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
            
            # Count notifications
            notifications_result = conn.execute(
                text("SELECT COUNT(*) as count FROM notifications WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            notifications_count = notifications_result.fetchone().count
            
            print(f"🔧 Board data summary:")
            print(f"   - Debts: {debts_count}")
            print(f"   - Expenses: {expenses_count}")
            print(f"   - Categories: {categories_count}")
            print(f"   - Notifications: {notifications_count}")
            
            return {
                'debts': debts_count,
                'expenses': expenses_count,
                'categories': categories_count,
                'notifications': notifications_count
            }
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        return {}

def confirm_clearing(board_name, data_counts):
    """Ask for confirmation before clearing"""
    print(f"\n⚠️  WARNING: You are about to CLEAR board '{board_name}'")
    print(f"   This action will:")
    print(f"   - DELETE {data_counts.get('debts', 0)} debt(s)")
    print(f"   - DELETE {data_counts.get('expenses', 0)} expense(s)")
    print(f"   - DELETE {data_counts.get('categories', 0)} categor(ies)")
    print(f"   - DELETE {data_counts.get('notifications', 0)} notification(s)")
    print(f"   - The board structure and members will remain")
    print(f"   - This action is IRREVERSIBLE!")
    
    while True:
        response = input(f"\n❓ Are you sure you want to clear board '{board_name}'? (yes/no): ").lower().strip()
        
        if response in ['yes', 'y']:
            return True
        elif response in ['no', 'n']:
            return False
        else:
            print("Please enter 'yes' or 'no'")

def clear_board_data(engine, board_id):
    """Clear all data from the board"""
    try:
        with engine.begin() as conn:
            print(f"🧹 Starting board clearing process...")
            
            # Start transaction
            print("   - Starting database transaction...")
            
            # Delete all debts in this board
            print("   - Deleting debts...")
            debts_result = conn.execute(
                text("DELETE FROM debts WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {debts_result.rowcount} debt(s)")
            
            # Delete all expenses in this board
            print("   - Deleting expenses...")
            expenses_result = conn.execute(
                text("DELETE FROM expenses WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {expenses_result.rowcount} expense(s)")
            
            # Delete all categories in this board (except default ones)
            print("   - Deleting custom categories...")
            categories_result = conn.execute(
                text("DELETE FROM categories WHERE board_id = :board_id AND is_default = false"),
                {"board_id": board_id}
            )
            print(f"     Deleted {categories_result.rowcount} custom categor(ies)")
            
            # Delete all notifications for this board
            print("   - Deleting notifications...")
            notifications_result = conn.execute(
                text("DELETE FROM notifications WHERE board_id = :board_id"),
                {"board_id": board_id}
            )
            print(f"     Deleted {notifications_result.rowcount} notification(s)")
            
            # Commit transaction
            print("   - Committing changes...")
            # Transaction is automatically committed when exiting the context
            
            print("✅ Board clearing completed successfully!")
            return True
            
    except SQLAlchemyError as e:
        print(f"❌ Database error during clearing: {e}")
        print("   Transaction rolled back - no changes were made")
        return False

def main():
    """Main function"""
    print("🔧 Starting main function...")
    
    board_name = BOARD_NAME_TO_CLEAR.strip()
    
    print("🔧 Homis Board Clearing Tool")
    print("=" * 40)
    print(f"🔧 Target board name: {board_name}")
    print()
    
    # Get database URL
    database_url = get_database_url()
    if not database_url:
        sys.exit(1)
    
    # Create database connection
    engine = create_database_connection(database_url)
    if not engine:
        sys.exit(1)
    
    # Find board by name
    board_info = find_board_by_name(engine, board_name)
    if not board_info:
        print("❌ Cannot proceed - board not found")
        sys.exit(1)
    
    # Get board members
    members = get_board_members(engine, board_info.id)
    
    # Get board data counts
    data_counts = get_board_data_counts(engine, board_info.id)
    
    print()
    
    # Confirm clearing
    if not confirm_clearing(board_info.name, data_counts):
        print("❌ Board clearing cancelled by user")
        sys.exit(0)
    
    # Clear board
    print()
    success = clear_board_data(engine, board_info.id)
    
    if success:
        print(f"\n🔧 Board '{board_info.name}' has been successfully cleared!")
        print("   All debts, expenses, and related data have been removed.")
        print("   The board structure and members remain intact.")
    else:
        print(f"\n❌ Failed to clear board '{board_info.name}'")
        sys.exit(1)

if __name__ == '__main__':
    print("🔧 Script entry point reached")
    main()
    print("�� Script finished")
