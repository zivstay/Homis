"""
Flask-Migrate configuration for database migrations.
This file sets up Flask-Migrate for handling database schema changes.
"""
import os
from flask import Flask
from flask_migrate import Migrate
from config import config
from postgres_models import db

def create_migrate_app():
    """Create Flask app with migration support"""
    app = Flask(__name__)
    
    # Load configuration
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    
    return app, migrate

# Create app and migrate instances
app, migrate = create_migrate_app()

if __name__ == '__main__':
    print("Flask-Migrate configuration loaded")
    print(f"Database URL: {app.config.get('SQLALCHEMY_DATABASE_URI')}")