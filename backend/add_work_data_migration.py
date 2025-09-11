#!/usr/bin/env python3
"""
Migration script to add work_data column to expenses table
"""
import os
import sys
from sqlalchemy import create_engine, text
from urllib.parse import urlparse

def get_database_url():
    """Get database URL from environment variables"""
    # Try to get from environment
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        # Handle Heroku's postgres:// URL format
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        return database_url
    
    # Fallback to local development database
    return 'postgresql://postgres:password@localhost:5432/homis'

def add_work_data_column():
    """Add work_data JSON column to expenses table"""
    database_url = get_database_url()
    print(f"🔍 Connecting to database...")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start a transaction
            with conn.begin():
                # Check if column already exists
                check_query = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'expenses' 
                    AND column_name = 'work_data'
                """)
                
                result = conn.execute(check_query)
                if result.fetchone():
                    print("✅ work_data column already exists in expenses table")
                    return True
                
                # Add the column
                print("🔧 Adding work_data column to expenses table...")
                add_column_query = text("""
                    ALTER TABLE expenses 
                    ADD COLUMN work_data JSON NULL
                """)
                
                conn.execute(add_column_query)
                print("✅ Successfully added work_data column to expenses table")
                
                return True
                
    except Exception as e:
        print(f"❌ Error adding work_data column: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Starting work_data migration...")
    
    if add_work_data_column():
        print("✅ Migration completed successfully!")
        return 0
    else:
        print("❌ Migration failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
