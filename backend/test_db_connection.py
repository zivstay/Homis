#!/usr/bin/env python3
"""
Simple database connection test script to debug PostgreSQL issues
"""
import os
import sys
from flask import Flask
from config import config

def test_connection():
    """Test basic database connection"""
    print("🔧 Testing database connection...")
    
    # Create minimal Flask app
    app = Flask(__name__)
    
    # Get configuration
    config_name = os.getenv('FLASK_ENV', 'production')
    print(f"🔧 Using config: {config_name}")
    
    app.config.from_object(config[config_name])
    
    # Print database configuration
    print(f"🔧 DATABASE_URL: {app.config.get('DATABASE_URL', 'Not set')}")
    print(f"🔧 SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    
    # Test SQLAlchemy import
    try:
        from sqlalchemy import create_engine
        print("✅ SQLAlchemy imported successfully")
    except ImportError as e:
        print(f"❌ SQLAlchemy import failed: {e}")
        return False
    
    # Test PostgreSQL driver import
    try:
        import psycopg2
        print("✅ psycopg2 imported successfully")
    except ImportError as e:
        print(f"❌ psycopg2 import failed: {e}")
    
    try:
        import psycopg2.binary
        print("✅ psycopg2.binary imported successfully")
    except ImportError as e:
        print(f"❌ psycopg2.binary import failed: {e}")
    
    try:
        import pg8000
        print("✅ pg8000 imported successfully")
    except ImportError as e:
        print(f"❌ pg8000 import failed: {e}")
    
    # Test engine creation
    try:
        database_url = app.config.get('SQLALCHEMY_DATABASE_URI')
        if database_url:
            print(f"🔧 Attempting to create engine with: {database_url}")
            
            # Try different driver options
            drivers_to_try = [
                database_url,
                database_url.replace('postgresql://', 'postgresql+psycopg2://'),
                database_url.replace('postgresql://', 'postgresql+pg8000://'),
            ]
            
            for driver_url in drivers_to_try:
                try:
                    print(f"🔧 Trying: {driver_url}")
                    engine = create_engine(driver_url, echo=True)
                    print(f"✅ Engine created successfully with: {driver_url}")
                    
                    # Test connection
                    with engine.connect() as conn:
                        result = conn.execute("SELECT 1")
                        print("✅ Database connection successful!")
                        return True
                        
                except Exception as e:
                    print(f"❌ Failed with {driver_url}: {e}")
                    continue
        else:
            print("❌ No database URL configured")
            return False
            
    except Exception as e:
        print(f"❌ Engine creation failed: {e}")
        return False
    
    return False

if __name__ == '__main__':
    success = test_connection()
    if success:
        print("🎉 Database connection test passed!")
    else:
        print("❌ Database connection test failed!")
        sys.exit(1) 