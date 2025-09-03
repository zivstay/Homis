import uuid
import json
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union
from dataclasses import asdict, dataclass

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base


# Define enums and dataclasses directly for compatibility
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
class UserDataclass:
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
    accepted_terms: bool = False
    terms_accepted_at: Optional[str] = None
    terms_version_signed: Optional[int] = None


@dataclass
class TermsVersionDataclass:
    id: str
    version_number: int
    title: str
    content_hebrew: str
    content_english: str
    created_at: str
    created_by: str
    is_active: bool
    change_description: Optional[str] = None


@dataclass
class BoardDataclass:
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
class BoardMemberDataclass:
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
class ExpenseDataclass:
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
class DebtDataclass:
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
    original_amount: float = None
    paid_amount: float = 0.0


@dataclass
class NotificationDataclass:
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
    type: str = "expense_added"


@dataclass
class CategoryDataclass:
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
class InvitationDataclass:
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
class PendingRegistrationDataclass:
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


db = SQLAlchemy()


def generate_uuid():
    return str(uuid.uuid4())


# SQLAlchemy Models
class User(db.Model):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500), nullable=True)

    # Add new fields for terms acceptance
    accepted_terms = Column(Boolean, default=False, nullable=False)
    terms_accepted_at = Column(DateTime, nullable=True)
    terms_version_signed = Column(Integer, nullable=True)  # Track terms version number

    # Relationships
    owned_boards = relationship("Board", back_populates="owner", foreign_keys="Board.owner_id")
    board_memberships = relationship("BoardMember", back_populates="user", foreign_keys="BoardMember.user_id",
                                     primaryjoin="User.id == BoardMember.user_id")
    created_expenses = relationship("Expense", back_populates="creator", foreign_keys="Expense.created_by")
    paid_expenses = relationship("Expense", back_populates="payer", foreign_keys="Expense.paid_by")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
    # Add relationship for invitations sent by this user
    sent_board_invitations = relationship("Invitation", back_populates="inviter", foreign_keys="Invitation.invited_by")
    # Add relationship for board member invitations sent by this user
    sent_member_invitations = relationship("BoardMember", back_populates="inviter",
                                           foreign_keys="BoardMember.invited_by",
                                           primaryjoin="User.id == BoardMember.invited_by")
    # Add relationships for debts
    debts_as_from_user = relationship("Debt", back_populates="from_user", foreign_keys="Debt.from_user_id")
    debts_as_to_user = relationship("Debt", back_populates="to_user", foreign_keys="Debt.to_user_id")
    # Add relationship for categories created by this user
    created_categories = relationship("Category", back_populates="creator", foreign_keys="Category.created_by")
    # Add relationship for notifications created by this user
    created_notifications = relationship("Notification", back_populates="creator",
                                         foreign_keys="Notification.created_by")

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'password_hash': self.password_hash,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'email_verified': self.email_verified,
            'avatar_url': self.avatar_url,
            'accepted_terms': self.accepted_terms,
            'terms_accepted_at': self.terms_accepted_at if self.terms_accepted_at else None,
            'terms_version_signed': self.terms_version_signed
        }

    def to_dataclass(self) -> UserDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return UserDataclass(**self.to_dict())


class TermsVersion(db.Model):
    __tablename__ = 'terms_versions'

    id = Column(String, primary_key=True, default=generate_uuid)
    version_number = Column(Integer, unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content_hebrew = Column(Text, nullable=False)
    content_english = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    change_description = Column(Text, nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'version_number': self.version_number,
            'title': self.title,
            'content_hebrew': self.content_hebrew,
            'content_english': self.content_english,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active,
            'change_description': self.change_description,
        }

    def to_dataclass(self) -> TermsVersionDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return TermsVersionDataclass(**self.to_dict())


class Board(db.Model):
    __tablename__ = 'boards'

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default='')
    owner_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, default=lambda: {})
    currency = Column(String(10), default='ILS')
    timezone = Column(String(50), default='Asia/Jerusalem')
    board_type = Column(String(50), default='general')

    # Relationships
    owner = relationship("User", back_populates="owned_boards", foreign_keys=[owner_id])
    members = relationship("BoardMember", back_populates="board")
    expenses = relationship("Expense", back_populates="board")
    categories = relationship("Category", back_populates="board")
    notifications = relationship("Notification", back_populates="board")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active,
            'settings': self.settings or {},
            'currency': self.currency,
            'timezone': self.timezone,
            'board_type': self.board_type
        }

    def to_dataclass(self) -> BoardDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return BoardDataclass(**self.to_dict())


