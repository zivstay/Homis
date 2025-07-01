# Professional Expense Manager Backend

A production-ready Flask-based REST API backend for the Hebrew expense management app (Homis). This backend provides a complete multi-tenant solution with authentication, authorization, and professional-grade features.

## 🚀 Features

### 🔐 Authentication & Security
- **JWT-based Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **CORS Support** for cross-origin requests
- **Input Validation** and sanitization

### 🏢 Multi-Tenant Architecture
- **Board-based Organization** - Each expense group is a separate board
- **User Management** - Complete user registration and profile management
- **Role-based Permissions** - Owner, Admin, Member, and Viewer roles
- **Board Invitations** - Invite users to boards with email notifications

### 💰 Expense Management
- **Multi-board Expenses** - Organize expenses by different groups/projects
- **Automatic Debt Calculation** - Split expenses among board members
- **Recurring Expenses** - Set up monthly, weekly, or custom recurring expenses
- **Category Management** - Custom categories per board with icons and colors
- **Receipt Upload** - Support for expense receipts
- **Tags System** - Tag expenses for better organization

### 📊 Advanced Features
- **Month-based Filtering** - View expenses by specific months
- **Debt Tracking** - Automatic debt creation and settlement tracking
- **Currency Support** - Multi-currency support per board
- **Timezone Support** - Board-specific timezone settings
- **Data Export** - Export expense data for reporting

### 🛡️ Production Features
- **Environment Configuration** - Development, testing, and production configs
- **Error Handling** - Comprehensive error handling and logging
- **Database Management** - TinyDB with automatic data initialization
- **API Documentation** - Complete endpoint documentation

## 🏗️ Architecture

### Multi-Tenant Design
```
Users → Boards → Expenses → Debts
  ↓       ↓        ↓        ↓
Profiles Members Categories Settlements
```

### Permission System
- **Owner**: Full control over board, can delete board, manage all members
- **Admin**: Can manage expenses, categories, and members
- **Member**: Can add/edit expenses and view all data
- **Viewer**: Read-only access to board data

## 🛠️ Setup

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables (optional):**
   ```bash
   # Create .env file
   echo "FLASK_ENV=development" > .env
   echo "SECRET_KEY=your-secret-key-here" >> .env
   echo "JWT_SECRET_KEY=your-jwt-secret-key-here" >> .env
   ```

4. **Run the Flask application:**
   ```bash
   python app.py
   ```

The server will start on `http://localhost:5000`

### Quick Start Scripts
- **Windows**: Double-click `start.bat` or run `.\start.ps1` in PowerShell
- **Linux/Mac**: Run `python app.py`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Board Management

#### Create Board
```http
POST /api/boards
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Apartment Expenses",
  "description": "Shared apartment expenses",
  "currency": "ILS",
  "timezone": "Asia/Jerusalem"
}
```

#### Get User Boards
```http
GET /api/boards
Authorization: Bearer <access_token>
```

#### Get Board Details
```http
GET /api/boards/{board_id}
Authorization: Bearer <access_token>
```

#### Update Board
```http
PUT /api/boards/{board_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Board Name",
  "description": "Updated description"
}
```

### Member Management

#### Get Board Members
```http
GET /api/boards/{board_id}/members
Authorization: Bearer <access_token>
```

#### Invite Member
```http
POST /api/boards/{board_id}/members
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "member"
}
```

#### Remove Member
```http
DELETE /api/boards/{board_id}/members/{user_id}
Authorization: Bearer <access_token>
```

### Expense Management

#### Create Expense
```http
POST /api/boards/{board_id}/expenses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 500,
  "category": "חשמל",
  "description": "חשבון חשמל חודשי",
  "paid_by": "user_id",
  "is_recurring": true,
  "frequency": "monthly",
  "tags": ["בית", "חובה"]
}
```

#### Get Board Expenses
```http
GET /api/boards/{board_id}/expenses
Authorization: Bearer <access_token>

# With month/year filtering
GET /api/boards/{board_id}/expenses?month=12&year=2024
```

#### Update Expense
```http
PUT /api/boards/{board_id}/expenses/{expense_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 550,
  "description": "Updated description"
}
```

#### Delete Expense
```http
DELETE /api/boards/{board_id}/expenses/{expense_id}
Authorization: Bearer <access_token>
```

### Category Management

#### Get Board Categories
```http
GET /api/boards/{board_id}/categories
Authorization: Bearer <access_token>
```

#### Create Category
```http
POST /api/boards/{board_id}/categories
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "בילויים",
  "icon": "happy",
  "color": "#FF69B4"
}
```

### Debt Management

#### Get Board Debts
```http
GET /api/boards/{board_id}/debts
Authorization: Bearer <access_token>
```

#### Mark Debt as Paid
```http
PUT /api/boards/{board_id}/debts/{debt_id}/mark-paid
Authorization: Bearer <access_token>
```

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts and profiles
- **boards**: Expense boards/projects
- **board_members**: Board membership and roles
- **expenses**: Expense records
- **debts**: Debt tracking between members
- **categories**: Expense categories
- **invitations**: Board invitations

### Data Models

#### User
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "is_active": true,
  "email_verified": false
}
```

#### Board
```json
{
  "id": "uuid",
  "name": "Apartment Expenses",
  "description": "Shared expenses",
  "owner_id": "user_uuid",
  "currency": "ILS",
  "timezone": "Asia/Jerusalem",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Expense
```json
{
  "id": "uuid",
  "board_id": "board_uuid",
  "amount": 500,
  "category": "חשמל",
  "description": "חשבון חשמל",
  "paid_by": "user_uuid",
  "date": "2024-01-01T00:00:00Z",
  "is_recurring": true,
  "frequency": "monthly",
  "tags": ["בית"]
}
```

## 🔧 Configuration

### Environment Variables
- `FLASK_ENV`: Environment (development/production/testing)
- `SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT signing key
- `DATABASE_PATH`: Database file path
- `CORS_ORIGINS`: Allowed CORS origins

### Rate Limiting
- Default: 200 requests per day, 50 per hour
- Registration: 5 per minute
- Login: 10 per minute
- Board creation: 10 per hour
- Expense creation: 100 per hour

### Limits
- Maximum boards per user: 10
- Maximum members per board: 20
- Maximum expenses per board: 1000

## 🧪 Testing

### Run Professional Tests
```bash
python test_professional_api.py
```

This will test:
- User registration and authentication
- Board creation and management
- Member invitations
- Expense creation and management
- Category management
- Debt tracking
- Token refresh
- Rate limiting

## 🚀 Production Deployment

### Recommended Setup
1. **Use a production WSGI server** like Gunicorn
2. **Set up environment variables** for secrets
3. **Use a production database** like PostgreSQL
4. **Set up proper logging** and monitoring
5. **Configure HTTPS** with SSL certificates
6. **Set up backup** and recovery procedures

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
```

### Environment Configuration
```bash
# Production environment variables
FLASK_ENV=production
SECRET_KEY=your-super-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
DATABASE_PATH=/data/expenses_db.json
CORS_ORIGINS=https://yourdomain.com
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with 12 rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Configurable cross-origin policies
- **Error Handling**: Secure error responses

## 📈 Performance

- **Lightweight**: Minimal dependencies
- **Fast**: TinyDB for simple, fast operations
- **Scalable**: Multi-tenant architecture
- **Cached**: Efficient data access patterns
- **Optimized**: Minimal database queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the test files for usage examples 