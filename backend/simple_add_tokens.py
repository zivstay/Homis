#!/usr/bin/env python3
"""
Simple script to add push tokens without full config dependencies
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

# Create a minimal Flask app
app = Flask(__name__)

# Set minimal database configuration
DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:123456@localhost:5432/homis_db'
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db = SQLAlchemy(app)

# Define minimal models (just what we need)
class User(db.Model):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PushToken(db.Model):
    __tablename__ = 'push_tokens'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    expo_push_token = Column(String(500), nullable=False, unique=True)
    device_id = Column(String(255), nullable=False)
    device_name = Column(String(255), nullable=True)
    device_os = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def generate_expo_token():
    """Generate a sample Expo push token"""
    random_id = str(uuid.uuid4()).replace('-', '')[:22]
    return f"ExponentPushToken[{random_id}]"


def add_sample_tokens():
    """Add sample push tokens for testing"""
    with app.app_context():
        try:
            # Test database connection
            db.session.execute(db.text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Get first few active users
            users = User.query.filter_by(is_active=True).limit(3).all()
            
            if not users:
                print("❌ No active users found. Please create users first.")
                print("💡 You can create a user using the existing scripts in this directory.")
                return
            
            print(f"🔄 Adding push tokens for {len(users)} users...")
            
            added_count = 0
            for i, user in enumerate(users):
                # Generate unique token
                expo_token = generate_expo_token()
                device_id = f"device_{uuid.uuid4().hex[:8]}"
                
                # Check if token already exists
                existing = PushToken.query.filter_by(expo_push_token=expo_token).first()
                if existing:
                    print(f"⚠️ Token already exists, skipping: {expo_token}")
                    continue
                
                # Create push token
                push_token = PushToken(
                    user_id=user.id,
                    expo_push_token=expo_token,
                    device_id=device_id,
                    device_name=f"{user.first_name}'s Device",
                    device_os="iOS 15.0" if i % 2 == 0 else "Android 12",
                    is_active=True
                )
                
                db.session.add(push_token)
                print(f"✅ Added token for {user.first_name} {user.last_name}: {expo_token}")
                added_count += 1
            
            db.session.commit()
            print(f"\n🎉 Successfully added {added_count} push tokens!")
            
            # Show current count
            total_tokens = PushToken.query.filter_by(is_active=True).count()
            print(f"📊 Total active push tokens: {total_tokens}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            print("💡 Make sure your database is running and accessible.")


def list_tokens():
    """List all push tokens"""
    with app.app_context():
        try:
            tokens = PushToken.query.filter_by(is_active=True).all()
            print(f"\n🔔 Found {len(tokens)} active push tokens:")
            print("-" * 80)
            
            for token in tokens:
                user = User.query.get(token.user_id)
                user_name = f"{user.first_name} {user.last_name}" if user else "Unknown User"
                print(f"User: {user_name}")
                print(f"Token: {token.expo_push_token}")
                print(f"Device: {token.device_name} ({token.device_os})")
                print(f"Created: {token.created_at}")
                print("-" * 80)
                
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'list':
        list_tokens()
    else:
        add_sample_tokens()
