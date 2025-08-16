#!/usr/bin/env python3
"""
Database initialization script for PostgreSQL migration.
This script can be used to initialize the database with tables and default data.
"""
import os
import sys
from flask import Flask
from config import config
from postgres_models import db, PostgreSQLDatabaseManager

def create_app_for_db():
    """Create a Flask app instance for database operations"""
    app = Flask(__name__)
    
    # Get configuration
    config_name = os.getenv('FLASK_ENV', 'production')
    app.config.from_object(config[config_name])
    
    # Debug: Print database configuration
    print(f"🔧 Database URL: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    print(f"🔧 Database config: {app.config.get('DATABASE_URL', 'Not set')}")
    
    # Ensure proper PostgreSQL URL format
    database_url = app.config.get('SQLALCHEMY_DATABASE_URI','postgresql://postgres:sarusiziv96@localhost:5432/postgres')
    if database_url and database_url.startswith('postgres://'):
        # Fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
        fixed_url = database_url.replace('postgres://', 'postgresql://', 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = fixed_url
        print(f"🔧 Fixed database URL: {fixed_url}")
    
    # Initialize database
    db.init_app(app)
    
    return app

def init_database():
    """Initialize the database with tables and default data"""
    app = create_app_for_db()
    
    with app.app_context():
        print("🔧 Creating database tables...")
        
        # Create all tables
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Initialize default data
        db_manager = PostgreSQLDatabaseManager(app)
        db_manager.initialize_default_data()
        print("✅ Default data initialized successfully!")
        
        print("🎉 Database initialization completed!")

def reset_database():
    """Reset the database (drop all tables and recreate)"""
    app = create_app_for_db()
    
    with app.app_context():
        print("⚠️  Dropping all database tables...")
        
        # Drop all tables
        db.drop_all()
        print("✅ All tables dropped!")
        
        # Create all tables
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Initialize default data
        db_manager = PostgreSQLDatabaseManager(app)
        db_manager.initialize_default_data()
        print("✅ Default data initialized successfully!")
        
        print("🎉 Database reset completed!")

def check_database():
    """Check database connection and tables"""
    app = create_app_for_db()
    
    with app.app_context():
        try:
            # Try to query the database
            from postgres_models import User, Board, Expense
            
            user_count = User.query.count()
            board_count = Board.query.count()
            expense_count = Expense.query.count()
            
            print(f"✅ Database connection successful!")
            print(f"📊 Statistics:")
            print(f"   Users: {user_count}")
            print(f"   Boards: {board_count}")
            print(f"   Expenses: {expense_count}")
            
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    return True

if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'init':
            init_database()
        elif command == 'reset':
            confirm = input("⚠️  Are you sure you want to reset the database? This will delete all data! (y/N): ")
            if confirm.lower() == 'y':
                reset_database()
            else:
                print("❌ Database reset cancelled.")
        elif command == 'check':
            check_database()
        else:
            print("Usage: python init_db.py [init|reset|check]")
            print("  init  - Initialize database with tables and default data")
            print("  reset - Reset database (drop all tables and recreate)")
            print("  check - Check database connection and show statistics")
    else:
        print("Usage: python init_db.py [init|reset|check]")
        print("  init  - Initialize database with tables and default data")
        print("  reset - Reset database (drop all tables and recreate)")
        print("  check - Check database connection and show statistics")