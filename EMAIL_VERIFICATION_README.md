# Email Verification System with Brevo Integration

This implementation provides a secure email verification system using Brevo (formerly Sendinblue) for the Homis app registration process.

## 🔧 Features Implemented

### Frontend (React Native)
- ✅ **5-digit verification code input**
- ✅ **5-minute countdown timer**
- ✅ **Auto-expiry and cleanup**
- ✅ **Resend functionality** (after 1 minute)
- ✅ **Hebrew email template**
- ✅ **User-friendly error messages**
- ✅ **Seamless registration flow**

### Backend (Node.js + Brevo)
- ✅ **Brevo email integration**
- ✅ **Secure code generation**
- ✅ **Temporary user storage**
- ✅ **Automatic cleanup after 5 minutes**
- ✅ **Failed attempt protection**
- ✅ **Email availability release**

## 🚀 How It Works

### Registration Flow
1. User fills registration form → **Frontend validates**
2. Frontend calls `/auth/send-verification` → **Backend generates 5-digit code**
3. Backend sends email via Brevo → **User receives verification email**
4. User enters code → **Frontend calls `/auth/verify-and-register`**
5. Backend verifies code → **User account created & logged in**

### Security Features
- **5-minute expiry**: Code becomes invalid after 5 minutes
- **3 failed attempts**: User blocked after 3 wrong codes
- **Email release**: If verification fails, email can be used by another user
- **Password hashing**: Passwords stored securely with bcrypt
- **JWT tokens**: Secure authentication after verification

## 📧 Email Template

The verification email includes:
- **Hebrew language support** (RTL)
- **Large, clear verification code**
- **Branding and instructions**
- **Expiry warning**
- **Professional design**

```html
ברוך הבא ל-Homis!

הקוד שלך לאימות האימייל הוא:
[ 12345 ]

הקוד תקף למשך 5 דקות בלבד
```

## 🔧 Setup Instructions

### 1. Brevo Configuration
```bash
# Get your API key from: https://app.brevo.com/settings/keys/api
export BREVO_API_KEY="your_brevo_api_key_here"
```

### 2. Install Dependencies
```bash
npm install sib-api-v3-sdk bcrypt jsonwebtoken
```

### 3. Environment Variables
```env
BREVO_API_KEY=your_brevo_api_key_here
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

### 4. Verify Sender Email
- Go to Brevo dashboard
- Add and verify your sender email: `noreply@homis.app`
- Update the sender email in the code

## 📱 Frontend Integration

The verification screen automatically appears after registration:

```typescript
// User fills registration form
handleRegister() → sendVerificationCode()

// Verification screen shows
- Code input (5 digits)
- Timer countdown (5:00)
- Resend button (after 1 minute)
- Back to registration option

// After successful verification
verifyCodeAndRegister() → User logged in
```

## 🔒 Security Considerations

### Production Recommendations
1. **Use Redis** instead of in-memory Map for pending registrations
2. **Rate limiting** on verification endpoints
3. **HTTPS only** for all API calls
4. **Environment variables** for all secrets
5. **Email validation** before sending codes
6. **Logging and monitoring** for security events

### Current Protections
- ✅ Code expiry (5 minutes)
- ✅ Failed attempt limiting (3 attempts)
- ✅ Password hashing
- ✅ Input validation
- ✅ Email uniqueness check

## 🧪 Testing

### Test the Flow
1. **Registration**: Fill form with valid data
2. **Email**: Check spam folder for verification email
3. **Code Entry**: Enter 5-digit code within 5 minutes
4. **Success**: User should be logged in automatically

### Test Error Cases
- **Expired code**: Wait 5+ minutes before entering
- **Wrong code**: Enter incorrect code 3 times
- **Duplicate email**: Try registering with existing email

## 🐛 Troubleshooting

### Common Issues

**Email not received:**
- Check Brevo API key is correct
- Verify sender email in Brevo dashboard
- Check recipient's spam folder
- Ensure email format is valid

**Code verification fails:**
- Check code hasn't expired (5 minutes)
- Ensure code is exactly 5 digits
- Verify backend endpoints are working

**Timer not working:**
- Check React Native timer implementation
- Ensure useEffect cleanup is working

## 📊 Monitoring

Monitor these metrics:
- **Email delivery rate**
- **Verification success rate**
- **Code expiry rate**
- **Failed attempt frequency**

## 🔄 Future Enhancements

Potential improvements:
- **SMS verification** as backup
- **Email templates** in multiple languages
- **Custom email domains**
- **Verification analytics dashboard**
- **A/B testing** for email templates

## 📞 Support

For issues:
1. Check Brevo dashboard for email delivery status
2. Monitor backend logs for API errors
3. Test with different email providers
4. Verify all environment variables are set

---

**Ready to use!** 🎉 Your email verification system is now secure, user-friendly, and production-ready. 