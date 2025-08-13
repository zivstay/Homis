import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from tinydb import TinyDB, Query

class UserRole(Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class BoardPermission(Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    OWNER = "owner"

@dataclass
class User:
    id: str
    email: str
    username: str
    password_hash: str
    first_name: str
    last_name: str
    created_at: str
    updated_at: str
    is_active: bool = True
    email_verified: bool = False
    avatar_url: Optional[str] = None

@dataclass
class Board:
    id: str
    name: str
    description: str
    owner_id: str
    created_at: str
    updated_at: str
    is_active: bool = True
    settings: Dict = None
    currency: str = "ILS"
    timezone: str = "Asia/Jerusalem"
    board_type: str = "general"

@dataclass
class BoardMember:
    id: str
    board_id: str
    user_id: str
    role: str
    joined_at: str
    invited_by: str
    is_active: bool = True
    is_default_board: bool = False
    permissions: List[str] = None

@dataclass
class Expense:
    id: str
    board_id: str
    amount: float
    category: str
    description: str
    paid_by: str
    date: str
    created_by: str
    created_at: str
    updated_at: str
    is_recurring: bool = False
    frequency: str = "monthly"
    start_date: str = None
    end_date: str = None
    receipt_url: Optional[str] = None
    tags: List[str] = None

@dataclass
class Debt:
    id: str
    board_id: str
    expense_id: str
    from_user_id: str
    to_user_id: str
    amount: float
    description: str
    is_paid: bool = False
    paid_at: str = None
    created_at: str = None
    updated_at: str = None

@dataclass
class Notification:
    id: str
    user_id: str
    board_id: str
    board_name: str
    expense_id: str
    expense_description: str
    amount: float
    created_by: str
    created_by_name: str
    created_at: str
    is_read: bool = False
    type: str = "expense_added"  # expense_added, expense_updated, expense_deleted, board_invite

@dataclass
class Category:
    id: str
    board_id: str
    name: str
    icon: str
    color: str
    created_by: str
    created_at: str
    is_default: bool = False
    is_active: bool = True

@dataclass
class Invitation:
    id: str
    board_id: str
    email: str
    invited_by: str
    role: str
    token: str
    expires_at: str
    created_at: str
    accepted_at: str = None
    is_expired: bool = False

@dataclass
class PendingRegistration:
    id: str
    email: str
    username: str
    password_hash: str
    first_name: str
    last_name: str
    verification_code: str
    expiry_time: str
    created_at: str
    attempts: int = 0

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db = TinyDB(db_path)
        self.users_table = self.db.table('users')
        self.boards_table = self.db.table('boards')
        self.board_members_table = self.db.table('board_members')
        self.expenses_table = self.db.table('expenses')
        self.debts_table = self.db.table('debts')
        self.categories_table = self.db.table('categories')
        self.invitations_table = self.db.table('invitations')
        self.notifications_table = self.db.table('notifications')
        self.pending_registrations_table = self.db.table('pending_registrations') # Added pending registrations table
        
        # Define query objects for reuse
        self.User = Query()
        self.Board = Query()
        self.BoardMember = Query()
        self.Expense = Query()
        self.Debt = Query()
        self.Category = Query()
        self.Invitation = Query()
        self.Notification = Query()
        self.PendingRegistration = Query() # Added pending registration query object

    def initialize_default_data(self):
        """Initialize default categories and admin user"""
        if not self.users_table.all():
            # Create default admin user
            admin_user = User(
                id=str(uuid.uuid4()),
                email="admin@homis.com",
                username="admin",
                password_hash="",  # Will be set by auth system
                first_name="Admin",
                last_name="User",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                is_active=True,
                email_verified=True
            )
            self.users_table.insert(asdict(admin_user))

        if not self.categories_table.all():
            # Create default categories
            default_categories = [
                Category(
                    id=str(uuid.uuid4()),
                    board_id="",  # Global categories
                    name="חשמל",
                    icon="flash",
                    color="#FFD700",
                    created_by="system",
                    created_at=datetime.now().isoformat(),
                    is_default=True
                ),
                Category(
                    id=str(uuid.uuid4()),
                    board_id="",
                    name="מים",
                    icon="water",
                    color="#00BFFF",
                    created_by="system",
                    created_at=datetime.now().isoformat(),
                    is_default=True
                ),
                Category(
                    id=str(uuid.uuid4()),
                    board_id="",
                    name="ארנונה",
                    icon="home",
                    color="#32CD32",
                    created_by="system",
                    created_at=datetime.now().isoformat(),
                    is_default=True
                ),
                Category(
                    id=str(uuid.uuid4()),
                    board_id="",
                    name="סופר",
                    icon="cart",
                    color="#FF6347",
                    created_by="system",
                    created_at=datetime.now().isoformat(),
                    is_default=True
                ),
                Category(
                    id=str(uuid.uuid4()),
                    board_id="",
                    name="אחר",
                    icon="ellipsis-horizontal",
                    color="#9370DB",
                    created_by="system",
                    created_at=datetime.now().isoformat(),
                    is_default=True
                )
            ]
            
            for category in default_categories:
                self.categories_table.insert(asdict(category))

    # User methods
    def create_user(self, user_data: Dict) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=user_data['email'],
            username=user_data['username'],
            password_hash=user_data['password_hash'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        self.users_table.insert(asdict(user))
        return user

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        user_data = self.users_table.get(self.User.id == user_id)
        return User(**user_data) if user_data else None

    def get_user_by_email(self, email: str) -> Optional[User]:
        user_data = self.users_table.get(self.User.email == email)
        return User(**user_data) if user_data else None

    def get_user_by_username(self, username: str) -> Optional[User]:
        user_data = self.users_table.get(self.User.username == username)
        return User(**user_data) if user_data else None

    def update_user(self, user_id: str, update_data: Dict) -> bool:
        update_data['updated_at'] = datetime.now().isoformat()
        return len(self.users_table.update(update_data, self.User.id == user_id)) > 0

    def update_user_password(self, user_id: str, password_hash: str) -> bool:
        """Update user password"""
        update_data = {
            'password_hash': password_hash,
            'updated_at': datetime.now().isoformat()
        }
        return len(self.users_table.update(update_data, self.User.id == user_id)) > 0

    # Board methods
    def create_board(self, board_data: Dict) -> Board:
        board = Board(
            id=str(uuid.uuid4()),
            name=board_data['name'],
            description=board_data.get('description', ''),
            owner_id=board_data['owner_id'],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            settings=board_data.get('settings', {}),
            currency=board_data.get('currency', 'ILS'),
            timezone=board_data.get('timezone', 'Asia/Jerusalem'),
            board_type=board_data.get('board_type', 'general')
        )
        self.boards_table.insert(asdict(board))
        
        # Add owner as board member
        self.add_board_member(
            board_id=board.id,
            user_id=board.owner_id,
            role=UserRole.OWNER.value,
            invited_by=board.owner_id
        )
        
        return board

    def get_board_by_id(self, board_id: str) -> Optional[Board]:
        board_data = self.boards_table.get(self.Board.id == board_id)
        return Board(**board_data) if board_data else None

    def get_user_boards(self, user_id: str) -> List[Board]:
        # Get boards where user is a member
        member_boards = self.board_members_table.search(
            (self.BoardMember.user_id == user_id) & 
            (self.BoardMember.is_active == True)
        )
        
        board_ids = [member['board_id'] for member in member_boards]
        boards_data = self.boards_table.search(self.Board.id.one_of(board_ids))
        
        boards = []
        for board_data in boards_data:
            board = Board(**board_data)
            
            # Find the corresponding member record to get is_default_board flag
            member_record = next((m for m in member_boards if m['board_id'] == board.id), None)
            if member_record:
                # Add is_default_board as an attribute to the board object
                board.is_default_board = member_record.get('is_default_board', False)
                board.user_role = member_record.get('role')
            
            boards.append(board)
            
        return boards

    def update_board(self, board_id: str, update_data: Dict) -> bool:
        update_data['updated_at'] = datetime.now().isoformat()
        return len(self.boards_table.update(update_data, self.Board.id == board_id)) > 0

    def delete_board(self, board_id: str) -> bool:
        # Delete board and all related data
        self.boards_table.remove(self.Board.id == board_id)
        self.board_members_table.remove(self.BoardMember.board_id == board_id)
        self.expenses_table.remove(self.Expense.board_id == board_id)
        self.debts_table.remove(self.Debt.board_id == board_id)
        self.categories_table.remove(self.Category.board_id == board_id)
        self.invitations_table.remove(self.Invitation.board_id == board_id)
        return True

    # Board member methods
    def add_board_member(self, board_id: str, user_id: str, role: str, invited_by: str) -> BoardMember:
        member = BoardMember(
            id=str(uuid.uuid4()),
            board_id=board_id,
            user_id=user_id,
            role=role,
            joined_at=datetime.now().isoformat(),
            invited_by=invited_by,
            is_active=True,
            is_default_board=False, # Default to False
            permissions=self._get_permissions_for_role(role)
        )
        self.board_members_table.insert(asdict(member))
        return member

    def get_board_members(self, board_id: str) -> List[BoardMember]:
        members_data = self.board_members_table.search(
            (self.BoardMember.board_id == board_id) & 
            (self.BoardMember.is_active == True)
        )
        return [BoardMember(**member_data) for member_data in members_data]

    def get_user_role_in_board(self, user_id: str, board_id: str) -> Optional[str]:
        member_data = self.board_members_table.get(
            (self.BoardMember.user_id == user_id) & 
            (self.BoardMember.board_id == board_id) &
            (self.BoardMember.is_active == True)
        )
        return member_data['role'] if member_data else None

    def update_board_member_role(self, member_id: str, new_role: str) -> bool:
        update_data = {
            'role': new_role,
            'permissions': self._get_permissions_for_role(new_role)
        }
        return len(self.board_members_table.update(update_data, self.BoardMember.id == member_id)) > 0

    def remove_board_member(self, board_id: str, user_id: str) -> bool:
        return len(self.board_members_table.update(
            {'is_active': False}, 
            (self.BoardMember.board_id == board_id) & (self.BoardMember.user_id == user_id)
        )) > 0

    def set_default_board(self, user_id: str, board_id: str) -> bool:
        """Set a board as the default board for a user"""
        # First, remove default flag from all user's boards
        self.board_members_table.update(
            {'is_default_board': False},
            self.BoardMember.user_id == user_id
        )
        
        # Then set the specified board as default
        return len(self.board_members_table.update(
            {'is_default_board': True},
            (self.BoardMember.user_id == user_id) & (self.BoardMember.board_id == board_id)
        )) > 0

    def get_user_default_board(self, user_id: str) -> Optional[Board]:
        """Get the user's default board"""
        member_data = self.board_members_table.get(
            (self.BoardMember.user_id == user_id) & 
            (self.BoardMember.is_default_board == True) &
            (self.BoardMember.is_active == True)
        )
        
        if not member_data:
            return None
            
        board_data = self.boards_table.get(self.Board.id == member_data['board_id'])
        return Board(**board_data) if board_data else None

    def clear_default_board(self, user_id: str) -> bool:
        """Clear default board for a user"""
        return len(self.board_members_table.update(
            {'is_default_board': False},
            self.BoardMember.user_id == user_id
        )) > 0

    # Expense methods
    def create_expense(self, expense_data: Dict) -> Expense:
        expense = Expense(
            id=str(uuid.uuid4()),
            board_id=expense_data['board_id'],
            amount=expense_data['amount'],
            category=expense_data['category'],
            description=expense_data.get('description', ''),
            paid_by=expense_data['paid_by'],
            date=expense_data.get('date', datetime.now().isoformat()),
            created_by=expense_data['created_by'],
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            is_recurring=expense_data.get('is_recurring', False),
            frequency=expense_data.get('frequency', 'monthly'),
            start_date=expense_data.get('start_date'),
            end_date=expense_data.get('end_date'),
            receipt_url=expense_data.get('receipt_url'),
            tags=expense_data.get('tags', [])
        )
        self.expenses_table.insert(asdict(expense))
        return expense

    def get_board_expenses(self, board_id: str, month: int = None, year: int = None) -> List[Expense]:
        query = self.Expense.board_id == board_id
        
        if month is not None and year is not None:
            # Filter by month and year
            start_date = datetime(year, month, 1).isoformat()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).isoformat()
            else:
                end_date = datetime(year, month + 1, 1).isoformat()
            
            query = query & (self.Expense.date >= start_date) & (self.Expense.date < end_date)
        
        expenses_data = self.expenses_table.search(query)
        expenses = [Expense(**expense_data) for expense_data in expenses_data]
        
        # Sort by created_at descending (newest first)
        expenses.sort(key=lambda x: x.created_at, reverse=True)
        
        return expenses

    def update_expense(self, expense_id: str, update_data: Dict) -> bool:
        update_data['updated_at'] = datetime.now().isoformat()
        return len(self.expenses_table.update(update_data, self.Expense.id == expense_id)) > 0

    def delete_expense(self, expense_id: str) -> bool:
        # Check if there are any paid debts associated with this expense
        paid_debts = self.debts_table.search(
            (self.Debt.expense_id == expense_id) & (self.Debt.is_paid == True)
        )
        
        if paid_debts:
            # Cannot delete expense if there are paid debts
            print(f"❌ Cannot delete expense {expense_id}: has {len(paid_debts)} paid debt(s)")
            return False
        
        # Delete associated unpaid debts first
        self.debts_table.remove((self.Debt.expense_id == expense_id) & (self.Debt.is_paid == False))
        
        # Delete the expense
        return len(self.expenses_table.remove(self.Expense.id == expense_id)) > 0

    # Debt methods
    def create_debt(self, debt_data: Dict) -> Debt:
        debt = Debt(
            id=str(uuid.uuid4()),
            board_id=debt_data['board_id'],
            expense_id=debt_data['expense_id'],
            from_user_id=debt_data['from_user_id'],
            to_user_id=debt_data['to_user_id'],
            amount=debt_data['amount'],
            description=debt_data.get('description', ''),
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        self.debts_table.insert(asdict(debt))
        return debt

    def get_user_debts(self, user_id: str, board_id: str = None) -> List[Debt]:
        query = (self.Debt.from_user_id == user_id) | (self.Debt.to_user_id == user_id)
        if board_id:
            query = query & (self.Debt.board_id == board_id)
        
        debts_data = self.debts_table.search(query)
        debts = [Debt(**debt_data) for debt_data in debts_data]
        
        # Sort by created_at descending (newest first)
        debts.sort(key=lambda x: x.created_at, reverse=True)
        
        return debts

    def mark_debt_as_paid(self, debt_id: str) -> bool:
        update_data = {
            'is_paid': True,
            'paid_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        return len(self.debts_table.update(update_data, self.Debt.id == debt_id)) > 0

    # Category methods
    def create_category(self, category_data: Dict) -> Category:
        category = Category(
            id=str(uuid.uuid4()),
            board_id=category_data['board_id'],
            name=category_data['name'],
            icon=category_data['icon'],
            color=category_data['color'],
            created_by=category_data['created_by'],
            created_at=datetime.now().isoformat(),
            is_default=category_data.get('is_default', False)
        )
        self.categories_table.insert(asdict(category))
        return category

    def get_board_categories(self, board_id: str) -> List[Category]:
        # Get only board-specific categories, not global defaults
        # This ensures each board has its own custom categories
        board_categories = self.categories_table.search(
            (self.Category.board_id == board_id) & (self.Category.is_active == True)
        )
        
        return [Category(**category_data) for category_data in board_categories]

    # Invitation methods
    def create_invitation(self, invitation_data: Dict) -> Invitation:
        invitation = Invitation(
            id=str(uuid.uuid4()),
            board_id=invitation_data['board_id'],
            email=invitation_data['email'],
            invited_by=invitation_data['invited_by'],
            role=invitation_data['role'],
            token=str(uuid.uuid4()),
            expires_at=invitation_data['expires_at'],
            created_at=datetime.now().isoformat()
        )
        self.invitations_table.insert(asdict(invitation))
        return invitation

    def get_invitation_by_token(self, token: str) -> Optional[Invitation]:
        invitation_data = self.invitations_table.get(self.Invitation.token == token)
        return Invitation(**invitation_data) if invitation_data else None

    def accept_invitation(self, invitation_id: str, user_id: str) -> bool:
        invitation_data = self.invitations_table.get(self.Invitation.id == invitation_id)
        if not invitation_data:
            return False
        
        # Add user to board
        self.add_board_member(
            board_id=invitation_data['board_id'],
            user_id=user_id,
            role=invitation_data['role'],
            invited_by=invitation_data['invited_by']
        )
        
        # Mark invitation as accepted
        update_data = {
            'accepted_at': datetime.now().isoformat()
        }
        return len(self.invitations_table.update(update_data, self.Invitation.id == invitation_id)) > 0

    # Notification methods
    def create_notification(self, notification_data: Dict) -> Notification:
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=notification_data['user_id'],
            board_id=notification_data['board_id'],
            board_name=notification_data['board_name'],
            expense_id=notification_data.get('expense_id', ''),
            expense_description=notification_data.get('expense_description', ''),
            amount=notification_data.get('amount', 0),
            created_by=notification_data['created_by'],
            created_by_name=notification_data['created_by_name'],
            created_at=datetime.now().isoformat(),
            is_read=False,
            type=notification_data.get('type', 'expense_added')
        )
        self.notifications_table.insert(asdict(notification))
        return notification

    def get_user_notifications(self, user_id: str) -> List[Notification]:
        notifications_data = self.notifications_table.search(self.Notification.user_id == user_id)
        # Sort by created_at descending (newest first)
        notifications_data.sort(key=lambda x: x['created_at'], reverse=True)
        return [Notification(**notification_data) for notification_data in notifications_data]

    def mark_notification_as_read(self, notification_id: str) -> bool:
        return len(self.notifications_table.update(
            {'is_read': True}, 
            self.Notification.id == notification_id
        )) > 0

    def mark_all_user_notifications_as_read(self, user_id: str) -> bool:
        return len(self.notifications_table.update(
            {'is_read': True}, 
            self.Notification.user_id == user_id
        )) > 0

    def delete_notification(self, notification_id: str) -> bool:
        return len(self.notifications_table.remove(self.Notification.id == notification_id)) > 0

    def create_expense_notification(self, expense: Expense, board_members: List[BoardMember], notification_type: str = 'expense_added'):
        """Create notifications for all board members except the creator"""
        # Get board info
        board_data = self.boards_table.search(self.Board.id == expense.board_id)
        if not board_data:
            return
        
        board = board_data[0]
        
        # Get creator info
        creator_data = self.users_table.search(self.User.id == expense.created_by)
        if not creator_data:
            return
        
        creator = creator_data[0]
        creator_name = f"{creator.get('first_name', '')} {creator.get('last_name', '')}".strip()
        if not creator_name:
            creator_name = creator.get('username', 'משתמש')

        # Create notification for each member except the creator
        for member in board_members:
            if member.user_id != expense.created_by:
                notification_data = {
                    'user_id': member.user_id,
                    'board_id': expense.board_id,
                    'board_name': board['name'],
                    'expense_id': expense.id,
                    'expense_description': expense.description,
                    'amount': expense.amount,
                    'created_by': expense.created_by,
                    'created_by_name': creator_name,
                    'type': notification_type
                }
                self.create_notification(notification_data)

    # Pending Registration methods
    def create_pending_registration(self, registration_data: Dict) -> PendingRegistration:
        """Create a pending registration for email verification"""
        pending_reg = PendingRegistration(
            id=str(uuid.uuid4()),
            email=registration_data['email'],
            username=registration_data['username'],
            password_hash=registration_data['password_hash'],
            first_name=registration_data['first_name'],
            last_name=registration_data['last_name'],
            verification_code=registration_data['verification_code'],
            expiry_time=registration_data['expiry_time'],
            attempts=registration_data.get('attempts', 0),
            created_at=datetime.now().isoformat()
        )
        self.pending_registrations_table.insert(asdict(pending_reg))
        return pending_reg

    def store_pending_registration(self, key: str, registration_data: Dict) -> bool:
        """Store a pending registration with custom key (used for password reset)"""
        # For password reset, we don't need all the user registration fields
        # Create a simplified record that fits the PendingRegistration structure
        pending_reg = PendingRegistration(
            id=str(uuid.uuid4()),
            email=key,  # Use the key as email for identification
            username="",  # Not needed for password reset
            password_hash="",  # Not needed for password reset
            first_name="",  # Not needed for password reset  
            last_name="",  # Not needed for password reset
            verification_code=registration_data['verification_code'],
            expiry_time=registration_data['expiry_time'],
            attempts=registration_data.get('attempts', 0),
            created_at=datetime.now().isoformat()
        )
        self.pending_registrations_table.insert(asdict(pending_reg))
        return True

    def get_pending_registration(self, email: str) -> Optional[PendingRegistration]:
        """Get pending registration by email"""
        registration_data = self.pending_registrations_table.get(self.PendingRegistration.email == email)
        if registration_data:
            return PendingRegistration(**registration_data)
        return None

    def get_pending_registration_by_username(self, username: str) -> Optional[PendingRegistration]:
        """Get pending registration by username"""
        registration_data = self.pending_registrations_table.get(self.PendingRegistration.username == username)
        if registration_data:
            return PendingRegistration(**registration_data)
        return None

    def update_pending_registration_attempts(self, email: str, attempts: int) -> bool:
        """Update the number of attempts for a pending registration"""
        return len(self.pending_registrations_table.update(
            {'attempts': attempts}, 
            self.PendingRegistration.email == email
        )) > 0

    def delete_pending_registration(self, email: str) -> bool:
        """Delete a pending registration"""
        return len(self.pending_registrations_table.remove(self.PendingRegistration.email == email)) > 0

    def cleanup_expired_pending_registrations(self):
        """Remove expired pending registrations"""
        current_time = datetime.now()
        expired_registrations = []
        
        # Get all pending registrations and check expiry manually
        all_registrations = self.pending_registrations_table.all()
        for registration in all_registrations:
            try:
                expiry_time = datetime.fromisoformat(registration['expiry_time'])
                if current_time > expiry_time:
                    expired_registrations.append(registration)
            except (ValueError, KeyError):
                # Invalid date format, consider expired
                expired_registrations.append(registration)
        
        # Remove expired registrations
        for registration in expired_registrations:
            self.pending_registrations_table.remove(self.PendingRegistration.id == registration['id'])
            print(f"🗑️ Cleaned up expired registration for {registration.get('email', 'unknown')}")

    # Helper methods
    def _get_permissions_for_role(self, role: str) -> List[str]:
        """Get permissions for a given role"""
        permissions_map = {
            UserRole.OWNER.value: [BoardPermission.READ.value, BoardPermission.WRITE.value, BoardPermission.ADMIN.value, BoardPermission.OWNER.value],
            UserRole.ADMIN.value: [BoardPermission.READ.value, BoardPermission.WRITE.value, BoardPermission.ADMIN.value],
            UserRole.MEMBER.value: [BoardPermission.READ.value, BoardPermission.WRITE.value],
            UserRole.VIEWER.value: [BoardPermission.READ.value]
        }
        return permissions_map.get(role, [])

    def user_has_permission(self, user_id: str, board_id: str, permission: str) -> bool:
        """Check if user has specific permission in board"""
        member_data = self.board_members_table.get(
            (self.BoardMember.user_id == user_id) & 
            (self.BoardMember.board_id == board_id) &
            (self.BoardMember.is_active == True)
        )
        
        if not member_data:
            return False
        
        # Board owner has all permissions
        if member_data['role'] == UserRole.OWNER.value:
            return True
        
        return permission in member_data.get('permissions', []) 