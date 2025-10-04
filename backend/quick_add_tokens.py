#!/usr/bin/env python3
"""
Quick script to add sample push tokens to the database
"""

import os
import sys
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from postgres_models import db, User, PushToken
from flask import Flask
from config import Config


def create_app():
    """Create Flask app"""
    app = Flask(__name__)
    config_class = Config()
    app.config.from_object(config_class)
    db.init_app(app)
    return app


def generate_expo_token():
    """Generate a sample Expo push token"""
    random_id = str(uuid.uuid4()).replace('-', '')[:22]
    return f"ExponentPushToken[{random_id}]"


def add_sample_tokens():
    """Add sample push tokens for testing"""
    app = create_app()
    
    with app.app_context():
        try:
            # Get first few active users
            users = User.query.filter_by(is_active=True).limit(3).all()
            
            if not users:
                print("❌ No active users found. Please create users first.")
                return
            
            print(f"🔄 Adding push tokens for {len(users)} users...")
            
            for i, user in enumerate(users):
                # Generate unique token
                expo_token = generate_expo_token()
                device_id = f"device_{uuid.uuid4().hex[:8]}"
                
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
            
            db.session.commit()
            print(f"\n🎉 Successfully added {len(users)} push tokens!")
            
            # Show current count
            total_tokens = PushToken.query.filter_by(is_active=True).count()
            print(f"📊 Total active push tokens: {total_tokens}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")


if __name__ == '__main__':
    add_sample_tokens()
