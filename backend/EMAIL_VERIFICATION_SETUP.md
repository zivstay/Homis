# Email Verification Setup Guide - Python/Flask Backend

This guide will help you set up email verification with Brevo (formerly Sendinblue) for your Python Flask backend.

## 🔧 Prerequisites

1. **Brevo Account**: Sign up at [brevo.com](https://brevo.com)
2. **Verified Sender Email**: Add and verify your sender email in Brevo dashboard
3. **API Key**: Get your Brevo API key from dashboard

## 📦 Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

The following new dependencies were added:
- `sib-api-v3-sdk==7.6.0` - Brevo Python SDK
- `email-validator==2.1.0` - Email validation
- `Flask-Bcrypt==1.0.1` - Password hashing

### 2. Environment Variables

Create a `.env` file in your backend directory:

```bash
# Flask Configuration
SECRET_KEY=your-very-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_ENV=development

# Database
DATABASE_PATH=expenses_db.json

# Email Service (Brevo/Sendinblue)
BREVO_API_KEY=your-brevo-api-key-here

# Rate Limiting
RATELIMIT_DEFAULT=200 per day;50 per hour
RATELIMIT_STORAGE_URL=memory://

# CORS (for production, specify your frontend URLs)
CORS_ORIGINS=*
```

### 3. Get Your Brevo API Key

1. Go to [Brevo Dashboard](https://app.brevo.com)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key
4. Copy the key and add it to your `.env` file

### 4. Verify Sender Email

1. In Brevo dashboard, go to **Settings** → **Senders & IP**
2. Add your sender email (e.g., `noreply@homis.app`)
3. Verify the email through the verification process
4. Update the sender email in `auth.py` line 337:
   ```python
   sender={"name": "Homis Team", "email": "your-verified-email@domain.com"}
   ```

## 🚀 New API Endpoints

### Send Verification Code
```http
POST /api/auth/send-verification
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (Success):**
```json
{
  "message": "Verification code sent to your email"
}
```

### Verify Code and Register
```http
POST /api/auth/verify-and-register
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "12345"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00"
  },
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token"
}
```

## 🔒 Security Features

- **5-minute expiry**: Verification codes expire automatically
- **3 failed attempts**: User blocked after 3 wrong codes
- **Email release**: Failed/expired verifications release the email for reuse
- **Password hashing**: Passwords securely hashed with bcrypt
- **Automatic cleanup**: Expired verifications cleaned up automatically

## 📧 Email Template

The verification emails include:
- **Hebrew language support** (RTL direction)
- **Professional Homis branding**
- **Large, clear 5-digit code**
- **Expiry warnings**
- **Mobile-friendly HTML design**

## 🧪 Testing

### Test the Flow

1. **Start the backend:**
   ```bash
   python app.py
   ```

2. **Send verification code:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/send-verification \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "username": "testuser",
       "password": "password123",
       "first_name": "Test",
       "last_name": "User"
     }'
   ```

3. **Check email and verify:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/verify-and-register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "code": "12345"
     }'
   ```

## 🐛 Troubleshooting

### Common Issues

**"Brevo client not initialized":**
- Check your `BREVO_API_KEY` environment variable
- Ensure the API key is valid and active

**"Failed to send verification email":**
- Verify your sender email in Brevo dashboard
- Check API key permissions
- Ensure you haven't exceeded Brevo's sending limits

**"No pending registration found":**
- Registration may have expired (5 minutes)
- Check if the email was entered correctly

### Debug Mode

Enable debug logging by setting:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📊 Production Considerations

### Use Redis for Production

Replace the in-memory `pending_registrations` dict with Redis:

```python
import redis

class AuthManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        self._init_brevo_client()
```

### Rate Limiting

Add rate limiting to verification endpoints:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.remote_addr,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/auth/send-verification', methods=['POST'])
@limiter.limit("5 per minute")  # Limit verification requests
def send_verification():
    # ... existing code
```

### Environment Variables

Ensure all sensitive data is in environment variables:
- `BREVO_API_KEY`
- `SECRET_KEY`
- `JWT_SECRET_KEY`

## ✅ Verification Checklist

- [ ] Brevo account created and verified
- [ ] API key generated and added to `.env`
- [ ] Sender email verified in Brevo
- [ ] Dependencies installed
- [ ] Backend endpoints responding
- [ ] Frontend integration working
- [ ] Email delivery successful
- [ ] Code verification working

---

**Your email verification system is now ready!** 🎉

Users can now register with email verification, providing better security and preventing fake registrations. 