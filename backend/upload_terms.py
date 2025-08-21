#!/usr/bin/env python3
"""
Terms Upload Script for Homis Backend

This script uploads new terms and conditions to the database.
It reads Hebrew and English HTML files and creates a new version in the database.

Usage:
    python upload_terms.py --hebrew /path/to/hebrew.html --english /path/to/english.html [--title "Terms Title"] [--description "Change description"]

Example:
    python upload_terms.py --hebrew terms_he.html --english terms_en.html --title "Terms of Service v2.0" --description "Updated privacy policy section"
"""

import os
import sys
import argparse
from datetime import datetime
from flask import Flask
from config import DevelopmentConfig, ProductionConfig
from postgres_models import db as postgres_db, TermsVersion, User

def create_app():
    """Create Flask app for database operations"""
    app = Flask(__name__)
    
    # Determine which config to use
    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)
    
    # Additional fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
    if app.config.get('DATABASE_URL') and app.config.get('DATABASE_URL').startswith('postgres://'):
        fixed_url = app.config.get('DATABASE_URL').replace('postgres://', 'postgresql://', 1)
        app.config['DATABASE_URL'] = fixed_url
        app.config['SQLALCHEMY_DATABASE_URI'] = fixed_url
    
    postgres_db.init_app(app)
    return app

def get_next_version_number(app):
    """Get the next version number for terms"""
    with app.app_context():
        try:
            latest_version = TermsVersion.query.order_by(TermsVersion.version_number.desc()).first()
            if latest_version:
                return latest_version.version_number + 1
            else:
                return 1
        except Exception as e:
            print(f"Error getting latest version: {e}")
            return 1

def get_admin_user_id(app):
    """Get the first admin/owner user ID for created_by field"""
    with app.app_context():
        try:
            # Try to find an admin user first
            admin_user = User.query.filter_by(is_active=True).first()
            if admin_user:
                return admin_user.id
            else:
                print("❌ No active users found in database")
                return None
        except Exception as e:
            print(f"Error finding admin user: {e}")
            return None

def read_html_file(file_path):
    """Read HTML content from file"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not content.strip():
            raise ValueError(f"File is empty: {file_path}")
        
        return content
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return None

def upload_terms(hebrew_file, english_file, title=None, description=None):
    """Upload new terms and conditions to database"""
    print("🔧 Terms Upload Script for Homis Backend")
    print("=" * 50)
    
    # Validate input files
    if not hebrew_file or not english_file:
        print("❌ Both Hebrew and English files are required")
        return False
    
    print(f"📁 Hebrew file: {hebrew_file}")
    print(f"📁 English file: {english_file}")
    
    # Read HTML content
    print("\n📖 Reading HTML files...")
    hebrew_content = read_html_file(hebrew_file)
    if not hebrew_content:
        return False
    
    english_content = read_html_file(english_file)
    if not english_content:
        return False
    
    print(f"✅ Hebrew content: {len(hebrew_content)} characters")
    print(f"✅ English content: {len(english_content)} characters")
    
    # Create Flask app and get database connection
    print("\n🔧 Connecting to database...")
    app = create_app()
    
    with app.app_context():
        try:
            # Get next version number
            version_number = get_next_version_number(app)
            print(f"🔢 Next version number: {version_number}")
            
            # Get admin user ID
            admin_user_id = get_admin_user_id(app)
            if not admin_user_id:
                print("❌ Cannot proceed without a valid user ID")
                return False
            
            print(f"👤 Using user ID: {admin_user_id}")
            
            # Set default title if not provided
            if not title:
                title = f"Terms of Service v{version_number}.0"
            
            # Create new terms version
            print(f"\n📝 Creating new terms version...")
            print(f"📌 Title: {title}")
            print(f"📌 Version: {version_number}")
            if description:
                print(f"📌 Description: {description}")
            
            new_terms = TermsVersion(
                version_number=version_number,
                title=title,
                content_hebrew=hebrew_content,
                content_english=english_content,
                created_by=admin_user_id,
                is_active=True,
                change_description=description
            )
            
            # Deactivate previous versions (only one active version at a time)
            print("🔄 Deactivating previous versions...")
            TermsVersion.query.update({'is_active': False})
            
            # Add new version
            postgres_db.session.add(new_terms)
            postgres_db.session.commit()
            
            print(f"✅ Terms version {version_number} uploaded successfully!")
            print(f"🆔 Terms ID: {new_terms.id}")
            print(f"📅 Created at: {new_terms.created_at}")
            
            # Verify upload
            print("\n🔍 Verifying upload...")
            uploaded_terms = TermsVersion.query.filter_by(version_number=version_number).first()
            if uploaded_terms:
                print(f"✅ Verification successful!")
                print(f"   - ID: {uploaded_terms.id}")
                print(f"   - Version: {uploaded_terms.version_number}")
                print(f"   - Title: {uploaded_terms.title}")
                print(f"   - Active: {uploaded_terms.is_active}")
                print(f"   - Hebrew content: {len(uploaded_terms.content_hebrew)} chars")
                print(f"   - English content: {len(uploaded_terms.content_english)} chars")
                
                if uploaded_terms.change_description:
                    print(f"   - Description: {uploaded_terms.change_description}")
            else:
                print("❌ Verification failed - terms not found in database")
                return False
            
            print("\n🎉 Upload completed successfully!")
            print(f"🌐 Terms are now available at:")
            print(f"   - Hebrew: /terms/he")
            print(f"   - English: /terms/en")
            print(f"   - Default: /terms")
            
            return True
            
        except Exception as e:
            print(f"❌ Error uploading terms: {e}")
            postgres_db.session.rollback()
            import traceback
            traceback.print_exc()
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Upload new terms and conditions to Homis database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python upload_terms.py --hebrew terms_he.html --english terms_en.html
  python upload_terms.py --hebrew terms_he.html --english terms_en.html --title "Terms v2.0"
  python upload_terms.py --hebrew terms_he.html --english terms_en.html --title "Terms v2.0" --description "Updated privacy section"
        """
    )
    
    parser.add_argument('--hebrew', '-he', required=True,
                      help='Path to Hebrew HTML file')
    parser.add_argument('--english', '-en', required=True,
                      help='Path to English HTML file')
    parser.add_argument('--title', '-t',
                      help='Title for the terms version (default: auto-generated)')
    parser.add_argument('--description', '-d',
                      help='Description of changes in this version')
    
    args = parser.parse_args()
    
    # Check if files exist
    if not os.path.exists(args.hebrew):
        print(f"❌ Hebrew file not found: {args.hebrew}")
        sys.exit(1)
    
    if not os.path.exists(args.english):
        print(f"❌ English file not found: {args.english}")
        sys.exit(1)
    
    # Upload terms
    success = upload_terms(
        hebrew_file=args.hebrew,
        english_file=args.english,
        title=args.title,
        description=args.description
    )
    
    if success:
        print("\n✨ All done! Your new terms are now live.")
        sys.exit(0)
    else:
        print("\n💥 Upload failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
