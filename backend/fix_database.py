import os
from dotenv import load_dotenv
from postgres_models import db as postgres_db
from flask import Flask

# Load environment variables
load_dotenv()

def fix_database():
    """Add missing columns to users table using the same connection method as app.py"""
    try:
        print("🔧 Initializing Flask app for database connection...")
        
        # Create a minimal Flask app (same as in app.py)
        app = Flask(__name__)
        
        # Load configuration from environment variables (same as in app.py)
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        # Additional fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
        if app.config.get('DATABASE_URL') and app.config.get('DATABASE_URL').startswith('postgres://'):
            fixed_url = app.config.get('DATABASE_URL').replace('postgres://', 'postgresql://', 1)
            app.config['DATABASE_URL'] = fixed_url
            app.config['SQLALCHEMY_DATABASE_URI'] = fixed_url
            print(f"🔧 Fixed DATABASE_URL: {fixed_url}")
        
        # Additional fix for SQLALCHEMY_DATABASE_URI
        if app.config.get('SQLALCHEMY_DATABASE_URI') and app.config.get('SQLALCHEMY_DATABASE_URI').startswith('postgres://'):
            fixed_uri = app.config.get('SQLALCHEMY_DATABASE_URI').replace('postgres://', 'postgresql://', 1)
            app.config['SQLALCHEMY_DATABASE_URI'] = fixed_uri
            print(f"🔧 Fixed SQLALCHEMY_DATABASE_URI: {fixed_uri}")
        
        # Additional fix for SQLAlchemy engine options
        if not app.config.get('SQLALCHEMY_ENGINE_OPTIONS'):
            app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {}
        
        if 'connect_args' not in app.config['SQLALCHEMY_ENGINE_OPTIONS']:
            app.config['SQLALCHEMY_ENGINE_OPTIONS']['connect_args'] = {}
        
        if 'sslmode' not in app.config['SQLALCHEMY_ENGINE_OPTIONS']['connect_args']:
            app.config['SQLALCHEMY_ENGINE_OPTIONS']['connect_args']['sslmode'] = 'require'
        
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
            required_columns = ['accepted_terms', 'terms_accepted_at', 'terms_version']
            missing_columns = [col for col in required_columns if col not in existing_columns]
            
            if not missing_columns:
                print("✅ All required columns already exist!")
                return
            
            print(f"🔍 Missing columns: {missing_columns}")
            
            # Ask for confirmation
            response = input("\n❓ Do you want to add the missing columns? (y/n): ").lower().strip()
            if response not in ['y', 'yes']:
                print("❌ Operation cancelled by user")
                return
            
            print("🔧 Adding missing columns...")
            
            # Add missing columns using SQLAlchemy
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
                
                # Add terms_version column
                if 'terms_version' not in existing_columns:
                    print("➕ Adding terms_version column...")
                    connection.execute(postgres_db.text("""
                        ALTER TABLE users 
                        ADD COLUMN terms_version VARCHAR(50)
                    """))
                    print("✅ Added terms_version column")
                
                # Update existing users with default values
                print("🔄 Updating existing users with default values...")
                connection.execute(postgres_db.text("""
                    UPDATE users 
                    SET accepted_terms = FALSE, 
                        terms_version = '1.0' 
                    WHERE accepted_terms IS NULL
                """))
                
                # The transaction will be committed automatically when exiting the context
                print("✅ Database changes committed successfully!")
            
            # Verify the changes
            print("🔍 Verifying changes...")
            inspector = postgres_db.inspect(postgres_db.engine)
            updated_columns = inspector.get_columns('users')
            updated_column_names = [col['name'] for col in updated_columns]
            
            print(f"🔍 Updated columns in users table: {updated_column_names}")
            
            # Check if all required columns exist now
            all_required_exist = all(col in updated_column_names for col in required_columns)
            
            if all_required_exist:
                print("✅ All required columns added successfully!")
                
                # Show sample data
                with postgres_db.engine.connect() as connection:
                    result = connection.execute(postgres_db.text("""
                        SELECT id, email, accepted_terms, terms_version 
                        FROM users 
                        LIMIT 3
                    """))
                    
                    print("\n📊 Sample user data:")
                    for row in result:
                        print(f"   User ID: {row[0]}")
                        print(f"   Email: {row[1]}")
                        print(f"   Accepted Terms: {row[2]}")
                        print(f"   Terms Version: {row[3]}")
                        print("   ---")
                
                print("\n🎉 Database fix completed successfully!")
                print("🚀 You can now run your Flask app with the new columns!")
                
            else:
                print("❌ Some columns are still missing. Please check the database manually.")
                
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