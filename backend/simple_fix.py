#!/usr/bin/env python3
"""
Simple script to fix the debts table by adding missing columns
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_debts_table():
    """Add missing columns to debts table"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    # Fix Heroku DATABASE_URL format
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        print("🔧 Connecting to database...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("✅ Connected to database successfully")
        
        # Check current table structure
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'debts'
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"🔍 Current columns in debts table: {existing_columns}")
        
        # Add original_amount column if missing
        if 'original_amount' not in existing_columns:
            print("➕ Adding original_amount column...")
            cursor.execute("ALTER TABLE debts ADD COLUMN original_amount FLOAT")
            print("✅ Added original_amount column")
        else:
            print("✅ original_amount column already exists")
        
        # Add paid_amount column if missing
        if 'paid_amount' not in existing_columns:
            print("➕ Adding paid_amount column...")
            cursor.execute("ALTER TABLE debts ADD COLUMN paid_amount FLOAT DEFAULT 0.0")
            print("✅ Added paid_amount column")
        else:
            print("✅ paid_amount column already exists")
        
        # Migrate existing data
        print("🔄 Migrating existing debts data...")
        cursor.execute("""
            UPDATE debts 
            SET original_amount = amount,
                paid_amount = CASE 
                    WHEN is_paid = true THEN amount 
                    ELSE 0.0 
                END
            WHERE original_amount IS NULL
        """)
        
        rows_updated = cursor.fetchone()[0] if cursor.rowcount else 0
        print(f"✅ Updated {rows_updated} debt records")
        
        # Commit changes
        conn.commit()
        print("✅ Changes committed successfully")
        
        # Verify the changes
        cursor.execute("""
            SELECT 
                COUNT(*) as total_debts,
                COUNT(CASE WHEN original_amount IS NOT NULL THEN 1 END) as debts_with_original_amount,
                COUNT(CASE WHEN paid_amount IS NOT NULL THEN 1 END) as debts_with_paid_amount
            FROM debts
        """)
        
        result = cursor.fetchone()
        print(f"\n📊 Verification results:")
        print(f"   Total debts: {result[0]}")
        print(f"   Debts with original_amount: {result[1]}")
        print(f"   Debts with paid_amount: {result[2]}")
        
        # Show sample data
        cursor.execute("""
            SELECT id, amount, original_amount, paid_amount, is_paid, description
            FROM debts 
            LIMIT 3
        """)
        
        print(f"\n📊 Sample debt data:")
        for row in cursor.fetchall():
            print(f"   Debt ID: {row[0]}")
            print(f"   Amount: {row[1]}")
            print(f"   Original Amount: {row[2]}")
            print(f"   Paid Amount: {row[3]}")
            print(f"   Is Paid: {row[4]}")
            print(f"   Description: {row[5]}")
            print("   ---")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Database fix completed successfully!")
        print("🚀 You can now run your Flask app with the new columns!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing database: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔧 Simple Database Fix Script for Homis Backend")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('postgres_models.py'):
        print("❌ Error: postgres_models.py not found!")
        print("💡 Make sure you're running this script from the backend directory")
        exit(1)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  Warning: .env file not found!")
        print("💡 Make sure you have a .env file with DATABASE_URL")
    
    success = fix_debts_table()
    if success:
        print("\n✅ All done! Your database is now ready for partial payments!")
    else:
        print("\n❌ Database fix failed. Please check the error messages above.") 