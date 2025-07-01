from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from config import config
from models import DatabaseManager, UserRole, BoardPermission
from auth import AuthManager, require_auth, require_board_access, require_board_owner, require_board_admin

# Load environment variables
load_dotenv()

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
    app.db_manager = db_manager
    
    # Initialize auth
    auth_manager = AuthManager(db_manager)
    app.auth_manager = auth_manager
    
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
    @require_auth
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
            return jsonify(result), 200
        else:
            return jsonify({'error': result['error']}), result.get('code', 400)

    # Board routes
    @app.route('/api/boards', methods=['GET', 'OPTIONS'])
    @require_auth
    def get_user_boards():
        """Get all boards for current user"""
        if request.method == 'OPTIONS':
            return '', 200
            
        print("🔍 Backend: /api/boards GET request received")
        print("🔍 Backend: Request headers:", dict(request.headers))
        
        try:
            current_user_id = auth_manager.get_current_user()['user']['id']
            print("🔍 Backend: Current user ID:", current_user_id)
            
            boards = db_manager.get_user_boards(current_user_id)
            print("🔍 Backend: Found boards:", len(boards))
            
            board_list = []
            for board in boards:
                members = db_manager.get_board_members(board.id)
                board_list.append({
                    'id': board.id,
                    'name': board.name,
                    'description': board.description,
                    'owner_id': board.owner_id,
                    'created_at': board.created_at,
                    'updated_at': board.updated_at,
                    'currency': board.currency,
                    'timezone': board.timezone,
                    'board_type': board.board_type,
                    'member_count': len(members),
                    'user_role': db_manager.get_user_role_in_board(current_user_id, board.id)
                })
            
            print("🔍 Backend: Returning boards:", board_list)
            return jsonify({'boards': board_list}), 200
        except Exception as e:
            print("🔍 Backend: Error in get_user_boards:", str(e))
            return jsonify({'error': 'Internal server error'}), 500

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
        
        # Prevent removing yourself if you're the owner
        board = db_manager.get_board_by_id(board_id)
        if board.owner_id == user_id and current_user_id == user_id:
            return jsonify({'error': 'Cannot remove yourself as board owner'}), 400
        
        success = db_manager.remove_board_member(board_id, user_id)
        if success:
            return jsonify({'message': 'Member removed successfully'}), 200
        else:
            return jsonify({'error': 'Failed to remove member'}), 500

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
            expense_list.append({
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
                'receipt_url': expense.receipt_url,
                'tags': expense.tags or []
            })
        
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
            'receipt_url': data.get('receipt_url'),
            'tags': data.get('tags', [])
        }
        
        expense = db_manager.create_expense(expense_data)
        
        # Create debts if there are multiple members
        members = db_manager.get_board_members(board_id)
        if len(members) > 1:
            create_debts_for_expense(expense, members)
        
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
            'tags': expense.tags or []
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
        
        update_data = {}
        allowed_fields = ['amount', 'category', 'description', 'paid_by', 'date', 'is_recurring', 'frequency', 'start_date', 'end_date', 'receipt_url', 'tags']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            success = db_manager.update_expense(expense_id, update_data)
            if success:
                # Update debts if amount or paid_by changed
                if 'amount' in update_data or 'paid_by' in update_data:
                    members = db_manager.get_board_members(board_id)
                    if len(members) > 1:
                        # Remove old debts and create new ones
                        db_manager.debts_table.remove(db_manager.Debt.expense_id == expense_id)
                        updated_expense = db_manager.get_board_expenses(board_id)
                        updated_expense = next((e for e in updated_expense if e.id == expense_id), None)
                        if updated_expense:
                            create_debts_for_expense(updated_expense, members)
                
                return jsonify({'message': 'Expense updated successfully'}), 200
        
        return jsonify({'error': 'No valid fields to update'}), 400

    @app.route('/api/boards/<board_id>/expenses/<expense_id>', methods=['DELETE'])
    @require_auth
    @require_board_access(BoardPermission.WRITE.value)
    def delete_expense(board_id, expense_id):
        """Delete an expense"""
        # Get the expense to check if it exists and belongs to the board
        expenses = db_manager.get_board_expenses(board_id)
        expense = next((e for e in expenses if e.id == expense_id), None)
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        success = db_manager.delete_expense(expense_id)
        if success:
            return jsonify({'message': 'Expense deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete expense'}), 500

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
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        board_ids = request.args.getlist('board_ids')
        is_paid = request.args.get('is_paid')
        
        # Get user's boards
        user_boards = db_manager.get_user_boards(current_user_id)
        if board_ids:
            user_boards = [board for board in user_boards if board.id in board_ids]
        
        all_debts = []
        total_owed = 0
        total_owed_to_me = 0
        total_unpaid = 0
        total_paid = 0
        
        for board in user_boards:
            board_debts = db_manager.get_user_debts(current_user_id, board.id)
            
            for debt in board_debts:
                # Filter by date if provided
                if start_date or end_date:
                    debt_date = datetime.fromisoformat(debt.created_at.replace('Z', '+00:00'))
                    if start_date:
                        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        if debt_date < start_dt:
                            continue
                    if end_date:
                        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        if debt_date > end_dt:
                            continue
                
                # Filter by paid status if provided
                if is_paid is not None:
                    if debt.is_paid != (is_paid.lower() == 'true'):
                        continue
                
                all_debts.append({
                    'id': debt.id,
                    'board_id': debt.board_id,
                    'expense_id': debt.expense_id,
                    'from_user_id': debt.from_user_id,
                    'to_user_id': debt.to_user_id,
                    'amount': debt.amount,
                    'description': debt.description,
                    'is_paid': debt.is_paid,
                    'paid_at': debt.paid_at,
                    'created_at': debt.created_at,
                    'board_name': board.name
                })
                
                # Calculate summary
                if debt.from_user_id == current_user_id:
                    total_owed += debt.amount
                    if not debt.is_paid:
                        total_unpaid += debt.amount
                    else:
                        total_paid += debt.amount
                else:
                    total_owed_to_me += debt.amount
        
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

    # Helper function to create debts for an expense
    def create_debts_for_expense(expense, members):
        """Create debts for all members except the payer"""
        other_members = [member for member in members if member.user_id != expense.paid_by]
        
        if not other_members:
            return
        
        total_people = len(members)
        amount_per_person = expense.amount / total_people
        
        for member in other_members:
            debt_data = {
                'board_id': expense.board_id,
                'expense_id': expense.id,
                'from_user_id': member.user_id,
                'to_user_id': expense.paid_by,
                'amount': amount_per_person,
                'description': f"{expense.category} - {expense.description or 'Shared expense'}"
            }
            db_manager.create_debt(debt_data)

    return app

if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000) 