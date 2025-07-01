import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Database settings
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'expenses_db.json'
    
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

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    # In production, these should be set via environment variables
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DATABASE_PATH = 'test_expenses_db.json'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 