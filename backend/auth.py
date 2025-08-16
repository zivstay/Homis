from flask import request, jsonify, current_app
from functools import wraps
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, get_jwt_identity,
    verify_jwt_in_request, get_jwt
)
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import re
import os
import random
import threading
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from email_validator import validate_email, EmailNotValidError
from models import UserRole, BoardPermission
from postgres_models import PostgreSQLDatabaseManager

bcrypt = Bcrypt()

def init_auth(app):
    """Initialize authentication extensions"""
    bcrypt.init_app(app)

class AuthManager:
    def __init__(self, db_manager: PostgreSQLDatabaseManager):
        self.db = db_manager
        
        # Initialize email verification
        # Remove in-memory storage - now using database
        self._init_brevo_client()
        
    def _init_brevo_client(self):
        """Initialize Brevo API client"""
        try:
            brevo_api_key = os.getenv('BREVO_API_KEY')
            if not brevo_api_key:
                print("Warning: BREVO_API_KEY not found in environment variables")
                self.brevo_client = None
                return
                
            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = brevo_api_key
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
            self.brevo_client = api_instance
            print("✅ Brevo email client initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Brevo client: {e}")
            self.brevo_client = None

    def register_user(self, user_data: dict) -> dict:
        """Register a new user"""
        # Convert email to lowercase
        user_data['email'] = user_data['email'].lower()
        
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

        # Convert email to lowercase for login
        email = email.lower()

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

    def _generate_verification_code(self) -> str:
        """Generate a 5-digit verification code"""
        return str(random.randint(10000, 99999))
    
    def _send_verification_email(self, email: str, code: str, first_name: str) -> bool:
        """Send verification email via Brevo"""
        if not self.brevo_client:
            print("❌ Brevo client not initialized")
            return False
            
        try:
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": email, "name": first_name}],
                sender={"name": "Homis Team", "email": "sarusiziv96@gmail.com"},  # Update with your verified email
                subject="אימות אימייל - Homis",
                html_content=f"""
                <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #2c3e50;">ברוך הבא ל-Homis!</h2>
                    <p>שלום {first_name},</p>
                    <p>תודה על ההרשמה לאפליקציית Homis לניהול הוצאות משותפות.</p>
                    <p>הקוד שלך לאימות האימייל הוא:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #3498db; font-size: 48px; margin: 0; letter-spacing: 8px;">{code}</h1>
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px;">הקוד תקף למשך 5 דקות בלבד</p>
                    <p style="color: #e74c3c; font-size: 12px;">אם לא ביקשת הרשמה זו, אנא התעלם מהודעה זו</p>
                </div>
                """,
                text_content=f"""
                ברוך הבא ל-Homis!
                
                שלום {first_name},
                
                תודה על ההרשמה לאפליקציית Homis לניהול הוצאות משותפות.
                
                הקוד שלך לאימות האימייל הוא: {code}
                
                הקוד תקף למשך 5 דקות בלבד.
                
                אם לא ביקשת הרשמה זו, אנא התעלם מהודעה זו.
                """
            )
            
            api_response = self.brevo_client.send_transac_email(send_smtp_email)
            print(f"✅ Verification email sent successfully to {email}")
            return True
            
        except ApiException as e:
            print(f"❌ Failed to send verification email: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error sending email: {e}")
            return False
    
    def send_verification_code(self, user_data: dict) -> dict:
        """Send verification code for registration"""
        # Convert email to lowercase
        user_data['email'] = user_data['email'].lower()
        
        # Validate input
        validation_result = self._validate_user_data(user_data)
        if not validation_result['valid']:
            return validation_result

        # Check if user already exists in the main users table
        if self.db.get_user_by_email(user_data['email']):
            return {
                'valid': False,
                'error': 'Email already exists',
                'code': 409
            }

        if self.db.get_user_by_username(user_data['username']):
            return {
                'valid': False,
                'error': 'Username already exists',
                'code': 409
            }

        # Check if there's already a pending registration for this email
        existing_pending_email = self.db.get_pending_registration(user_data['email'])
        if existing_pending_email:
            # Delete the existing pending registration to start fresh
            self.db.delete_pending_registration(user_data['email'])
            print(f"🔄 Removed existing pending registration for email: {user_data['email']}")

        # Check if there's a pending registration with this username (but different email)
        existing_pending_username = self.db.get_pending_registration_by_username(user_data['username'])
        if existing_pending_username and existing_pending_username.email != user_data['email']:
            # Delete the existing pending registration with the same username
            self.db.delete_pending_registration(existing_pending_username.email)
            print(f"🔄 Removed existing pending registration for username: {user_data['username']} (email: {existing_pending_username.email})")

        # Generate verification code
        verification_code = self._generate_verification_code()
        expiry_time = datetime.now() + timedelta(minutes=5)
        
        # Hash password for storage
        password_hash = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')

        # Store pending registration
        self.db.create_pending_registration({
            'email': user_data['email'],
            'username': user_data['username'],
            'password_hash': password_hash,
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'verification_code': verification_code,
            'expiry_time': expiry_time.isoformat(),  # Convert to string
            'attempts': 0
        })

        # Send verification email
        email_sent = self._send_verification_email(
            user_data['email'], 
            verification_code, 
            user_data['first_name']
        )
        
        if not email_sent:
            # Remove from pending if email failed
            self.db.delete_pending_registration(user_data['email'])
            return {
                'valid': False,
                'error': 'Failed to send verification email',
                'code': 500
            }

        # Set up automatic cleanup
        def cleanup():
            self.db.delete_pending_registration(user_data['email'])
            print(f"🗑️ Auto-cleaned expired verification for {user_data['email']}")
        
        timer = threading.Timer(300.0, cleanup)  # 5 minutes
        timer.start()

        return {
            'valid': True,
            'message': 'Verification code sent to your email'
        }
    
    def verify_code_and_register(self, email: str, code: str) -> dict:
        """Verify code and complete registration"""
        # Convert email to lowercase
        email = email.lower()
        
        # Get pending registration
        pending_reg = self.db.get_pending_registration(email)
        if not pending_reg:
            return {
                'valid': False,
                'error': 'No pending registration found for this email',
                'code': 400
            }

        # Check if code expired
        expiry_time = datetime.fromisoformat(pending_reg.expiry_time)
        if datetime.now() > expiry_time:
            self.db.delete_pending_registration(email)
            return {
                'valid': False,
                'error': 'Verification code has expired',
                'code': 400
            }

        # Check verification code
        if pending_reg.verification_code != code:
            pending_reg.attempts += 1
            self.db.update_pending_registration_attempts(email, pending_reg.attempts)
            
            # Block after 3 failed attempts
            if pending_reg.attempts >= 3:
                self.db.delete_pending_registration(email)
                return {
                    'valid': False,
                    'error': 'Too many failed attempts. Please try again.',
                    'code': 400
                }
            
            return {
                'valid': False,
                'error': 'Invalid verification code',
                'code': 400
            }

        # Create user in database
        user = self.db.create_user({
            'email': pending_reg.email,
            'username': pending_reg.username,
            'password_hash': pending_reg.password_hash,
            'first_name': pending_reg.first_name,
            'last_name': pending_reg.last_name
        })

        # Clean up pending registration
        self.db.delete_pending_registration(email)

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
    
    def _send_password_reset_email(self, email: str, code: str, first_name: str) -> bool:
        """Send password reset email via Brevo"""
        if not self.brevo_client:
            print("❌ Brevo client not initialized")
            return False
            
        try:
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": email, "name": first_name}],
                sender={"name": "Homis Team", "email": "sarusiziv96@gmail.com"},
                subject="איפוס סיסמה - Homis",
                html_content=f"""
                <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #2c3e50;">איפוס סיסמה - Homis</h2>
                    <p>שלום {first_name},</p>
                    <p>קיבלנו בקשה לאיפוס סיסמה עבור החשבון שלך באפליקציית Homis.</p>
                    <p>הקוד שלך לאיפוס הסיסמה הוא:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #e74c3c; font-size: 48px; margin: 0; letter-spacing: 8px;">{code}</h1>
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px;">הקוד תקף למשך 10 דקות בלבד</p>
                    <p style="color: #e74c3c; font-size: 12px;">אם לא ביקשת איפוס סיסמה, אנא התעלם מהודעה זו</p>
                </div>
                """,
                text_content=f"""
                איפוס סיסמה - Homis
                
                שלום {first_name},
                
                קיבלנו בקשה לאיפוס סיסמה עבור החשבון שלך באפליקציית Homis.
                
                הקוד שלך לאיפוס הסיסמה הוא: {code}
                
                הקוד תקף למשך 10 דקות בלבד.
                
                אם לא ביקשת איפוס סיסמה, אנא התעלם מהודעה זו.
                """
            )
            
            api_response = self.brevo_client.send_transac_email(send_smtp_email)
            print(f"✅ Password reset email sent successfully to {email}")
            return True
            
        except ApiException as e:
            print(f"❌ Failed to send password reset email: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error sending password reset email: {e}")
            return False
    
    def request_password_reset(self, email: str) -> dict:
        """Request password reset by sending verification code"""
        try:
            # Convert email to lowercase
            email = email.lower()
            
            # Validate email
            try:
                validate_email(email)
            except EmailNotValidError:
                return {
                    'valid': False,
                    'error': 'Invalid email format',
                    'code': 400
                }

            # Check if user exists
            user = self.db.get_user_by_email(email)
            if not user:
                return {
                    'valid': False,
                    'error': 'User not found',
                    'code': 404
                }

            # Generate reset code
            reset_code = self._generate_verification_code()

            # Store reset request in database (using pending registrations table for simplicity)
            # We'll store password reset requests with a special prefix
            reset_data = {
                'email': email,
                'verification_code': reset_code,
                'expiry_time': (datetime.now() + timedelta(minutes=10)).isoformat(),  # 10 minutes
                'attempts': 0,
                'is_password_reset': True  # Flag to differentiate from registration
            }

            # Clean up any existing reset requests for this email
            self.db.delete_pending_registration(f"reset_{email}")
            
            # Store the reset request
            self.db.store_pending_registration(f"reset_{email}", reset_data)

            # Send reset email
            email_sent = self._send_password_reset_email(email, reset_code, user.first_name)

            if not email_sent:
                # Clean up if email failed
                self.db.delete_pending_registration(f"reset_{email}")
                return {
                    'valid': False,
                    'error': 'Failed to send reset email',
                    'code': 500
                }

            return {
                'valid': True,
                'message': 'Password reset code sent to your email'
            }

        except Exception as e:
            print(f"❌ Error in request_password_reset: {e}")
            return {
                'valid': False,
                'error': 'Server error',
                'code': 500
            }

    def verify_reset_code(self, email: str, code: str) -> dict:
        """Verify password reset code"""
        try:
            # Convert email to lowercase
            email = email.lower()
            
            # Get reset request
            reset_request = self.db.get_pending_registration(f"reset_{email}")
            if not reset_request:
                return {
                    'valid': False,
                    'error': 'No reset request found',
                    'code': 404
                }

            # Check if code expired
            expiry_time = datetime.fromisoformat(reset_request.expiry_time)
            if datetime.now() > expiry_time:
                self.db.delete_pending_registration(f"reset_{email}")
                return {
                    'valid': False,
                    'error': 'Reset code has expired',
                    'code': 400
                }

            # Check verification code
            if reset_request.verification_code != code:
                reset_request.attempts += 1
                self.db.update_pending_registration_attempts(f"reset_{email}", reset_request.attempts)
                
                # Block after 3 failed attempts
                if reset_request.attempts >= 3:
                    self.db.delete_pending_registration(f"reset_{email}")
                    return {
                        'valid': False,
                        'error': 'Too many failed attempts. Please try again.',
                        'code': 400
                    }
                
                return {
                    'valid': False,
                    'error': 'Invalid reset code',
                    'code': 400
                }

            return {
                'valid': True,
                'message': 'Reset code verified successfully'
            }

        except Exception as e:
            print(f"❌ Error in verify_reset_code: {e}")
            return {
                'valid': False,
                'error': 'Server error',
                'code': 500
            }

    def reset_password(self, email: str, code: str, new_password: str) -> dict:
        """Reset password after verifying code"""
        try:
            # Convert email to lowercase
            email = email.lower()
            
            # First verify the code again
            verification_result = self.verify_reset_code(email, code)
            if not verification_result['valid']:
                return verification_result

            # Validate new password
            if len(new_password) < 6:
                return {
                    'valid': False,
                    'error': 'Password must be at least 6 characters long',
                    'code': 400
                }

            # Get user
            user = self.db.get_user_by_email(email)
            if not user:
                return {
                    'valid': False,
                    'error': 'User not found',
                    'code': 404
                }

            # Hash new password
            new_password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')

            # Update password in database
            success = self.db.update_user_password(user.id, new_password_hash)
            if not success:
                return {
                    'valid': False,
                    'error': 'Failed to update password',
                    'code': 500
                }

            # Clean up reset request
            self.db.delete_pending_registration(f"reset_{email}")

            return {
                'valid': True,
                'message': 'Password reset successfully'
            }

        except Exception as e:
            print(f"❌ Error in reset_password: {e}")
            return {
                'valid': False,
                'error': 'Server error',
                'code': 500
            }

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