class BoardMember(db.Model):
    __tablename__ = 'board_members'

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    role = Column(String(50), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    invited_by = Column(String, ForeignKey('users.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    is_default_board = Column(Boolean, default=False)
    permissions = Column(JSON, default=lambda: [])

    # Relationships
    board = relationship("Board", back_populates="members")
    user = relationship("User", back_populates="board_memberships", foreign_keys=[user_id])
    inviter = relationship("User", back_populates="sent_member_invitations", foreign_keys=[invited_by])

    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'invited_by': self.invited_by,
            'is_active': self.is_active,
            'is_default_board': self.is_default_board,
            'permissions': self.permissions or []
        }

    def to_dataclass(self) -> BoardMemberDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return BoardMemberDataclass(**self.to_dict())


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(255), nullable=False)
    description = Column(Text, default='')
    paid_by = Column(String, ForeignKey('users.id'), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_recurring = Column(Boolean, default=False)
    frequency = Column(String(50), default='monthly')
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    receipt_url = Column(String(500), nullable=True)
    tags = Column(JSON, default=lambda: [])

    # Relationships
    board = relationship("Board", back_populates="expenses")
    creator = relationship("User", back_populates="created_expenses", foreign_keys=[created_by])
    payer = relationship("User", back_populates="paid_expenses", foreign_keys=[paid_by])
    debts = relationship("Debt", back_populates="expense")

    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'amount': self.amount,
            'category': self.category,
            'description': self.description,
            'paid_by': self.paid_by,
            'date': self.date.isoformat() if self.date else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_recurring': self.is_recurring,
            'frequency': self.frequency,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'receipt_url': self.receipt_url,
            'tags': self.tags or []
        }

    def to_dataclass(self) -> ExpenseDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return ExpenseDataclass(**self.to_dict())


class Debt(db.Model):
    __tablename__ = 'debts'

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    expense_id = Column(String, ForeignKey('expenses.id'), nullable=False)
    from_user_id = Column(String, ForeignKey('users.id'), nullable=False)
    to_user_id = Column(String, ForeignKey('users.id'), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, default='')
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    original_amount = Column(Float, nullable=True)  # Original debt amount before partial payments
    paid_amount = Column(Float, default=0.0)  # Total amount paid so far

    # Relationships
    expense = relationship("Expense", back_populates="debts")
    from_user = relationship("User", back_populates="debts_as_from_user", foreign_keys=[from_user_id])
    to_user = relationship("User", back_populates="debts_as_to_user", foreign_keys=[to_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'expense_id': self.expense_id,
            'from_user_id': self.from_user_id,
            'to_user_id': self.to_user_id,
            'amount': self.amount,
            'description': self.description,
            'is_paid': self.is_paid,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'original_amount': self.original_amount,
            'paid_amount': self.paid_amount
        }

    def to_dataclass(self) -> DebtDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return DebtDataclass(**self.to_dict())


class Category(db.Model):
    __tablename__ = 'categories'

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    name = Column(String(255), nullable=False)
    icon = Column(String(255), default='ellipsis-horizontal')
    color = Column(String(50), default='#9370DB')
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    board = relationship("Board", back_populates="categories")
    creator = relationship("User", back_populates="created_categories", foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'name': self.name,
            'icon': self.icon,
            'color': self.color,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_default': self.is_default,
            'is_active': self.is_active
        }

    def to_dataclass(self) -> CategoryDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return CategoryDataclass(**self.to_dict())


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    board_name = Column(String(255), nullable=False)
    expense_id = Column(String, nullable=True)
    expense_description = Column(Text, default='')
    amount = Column(Float, default=0)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    type = Column(String(50), default='expense_added')

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    board = relationship("Board", back_populates="notifications")
    creator = relationship("User", back_populates="created_notifications", foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'board_id': self.board_id,
            'board_name': self.board_name,
            'expense_id': self.expense_id,
            'expense_description': self.expense_description,
            'amount': self.amount,
            'created_by': self.created_by,
            'created_by_name': self.created_by_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_read': self.is_read,
            'type': self.type
        }

    def to_dataclass(self) -> NotificationDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return NotificationDataclass(**self.to_dict())


class Invitation(db.Model):
    __tablename__ = 'invitations'

    id = Column(String, primary_key=True, default=generate_uuid)
    board_id = Column(String, ForeignKey('boards.id'), nullable=False)
    email = Column(String(255), nullable=False)
    invited_by = Column(String, ForeignKey('users.id'), nullable=False)
    role = Column(String(50), nullable=False)
    token = Column(String, unique=True, default=generate_uuid)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    is_expired = Column(Boolean, default=False)

    # Relationships
    board = relationship("Board")
    inviter = relationship("User", back_populates="sent_board_invitations", foreign_keys=[invited_by])

    def to_dict(self):
        return {
            'id': self.id,
            'board_id': self.board_id,
            'email': self.email,
            'invited_by': self.invited_by,
            'role': self.role,
            'token': self.token,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'is_expired': self.is_expired
        }

    def to_dataclass(self) -> InvitationDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return InvitationDataclass(**self.to_dict())


class PendingRegistration(db.Model):
    __tablename__ = 'pending_registrations'

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    verification_code = Column(String(10), nullable=False)
    expiry_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    attempts = Column(Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'password_hash': self.password_hash,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'verification_code': self.verification_code,
            'expiry_time': self.expiry_time.isoformat() if self.expiry_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'attempts': self.attempts
        }

    def to_dataclass(self) -> PendingRegistrationDataclass:
        """Convert SQLAlchemy model to dataclass for compatibility"""
        return PendingRegistrationDataclass(**self.to_dict())


# PostgreSQL Database Manager (SQLAlchemy-based)
class PostgreSQLDatabaseManager:
    def __init__(self, app=None):
        self.db = db
        self.app = app
        # Don't call init_app here - it's already called in app.py

    def init_app(self, app):
        # Only initialize if not already initialized
        if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
            self.db.init_app(app)
        self.app = app

    def create_all(self):
        """Create all database tables"""
        if self.app:
            with self.app.app_context():
                self.db.create_all()
        else:
            self.db.create_all()

    def initialize_default_data(self):
        """Initialize default categories and admin user"""
        if not self.app:
            return
        with self.app.app_context():
            # Check if we already have users
            admin_user = None
            if User.query.first() is None:
                # Create default admin user
                admin_user = User(
                    email="admin@homis.com",
                    username="admin",
                    password_hash="",  # Will be set by auth system
                    first_name="Admin",
                    last_name="User",
                    is_active=True,
                    email_verified=True
                )
                self.db.session.add(admin_user)
                self.db.session.commit()
            else:
                # Get existing admin user
                admin_user = User.query.filter_by(email="admin@homis.com").first()
                if not admin_user:
                    # Create admin user if it doesn't exist
                    admin_user = User(
                        email="admin@homis.com",
                        username="admin",
                        password_hash="",  # Will be set by auth system
                        first_name="Admin",
                        last_name="User",
                        is_active=True,
                        email_verified=True
                    )
                    self.db.session.add(admin_user)
                    self.db.session.commit()

            # Check if we already have a global board for default categories
            global_board = Board.query.filter_by(name="Global Categories").first()
            if not global_board:
                # Create a global board for default categories
                global_board = Board(
                    name="Global Categories",
                    description="Default categories available to all users",
                    owner_id=admin_user.id,  # Use the actual admin user ID
                    board_type="global",
                    is_active=True
                )
                self.db.session.add(global_board)
                self.db.session.commit()

            # Check if we already have default categories
            if Category.query.filter_by(board_id=global_board.id).first() is None:
                # Create default categories
                default_categories = [
                    {
                        'board_id': global_board.id,  # Use the global board ID
                        'name': "חשמל",
                        'icon': "flash",
                        'color': "#FFD700",
                        'created_by': admin_user.id,  # Use the actual admin user ID
                        'is_default': True
                    },
                    {
                        'board_id': global_board.id,
                        'name': "מים",
                        'icon': "water",
                        'color': "#00BFFF",
                        'created_by': admin_user.id,
                        'is_default': True
                    },
                    {
                        'board_id': global_board.id,
                        'name': "ארנונה",
                        'icon': "home",
                        'color': "#32CD32",
                        'created_by': admin_user.id,
                        'is_default': True
                    },
                    {
                        'board_id': global_board.id,
                        'name': "סופר",
                        'icon': "cart",
                        'color': "#FF6347",
                        'created_by': admin_user.id,
                        'is_default': True
                    },
                    {
                        'board_id': global_board.id,
                        'name': "אחר",
                        'icon': "ellipsis-horizontal",
                        'color': "#9370DB",
                        'created_by': admin_user.id,
                        'is_default': True
                    }
                ]

                for category_data in default_categories:
                    category = Category(**category_data)
                    self.db.session.add(category)

                self.db.session.commit()

    # User methods
    def create_user(self, user_data: Dict) -> UserDataclass:
        user = User(
            email=user_data['email'],
            username=user_data['username'],
            password_hash=user_data['password_hash'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            accepted_terms=user_data.get('accepted_terms', False),
            terms_accepted_at=user_data.get('terms_accepted_at'),
            terms_version_signed=user_data.get('terms_version_signed')
        )
        self.db.session.add(user)
        self.db.session.commit()
        return user.to_dataclass()

    def get_user_by_id(self, user_id: str) -> Optional[UserDataclass]:
        user = User.query.get(user_id)
        return user.to_dataclass() if user else None

    def get_user_by_email(self, email: str) -> Optional[UserDataclass]:
        user = User.query.filter_by(email=email).first()
        return user.to_dataclass() if user else None

    def get_user_by_username(self, username: str) -> Optional[UserDataclass]:
        user = User.query.filter_by(username=username).first()
        return user.to_dataclass() if user else None

    def update_user(self, user_id: str, update_data: Dict) -> bool:
        user = User.query.get(user_id)
        if not user:
            return False

        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)

        user.updated_at = datetime.utcnow()
        self.db.session.commit()
        return True

    def update_user_password(self, user_id: str, password_hash: str) -> bool:
        user = User.query.get(user_id)
        if not user:
            return False

        user.password_hash = password_hash
        user.updated_at = datetime.utcnow()
        self.db.session.commit()
        return True

    # Board methods
    def create_board(self, board_data: Dict) -> BoardDataclass:
        board = Board(
            name=board_data['name'],
            description=board_data.get('description', ''),
            owner_id=board_data['owner_id'],
            settings=board_data.get('settings', {}),
            currency=board_data.get('currency', 'ILS'),
            timezone=board_data.get('timezone', 'Asia/Jerusalem'),
            board_type=board_data.get('board_type', 'general')
        )
        self.db.session.add(board)
        self.db.session.commit()

        # Add owner as board member
        self.add_board_member(
            board_id=board.id,
            user_id=board.owner_id,
            role=UserRole.OWNER.value,
            invited_by=board.owner_id
        )

        return board.to_dataclass()

    def get_board_by_id(self, board_id: str) -> Optional[BoardDataclass]:
        board = Board.query.get(board_id)
        return board.to_dataclass() if board else None

    def get_user_boards(self, user_id: str) -> List[BoardDataclass]:
        # Get boards where user is a member
        member_boards = (
            self.db.session.query(Board, BoardMember)
            .join(BoardMember, Board.id == BoardMember.board_id)
            .filter(
                BoardMember.user_id == user_id,
                BoardMember.is_active == True
            )
            .all()
        )

        boards = []
        for board, member in member_boards:
            board_obj = board.to_dataclass()
            # Add member-specific attributes
            board_obj.is_default_board = member.is_default_board
            board_obj.user_role = member.role
            boards.append(board_obj)

        return boards

    def update_board(self, board_id: str, update_data: Dict) -> bool:
        board = Board.query.get(board_id)
        if not board:
            return False

        for key, value in update_data.items():
            if hasattr(board, key):
                setattr(board, key, value)

        board.updated_at = datetime.utcnow()
        self.db.session.commit()
        return True

    def delete_board(self, board_id: str) -> bool:
        try:
            # Delete in proper order due to foreign key constraints
            Debt.query.filter_by(board_id=board_id).delete()
            Expense.query.filter_by(board_id=board_id).delete()
            Notification.query.filter_by(board_id=board_id).delete()
            Category.query.filter_by(board_id=board_id).delete()
            Invitation.query.filter_by(board_id=board_id).delete()
            BoardMember.query.filter_by(board_id=board_id).delete()
            Board.query.filter_by(id=board_id).delete()

            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error deleting board: {e}")
            return False

    # Board member methods
    def add_board_member(self, board_id: str, user_id: str, role: str, invited_by: str) -> BoardMemberDataclass:
        print(f"🔍 Creating BoardMember: board_id={board_id}, user_id={user_id}, role={role}, invited_by={invited_by}")

        # Check if member already exists
        existing_member = BoardMember.query.filter_by(
            board_id=board_id,
            user_id=user_id,
            is_active=True
        ).first()

        if existing_member:
            print(f"⚠️ Member already exists: {existing_member.id}")
            return existing_member.to_dataclass()

        permissions = self._get_permissions_for_role(role)
        print(f"🔍 Permissions for role {role}: {permissions}")

        member = BoardMember(
            board_id=board_id,
            user_id=user_id,
            role=role,
            invited_by=invited_by,
            permissions=permissions
        )

        print(f"🔍 BoardMember object created with ID: {member.id}")
        self.db.session.add(member)
        self.db.session.commit()

        # Verify it was saved
        saved_member = BoardMember.query.get(member.id)
        if saved_member:
            print(f"✅ BoardMember saved successfully: {saved_member.id}")
        else:
            print(f"❌ BoardMember was not saved properly")

        return member.to_dataclass()

    def get_board_members(self, board_id: str) -> List[BoardMemberDataclass]:
        members = BoardMember.query.filter_by(board_id=board_id, is_active=True).all()
        return [member.to_dataclass() for member in members]

    def get_user_role_in_board(self, user_id: str, board_id: str) -> Optional[str]:
        member = BoardMember.query.filter_by(
            user_id=user_id,
            board_id=board_id,
            is_active=True
        ).first()
        return member.role if member else None

    def update_board_member_role(self, member_id: str, new_role: str) -> bool:
        member = BoardMember.query.get(member_id)
        if not member:
            return False

        member.role = new_role
        member.permissions = self._get_permissions_for_role(new_role)
        self.db.session.commit()
        return True

    def remove_board_member(self, board_id: str, user_id: str) -> bool:
        member = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
        if not member:
            return False

        member.is_active = False
        self.db.session.commit()
        return True

    def set_default_board(self, user_id: str, board_id: str) -> bool:
        try:
            # Remove default flag from all user's boards
            BoardMember.query.filter_by(user_id=user_id).update({'is_default_board': False})

            # Set the specified board as default
            member = BoardMember.query.filter_by(user_id=user_id, board_id=board_id).first()
            if member:
                member.is_default_board = True
                self.db.session.commit()
                return True
            return False
        except Exception as e:
            self.db.session.rollback()
            print(f"Error setting default board: {e}")
            return False

    def get_user_default_board(self, user_id: str) -> Optional[BoardDataclass]:
        member = BoardMember.query.filter_by(
            user_id=user_id,
            is_default_board=True,
            is_active=True
        ).first()

        if not member:
            return None

        board = Board.query.get(member.board_id)
        return board.to_dataclass() if board else None

    def clear_default_board(self, user_id: str) -> bool:
        try:
            BoardMember.query.filter_by(user_id=user_id).update({'is_default_board': False})
            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error clearing default board: {e}")
            return False

    # Expense methods
    def create_expense(self, expense_data: Dict) -> ExpenseDataclass:
        # Handle date conversion
        date_val = expense_data.get('date')
        if isinstance(date_val, str):
            try:
                date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            except ValueError:
                date_val = datetime.utcnow()
        elif date_val is None:
            date_val = datetime.utcnow()

        expense = Expense(
            board_id=expense_data['board_id'],
            amount=expense_data['amount'],
            category=expense_data['category'],
            description=expense_data.get('description', ''),
            paid_by=expense_data['paid_by'],
            date=date_val,
            created_by=expense_data['created_by'],
            is_recurring=expense_data.get('is_recurring', False),
            frequency=expense_data.get('frequency', 'monthly'),
            start_date=self._parse_date(expense_data.get('start_date')),
            end_date=self._parse_date(expense_data.get('end_date')),
            receipt_url=expense_data.get('receipt_url'),
            tags=expense_data.get('tags', [])
        )
        self.db.session.add(expense)
        self.db.session.commit()
        return expense.to_dataclass()

    def get_board_expenses(self, board_id: str, month: int = None, year: int = None) -> List[ExpenseDataclass]:
        query = Expense.query.filter_by(board_id=board_id)

        if month is not None and year is not None:
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)

            query = query.filter(Expense.date >= start_date, Expense.date < end_date)

        expenses = query.order_by(Expense.created_at.desc()).all()
        return [expense.to_dataclass() for expense in expenses]

    def get_expense_by_id(self, expense_id: str) -> ExpenseDataclass:
        """Get a single expense by ID"""
        expense = Expense.query.get(expense_id)
        if expense:
            return expense.to_dataclass()
        return None

    def update_expense(self, expense_id: str, update_data: Dict) -> bool:
        expense = Expense.query.get(expense_id)
        if not expense:
            return False

        for key, value in update_data.items():
            if hasattr(expense, key):
                if key in ['date', 'start_date', 'end_date'] and isinstance(value, str):
                    value = self._parse_date(value)
                setattr(expense, key, value)

        expense.updated_at = datetime.utcnow()
        self.db.session.commit()
        return True

    def delete_expense(self, expense_id: str) -> bool:
        try:
            # Check if there are any paid debts associated with this expense
            paid_debts = Debt.query.filter_by(expense_id=expense_id, is_paid=True).all()

            if paid_debts:
                print(f"❌ Cannot delete expense {expense_id}: has {len(paid_debts)} paid debt(s)")
                return False

            # Delete associated unpaid debts first
            Debt.query.filter_by(expense_id=expense_id, is_paid=False).delete()

            # Delete the expense
            Expense.query.filter_by(id=expense_id).delete()

            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error deleting expense: {e}")
            return False

    # Debt methods
    def create_debt(self, debt_data: Dict) -> DebtDataclass:
        debt = Debt(
            board_id=debt_data['board_id'],
            expense_id=debt_data['expense_id'],
            from_user_id=debt_data['from_user_id'],
            to_user_id=debt_data['to_user_id'],
            amount=debt_data['amount'],
            description=debt_data.get('description', ''),
            original_amount=debt_data['amount'],  # Set original amount to initial amount
            paid_amount=0.0  # Initialize paid amount to 0
        )
        self.db.session.add(debt)
        self.db.session.commit()
        return debt.to_dataclass()

    def get_user_debts(self, user_id: str, board_id: str = None) -> List[DebtDataclass]:
        query = Debt.query.filter(
            (Debt.from_user_id == user_id) | (Debt.to_user_id == user_id)
        )

        if board_id:
            query = query.filter_by(board_id=board_id)

        debts = query.order_by(Debt.created_at.desc()).all()
        return [debt.to_dataclass() for debt in debts]

    def get_debts_between_users(self, user1_id: str, user2_id: str, board_id: str = None) -> List[DebtDataclass]:
        """Get all debts between two specific users"""
        query = Debt.query.filter(
            (
                (Debt.from_user_id == user1_id) & (Debt.to_user_id == user2_id)
            ) | (
                (Debt.from_user_id == user2_id) & (Debt.to_user_id == user1_id)
            )
        )

        if board_id:
            query = query.filter_by(board_id=board_id)

        debts = query.order_by(Debt.created_at.desc()).all()
        return [debt.to_dataclass() for debt in debts]

    def process_partial_payment_for_user(self, from_user_id: str, to_user_id: str, payment_amount: float,
                                         board_ids: List[str] = None) -> Dict:
        """
        Process partial payment from one user to another.
        Returns info about which debts were closed/updated.
        """
        try:
            # Get all unpaid debts from the user to the creditor
            query = Debt.query.filter(
                Debt.from_user_id == from_user_id,
                Debt.to_user_id == to_user_id,
                Debt.is_paid == False
            )

            if board_ids:
                query = query.filter(Debt.board_id.in_(board_ids))

            # Order by created_at (oldest first) to prioritize older debts
            unpaid_debts = query.order_by(Debt.created_at.asc()).all()

            if not unpaid_debts:
                return {
                    'success': False,
                    'error': 'No unpaid debts found between these users',
                    'debts_closed': [],
                    'debts_updated': []
                }

            # Calculate total debt amount
            total_debt = sum(debt.amount for debt in unpaid_debts)

            if payment_amount > total_debt:
                return {
                    'success': False,
                    'error': f'Payment amount ({payment_amount}) exceeds total debt ({total_debt})',
                    'debts_closed': [],
                    'debts_updated': []
                }

            # Process payment - first try to close full debts, then partial
            remaining_payment = payment_amount
            debts_closed = []
            debts_updated = []

            # First pass: close debts that can be fully paid
            for debt in unpaid_debts:
                if remaining_payment <= 0:
                    break

                if debt.amount <= remaining_payment:
                    # Fully pay this debt
                    debt.is_paid = True
                    debt.paid_at = datetime.utcnow()
                    debt.paid_amount = debt.original_amount or debt.amount
                    remaining_payment -= debt.amount
                    debts_closed.append({
                        'debt_id': debt.id,
                        'original_amount': debt.original_amount or debt.amount,
                        'amount_paid': debt.amount,
                        'description': debt.description
                    })

            # Second pass: if there's remaining payment, apply to largest remaining debt
            if remaining_payment > 0:
                # Find the largest unpaid debt that hasn't been fully paid yet
                remaining_debts = [d for d in unpaid_debts if not d.is_paid and d.amount > 0]
                if remaining_debts:
                    # Sort by amount (largest first) to prioritize bigger debts for partial payment
                    remaining_debts.sort(key=lambda x: x.amount, reverse=True)
                    debt_to_update = remaining_debts[0]

                    # Update this debt with partial payment
                    old_amount = debt_to_update.amount
                    debt_to_update.amount -= remaining_payment
                    debt_to_update.paid_amount += remaining_payment

                    if debt_to_update.original_amount is None:
                        debt_to_update.original_amount = old_amount + remaining_payment

                    debts_updated.append({
                        'debt_id': debt_to_update.id,
                        'original_amount': debt_to_update.original_amount,
                        'amount_paid': remaining_payment,
                        'remaining_amount': debt_to_update.amount,
                        'description': debt_to_update.description
                    })

                    remaining_payment = 0

            self.db.session.commit()

            return {
                'success': True,
                'debts_closed': debts_closed,
                'debts_updated': debts_updated,
                'total_processed': payment_amount - remaining_payment
            }

        except Exception as e:
            self.db.session.rollback()
            print(f"Error processing partial payment: {e}")
            return {
                'success': False,
                'error': str(e),
                'debts_closed': [],
                'debts_updated': []
            }

    def mark_debt_as_paid(self, debt_id: str) -> bool:
        debt = Debt.query.get(debt_id)
        if not debt:
            return False

        debt.is_paid = True
        debt.paid_at = datetime.utcnow()
        debt.updated_at = datetime.utcnow()
        # Set paid_amount to original amount if not set
        if debt.original_amount is None:
            debt.original_amount = debt.amount
        debt.paid_amount = debt.original_amount
        self.db.session.commit()
        return True

    def migrate_existing_debts_to_new_format(self):
        """
        Migrate existing debts to include original_amount and paid_amount fields
        """
        try:
            # Find all debts that don't have original_amount set
            debts_to_migrate = Debt.query.filter(Debt.original_amount.is_(None)).all()

            print(f"📊 Migrating {len(debts_to_migrate)} existing debts to new format...")

            for debt in debts_to_migrate:
                # Set original_amount to current amount
                debt.original_amount = debt.amount

                # Set paid_amount based on payment status
                if debt.is_paid:
                    debt.paid_amount = debt.amount
                else:
                    debt.paid_amount = 0.0

            self.db.session.commit()
            print(f"✅ Successfully migrated {len(debts_to_migrate)} debts")
            return True

        except Exception as e:
            self.db.session.rollback()
            print(f"❌ Error migrating debts: {e}")
            return False

    # Category methods
    def create_category(self, category_data: Dict) -> CategoryDataclass:
        category = Category(
            board_id=category_data['board_id'],
            name=category_data['name'],
            icon=category_data['icon'],
            color=category_data['color'],
            created_by=category_data['created_by'],
            is_default=category_data.get('is_default', False)
        )
        self.db.session.add(category)
        self.db.session.commit()
        return category.to_dataclass()

    def get_board_categories(self, board_id: str) -> List[CategoryDataclass]:
        categories = Category.query.filter_by(
            board_id=board_id,
            is_active=True
        ).all()
        return [category.to_dataclass() for category in categories]

    # Notification methods
    def create_notification(self, notification_data: Dict) -> NotificationDataclass:
        notification = Notification(
            user_id=notification_data['user_id'],
            board_id=notification_data['board_id'],
            board_name=notification_data['board_name'],
            expense_id=notification_data.get('expense_id', ''),
            expense_description=notification_data.get('expense_description', ''),
            amount=notification_data.get('amount', 0),
            created_by=notification_data['created_by'],
            created_by_name=notification_data['created_by_name'],
            type=notification_data.get('type', 'expense_added')
        )
        self.db.session.add(notification)
        self.db.session.commit()
        return notification.to_dataclass()

    def get_user_notifications(self, user_id: str) -> List[NotificationDataclass]:
        notifications = (
            Notification.query
            .filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )
        return [notification.to_dataclass() for notification in notifications]

    def mark_notification_as_read(self, notification_id: str) -> bool:
        notification = Notification.query.get(notification_id)
        if not notification:
            return False

        notification.is_read = True
        self.db.session.commit()
        return True

    def mark_all_user_notifications_as_read(self, user_id: str) -> bool:
        try:
            Notification.query.filter_by(user_id=user_id).update({'is_read': True})
            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error marking notifications as read: {e}")
            return False

    def delete_notification(self, notification_id: str) -> bool:
        try:
            Notification.query.filter_by(id=notification_id).delete()
            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error deleting notification: {e}")
            return False

    def create_expense_notification(self, expense: ExpenseDataclass, board_members: List[BoardMemberDataclass],
                                    notification_type: str = 'expense_added'):
        """Create notifications for all board members except the creator"""
        # Get board info
        board = Board.query.get(expense.board_id)
        if not board:
            return

        # Get creator info
        creator = User.query.get(expense.created_by)
        if not creator:
            return

        creator_name = f"{creator.first_name} {creator.last_name}".strip()
        if not creator_name:
            creator_name = creator.username or 'משתמש'

        # Create notification for each member except the creator
        for member in board_members:
            if member.user_id != expense.created_by:
                notification_data = {
                    'user_id': member.user_id,
                    'board_id': expense.board_id,
                    'board_name': board.name,
                    'expense_id': expense.id,
                    'expense_description': expense.description,
                    'amount': expense.amount,
                    'created_by': expense.created_by,
                    'created_by_name': creator_name,
                    'type': notification_type
                }
                self.create_notification(notification_data)

    # Pending Registration methods
    def create_pending_registration(self, registration_data: Dict) -> PendingRegistrationDataclass:
        pending_reg = PendingRegistration(
            email=registration_data['email'],
            username=registration_data['username'],
            password_hash=registration_data['password_hash'],
            first_name=registration_data['first_name'],
            last_name=registration_data['last_name'],
            verification_code=registration_data['verification_code'],
            expiry_time=self._parse_date(registration_data['expiry_time']),
            attempts=registration_data.get('attempts', 0)
        )
        self.db.session.add(pending_reg)
        self.db.session.commit()
        return pending_reg.to_dataclass()

    def store_pending_registration(self, key: str, registration_data: Dict) -> bool:
        try:
            pending_reg = PendingRegistration(
                email=key,  # Use the key as email for identification
                username="",  # Not needed for password reset
                password_hash="",  # Not needed for password reset
                first_name="",  # Not needed for password reset
                last_name="",  # Not needed for password reset
                verification_code=registration_data['verification_code'],
                expiry_time=self._parse_date(registration_data['expiry_time']),
                attempts=registration_data.get('attempts', 0)
            )
            self.db.session.add(pending_reg)
            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error storing pending registration: {e}")
            return False

    def get_pending_registration(self, email: str) -> Optional[PendingRegistrationDataclass]:
        pending_reg = PendingRegistration.query.filter_by(email=email).first()
        return pending_reg.to_dataclass() if pending_reg else None

    def get_pending_registration_by_username(self, username: str) -> Optional[PendingRegistrationDataclass]:
        pending_reg = PendingRegistration.query.filter_by(username=username).first()
        return pending_reg.to_dataclass() if pending_reg else None

    def update_pending_registration_attempts(self, email: str, attempts: int) -> bool:
        try:
            pending_reg = PendingRegistration.query.filter_by(email=email).first()
            if pending_reg:
                pending_reg.attempts = attempts
                self.db.session.commit()
                return True
            return False
        except Exception as e:
            self.db.session.rollback()
            print(f"Error updating pending registration attempts: {e}")
            return False

    def delete_pending_registration(self, email: str) -> bool:
        try:
            PendingRegistration.query.filter_by(email=email).delete()
            self.db.session.commit()
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"Error deleting pending registration: {e}")
            return False

    def delete_user(self, user_id: str) -> bool:
        """Delete user and all related data"""
        try:
            print(f"🗑️ Starting deletion of user {user_id}")

            # Get user info for logging
            user = User.query.get(user_id)
            if not user:
                print(f"❌ User {user_id} not found")
                return False

            print(f"🗑️ Deleting user: {user.email}")

            # Delete all data in the correct order to avoid foreign key constraint issues
            # First, get all boards owned by this user to delete their data
            owned_boards = Board.query.filter_by(owner_id=user_id).all()
            owned_board_ids = [board.id for board in owned_boards]

            if owned_board_ids:
                print(f"🗑️ User owns {len(owned_board_ids)} board(s)")

                # Delete all data from owned boards first
                for board_id in owned_board_ids:
                    print(f"🗑️ Deleting data from board {board_id}")

                    # Delete invitations for this board first (to avoid foreign key constraint)
                    invitations_deleted = Invitation.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {invitations_deleted} invitation(s)")

                    # Delete debts in this board
                    debts_deleted = Debt.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {debts_deleted} debt(s)")

                    # Delete expenses in this board
                    expenses_deleted = Expense.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {expenses_deleted} expense(s)")

                    # Delete categories in this board
                    categories_deleted = Category.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {categories_deleted} categor(ies)")

                    # Delete notifications for this board
                    notifications_deleted = Notification.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {notifications_deleted} notification(s)")

                    # Delete board members for this board
                    board_members_deleted = BoardMember.query.filter_by(board_id=board_id).delete()
                    print(f"   Deleted {board_members_deleted} board member(s)")

                # Now delete the owned boards
                boards_deleted = Board.query.filter_by(owner_id=user_id).delete()
                print(f"🗑️ Deleted {boards_deleted} owned board(s)")

            # Delete user's debts in other boards
            debts_deleted = Debt.query.filter(
                (Debt.from_user_id == user_id) | (Debt.to_user_id == user_id)
            ).delete()
            print(f"🗑️ Deleted {debts_deleted} debt(s) in other boards")

            # Delete user's expenses in other boards
            expenses_deleted = Expense.query.filter(
                (Expense.created_by == user_id) | (Expense.paid_by == user_id)
            ).delete()
            print(f"🗑️ Deleted {expenses_deleted} expense(s) in other boards")

            # Delete user's categories in other boards
            categories_deleted = Category.query.filter_by(created_by=user_id).delete()
            print(f"🗑️ Deleted {categories_deleted} categor(ies) in other boards")

            # Delete user's notifications
            notifications_deleted = Notification.query.filter(
                (Notification.user_id == user_id) | (Notification.created_by == user_id)
            ).delete()
            print(f"🗑️ Deleted {notifications_deleted} notification(s)")

            # Delete user's invitations (only those sent by the user, not board invitations)
            invitations_deleted = Invitation.query.filter_by(invited_by=user_id).delete()
            print(f"🗑️ Deleted {invitations_deleted} invitation(s) sent by user")

            # Remove user from board memberships in other boards
            board_members_deleted = BoardMember.query.filter_by(user_id=user_id).delete()
            print(f"🗑️ Removed from {board_members_deleted} board(s)")

            # Delete user account
            print(f"🗑️ About to delete user account with ID: {user_id}")
            user_deleted = User.query.filter_by(id=user_id).delete()
            print(f"🗑️ User.delete() returned: {user_deleted}")

            if user_deleted:
                # Force flush to ensure changes are written to database
                print(f"🗑️ Flushing session...")
                self.db.session.flush()
                print(f"✅ Flush completed")

                # Force commit to ensure changes are saved
                print(f"🗑️ Forcing commit...")
                self.db.session.commit()
                print(f"✅ Commit completed")

                # Clear session to ensure fresh data
                print(f"🗑️ Clearing session...")
                self.db.session.expire_all()
                print(f"✅ Session cleared")

                # Verify deletion with fresh query
                print(f"🗑️ Verifying deletion...")
                verify_user = User.query.get(user_id)
                if verify_user:
                    print(f"❌ User still exists after commit! ID: {verify_user.id}, Email: {verify_user.email}")
                    return False
                else:
                    print(f"✅ User deletion verified - user no longer exists")
                    return True
            else:
                print(f"❌ Failed to delete user account")
                return False

        except Exception as e:
            print(f"❌ Error deleting user {user_id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    def cleanup_expired_pending_registrations(self):
        """Remove expired pending registrations"""
        if not self.app:
            return
        with self.app.app_context():
            try:
                current_time = datetime.utcnow()
                expired_count = PendingRegistration.query.filter(
                    PendingRegistration.expiry_time < current_time
                ).delete()
                self.db.session.commit()
                if expired_count > 0:
                    print(f"🗑️ Cleaned up {expired_count} expired registration(s)")
            except Exception as e:
                self.db.session.rollback()
                print(f"Error cleaning up expired registrations: {e}")

    # Invitation methods
    def create_invitation(self, invitation_data: Dict) -> InvitationDataclass:
        invitation = Invitation(
            board_id=invitation_data['board_id'],
            email=invitation_data['email'],
            invited_by=invitation_data['invited_by'],
            role=invitation_data['role'],
            expires_at=self._parse_date(invitation_data['expires_at'])
        )
        self.db.session.add(invitation)
        self.db.session.commit()
        return invitation.to_dataclass()

    def get_invitation_by_token(self, token: str) -> Optional[InvitationDataclass]:
        invitation = Invitation.query.filter_by(token=token).first()
        return invitation.to_dataclass() if invitation else None

    def get_pending_invitations_by_email(self, email: str) -> List[InvitationDataclass]:
        """Get all pending invitations for an email address"""
        print(f"🔍 Searching for pending invitations for email: {email.lower()}")

        # Get all invitations for this email (for debugging)
        all_invitations = Invitation.query.filter_by(email=email.lower()).all()
        print(f"🔍 Total invitations for this email: {len(all_invitations)}")

        for inv in all_invitations:
            print(
                f"🔍 Invitation {inv.id}: accepted_at={inv.accepted_at}, is_expired={inv.is_expired}, expires_at={inv.expires_at}")

        invitations = Invitation.query.filter_by(
            email=email.lower(),
            accepted_at=None,
            is_expired=False
        ).filter(
            Invitation.expires_at > datetime.utcnow()
        ).all()

        print(f"🔍 Pending invitations found: {len(invitations)}")
        return [invitation.to_dataclass() for invitation in invitations]

    def accept_invitation(self, invitation_id: str, user_id: str) -> bool:
        try:
            print(f"🔍 Accept invitation: Looking for invitation {invitation_id}")
            invitation = Invitation.query.get(invitation_id)
            if not invitation:
                print(f"❌ Invitation {invitation_id} not found")
                return False

            print(
                f"🔍 Found invitation: board_id={invitation.board_id}, role={invitation.role}, invited_by={invitation.invited_by}")

            # Add user to board
            print(f"🔍 Adding user {user_id} to board {invitation.board_id} with role {invitation.role}")
            member = self.add_board_member(
                board_id=invitation.board_id,
                user_id=user_id,
                role=invitation.role,
                invited_by=invitation.invited_by
            )
            print(f"🔍 Board member created: {member.id}")

            # Mark invitation as accepted
            invitation.accepted_at = datetime.utcnow()
            self.db.session.commit()
            print(f"✅ Invitation {invitation_id} accepted successfully")
            return True
        except Exception as e:
            self.db.session.rollback()
            print(f"❌ Error accepting invitation: {e}")
            import traceback
            traceback.print_exc()
            return False

    # Helper methods
    def _get_permissions_for_role(self, role: str) -> List[str]:
        """Get permissions for a given role"""
        permissions_map = {
            UserRole.OWNER.value: [BoardPermission.READ.value, BoardPermission.WRITE.value, BoardPermission.ADMIN.value,
                                   BoardPermission.OWNER.value],
            UserRole.ADMIN.value: [BoardPermission.READ.value, BoardPermission.WRITE.value,
                                   BoardPermission.ADMIN.value],
            UserRole.MEMBER.value: [BoardPermission.READ.value, BoardPermission.WRITE.value],
            UserRole.VIEWER.value: [BoardPermission.READ.value]
        }
        return permissions_map.get(role, [])

    def user_has_permission(self, user_id: str, board_id: str, permission: str) -> bool:
        """Check if user has specific permission in board"""
        member = BoardMember.query.filter_by(
            user_id=user_id,
            board_id=board_id,
            is_active=True
        ).first()

        if not member:
            return False

        # Board owner has all permissions
        if member.role == UserRole.OWNER.value:
            return True

        return permission in (member.permissions or [])

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime object"""
        if not date_str:
            return None

        try:
            if isinstance(date_str, str):
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return date_str
        except (ValueError, AttributeError):
            return None

    # Compatibility layer for TinyDB-style access
    @property
    def users_table(self):
        """Compatibility property for direct table access"""

        class UserQuery:
            def search(self, condition):
                # This is a stub - should not be used in PostgreSQL
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return User.query.all()

        return UserQuery()

    @property
    def boards_table(self):
        """Compatibility property for direct table access"""

        class BoardQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Board.query.all()

        return BoardQuery()

    @property
    def board_members_table(self):
        """Compatibility property for direct table access"""

        class BoardMemberQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return BoardMember.query.all()

        return BoardMemberQuery()

    @property
    def expenses_table(self):
        """Compatibility property for direct table access"""

        class ExpenseQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Expense.query.all()

        return ExpenseQuery()

    @property
    def debts_table(self):
        """Compatibility property for direct table access"""

        class DebtQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Debt.query.all()

        return DebtQuery()

    @property
    def categories_table(self):
        """Compatibility property for direct table access"""

        class CategoryQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Category.query.all()

        return CategoryQuery()

    @property
    def notifications_table(self):
        """Compatibility property for direct table access"""

        class NotificationQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Notification.query.all()

        return NotificationQuery()

    @property
    def pending_registrations_table(self):
        """Compatibility property for direct table access"""

        class PendingRegistrationQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return PendingRegistration.query.all()

        return PendingRegistrationQuery()

    @property
    def invitations_table(self):
        """Compatibility property for direct table access"""

        class InvitationQuery:
            def search(self, condition):
                raise NotImplementedError("Use proper SQLAlchemy queries instead")

            def all(self):
                return Invitation.query.all()

        return InvitationQuery()

    def auto_offset_mutual_debts(self, user_id: str, board_ids: List[str] = None) -> Dict:
        """
        Automatically offset mutual debts between ALL users in the specified boards.
        For example: if User A owes User B 20₪ and User B owes User A 18₪,
        the result will be User A owes User B 2₪ (the rest is offset).
        """
        try:
            # Get all unpaid debts in specified boards (not just for current user)
            query = Debt.query.filter(Debt.is_paid == False)

            if board_ids:
                query = query.filter(Debt.board_id.in_(board_ids))
                print(f"🔍 Auto offset: Looking for debts in boards: {board_ids}")
            else:
                print("🔍 Auto offset: Looking for debts in ALL boards")

            all_debts = query.all()
            print(f"🔍 Auto offset: Found {len(all_debts)} unpaid debts")

            if not all_debts:
                return {
                    'success': True,
                    'offsets_processed': 0,
                    'total_amount_offset': 0,
                    'details': []
                }

            # Group debts by user pairs - create a comprehensive mapping
            user_pairs = {}

            for debt in all_debts:
                from_user = debt.from_user_id
                to_user = debt.to_user_id

                # Skip self-debts
                if from_user == to_user:
                    continue

                # Create a consistent pair key (smaller ID first)
                pair_key = tuple(sorted([from_user, to_user]))

                if pair_key not in user_pairs:
                    user_pairs[pair_key] = {
                        pair_key[0]: [],  # debts where user[0] owes user[1]
                        pair_key[1]: []  # debts where user[1] owes user[0]
                    }

                # Add debt to appropriate category
                if from_user == pair_key[0]:
                    user_pairs[pair_key][pair_key[0]].append(debt)  # user[0] owes user[1]
                else:
                    user_pairs[pair_key][pair_key[1]].append(debt)  # user[1] owes user[0]

            offsets_processed = 0
            total_amount_offset = 0
            offset_details = []

            # Process each user pair
            for pair_key, debt_data in user_pairs.items():
                user1_id, user2_id = pair_key

                # Calculate totals for each direction
                user1_owes_user2 = sum(debt.amount for debt in debt_data[user1_id])
                user2_owes_user1 = sum(debt.amount for debt in debt_data[user2_id])

                # Only process if there are mutual debts
                if user1_owes_user2 > 0 and user2_owes_user1 > 0:
                    offset_amount = min(user1_owes_user2, user2_owes_user1)

                    if offset_amount > 0:
                        # Process the offset
                        remaining_offset = offset_amount

                        # First, close smaller debts completely
                        all_mutual_debts = debt_data[user1_id] + debt_data[user2_id]
                        all_mutual_debts.sort(key=lambda x: x.amount)  # Smallest first

                        for debt in all_mutual_debts:
                            if remaining_offset <= 0:
                                break

                            if debt.amount <= remaining_offset:
                                # Close this debt completely
                                # Set original_amount if not set
                                if debt.original_amount is None:
                                    debt.original_amount = debt.amount
                                
                                print(f"💰 Auto offset - Closing debt completely:")
                                print(f"   Debt ID: {debt.id}")
                                print(f"   From: {debt.from_user_id} To: {debt.to_user_id}")
                                print(f"   Original amount: {debt.original_amount}")
                                print(f"   Current amount: {debt.amount}")
                                print(f"   Offset applied: {debt.amount}")
                                
                                debt.is_paid = True
                                debt.paid_at = datetime.utcnow()
                                debt.updated_at = datetime.utcnow()
                                debt.paid_amount = debt.original_amount  # Full amount paid
                                remaining_offset -= debt.amount
                                
                                print(f"   Final state: is_paid={debt.is_paid}, paid_amount={debt.paid_amount}")
                            else:
                                # Partially reduce this debt
                                old_amount = debt.amount
                                
                                print(f"💰 Auto offset - Partially reducing debt:")
                                print(f"   Debt ID: {debt.id}")
                                print(f"   From: {debt.from_user_id} To: {debt.to_user_id}")
                                print(f"   Original amount: {debt.original_amount}")
                                print(f"   Current amount before: {old_amount}")
                                print(f"   Offset applied: {remaining_offset}")
                                
                                debt.amount -= remaining_offset
                                debt.paid_amount += remaining_offset
                                debt.updated_at = datetime.utcnow()

                                if debt.original_amount is None:
                                    debt.original_amount = old_amount + remaining_offset

                                print(f"   Current amount after: {debt.amount}")
                                print(f"   Total paid amount: {debt.paid_amount}")
                                print(f"   Original amount: {debt.original_amount}")
                                
                                remaining_offset = 0

                        # Get user names for the detail report
                        user1 = User.query.get(user1_id)
                        user2 = User.query.get(user2_id)
                        user1_name = f"{user1.first_name} {user1.last_name}" if user1 else "משתמש לא ידוע"
                        user2_name = f"{user2.first_name} {user2.last_name}" if user2 else "משתמש לא ידוע"

                        # Calculate remaining debt after offset
                        remaining_user1_owes = user1_owes_user2 - offset_amount if user1_owes_user2 >= offset_amount else 0
                        remaining_user2_owes = user2_owes_user1 - offset_amount if user2_owes_user1 >= offset_amount else 0
                        net_remaining = remaining_user1_owes - remaining_user2_owes

                        # Determine direction and amount
                        if net_remaining > 0:
                            direction = 'user1_owes_user2'
                            remaining_debt = net_remaining
                        elif net_remaining < 0:
                            direction = 'user2_owes_user1'
                            remaining_debt = abs(net_remaining)
                        else:
                            direction = 'balanced'
                            remaining_debt = 0

                        offset_details.append({
                            'user1_name': user1_name,
                            'user2_name': user2_name,
                            'offset_amount': offset_amount,
                            'remaining_debt': remaining_debt,
                            'direction': direction
                        })

                        offsets_processed += 1
                        total_amount_offset += offset_amount

                        print(f"💰 Offset processed: {user1_name} ↔ {user2_name}, amount: {offset_amount}")
                        print(f"   Before: {user1_name} owed {user1_owes_user2}, {user2_name} owed {user2_owes_user1}")
                        print(f"   After: net remaining = {remaining_debt} ({direction})")

            # Commit all changes
            self.db.session.commit()
            print(f"🔄 Auto offset completed: {offsets_processed} pairs processed, {total_amount_offset} total offset")

            return {
                'success': True,
                'offsets_processed': offsets_processed,
                'total_amount_offset': total_amount_offset,
                'details': offset_details
            }

        except Exception as e:
            self.db.session.rollback()
            print(f"Error in auto_offset_mutual_debts: {e}")
            return {
                'success': False,
                'error': str(e),
                'offsets_processed': 0,
                'total_amount_offset': 0,
                'details': []
            }
