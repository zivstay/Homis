#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration: Add all_items_completed field to shopping_lists table
This field tracks whether all items in a shopping list are completed
"""

import os
import sys
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def run_migration():
    """Add all_items_completed field to shopping_lists"""
    
    database_url = Config.SQLALCHEMY_DATABASE_URI
    if not database_url:
        print("ERROR: Database URL not configured")
        return False
    
    print(f"Connecting to database...")
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("\n" + "="*60)
        print("MIGRATION: Add all_items_completed to shopping_lists")
        print("="*60 + "\n")
        
        # Step 1: Check if column already exists
        print("Step 1: Checking if all_items_completed column exists...")
        check_column = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shopping_lists' 
            AND column_name = 'all_items_completed'
        """)
        result = session.execute(check_column).fetchone()
        
        if result:
            print("✓ Column all_items_completed already exists. Skipping column creation.")
        else:
            print("Adding all_items_completed column...")
            add_column = text("""
                ALTER TABLE shopping_lists 
                ADD COLUMN all_items_completed BOOLEAN DEFAULT FALSE NOT NULL
            """)
            session.execute(add_column)
            session.commit()
            print("✓ Column all_items_completed added successfully")
        
        # Step 2: Update all_items_completed for existing lists
        print("\nStep 2: Updating all_items_completed for existing lists...")
        update_completion = text("""
            UPDATE shopping_lists sl
            SET all_items_completed = (
                SELECT CASE 
                    WHEN COUNT(*) = 0 THEN FALSE
                    WHEN COUNT(*) = COUNT(*) FILTER (WHERE is_completed = TRUE) THEN TRUE
                    ELSE FALSE
                END
                FROM shopping_list_items
                WHERE shopping_list_id = sl.id
            )
            WHERE sl.is_active = TRUE
        """)
        session.execute(update_completion)
        session.commit()
        print("✓ Updated all_items_completed status for all active lists")
        
        # Step 3: Show summary
        print("\nStep 3: Summary...")
        summary = text("""
            SELECT 
                COUNT(*) as total_lists,
                COUNT(*) FILTER (WHERE all_items_completed = TRUE) as completed_lists,
                COUNT(*) FILTER (WHERE all_items_completed = FALSE) as incomplete_lists
            FROM shopping_lists
            WHERE is_active = TRUE
        """)
        result = session.execute(summary).fetchone()
        print(f"Total active lists: {result[0]}")
        print(f"Completed lists: {result[1]}")
        print(f"Incomplete lists: {result[2]}")
        
        print("\n" + "="*60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR during migration: {str(e)}")
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)

