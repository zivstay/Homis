import os
from postgres_models import db as postgres_db
from flask import Flask
from config import DevelopmentConfig

def fix_database():
    """Add missing columns to users table using the same connection method as app.py"""
    try:
        print("🔧 Initializing Flask app for database connection...")
        
        # Create a minimal Flask app (same as in app.py)
        app = Flask(__name__)
        
        # Load configuration from config.py (same as in app.py)
        app.config.from_object(DevelopmentConfig)
        
        print(f"🔧 Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        
        print("🔧 Initializing PostgreSQL database...")
        postgres_db.init_app(app)
        
        with app.app_context():
            print("🔍 Checking current database structure...")
            
            # Check if the columns already exist
            inspector = postgres_db.inspect(postgres_db.engine)
            columns = inspector.get_columns('users')
            existing_columns = [col['name'] for col in columns]
            
            print(f"🔍 Current columns in users table: {existing_columns}")
            
            # Check which columns are missing
            required_columns = ['accepted_terms', 'terms_accepted_at', 'terms_version_signed']
            missing_columns = [col for col in required_columns if col not in existing_columns]
            
            print(f"🔍 Missing columns in users table: {missing_columns}")
            
            # Check debts table for new columns
            print("🔍 Checking debts table structure...")
            debts_columns = inspector.get_columns('debts')
            debts_existing_columns = [col['name'] for col in debts_columns]
            print(f"🔍 Current columns in debts table: {debts_existing_columns}")
            
            # Check which debt columns are missing
            required_debt_columns = ['original_amount', 'paid_amount']
            missing_debt_columns = [col for col in required_debt_columns if col not in debts_existing_columns]
            
            if missing_debt_columns:
                print(f"🔍 Missing columns in debts table: {missing_debt_columns}")
            else:
                print("✅ All required debt columns already exist!")
            
            # Check terms_versions table
            print("🔍 Checking terms_versions table...")
            table_names = inspector.get_table_names()
            terms_table_exists = 'terms_versions' in table_names
            
            if not terms_table_exists:
                print("🔍 terms_versions table does not exist - needs to be created")
            else:
                print("✅ terms_versions table already exists!")
            
            # Check if we need to add any columns or tables
            if not missing_columns and not missing_debt_columns and terms_table_exists:
                print("✅ All required columns and tables already exist!")
                return
            
            if missing_columns or missing_debt_columns or not terms_table_exists:
                # Ask for confirmation
                response = input("\n❓ Do you want to add the missing columns/tables? (y/n): ").lower().strip()
                if response not in ['y', 'yes']:
                    print("❌ Operation cancelled by user")
                    return
                
                print("🔧 Adding missing columns and tables...")
                
                # Add missing columns to users table
                if missing_columns:
                    print("🔧 Adding missing columns to users table...")
                    with postgres_db.engine.begin() as connection:
                        # Add accepted_terms column
                        if 'accepted_terms' not in existing_columns:
                            print("➕ Adding accepted_terms column...")
                            connection.execute(postgres_db.text("""
                                ALTER TABLE users 
                                ADD COLUMN accepted_terms BOOLEAN NOT NULL DEFAULT FALSE
                            """))
                            print("✅ Added accepted_terms column")
                        
                        # Add terms_accepted_at column
                        if 'terms_accepted_at' not in existing_columns:
                            print("➕ Adding terms_accepted_at column...")
                            connection.execute(postgres_db.text("""
                                ALTER TABLE users 
                                ADD COLUMN terms_accepted_at TIMESTAMP
                            """))
                            print("✅ Added terms_accepted_at column")
                        
                        # Add terms_version_signed column
                        if 'terms_version_signed' not in existing_columns:
                            print("➕ Adding terms_version_signed column...")
                            connection.execute(postgres_db.text("""
                                ALTER TABLE users 
                                ADD COLUMN terms_version_signed INTEGER
                            """))
                            print("✅ Added terms_version_signed column")
                        
                        # Update existing users with default values
                        print("🔄 Updating existing users with default values...")
                        connection.execute(postgres_db.text("""
                            UPDATE users 
                            SET accepted_terms = FALSE, 
                                terms_version_signed = NULL 
                            WHERE accepted_terms IS NULL
                        """))
                        
                        print("✅ Users table changes committed successfully!")
                
                # Add missing columns to debts table
                if missing_debt_columns:
                    print("🔧 Adding missing columns to debts table...")
                    with postgres_db.engine.begin() as connection:
                        # Add original_amount column
                        if 'original_amount' not in debts_existing_columns:
                            print("➕ Adding original_amount column...")
                            connection.execute(postgres_db.text("""
                                ALTER TABLE debts 
                                ADD COLUMN original_amount FLOAT
                            """))
                            print("✅ Added original_amount column")
                        
                        # Add paid_amount column
                        if 'paid_amount' not in debts_existing_columns:
                            print("➕ Adding paid_amount column...")
                            connection.execute(postgres_db.text("""
                                ALTER TABLE debts 
                                ADD COLUMN paid_amount FLOAT DEFAULT 0.0
                            """))
                            print("✅ Added paid_amount column")
                        
                        # Migrate existing debts data
                        print("🔄 Migrating existing debts data...")
                        connection.execute(postgres_db.text("""
                            UPDATE debts 
                            SET original_amount = amount,
                                paid_amount = CASE 
                                    WHEN is_paid = true THEN amount 
                                    ELSE 0.0 
                                END
                            WHERE original_amount IS NULL
                        """))
                        
                        print("✅ Debts table changes committed successfully!")
                
                # Create terms_versions table if it doesn't exist
                if not terms_table_exists:
                    print("🔧 Creating terms_versions table...")
                    with postgres_db.engine.begin() as connection:
                        connection.execute(postgres_db.text("""
                            CREATE TABLE terms_versions (
                                id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
                                version_number INTEGER UNIQUE NOT NULL,
                                title VARCHAR(255) NOT NULL,
                                content_hebrew TEXT NOT NULL,
                                content_english TEXT NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                created_by VARCHAR NOT NULL REFERENCES users(id),
                                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                                change_description TEXT
                            )
                        """))
                        
                        # Create index on version_number
                        connection.execute(postgres_db.text("""
                            CREATE INDEX idx_terms_versions_version_number ON terms_versions(version_number)
                        """))
                        
                        print("✅ terms_versions table created successfully!")
                
                # Verify all changes
                print("🔍 Verifying all changes...")
                
                # Check users table
                inspector = postgres_db.inspect(postgres_db.engine)
                updated_users_columns = inspector.get_columns('users')
                updated_users_column_names = [col['name'] for col in updated_users_columns]
                
                print(f"🔍 Updated columns in users table: {updated_users_column_names}")
                
                # Check debts table
                updated_debts_columns = inspector.get_columns('debts')
                updated_debts_column_names = [col['name'] for col in updated_debts_columns]
                
                print(f"🔍 Updated columns in debts table: {updated_debts_column_names}")
                
                # Check terms_versions table again
                updated_table_names = inspector.get_table_names()
                terms_table_now_exists = 'terms_versions' in updated_table_names
                
                print(f"🔍 Terms table exists: {terms_table_now_exists}")
                
                # Check if all required columns exist now
                all_users_required_exist = all(col in updated_users_column_names for col in required_columns)
                all_debts_required_exist = all(col in updated_debts_column_names for col in required_debt_columns)
                
                if all_users_required_exist and all_debts_required_exist and terms_table_now_exists:
                    print("✅ All required columns and tables added successfully!")
                    
                    # Show sample data from users
                    with postgres_db.engine.connect() as connection:
                        result = connection.execute(postgres_db.text("""
                            SELECT id, email, accepted_terms, terms_version_signed 
                            FROM users 
                            LIMIT 3
                        """))
                        
                        print("\n📊 Sample user data:")
                        for row in result:
                            print(f"   User ID: {row[0]}")
                            print(f"   Email: {row[1]}")
                            print(f"   Accepted Terms: {row[2]}")
                            print(f"   Terms Version Signed: {row[3]}")
                            print("   ---")
                    
                    # Show sample data from debts
                    with postgres_db.engine.connect() as connection:
                        result = connection.execute(postgres_db.text("""
                            SELECT id, amount, original_amount, paid_amount, is_paid
                            FROM debts 
                            LIMIT 3
                        """))
                        
                        print("\n📊 Sample debt data:")
                        for row in result:
                            print(f"   Debt ID: {row[0]}")
                            print(f"   Amount: {row[1]}")
                            print(f"   Original Amount: {row[2]}")
                            print(f"   Paid Amount: {row[3]}")
                            print(f"   Is Paid: {row[4]}")
                            print("   ---")
                    
                    # Show sample data from terms_versions if it exists and has data
                    if terms_table_now_exists:
                        with postgres_db.engine.connect() as connection:
                            result = connection.execute(postgres_db.text("""
                                SELECT id, version_number, title, created_at, is_active
                                FROM terms_versions 
                                ORDER BY version_number DESC
                                LIMIT 3
                            """))
                            
                            print("\n📊 Sample terms versions data:")
                            rows = list(result)
                            if rows:
                                for row in rows:
                                    print(f"   Terms ID: {row[0]}")
                                    print(f"   Version: {row[1]}")
                                    print(f"   Title: {row[2]}")
                                    print(f"   Created: {row[3]}")
                                    print(f"   Active: {row[4]}")
                                    print("   ---")
                            else:
                                print("   No terms versions found - table is empty")
                    
                    print("\n🎉 Database fix completed successfully!")
                    print("🚀 You can now run your Flask app with the new columns and tables!")
                    
                else:
                    print("❌ Some columns are still missing. Please check the database manually.")
                    if not all_users_required_exist:
                        print(f"❌ Missing users columns: {[col for col in required_columns if col not in updated_users_column_names]}")
                    if not all_debts_required_exist:
                        print(f"❌ Missing debts columns: {[col for col in required_debt_columns if col not in updated_debts_column_names]}")
                    if not terms_table_now_exists:
                        print(f"❌ Missing terms_versions table")
                
                return
            
            print(f"🔍 Missing columns: {missing_columns}")
            

                
    except Exception as e:
        print(f"❌ Error fixing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔧 Database Fix Script for Homis Backend")
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
    
    fix_database() 