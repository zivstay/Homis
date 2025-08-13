import logging as logger
import traceback

from flask import Flask, request, jsonify, current_app, send_from_directory, Response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import os
import uuid
import logging
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from config import config
from models import DatabaseManager, UserRole, BoardPermission
from auth import AuthManager, require_auth, require_board_access, require_board_owner, require_board_admin
from b2_storage import create_b2_service

# Load environment variables
load_dotenv()

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_upload_folders():
    """Create upload directories if they don't exist"""
    upload_dir = os.path.join(os.getcwd(), UPLOAD_FOLDER)
    expense_images_dir = os.path.join(upload_dir, 'expense_images')
    
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(expense_images_dir, exist_ok=True)
    
    return upload_dir, expense_images_dir



def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    CORS(app, 
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    print("🔧 Backend: Initializing JWT with secret:", app.config['JWT_SECRET_KEY'][:10] + "...")
    jwt = JWTManager(app)
    
    # Temporarily disable rate limiter to fix the issue
    # limiter = Limiter(
    #     app=app,
    #     key_func=get_remote_address,
    #     default_limits=app.config['RATELIMIT_DEFAULT'],
    #     storage_uri=app.config['RATELIMIT_STORAGE_URL']
    # )
    
    # Initialize database
    db_manager = DatabaseManager(app.config['DATABASE_PATH'])
    db_manager.initialize_default_data()
    
    # Clean up expired pending registrations on startup
    db_manager.cleanup_expired_pending_registrations()
    
    app.db_manager = db_manager
    
    # Initialize auth
    auth_manager = AuthManager(db_manager)
    app.auth_manager = auth_manager
    
    # Initialize storage services
    upload_dir, expense_images_dir = create_upload_folders()
    app.config['UPLOAD_FOLDER'] = upload_dir
    app.config['EXPENSE_IMAGES_FOLDER'] = expense_images_dir
    
    # Initialize B2 storage service if configured
    b2_service = None
    if app.config.get('UPLOAD_METHOD') == 'b2':
        b2_service = create_b2_service(app.config)
        if b2_service:
            print("🚀 B2 Storage Service initialized successfully")
        else:
            print("⚠️  B2 Storage Service failed to initialize, falling back to local storage")
    
    app.b2_service = b2_service
    
    # File upload function
    def upload_expense_image(file, user_id):
        """Upload expense image and return the file URL"""
        if not file or not allowed_file(file.filename):
            return None
        
        # Try B2 storage first if available and configured
        if app.config.get('UPLOAD_METHOD') == 'b2' and app.b2_service:
            try:
                success, file_url, error = app.b2_service.upload_file(file, 'expense_images', user_id)
                if success:
                    print(f"✅ Successfully uploaded to B2: {file_url}")
                    return file_url
                else:
                    print(f"❌ B2 upload failed: {error}, falling back to local storage")
            except Exception as e:
                print(f"❌ B2 upload exception: {e}, falling back to local storage")
        
        # Fallback to local storage
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
        
        # Save file locally
        file_path = os.path.join(app.config['EXPENSE_IMAGES_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Return URL path for accessing the image
        return f"/api/uploads/expense_images/{unique_filename}"
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({'error': 'Rate limit exceeded'}), 429

    # Health check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Expense Manager API is running',
            'timestamp': datetime.now().isoformat()
        })

    # Test endpoint for debugging image issues
    @app.route('/api/test-image', methods=['GET'])
    @require_auth
    def test_image_endpoint():
        """Test endpoint to verify connectivity"""
        print(f"🔍 === TEST IMAGE ENDPOINT CALLED ===")
        print(f"🔍 Request URL: {request.url}")
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Request headers: {dict(request.headers)}")
        return jsonify({
            'message': 'Test endpoint working',
            'timestamp': datetime.now().isoformat(),
            'user': auth_manager.get_current_user()['user']['id']
        })

    # Test endpoint to check route pattern
    @app.route('/api/expenses/<expense_id>/test', methods=['GET'])
    def test_expense_route(expense_id):
        """Test expense route pattern"""
        print(f"🔍 === EXPENSE ROUTE TEST CALLED ===")
        print(f"🔍 Expense ID: {expense_id}")
        print(f"🔍 Request URL: {request.url}")
        return jsonify({
            'message': 'Expense route test working',
            'expense_id': expense_id,
            'timestamp': datetime.now().isoformat()
        })

    # Authentication routes
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        """Register a new user"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = auth_manager.register_user(data)
        
        if result['valid']:
            return jsonify(result), 201
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        """Login user"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = auth_manager.login_user(data)
        
        if result['valid']:
            return jsonify(result), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/refresh', methods=['POST'])
    @jwt_required(refresh=True)
    def refresh():
        """Refresh access token"""
        result = auth_manager.refresh_token()
        
        if result['valid']:
            return jsonify(result), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/me', methods=['GET'])
    @require_auth
    def get_current_user():
        """Get current user information"""
        result = auth_manager.get_current_user()
        
        if result['valid']:
            return jsonify(result), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/change-password', methods=['POST'])
    @require_auth
    def change_password():
        """Change user password"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        result = auth_manager.change_password(
            current_user_id,
            data.get('current_password'),
            data.get('new_password')
        )
        
        if result['valid']:
            return jsonify({'message': 'Password changed successfully'}), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    # Email verification endpoints
    @app.route('/api/auth/send-verification', methods=['POST'])
    def send_verification():
        """Send verification code for registration"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = auth_manager.send_verification_code(data)
        
        if result['valid']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/verify-and-register', methods=['POST'])
    def verify_and_register():
        """Verify code and complete registration"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return jsonify({'error': 'Email and verification code are required'}), 400
        
        result = auth_manager.verify_code_and_register(email, code)
        
        if result['valid']:
            return jsonify(result), 201
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    # Password reset endpoints
    @app.route('/api/auth/request-password-reset', methods=['POST'])
    def request_password_reset():
        """Request password reset by sending verification code"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        result = auth_manager.request_password_reset(email)
        
        if result['valid']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/verify-reset-code', methods=['POST'])
    def verify_reset_code():
        """Verify password reset code"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        code = data.get('code')
        
        if not email or not code:
            return jsonify({'error': 'Email and verification code are required'}), 400
        
        result = auth_manager.verify_reset_code(email, code)
        
        if result['valid']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    @app.route('/api/auth/reset-password', methods=['POST'])
    def reset_password():
        """Reset password with verified code"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        code = data.get('code')
        new_password = data.get('new_password')
        
        if not email or not code or not new_password:
            return jsonify({'error': 'Email, code, and new password are required'}), 400
        
        result = auth_manager.reset_password(email, code, new_password)
        
        if result['valid']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    # Board routes
    @app.route('/api/boards', methods=['GET', 'OPTIONS'])
    @require_auth
    def get_user_boards():
        """Get all boards for the current user"""
        try:
            current_user_id = auth_manager.get_current_user()['user']['id']
            boards = db_manager.get_user_boards(current_user_id)
            
            board_list = []
            for board in boards:
                board_dict = {
                    'id': board.id,
                    'name': board.name,
                    'description': board.description,
                    'owner_id': board.owner_id,
                    'created_at': board.created_at,
                    'updated_at': board.updated_at,
                    'currency': board.currency,
                    'timezone': board.timezone,
                    'board_type': board.board_type,
                    'is_default_board': getattr(board, 'is_default_board', False),
                    'user_role': getattr(board, 'user_role', 'member')
                }
                
                # Get member count for each board
                members = db_manager.get_board_members(board.id)
                board_dict['member_count'] = len(members)
                
                board_list.append(board_dict)
            
            return jsonify({'boards': board_list}), 200
        except Exception as e:
            print(f"Error getting boards: {e}")
            logger.error(traceback.format_exc())
            return jsonify({'error': 'Failed to get boards'}), 500

    @app.route('/api/boards', methods=['POST'])
    @require_auth
    def create_board():
        """Create a new board"""
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Board name is required'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        # Check board limit
        user_boards = db_manager.get_user_boards(current_user_id)
        if len(user_boards) >= app.config['MAX_BOARDS_PER_USER']:
            return jsonify({'error': 'Maximum number of boards reached'}), 400
        
        board_data = {
            'name': data['name'],
            'description': data.get('description', ''),
            'owner_id': current_user_id,
            'currency': data.get('currency', 'ILS'),
            'timezone': data.get('timezone', 'Asia/Jerusalem'),
            'settings': data.get('settings', {}),
            'board_type': data.get('board_type', 'general')
        }
        
        board = db_manager.create_board(board_data)
        
        # Handle custom categories if provided
        custom_categories = data.get('custom_categories', [])
        if custom_categories and len(custom_categories) > 0:
            print(f"📋 Creating {len(custom_categories)} custom categories for board {board.id}")
            for category_data in custom_categories:
                category_info = {
                    'board_id': board.id,
                    'name': category_data.get('name'),
                    'icon': category_data.get('icon', 'ellipsis-horizontal'),
                    'color': category_data.get('color', '#9370DB'),
                    'created_by': current_user_id,
                    'is_default': False
                }
                try:
                    db_manager.create_category(category_info)
                    print(f"✅ Created custom category: {category_info['name']}")
                except Exception as e:
                    print(f"❌ Failed to create custom category {category_info['name']}: {str(e)}")
        
        return jsonify({
            'id': board.id,
            'name': board.name,
            'description': board.description,
            'owner_id': board.owner_id,
            'created_at': board.created_at,
            'currency': board.currency,
            'timezone': board.timezone,
            'board_type': board.board_type
        }), 201

    @app.route('/api/boards/<board_id>', methods=['GET'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def get_board(board_id):
        """Get board details"""
        board = db_manager.get_board_by_id(board_id)
        if not board:
            return jsonify({'error': 'Board not found'}), 404
        
        members = db_manager.get_board_members(board_id)
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        return jsonify({
            'id': board.id,
            'name': board.name,
            'description': board.description,
            'owner_id': board.owner_id,
            'created_at': board.created_at,
            'updated_at': board.updated_at,
            'currency': board.currency,
            'timezone': board.timezone,
            'board_type': board.board_type,
            'settings': board.settings,
            'members': [
                {
                    'id': member.id,
                    'user_id': member.user_id,
                    'role': member.role,
                    'joined_at': member.joined_at,
                    'permissions': member.permissions
                } for member in members
            ],
            'user_role': db_manager.get_user_role_in_board(current_user_id, board_id)
        }), 200

    @app.route('/api/boards/<board_id>', methods=['PUT'])
    @require_auth
    @require_board_admin
    def update_board(board_id):
        """Update board details"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        board = db_manager.get_board_by_id(board_id)
        if not board:
            return jsonify({'error': 'Board not found'}), 404
        
        update_data = {}
        allowed_fields = ['name', 'description', 'currency', 'timezone', 'settings']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            success = db_manager.update_board(board_id, update_data)
            if success:
                updated_board = db_manager.get_board_by_id(board_id)
                return jsonify({
                    'id': updated_board.id,
                    'name': updated_board.name,
                    'description': updated_board.description,
                    'owner_id': updated_board.owner_id,
                    'created_at': updated_board.created_at,
                    'updated_at': updated_board.updated_at,
                    'currency': updated_board.currency,
                    'timezone': updated_board.timezone,
                    'settings': updated_board.settings
                }), 200
        
        return jsonify({'error': 'No valid fields to update'}), 400

    @app.route('/api/boards/<board_id>', methods=['DELETE'])
    @require_auth
    @require_board_owner
    def delete_board(board_id):
        """Delete board"""
        board = db_manager.get_board_by_id(board_id)
        if not board:
            return jsonify({'error': 'Board not found'}), 404
        
        success = db_manager.delete_board(board_id)
        if success:
            return jsonify({'message': 'Board deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete board'}), 500

    # Board member routes
    @app.route('/api/boards/<board_id>/members', methods=['GET'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def get_board_members(board_id):
        """Get board members"""
        members = db_manager.get_board_members(board_id)
        print(f"🔍 Board {board_id} has {len(members)} members:")
        for member in members:
            user = db_manager.get_user_by_id(member.user_id)
            if user:
                print(f"🔍 Member: {user.first_name} {user.last_name} (ID: {user.id}, Role: {member.role})")
        
        member_list = []
        for member in members:
            user = db_manager.get_user_by_id(member.user_id)
            if user:
                member_list.append({
                    'id': member.id,
                    'user_id': member.user_id,
                    'role': member.role,
                    'joined_at': member.joined_at,
                    'permissions': member.permissions,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'username': user.username,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'avatar_url': user.avatar_url
                    }
                })
        
        return jsonify({'members': member_list}), 200

    @app.route('/api/boards/<board_id>/members', methods=['POST'])
    @require_auth
    @require_board_admin
    def invite_member(board_id):
        """Invite a member to the board"""
        data = request.get_json()
        if not data or not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400
        
        board = db_manager.get_board_by_id(board_id)
        if not board:
            return jsonify({'error': 'Board not found'}), 404
        
        # Check member limit
        current_members = db_manager.get_board_members(board_id)
        if len(current_members) >= app.config['MAX_USERS_PER_BOARD']:
            return jsonify({'error': 'Maximum number of members reached'}), 400
        
        # Check if user already exists
        user = db_manager.get_user_by_email(data['email'])
        if user:
            # User exists, add them directly
            member = db_manager.add_board_member(
                board_id=board_id,
                user_id=user.id,
                role=data.get('role', UserRole.MEMBER.value),
                invited_by=auth_manager.get_current_user()['user']['id']
            )
            return jsonify({
                'message': 'Member added successfully',
                'member_id': member.id
            }), 201
        else:
            # User doesn't exist, create invitation
            invitation_data = {
                'board_id': board_id,
                'email': data['email'],
                'invited_by': auth_manager.get_current_user()['user']['id'],
                'role': data.get('role', UserRole.MEMBER.value),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            invitation = db_manager.create_invitation(invitation_data)
            return jsonify({
                'message': 'Invitation sent successfully',
                'invitation_id': invitation.id
            }), 201

    @app.route('/api/boards/<board_id>/members/<user_id>', methods=['DELETE'])
    @require_auth
    @require_board_admin
    def remove_member(board_id, user_id):
        """Remove a member from the board"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot remove yourself from the board'}), 400
        
        if db_manager.remove_board_member(board_id, user_id):
            return jsonify({'message': 'Member removed successfully'}), 200
        else:
            return jsonify({'error': 'Failed to remove member'}), 500

    @app.route('/api/boards/<board_id>/set-default', methods=['PUT'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def set_default_board(board_id):
        """Set a board as the user's default board"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        success = db_manager.set_default_board(current_user_id, board_id)
        
        if success:
            return jsonify({'message': 'Default board set successfully'}), 200
        else:
            return jsonify({'error': 'Failed to set default board'}), 500

    @app.route('/api/boards/clear-default', methods=['PUT'])
    @require_auth
    def clear_default_board():
        """Clear the user's default board"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        success = db_manager.clear_default_board(current_user_id)
        
        if success:
            return jsonify({'message': 'Default board cleared successfully'}), 200
        else:
            return jsonify({'error': 'Failed to clear default board'}), 500

    # Expense routes
    @app.route('/api/boards/<board_id>/expenses', methods=['GET'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def get_board_expenses(board_id):
        """Get expenses for a board"""
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        expenses = db_manager.get_board_expenses(board_id, month, year)
        
        expense_list = []
        for expense in expenses:
            expense_dict = {
                'id': expense.id,
                'board_id': expense.board_id,
                'amount': expense.amount,
                'category': expense.category,
                'description': expense.description,
                'paid_by': expense.paid_by,
                'date': expense.date,
                'created_by': expense.created_by,
                'created_at': expense.created_at,
                'updated_at': expense.updated_at,
                'is_recurring': expense.is_recurring,
                'frequency': expense.frequency,
                'start_date': expense.start_date,
                'end_date': expense.end_date,
                'tags': expense.tags or [],
                'has_image': bool(expense.receipt_url)  # Boolean flag instead of URL
            }
            expense_list.append(expense_dict)
        
        return jsonify({'expenses': expense_list}), 200

    @app.route('/api/boards/<board_id>/expenses', methods=['POST'])
    @require_auth
    @require_board_access(BoardPermission.WRITE.value)
    def create_expense(board_id):
        """Create a new expense"""
        data = request.get_json()
        if not data or not data.get('amount') or not data.get('category'):
            return jsonify({'error': 'Amount and category are required'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        print(f"🔍 Creating expense - User: {current_user_id}, Board: {board_id}, Amount: {data['amount']}")
        
        expense_data = {
            'board_id': board_id,
            'amount': data['amount'],
            'category': data['category'],
            'description': data.get('description', ''),
            'paid_by': data.get('paid_by', current_user_id),
            'date': data.get('date', datetime.now().isoformat()),
            'created_by': current_user_id,
            'is_recurring': data.get('is_recurring', False),
            'frequency': data.get('frequency', 'monthly'),
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'receipt_url': data.get('image_url'),  # Use image_url from frontend
            'tags': data.get('tags', [])
        }
        
        print(f"🔍 Expense data - Paid by: {expense_data['paid_by']}")
        
        expense = db_manager.create_expense(expense_data)
        print(f"🔍 Expense created with ID: {expense.id}")
        
        # Create debts if there are multiple members
        members = db_manager.get_board_members(board_id)
        print(f"🔍 Board has {len(members)} members")
        for member in members:
            user = db_manager.get_user_by_id(member.user_id)
            print(f"🔍 Member: {user.first_name} {user.last_name} (ID: {member.user_id})")
        
        if len(members) > 1:
            print(f"🔍 Creating debts for expense...")
            create_debts_for_expense(expense, members)
        else:
            print(f"🔍 Only one member - no debts to create")
        
        # Create notifications for all board members except the creator
        db_manager.create_expense_notification(expense, members, 'expense_added')
        
        return jsonify({
            'id': expense.id,
            'board_id': expense.board_id,
            'amount': expense.amount,
            'category': expense.category,
            'description': expense.description,
            'paid_by': expense.paid_by,
            'date': expense.date,
            'created_by': expense.created_by,
            'created_at': expense.created_at,
            'is_recurring': expense.is_recurring,
            'frequency': expense.frequency,
            'tags': expense.tags or [],
            'has_image': bool(expense.receipt_url)  # Boolean flag instead of URL
        }), 201

    @app.route('/api/boards/<board_id>/expenses/<expense_id>', methods=['PUT'])
    @require_auth
    @require_board_access(BoardPermission.WRITE.value)
    def update_expense(board_id, expense_id):
        """Update an expense"""
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get the expense to check if it exists and belongs to the board
        expenses = db_manager.get_board_expenses(board_id)
        expense = next((e for e in expenses if e.id == expense_id), None)
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        # Check if there are critical updates that would affect paid debts
        if 'amount' in data or 'paid_by' in data:
            # Check if there are any paid debts associated with this expense
            paid_debts = db_manager.debts_table.search(
                (db_manager.Debt.expense_id == expense_id) & 
                (db_manager.Debt.is_paid == True)
            )
            
            if paid_debts:
                return jsonify({'error': 'Cannot modify amount or payer - some payments have already been made. Contact support if you need to modify this expense.'}), 400
        
        update_data = {}
        allowed_fields = ['amount', 'category', 'description', 'paid_by', 'date', 'is_recurring', 'frequency', 'start_date', 'end_date', 'tags']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Handle image_url from frontend, map to receipt_url in database
        if 'image_url' in data:
            update_data['receipt_url'] = data['image_url']
        
        if update_data:
            success = db_manager.update_expense(expense_id, update_data)
            if success:
                # Update debts only if amount or paid_by changed AND there are no paid debts
                if 'amount' in update_data or 'paid_by' in update_data:
                    print(f"🔍 Updating debts for expense {expense_id} - amount or payer changed")
                    members = db_manager.get_board_members(board_id)
                    if len(members) > 1:
                        # Remove only UNPAID debts and create new ones
                        print(f"🔍 Removing old UNPAID debts for expense {expense_id}")
                        db_manager.debts_table.remove(
                            (db_manager.Debt.expense_id == expense_id) & 
                            (db_manager.Debt.is_paid == False)
                        )
                        updated_expense = db_manager.get_board_expenses(board_id)
                        updated_expense = next((e for e in updated_expense if e.id == expense_id), None)
                        if updated_expense:
                            print(f"🔍 Creating new debts for updated expense")
                            create_debts_for_expense(updated_expense, members)
                
                # Create notifications for expense update
                members = db_manager.get_board_members(board_id)
                updated_expense = db_manager.get_board_expenses(board_id)
                updated_expense = next((e for e in updated_expense if e.id == expense_id), None)
                if updated_expense:
                    db_manager.create_expense_notification(updated_expense, members, 'expense_updated')
                
                return jsonify({'message': 'Expense updated successfully'}), 200
        
        return jsonify({'error': 'No valid fields to update'}), 400

    @app.route('/api/boards/<board_id>/expenses/<expense_id>', methods=['DELETE'])
    @require_auth
    @require_board_access(BoardPermission.WRITE.value)
    def delete_expense(board_id, expense_id):
        """Delete an expense"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        # Get the expense before deleting for notifications
        expenses = db_manager.get_board_expenses(board_id)
        expense = next((e for e in expenses if e.id == expense_id), None)
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        # Check if user is the creator of the expense
        if expense.created_by != current_user_id:
            return jsonify({'error': 'You can only delete expenses you created'}), 403
        
        # Check if there are any PAID debts associated with this expense
        # Only paid debts prevent deletion - unpaid debts can be deleted
        paid_debts = db_manager.debts_table.search(
            (db_manager.Debt.expense_id == expense_id) & 
            (db_manager.Debt.is_paid == True)
        )
        
        if paid_debts:
            return jsonify({'error': 'Cannot delete expense - some payments have already been made. Contact support if you need to modify this expense.'}), 400
        
        # Get board members for notifications
        members = db_manager.get_board_members(board_id)
        
        # Create notifications before deleting
        db_manager.create_expense_notification(expense, members, 'expense_deleted')
        
        if db_manager.delete_expense(expense_id):
            return jsonify({'message': 'Expense deleted successfully'}), 200
        return jsonify({'error': 'Failed to delete expense'}), 500

    # File upload endpoints
    @app.route('/api/upload/expense-image', methods=['POST'])
    @require_auth
    def upload_expense_image_endpoint():
        """Upload an image for an expense"""
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        image_url = upload_expense_image(file, current_user_id)
        if image_url:
            return jsonify({'image_url': image_url}), 200
        else:
            return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg, gif, webp'}), 400

    @app.route('/api/expenses/<expense_id>/image', methods=['POST'])
    @require_auth
    def get_expense_image(expense_id):
        """Get image for a specific expense with proper authorization checks"""
        print(f"🔍 === IMAGE ENDPOINT CALLED ===")
        print(f"🔍 Request URL: {request.url}")
        print(f"🔍 Request method: {request.method}")
        print(f"🔍 Expense ID: {expense_id}")
        print(f"🔍 Request headers: {dict(request.headers)}")
        
        # Get current user ID here where auth context is available
        try:
            current_user_result = auth_manager.get_current_user()
            print(f"🔍 Auth result: {current_user_result}")
            
            if not current_user_result.get('valid'):
                return jsonify({'error': 'Authentication failed'}), 401
            
            current_user_id = current_user_result['user']['id']
            print(f"🔍 Current user ID: {current_user_id}")
            
            return get_expense_image_actual(expense_id, current_user_id)
        except Exception as e:
            traceback.print_exc()
            print(f"🔍 Auth error: {e}")
            return jsonify({'error': 'Authentication failed'}), 401
    
    def get_expense_image_actual(expense_id, current_user_id):
        """Get image for a specific expense with proper authorization checks"""
        print(f"🔍 === IMAGE ENDPOINT ACTUAL CALLED ===")
        
        try:
            print(f"🔍 Image endpoint called for expense_id: {expense_id}")
            print(f"🔍 Current user ID: {current_user_id}")
            
            # Always return base64 data for React Native (since we're using POST)
            return_base64 = True
            print(f"🔍 Return base64: {return_base64}")
            
            # Find the expense and check if user has access
            expense = None
            user_boards = db_manager.get_user_boards(current_user_id)
            print(f"🔍 User has access to {len(user_boards)} boards")
            
            for board in user_boards:
                board_expenses = db_manager.get_board_expenses(board.id)
                print(f"🔍 Board {board.name} has {len(board_expenses)} expenses")
                expense = next((e for e in board_expenses if e.id == expense_id), None)
                if expense:
                    print(f"🔍 Found expense in board {board.name}")
                    break
            
            if not expense:
                print(f"🔍 Expense {expense_id} not found or access denied")
                return jsonify({'error': 'Expense not found or access denied'}), 404
            
            print(f"🔍 Expense receipt_url: {expense.receipt_url}")
            if not expense.receipt_url:
                print(f"🔍 No image found for expense {expense_id}")
                return jsonify({'error': 'No image found for this expense'}), 404
            
            # Extract filename from the receipt_url
            # Format: /api/uploads/expense_images/filename.jpg
            if expense.receipt_url.startswith('/api/uploads/expense_images/'):
                filename = expense.receipt_url.split('/')[-1]
            else:
                return jsonify({'error': 'Invalid image URL format'}), 400
            
            # Get file content from storage
            file_content = None
            
            # Serve the image based on storage method
            if app.config.get('UPLOAD_METHOD') == 'b2' and app.b2_service:
                # Get from B2
                file_path = f'expense_images/{filename}'
                try:
                    logger.info(f'Getting image from B2: {file_path}')
                    success, file_content, error = app.b2_service.download_file(file_path)
                    
                    if not success:
                        current_app.logger.error(f"Failed to download B2 file {file_path}: {error}")
                        return jsonify({'error': 'Image not found'}), 404
                        
                except Exception as e:
                    current_app.logger.error(f"Error getting B2 image {filename}: {str(e)}")
                    return jsonify({'error': 'Error loading image'}), 500
            else:
                # Get from local storage
                try:
                    file_path = os.path.join(app.config['EXPENSE_IMAGES_FOLDER'], filename)
                    
                    if not os.path.exists(file_path):
                        return jsonify({'error': 'Image not found'}), 404
                    
                    with open(file_path, 'rb') as f:
                        file_content = f.read()
                        
                except Exception as e:
                    current_app.logger.error(f"Error reading local image {filename}: {str(e)}")
                    return jsonify({'error': 'Image not found'}), 404
            
            # Check if we got file content
            if not file_content:
                return jsonify({'error': 'Image not found'}), 404
            
            # Always return as base64 JSON for React Native
            import base64
            base64_data = base64.b64encode(file_content).decode('utf-8')
            
            return jsonify({
                'image': base64_data
            }), 200
                    
        except Exception as e:
            traceback.print_exc()
            current_app.logger.error(f"Error in get_expense_image: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500



    @app.route('/api/admin/storage-info', methods=['GET'])
    @require_auth
    def get_storage_info():
        """Get information about the current storage configuration (admin only)"""
        # Note: You might want to add admin role checking here
        current_user = auth_manager.get_current_user()['user']
        
        storage_info = {
            'upload_method': app.config.get('UPLOAD_METHOD', 'local'),
            'b2_configured': app.b2_service is not None,
            'local_upload_folder': app.config.get('UPLOAD_FOLDER'),
        }
        
        if app.b2_service:
            try:
                success, message = app.b2_service.test_connection()
                storage_info['b2_connection_test'] = {
                    'success': success,
                    'message': message
                }
            except Exception as e:
                storage_info['b2_connection_test'] = {
                    'success': False,
                    'message': f"Connection test failed: {str(e)}"
                }
        
        return jsonify(storage_info), 200

    @app.route('/api/admin/b2-files', methods=['GET'])
    @require_auth
    def list_b2_files():
        """List recent files in B2 bucket (admin only)"""
        if not app.b2_service:
            return jsonify({'error': 'B2 service not configured'}), 400
        
        folder = request.args.get('folder', 'expense_images')
        limit = int(request.args.get('limit', 10))
        
        try:
            success, files, error = app.b2_service.list_recent_files(folder, limit)
            if success:
                return jsonify({
                    'success': True,
                    'files': files,
                    'count': len(files)
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': error,
                    'files': []
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f"Failed to list files: {str(e)}",
                'files': []
            }), 500

    # Debt routes
    @app.route('/api/boards/<board_id>/debts', methods=['GET'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def get_board_debts(board_id):
        """Get debts for a board"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        debts = db_manager.get_user_debts(current_user_id, board_id)
        
        debt_list = []
        for debt in debts:
            debt_list.append({
                'id': debt.id,
                'board_id': debt.board_id,
                'expense_id': debt.expense_id,
                'from_user_id': debt.from_user_id,
                'to_user_id': debt.to_user_id,
                'amount': debt.amount,
                'description': debt.description,
                'is_paid': debt.is_paid,
                'paid_at': debt.paid_at,
                'created_at': debt.created_at
            })
        
        return jsonify({'debts': debt_list}), 200

    @app.route('/api/boards/<board_id>/debts/<debt_id>/mark-paid', methods=['PUT'])
    @require_auth
    @require_board_access(BoardPermission.WRITE.value)
    def mark_debt_paid(board_id, debt_id):
        """Mark a debt as paid"""
        success = db_manager.mark_debt_as_paid(debt_id)
        if success:
            return jsonify({'message': 'Debt marked as paid'}), 200
        else:
            return jsonify({'error': 'Failed to mark debt as paid'}), 500

    # Summary and Statistics routes
    @app.route('/api/expenses/summary', methods=['GET'])
    @require_auth
    def get_expenses_summary():
        """Get summary statistics for all user's expenses"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        board_ids = request.args.getlist('board_ids')
        
        # Get user's boards
        user_boards = db_manager.get_user_boards(current_user_id)
        if board_ids:
            user_boards = [board for board in user_boards if board.id in board_ids]
        
        if not user_boards:
            return jsonify({
                'total_amount': 0,
                'total_expenses': 0,
                'expenses_by_category': {},
                'expenses_by_board': {},
                'monthly_trend': {}
            }), 200
        
        # Collect all expenses from user's boards
        all_expenses = []
        expenses_by_category = {}
        expenses_by_board = {}
        monthly_trend = {}
        total_amount = 0
        total_expenses = 0
        
        for board in user_boards:
            board_expenses = db_manager.get_board_expenses(board.id)
            
            # Filter by date if provided
            if start_date or end_date:
                filtered_expenses = []
                for expense in board_expenses:
                    expense_date = datetime.fromisoformat(expense.date.replace('Z', '+00:00'))
                    if start_date:
                        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        if expense_date < start_dt:
                            continue
                    if end_date:
                        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        if expense_date > end_dt:
                            continue
                    filtered_expenses.append(expense)
                board_expenses = filtered_expenses
            
            # Aggregate statistics
            board_total = sum(expense.amount for expense in board_expenses)
            expenses_by_board[board.name] = board_total
            total_amount += board_total
            total_expenses += len(board_expenses)
            
            for expense in board_expenses:
                all_expenses.append(expense)
                
                # Category aggregation
                if expense.category not in expenses_by_category:
                    expenses_by_category[expense.category] = 0
                expenses_by_category[expense.category] += expense.amount
                
                # Monthly trend
                expense_date = datetime.fromisoformat(expense.date.replace('Z', '+00:00'))
                month_key = expense_date.strftime('%Y-%m')
                if month_key not in monthly_trend:
                    monthly_trend[month_key] = 0
                monthly_trend[month_key] += expense.amount
        
        return jsonify({
            'total_amount': total_amount,
            'total_expenses': total_expenses,
            'expenses_by_category': expenses_by_category,
            'expenses_by_board': expenses_by_board,
            'monthly_trend': monthly_trend
        }), 200

    @app.route('/api/debts/all', methods=['GET'])
    @require_auth
    def get_all_debts():
        """Get all debts for the current user across all boards"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        print(f"🔍 === Loading debts for user: {current_user_id} ===")
        
        # Get user's boards
        user_boards = db_manager.get_user_boards(current_user_id)
        
        print(f"🔍 User has access to {len(user_boards)} boards")
        for board in user_boards:
            print(f"🔍 Board: {board.name} (ID: {board.id})")
        
        all_debts = []
        total_owed = 0
        total_owed_to_me = 0
        total_unpaid = 0
        total_paid = 0
        
        for board in user_boards:
            print(f"🔍 Checking debts in board: {board.name} (ID: {board.id})")
            board_debts = db_manager.get_user_debts(current_user_id, board.id)
            print(f"🔍 Found {len(board_debts)} debts in this board")
            
            for debt in board_debts:
                print(f"🔍 Processing debt: {debt.from_user_id} -> {debt.to_user_id}, amount: {debt.amount}, paid: {debt.is_paid}")
                
                # Get user names for display
                from_user = db_manager.get_user_by_id(debt.from_user_id)
                to_user = db_manager.get_user_by_id(debt.to_user_id)
                
                from_user_name = f"{from_user.first_name} {from_user.last_name}" if from_user else "משתמש לא ידוע"
                to_user_name = f"{to_user.first_name} {to_user.last_name}" if to_user else "משתמש לא ידוע"
                
                all_debts.append({
                    'id': debt.id,
                    'board_id': debt.board_id,
                    'expense_id': debt.expense_id,
                    'from_user_id': debt.from_user_id,
                    'to_user_id': debt.to_user_id,
                    'from_user_name': from_user_name,
                    'to_user_name': to_user_name,
                    'amount': debt.amount,
                    'description': debt.description,
                    'is_paid': debt.is_paid,
                    'paid_at': debt.paid_at,
                    'created_at': debt.created_at,
                    'board_name': board.name
                })
                
                # Calculate summary
                if debt.from_user_id == current_user_id:
                    print(f"🔍 Current user owes {debt.amount} to {to_user_name}")
                    if not debt.is_paid:
                        total_owed += debt.amount
                        total_unpaid += debt.amount
                    else:
                        total_paid += debt.amount
                else:
                    print(f"🔍 {from_user_name} owes {debt.amount} to current user")
                    if not debt.is_paid:
                        total_owed_to_me += debt.amount
        
        print(f"🔍 Final summary - Total owed: {total_owed}, Total owed to me: {total_owed_to_me}")
        print(f"🔍 Total debts found: {len(all_debts)}")
        
        return jsonify({
            'debts': all_debts,
            'summary': {
                'total_owed': total_owed,
                'total_owed_to_me': total_owed_to_me,
                'total_unpaid': total_unpaid,
                'total_paid': total_paid
            }
        }), 200

    @app.route('/api/expenses/by-period', methods=['GET'])
    @require_auth
    def get_expenses_by_period():
        """Get expenses for a specific period"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        board_ids = request.args.getlist('board_ids')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start date and end date are required'}), 400
        
        # Get user's boards
        user_boards = db_manager.get_user_boards(current_user_id)
        if board_ids:
            user_boards = [board for board in user_boards if board.id in board_ids]
        
        all_expenses = []
        total_amount = 0
        
        for board in user_boards:
            board_expenses = db_manager.get_board_expenses(board.id)
            
            for expense in board_expenses:
                expense_date = datetime.fromisoformat(expense.date.replace('Z', '+00:00'))
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                
                if start_dt <= expense_date <= end_dt:
                    all_expenses.append({
                        'id': expense.id,
                        'board_id': expense.board_id,
                        'amount': expense.amount,
                        'category': expense.category,
                        'description': expense.description,
                        'paid_by': expense.paid_by,
                        'date': expense.date,
                        'created_by': expense.created_by,
                        'created_at': expense.created_at,
                        'is_recurring': expense.is_recurring,
                        'frequency': expense.frequency,
                        'tags': expense.tags or [],
                        'board_name': board.name
                    })
                    total_amount += expense.amount
        
        # Calculate average per day
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        days_diff = (end_dt - start_dt).days + 1
        average_per_day = total_amount / days_diff if days_diff > 0 else 0
        
        return jsonify({
            'expenses': all_expenses,
            'summary': {
                'total_amount': total_amount,
                'total_expenses': len(all_expenses),
                'average_per_day': average_per_day
            }
        }), 200

    # Category routes
    @app.route('/api/boards/<board_id>/categories', methods=['GET'])
    @require_auth
    @require_board_access(BoardPermission.READ.value)
    def get_board_categories(board_id):
        """Get categories for a board"""
        categories = db_manager.get_board_categories(board_id)
        
        category_list = []
        for category in categories:
            category_list.append({
                'id': category.id,
                'board_id': category.board_id,
                'name': category.name,
                'icon': category.icon,
                'color': category.color,
                'created_by': category.created_by,
                'created_at': category.created_at,
                'is_default': category.is_default,
                'is_active': category.is_active
            })
        
        return jsonify({'categories': category_list}), 200

    @app.route('/api/boards/<board_id>/categories', methods=['POST'])
    @require_auth
    @require_board_admin
    def create_category(board_id):
        """Create a new category"""
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        category_data = {
            'board_id': board_id,
            'name': data['name'],
            'icon': data.get('icon', 'ellipsis-horizontal'),
            'color': data.get('color', '#9370DB'),
            'created_by': current_user_id,
            'is_default': data.get('is_default', False)
        }
        
        category = db_manager.create_category(category_data)
        
        return jsonify({
            'id': category.id,
            'board_id': category.board_id,
            'name': category.name,
            'icon': category.icon,
            'color': category.color,
            'created_by': category.created_by,
            'created_at': category.created_at,
            'is_default': category.is_default
        }), 201

    @app.route('/api/boards/<board_id>/categories/update', methods=['PUT'])
    @require_auth
    @require_board_admin
    def update_board_categories(board_id):
        """Update all categories for a board"""
        data = request.get_json()
        if not data or 'categories' not in data:
            return jsonify({'error': 'Categories data is required'}), 400
        
        current_user_id = auth_manager.get_current_user()['user']['id']
        categories = data['categories']
        
        try:
            # First, delete all existing custom categories for this board (keep default ones)
            db_manager.categories_table.remove(
                (db_manager.Category.board_id == board_id) & 
                (db_manager.Category.is_default == False)
            )
            
            # Create new categories
            for category_data in categories:
                category_info = {
                    'board_id': board_id,
                    'name': category_data.get('name'),
                    'icon': category_data.get('icon', 'ellipsis-horizontal'),
                    'color': category_data.get('color', '#9370DB'),
                    'created_by': current_user_id,
                    'is_default': False
                }
                try:
                    db_manager.create_category(category_info)
                    print(f"✅ Updated category: {category_info['name']}")
                except Exception as e:
                    print(f"❌ Failed to create category {category_info['name']}: {str(e)}")
            
            return jsonify({'message': 'Categories updated successfully'}), 200
            
        except Exception as e:
            print(f"❌ Error updating board categories: {str(e)}")
            return jsonify({'error': 'Failed to update categories'}), 500

    # Helper function to create debts for an expense
    def create_debts_for_expense(expense, members):
        """Create debts for all members except the payer"""
        print(f"🔍 === Creating debts for expense ===")
        print(f"🔍 Expense ID: {expense.id}")
        print(f"🔍 Expense amount: {expense.amount}")
        print(f"🔍 Total members: {len(members)}")
        print(f"🔍 Paid by: {expense.paid_by}")
        
        # Debug: Print all members
        for i, member in enumerate(members):
            user = db_manager.get_user_by_id(member.user_id)
            print(f"🔍 Member {i+1}: {user.first_name} {user.last_name} (ID: {member.user_id})")
        
        other_members = [member for member in members if member.user_id != expense.paid_by]
        print(f"🔍 Other members (who owe money): {len(other_members)}")
        
        # Debug: Print other members
        for i, member in enumerate(other_members):
            user = db_manager.get_user_by_id(member.user_id)
            print(f"🔍 Debtor {i+1}: {user.first_name} {user.last_name} (ID: {member.user_id})")
        
        if not other_members:
            print("🔍 No other members - no debts to create")
            return
        
        total_people = len(members)
        amount_per_person = expense.amount / total_people
        
        print(f"🔍 Total people: {total_people}")
        print(f"🔍 Amount per person: {amount_per_person}")
        print(f"🔍 Each person owes to payer: {amount_per_person}")
        
        debts_created = 0
        for member in other_members:
            debt_data = {
                'board_id': expense.board_id,
                'expense_id': expense.id,
                'from_user_id': member.user_id,
                'to_user_id': expense.paid_by,
                'amount': amount_per_person,
                'description': f"{expense.category} - {expense.description or 'Shared expense'}"
            }
            print(f"🔍 Creating debt: {member.user_id} owes {amount_per_person} to {expense.paid_by}")
            debt = db_manager.create_debt(debt_data)
            print(f"🔍 Debt created with ID: {debt.id}")
            debts_created += 1
        
        print(f"🔍 Total debts created: {debts_created}")
        print(f"🔍 === Finished creating debts ===")
        
        # Let's verify the debts were actually saved
        print(f"🔍 === Verifying debts in database ===")
        all_debts = db_manager.get_user_debts(expense.paid_by, expense.board_id)
        print(f"🔍 Total debts for payer in this board: {len(all_debts)}")
        for debt in all_debts:
            if debt.expense_id == expense.id:
                print(f"🔍 Found debt for this expense: {debt.from_user_id} -> {debt.to_user_id}, amount: {debt.amount}")

    # Notification endpoints
    @app.route('/api/notifications', methods=['GET'])
    @require_auth
    def get_notifications():
        """Get notifications for the current user"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        notifications = db_manager.get_user_notifications(current_user_id)
        
        notification_list = []
        for notification in notifications:
            notification_list.append({
                'id': notification.id,
                'user_id': notification.user_id,
                'board_id': notification.board_id,
                'board_name': notification.board_name,
                'expense_id': notification.expense_id,
                'expense_description': notification.expense_description,
                'amount': notification.amount,
                'created_by': notification.created_by,
                'created_by_name': notification.created_by_name,
                'created_at': notification.created_at,
                'is_read': notification.is_read,
                'type': notification.type
            })
        
        return jsonify({'notifications': notification_list}), 200

    @app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
    @require_auth
    def mark_notification_as_read(notification_id):
        """Mark a specific notification as read"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        # Check if notification belongs to current user
        notifications = db_manager.get_user_notifications(current_user_id)
        notification = next((n for n in notifications if n.id == notification_id), None)
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        success = db_manager.mark_notification_as_read(notification_id)
        
        if success:
            return jsonify({'message': 'Notification marked as read'}), 200
        else:
            return jsonify({'error': 'Failed to mark notification as read'}), 500

    @app.route('/api/notifications/mark-all-read', methods=['PUT'])
    @require_auth
    def mark_all_notifications_as_read():
        """Mark all notifications as read for the current user"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        success = db_manager.mark_all_user_notifications_as_read(current_user_id)
        
        if success:
            return jsonify({'message': 'All notifications marked as read'}), 200
        else:
            return jsonify({'error': 'Failed to mark notifications as read'}), 500

    @app.route('/api/notifications/<notification_id>', methods=['DELETE'])
    @require_auth
    def delete_notification(notification_id):
        """Delete a specific notification"""
        current_user_id = auth_manager.get_current_user()['user']['id']
        
        # Check if notification belongs to current user
        notifications = db_manager.get_user_notifications(current_user_id)
        notification = next((n for n in notifications if n.id == notification_id), None)
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        success = db_manager.delete_notification(notification_id)
        
        if success:
            return jsonify({'message': 'Notification deleted'}), 200
        else:
            return jsonify({'error': 'Failed to delete notification'}), 500

    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000,use_reloader=False)

