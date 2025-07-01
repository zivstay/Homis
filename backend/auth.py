from flask import request, jsonify, current_app
from functools import wraps
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, get_jwt_identity,
    verify_jwt_in_request, get_jwt
)
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import re
from email_validator import validate_email, EmailNotValidError
from models import DatabaseManager, UserRole, BoardPermission

bcrypt = Bcrypt()

def init_auth(app):
    """Initialize authentication extensions"""
    bcrypt.init_app(app)

class AuthManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def register_user(self, user_data: dict) -> dict:
        """Register a new user"""
        # Validate input
        validation_result = self._validate_user_data(user_data)
        if not validation_result['valid']:
            return validation_result

        # Check if user already exists
        if self.db.get_user_by_email(user_data['email']):
            return {
                'valid': False,
                'error': 'User with this email already exists',
                'code': 409
            }

        if self.db.get_user_by_username(user_data['username']):
            return {
                'valid': False,
                'error': 'Username already taken',
                'code': 409
            }

        # Hash password
        password_hash = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')

        # Create user
        user = self.db.create_user({
            'email': user_data['email'],
            'username': user_data['username'],
            'password_hash': password_hash,
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name']
        })

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return {
            'valid': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }

    def login_user(self, credentials: dict) -> dict:
        """Authenticate user and return tokens"""
        email = credentials.get('email')
        password = credentials.get('password')

        if not email or not password:
            return {
                'valid': False,
                'error': 'Email and password are required',
                'code': 400
            }

        # Find user by email
        user = self.db.get_user_by_email(email)
        if not user:
            return {
                'valid': False,
                'error': 'Invalid email or password',
                'code': 401
            }

        # Check if user is active
        if not user.is_active:
            return {
                'valid': False,
                'error': 'Account is deactivated',
                'code': 403
            }

        # Verify password
        if not bcrypt.check_password_hash(user.password_hash, password):
            return {
                'valid': False,
                'error': 'Invalid email or password',
                'code': 401
            }

        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return {
            'valid': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }

    def refresh_token(self) -> dict:
        """Refresh access token"""
        try:
            current_user_id = get_jwt_identity()
            user = self.db.get_user_by_id(current_user_id)
            
            if not user or not user.is_active:
                return {
                    'valid': False,
                    'error': 'User not found or inactive',
                    'code': 401
                }

            new_access_token = create_access_token(identity=current_user_id)
            
            return {
                'valid': True,
                'access_token': new_access_token
            }
        except Exception as e:
            return {
                'valid': False,
                'error': 'Invalid refresh token',
                'code': 401
            }

    def get_current_user(self) -> dict:
        """Get current authenticated user"""
        try:
            current_user_id = get_jwt_identity()
            user = self.db.get_user_by_id(current_user_id)
            
            if not user:
                return {
                    'valid': False,
                    'error': 'User not found',
                    'code': 404
                }

            return {
                'valid': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'created_at': user.created_at,
                    'is_active': user.is_active,
                    'email_verified': user.email_verified,
                    'avatar_url': user.avatar_url
                }
            }
        except Exception as e:
            return {
                'valid': False,
                'error': 'Authentication required',
                'code': 401
            }

    def change_password(self, user_id: str, old_password: str, new_password: str) -> dict:
        """Change user password"""
        user = self.db.get_user_by_id(user_id)
        if not user:
            return {
                'valid': False,
                'error': 'User not found',
                'code': 404
            }

        # Verify old password
        if not bcrypt.check_password_hash(user.password_hash, old_password):
            return {
                'valid': False,
                'error': 'Current password is incorrect',
                'code': 400
            }

        # Validate new password
        if len(new_password) < 8:
            return {
                'valid': False,
                'error': 'Password must be at least 8 characters long',
                'code': 400
            }

        # Hash new password
        new_password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        # Update password
        success = self.db.update_user(user_id, {'password_hash': new_password_hash})
        
        if success:
            return {
                'valid': True,
                'message': 'Password changed successfully'
            }
        else:
            return {
                'valid': False,
                'error': 'Failed to update password',
                'code': 500
            }

    def _validate_user_data(self, user_data: dict) -> dict:
        """Validate user registration data"""
        required_fields = ['email', 'username', 'password', 'first_name', 'last_name']
        
        for field in required_fields:
            if field not in user_data or not user_data[field]:
                return {
                    'valid': False,
                    'error': f'{field.replace("_", " ").title()} is required',
                    'code': 400
                }

        # Validate email
        try:
            validate_email(user_data['email'])
        except EmailNotValidError:
            return {
                'valid': False,
                'error': 'Invalid email address',
                'code': 400
            }

        # Validate username
        if len(user_data['username']) < 3:
            return {
                'valid': False,
                'error': 'Username must be at least 3 characters long',
                'code': 400
            }

        if not re.match(r'^[a-zA-Z0-9_]+$', user_data['username']):
            return {
                'valid': False,
                'error': 'Username can only contain letters, numbers, and underscores',
                'code': 400
            }

        # Validate password
        if len(user_data['password']) < 8:
            return {
                'valid': False,
                'error': 'Password must be at least 8 characters long',
                'code': 400
            }

        # Validate names
        if len(user_data['first_name']) < 2:
            return {
                'valid': False,
                'error': 'First name must be at least 2 characters long',
                'code': 400
            }

        if len(user_data['last_name']) < 2:
            return {
                'valid': False,
                'error': 'Last name must be at least 2 characters long',
                'code': 400
            }

        return {'valid': True}

# Decorators for route protection
def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        print("🔐 Auth: require_auth decorator called")
        print("🔐 Auth: Request headers:", dict(request.headers))
        
        # Allow OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            print("🔐 Auth: OPTIONS request, allowing without auth")
            return f(*args, **kwargs)
            
        try:
            verify_jwt_in_request()
            print("🔐 Auth: JWT verification successful")
            return f(*args, **kwargs)
        except Exception as e:
            print("🔐 Auth: JWT verification failed:", str(e))
            return jsonify({'error': 'Authentication required'}), 401
    return decorated_function

def require_board_access(permission: str = BoardPermission.READ.value):
    """Decorator to require board access with specific permission"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                board_id = kwargs.get('board_id') or request.args.get('board_id') or request.json.get('board_id')
                
                if not board_id:
                    return jsonify({'error': 'Board ID is required'}), 400

                # Check if user has access to the board
                if not current_app.db_manager.user_has_permission(current_user_id, board_id, permission):
                    return jsonify({'error': 'Insufficient permissions'}), 403

                return f(*args, **kwargs)
            except Exception:
                return jsonify({'error': 'Authentication required'}), 401
        return decorated_function
    return decorator

def require_board_owner(f):
    """Decorator to require board ownership"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            board_id = kwargs.get('board_id') or request.args.get('board_id') or request.json.get('board_id')
            
            if not board_id:
                return jsonify({'error': 'Board ID is required'}), 400

            # Check if user is board owner
            if not current_app.db_manager.user_has_permission(current_user_id, board_id, BoardPermission.OWNER.value):
                return jsonify({'error': 'Board ownership required'}), 403

            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401
    return decorated_function

def require_board_admin(f):
    """Decorator to require board admin permissions"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            board_id = kwargs.get('board_id') or request.args.get('board_id') or request.json.get('board_id')
            
            if not board_id:
                return jsonify({'error': 'Board ID is required'}), 400

            # Check if user has admin permissions
            if not current_app.db_manager.user_has_permission(current_user_id, board_id, BoardPermission.ADMIN.value):
                return jsonify({'error': 'Admin permissions required'}), 403

            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401
    return decorated_function 