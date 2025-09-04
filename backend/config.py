import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)  # Extended from 24 hours to 7 days
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Database settings - PostgreSQL only
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    # Fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
        # Also try alternative PostgreSQL drivers if the main one fails
        print(f"🔧 Using database URL: {DATABASE_URL}")
    else:
        print("⚠️  No DATABASE_URL found!")
    
    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'sslmode': 'require'
        }
    }
    
    # Rate limiting
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT', "200 per day;50 per hour")
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', "memory://")
    
    print(f"🔧 Config: RATELIMIT_DEFAULT = '{RATELIMIT_DEFAULT}'")
    print(f"🔧 Config: RATELIMIT_STORAGE_URL = '{RATELIMIT_STORAGE_URL}'")
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Security settings
    BCRYPT_LOG_ROUNDS = 12
    
    # App settings
    MAX_BOARDS_PER_USER = 10
    MAX_USERS_PER_BOARD = 20
    MAX_EXPENSES_PER_BOARD = 1000
    # Backblaze B2 settings
    B2_APPLICATION_KEY_ID = os.environ.get('B2_APPLICATION_KEY_ID')
    B2_APPLICATION_KEY = os.environ.get('B2_APPLICATION_KEY')
    B2_BUCKET_NAME = os.environ.get('B2_BUCKET_NAME')
    B2_BUCKET_ID = os.environ.get('B2_BUCKET_ID')
    B2_ENDPOINT_URL = os.environ.get('B2_ENDPOINT_URL')  # Optional: Custom endpoint
    
    # Validate required B2 settings
    if not all([B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME]):
        raise ValueError("Required B2 settings missing. B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME must be set.")
    # File upload settings
    UPLOAD_METHOD = os.environ.get('UPLOAD_METHOD', 'b2')  # 'local' or 'b2'
    
    # Image compression settings
    IMAGE_MAX_WIDTH = int(os.environ.get('IMAGE_MAX_WIDTH', 1200))
    IMAGE_MAX_HEIGHT = int(os.environ.get('IMAGE_MAX_HEIGHT', 1200))
    IMAGE_QUALITY = int(os.environ.get('IMAGE_QUALITY', 85))
    IMAGE_MAX_FILE_SIZE = int(os.environ.get('IMAGE_MAX_FILE_SIZE', 10 * 1024 * 1024))  # 10MB

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    # Development fallback for DATABASE_URL
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:123456@localhost:5432/homis_db'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    # In production, these should be set via environment variables
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    # Require DATABASE_URL in production
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required in production.")
    
    # Fix for Heroku DATABASE_URL (postgres:// -> postgresql://)
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    
    # Additional fix for SQLAlchemy engine options
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'sslmode': 'require'
        }
    }

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    # Override the DATABASE_URL check for testing
    DATABASE_URL = os.environ.get('TEST_DATABASE_URL') or 'postgresql://postgres:123456@localhost:5432/homis_test_db'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 