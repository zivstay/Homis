#!/usr/bin/env python3
"""
Data migration script from TinyDB (SQLite) to PostgreSQL.
This script migrates all existing data from the current TinyDB database to PostgreSQL.
"""
import os
import sys
from datetime import datetime
from flask import Flask
from config import config
from models import DatabaseManager  # TinyDB version
from postgres_models import db, PostgreSQLDatabaseManager  # PostgreSQL version

def create_app_for_migration():
    """Create a Flask app instance for migration"""
    app = Flask(__name__)
    
    # Get configuration
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize PostgreSQL database
    db.init_app(app)
    
    return app

def migrate_data():
    """Migrate data from TinyDB to PostgreSQL"""
    print("🔄 Starting data migration from TinyDB to PostgreSQL...")
    
    # Initialize TinyDB manager
    tinydb_path = os.getenv('DATABASE_PATH', 'expenses_db.json')
    if not os.path.exists(tinydb_path):
        print(f"❌ TinyDB file not found: {tinydb_path}")
        return False
    
    tinydb_manager = DatabaseManager(tinydb_path)
    
    # Initialize PostgreSQL app and manager
    app = create_app_for_migration()
    
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        postgres_manager = PostgreSQLDatabaseManager(app)
        
        try:
            # Migrate Users
            print("👥 Migrating users...")
            users = tinydb_manager.users_table.all()
            user_count = 0
            for user_data in users:
                try:
                    # Check if user already exists
                    existing_user = postgres_manager.get_user_by_email(user_data['email'])
                    if not existing_user:
                        postgres_manager.create_user(user_data)
                        user_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate user {user_data.get('email', 'unknown')}: {e}")
            print(f"✅ Migrated {user_count} users")
            
            # Migrate Boards
            print("📋 Migrating boards...")
            boards = tinydb_manager.boards_table.all()
            board_count = 0
            for board_data in boards:
                try:
                    # Check if board already exists
                    existing_board = postgres_manager.get_board_by_id(board_data['id'])
                    if not existing_board:
                        # Remove the auto-generated member addition since we'll migrate members separately
                        temp_board = postgres_manager.create_board(board_data)
                        board_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate board {board_data.get('name', 'unknown')}: {e}")
            print(f"✅ Migrated {board_count} boards")
            
            # Migrate Board Members (after removing auto-generated ones)
            print("👥 Migrating board members...")
            # First, remove auto-generated board members
            from postgres_models import BoardMember
            BoardMember.query.delete()
            db.session.commit()
            
            members = tinydb_manager.board_members_table.all()
            member_count = 0
            for member_data in members:
                try:
                    postgres_manager.add_board_member(
                        board_id=member_data['board_id'],
                        user_id=member_data['user_id'],
                        role=member_data['role'],
                        invited_by=member_data['invited_by']
                    )
                    
                    # Update additional fields
                    from postgres_models import BoardMember
                    member = BoardMember.query.filter_by(
                        board_id=member_data['board_id'],
                        user_id=member_data['user_id']
                    ).first()
                    
                    if member:
                        member.id = member_data['id']
                        member.joined_at = datetime.fromisoformat(member_data['joined_at'])
                        member.is_active = member_data.get('is_active', True)
                        member.is_default_board = member_data.get('is_default_board', False)
                        member.permissions = member_data.get('permissions', [])
                        db.session.commit()
                    
                    member_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate board member: {e}")
            print(f"✅ Migrated {member_count} board members")
            
            # Migrate Categories
            print("📂 Migrating categories...")
            categories = tinydb_manager.categories_table.all()
            # First, remove default categories that were auto-created
            from postgres_models import Category
            Category.query.delete()
            db.session.commit()
            
            category_count = 0
            for category_data in categories:
                try:
                    postgres_manager.create_category(category_data)
                    category_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate category {category_data.get('name', 'unknown')}: {e}")
            print(f"✅ Migrated {category_count} categories")
            
            # Migrate Expenses
            print("💰 Migrating expenses...")
            expenses = tinydb_manager.expenses_table.all()
            expense_count = 0
            for expense_data in expenses:
                try:
                    postgres_manager.create_expense(expense_data)
                    expense_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate expense: {e}")
            print(f"✅ Migrated {expense_count} expenses")
            
            # Migrate Debts
            print("💳 Migrating debts...")
            debts = tinydb_manager.debts_table.all()
            debt_count = 0
            for debt_data in debts:
                try:
                    postgres_manager.create_debt(debt_data)
                    debt_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate debt: {e}")
            print(f"✅ Migrated {debt_count} debts")
            
            # Migrate Notifications
            print("🔔 Migrating notifications...")
            notifications = tinydb_manager.notifications_table.all()
            notification_count = 0
            for notification_data in notifications:
                try:
                    postgres_manager.create_notification(notification_data)
                    notification_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate notification: {e}")
            print(f"✅ Migrated {notification_count} notifications")
            
            # Migrate Pending Registrations
            print("⏳ Migrating pending registrations...")
            pending_regs = tinydb_manager.pending_registrations_table.all()
            pending_count = 0
            for pending_data in pending_regs:
                try:
                    postgres_manager.create_pending_registration(pending_data)
                    pending_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate pending registration: {e}")
            print(f"✅ Migrated {pending_count} pending registrations")
            
            # Migrate Invitations
            print("📧 Migrating invitations...")
            invitations = tinydb_manager.invitations_table.all()
            invitation_count = 0
            for invitation_data in invitations:
                try:
                    postgres_manager.create_invitation(invitation_data)
                    invitation_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate invitation: {e}")
            print(f"✅ Migrated {invitation_count} invitations")
            
            print("🎉 Data migration completed successfully!")
            print(f"📊 Migration Summary:")
            print(f"   Users: {user_count}")
            print(f"   Boards: {board_count}")
            print(f"   Board Members: {member_count}")
            print(f"   Categories: {category_count}")
            print(f"   Expenses: {expense_count}")
            print(f"   Debts: {debt_count}")
            print(f"   Notifications: {notification_count}")
            print(f"   Pending Registrations: {pending_count}")
            print(f"   Invitations: {invitation_count}")
            
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def backup_tinydb():
    """Create a backup of the current TinyDB file"""
    tinydb_path = os.getenv('DATABASE_PATH', 'expenses_db.json')
    if os.path.exists(tinydb_path):
        backup_path = f"{tinydb_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        import shutil
        shutil.copy2(tinydb_path, backup_path)
        print(f"✅ TinyDB backup created: {backup_path}")
        return backup_path
    else:
        print(f"⚠️  TinyDB file not found: {tinydb_path}")
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'migrate':
            # Create backup first
            backup_path = backup_tinydb()
            if backup_path:
                print(f"📁 Backup created at: {backup_path}")
            
            # Run migration
            success = migrate_data()
            if success:
                print("✅ Migration completed successfully!")
                print("💡 You can now switch to PostgreSQL by setting DATABASE_URL environment variable")
            else:
                print("❌ Migration failed!")
                
        elif command == 'backup':
            backup_tinydb()
        else:
            print("Usage: python migrate_data.py [migrate|backup]")
            print("  migrate - Migrate data from TinyDB to PostgreSQL")
            print("  backup  - Create a backup of the TinyDB file")
    else:
        print("Usage: python migrate_data.py [migrate|backup]")
        print("  migrate - Migrate data from TinyDB to PostgreSQL") 
        print("  backup  - Create a backup of the TinyDB file")